/**
 * @see docs/06_API_Spec_v0.1.md (processVoiceInput)
 * @see docs/05_AI_파이프라인_v0.1.md
 */
import * as functions from 'firebase-functions';
import { getAdminFirestore, FieldValue } from '../utils/admin';
import { checkUserLimit } from '../utils/limits';
import { callAI } from '../ai/client';
import {
  COLLECTIONS,
  FUNCTIONS_REGION,
  ProcessVoiceInputRequestSchema,
  ClassifyOutputSchema,
  ExtractEntitiesOutputSchema,
  ClassifyPriorityOutputSchema,
  DraftGenerationOutputSchema,
} from '@aide/shared';
import type { Language } from '@aide/shared';

// Gemini 기반 음성 → 텍스트 변환 (whisper 백업)
async function transcribeAudio(audioUrl: string): Promise<string> {
  // Phase 1: Gemini Audio API 또는 Whisper API 사용
  // 실제 구현에서는 fetch(audioUrl) → Gemini multimodal 또는 OpenAI Whisper
  // 여기서는 Gemini Flash (multimodal 지원)로 처리
  const response = await fetch(audioUrl);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const apiKey = process.env['GEMINI_API_KEY']!;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const result = await model.generateContent([
    { inlineData: { mimeType: 'audio/webm', data: base64 } },
    '이 오디오를 정확하게 텍스트로 변환하세요. 텍스트만 반환하고 설명은 추가하지 마세요.',
  ]);

  return result.response.text().trim();
}

export const processVoiceInput = functions
  .region(FUNCTIONS_REGION)
  .runWith({ timeoutSeconds: 120, memory: '512MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다');
    }

    const uid = context.auth.uid;

    const parsed = ProcessVoiceInputRequestSchema.safeParse(data);
    if (!parsed.success) {
      throw new functions.https.HttpsError('invalid-argument', parsed.error.message);
    }

    const { audioUrl, audioDurationSec, mode, timezone } = parsed.data;

    await checkUserLimit(uid, 'voiceInput');
    await checkUserLimit(uid, 'aiCall');

    const db = getAdminFirestore();
    const now = FieldValue.serverTimestamp();

    // 1. rawData 저장 (음성)
    const rawRef = db.collection(COLLECTIONS.RAW_DATA).doc();
    await rawRef.set({
      id: rawRef.id,
      userId: uid,
      channel: 'voice',
      mode,
      audioUrl,
      audioDurationSec,
      language: 'ko',
      createdAt: now,
    });

    // 2. STT
    let transcript: string;
    try {
      transcript = await transcribeAudio(audioUrl);
    } catch (e) {
      throw new functions.https.HttpsError('internal', `음성 변환 실패: ${e instanceof Error ? e.message : String(e)}`);
    }

    // rawData에 텍스트 업데이트
    await rawRef.update({ rawText: transcript });

    // 3. AI 파이프라인 (processTextInput과 동일)
    const [classification, entities, priority] = await Promise.all([
      callAI({ task: 'classify', systemPromptKey: 'classify', userInput: transcript, outputSchema: ClassifyOutputSchema }),
      callAI({ task: 'extract_entities', systemPromptKey: 'extract_entities', userInput: transcript, outputSchema: ExtractEntitiesOutputSchema }),
      callAI({ task: 'classify_priority', systemPromptKey: 'classify_priority', userInput: transcript, outputSchema: ClassifyPriorityOutputSchema }),
    ]);

    const parsedRef = db.collection(COLLECTIONS.PARSED_DATA).doc();
    await parsedRef.set({
      id: parsedRef.id,
      userId: uid,
      rawDataId: rawRef.id,
      entities: entities.entities,
      keywords: entities.keywords,
      confidence: classification.confidence,
      modelVersion: 'gemini-2.5-flash-lite',
      createdAt: now,
    });

    const lang: Language = classification.language;
    const draftPromptKey = `draft_generation_${classification.entityType.toLowerCase()}` as const;

    const draftOutput = await callAI({
      task: 'draft_generation',
      systemPromptKey: draftPromptKey,
      userInput: transcript,
      outputSchema: DraftGenerationOutputSchema,
      contextData: {
        context: JSON.stringify({ entities: entities.entities, keywords: entities.keywords, timezone }),
        language: lang,
      },
    });

    const draftRef = db.collection(COLLECTIONS.DRAFTS).doc();
    await draftRef.set({
      id: draftRef.id,
      userId: uid,
      rawDataId: rawRef.id,
      parsedDataId: parsedRef.id,
      track: mode === 'WORK' ? 'WORK' : classification.track,
      entityType: classification.entityType,
      title: draftOutput.title,
      body: draftOutput.body ?? null,
      priority: draftOutput.priority ?? priority.priority,
      dueDate: draftOutput.dueDate ? new Date(draftOutput.dueDate) : null,
      tags: draftOutput.tags,
      projectId: null,
      sectionId: null,
      personIds: [],
      aiConfidence: classification.confidence,
      status: 'PENDING',
      editedByUser: false,
      confirmedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    return { ok: true, data: { draftId: draftRef.id, transcript } };
  });
