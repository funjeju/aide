/**
 * @see docs/06_API_Spec_v0.1.md (processTextInput)
 * @see docs/05_AI_파이프라인_v0.1.md
 */
import * as functions from 'firebase-functions';
import { getAdminFirestore, FieldValue } from '../utils/admin';
import { checkUserLimit } from '../utils/limits';
import { callAI } from '../ai/client';
import {
  COLLECTIONS,
  FUNCTIONS_REGION,
  ProcessTextInputRequestSchema,
  ClassifyOutputSchema,
  ExtractEntitiesOutputSchema,
  ClassifyPriorityOutputSchema,
  ExtractEmotionOutputSchema,
  DraftGenerationOutputSchema,
} from '@aide/shared';
import type { Language } from '@aide/shared';

export const processTextInput = functions
  .region(FUNCTIONS_REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다');
    }

    const uid = context.auth.uid;

    // 요청 검증
    const parsed = ProcessTextInputRequestSchema.safeParse(data);
    if (!parsed.success) {
      throw new functions.https.HttpsError('invalid-argument', parsed.error.message);
    }

    const { text, mode, timezone } = parsed.data;

    // 한도 체크 (트랜잭션 기반)
    await checkUserLimit(uid, 'textInput');
    await checkUserLimit(uid, 'aiCall');

    const db = getAdminFirestore();
    const now = FieldValue.serverTimestamp();

    // 1. rawData 저장
    const rawRef = db.collection(COLLECTIONS.RAW_DATA).doc();
    await rawRef.set({
      id: rawRef.id,
      userId: uid,
      channel: 'text',
      mode,
      rawText: text,
      language: 'ko',
      createdAt: now,
    });

    // 2. AI Tier 1: 병렬 처리
    const [classification, entities, priority, emotion] = await Promise.all([
      callAI({
        task: 'classify',
        systemPromptKey: 'classify',
        userInput: text,
        outputSchema: ClassifyOutputSchema,
      }),
      callAI({
        task: 'extract_entities',
        systemPromptKey: 'extract_entities',
        userInput: text,
        outputSchema: ExtractEntitiesOutputSchema,
      }),
      callAI({
        task: 'classify_priority',
        systemPromptKey: 'classify_priority',
        userInput: text,
        outputSchema: ClassifyPriorityOutputSchema,
      }),
      callAI({
        task: 'extract_emotion',
        systemPromptKey: 'extract_emotion',
        userInput: text,
        outputSchema: ExtractEmotionOutputSchema,
      }),
    ]);

    // 3. parsedData 저장
    const parsedRef = db.collection(COLLECTIONS.PARSED_DATA).doc();
    await parsedRef.set({
      id: parsedRef.id,
      userId: uid,
      rawDataId: rawRef.id,
      entities: entities.entities,
      keywords: entities.keywords,
      emotion: emotion.emotion,
      confidence: classification.confidence,
      modelVersion: 'gemini-2.5-flash-lite',
      createdAt: now,
    });

    const lang: Language = classification.language;
    const draftPromptKey = `draft_generation_${classification.entityType.toLowerCase()}` as const;

    // 4. AI Tier 2: Draft 생성
    const draftOutput = await callAI({
      task: 'draft_generation',
      systemPromptKey: draftPromptKey,
      userInput: text,
      outputSchema: DraftGenerationOutputSchema,
      contextData: {
        context: JSON.stringify({ entities: entities.entities, keywords: entities.keywords, timezone }),
        language: lang,
      },
    });

    // 5. drafts 저장
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

    return { ok: true, data: { draftId: draftRef.id } };
  });
