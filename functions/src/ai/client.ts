/**
 * @see docs/05_AI_파이프라인_v0.1.md
 *
 * 모든 AI 호출은 반드시 이 callAI() 추상화를 통해야 한다.
 * 직접 SDK 호출 금지.
 */
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { z } from 'zod';
import * as functions from 'firebase-functions';
import { sanitizeUserInput } from '@aide/shared';

const FLASH_LITE_MODEL = 'gemini-2.5-flash-lite';
const FLASH_MODEL = 'gemini-2.5-flash';

// Tier 1: 빠른 분류/추출 작업
const TIER1_TASKS = ['classify', 'extract_entities', 'extract_keywords', 'classify_priority', 'extract_emotion', 'clean_text'] as const;
// Tier 2: 복잡한 생성 작업
const TIER2_TASKS = ['draft_generation', 'chatbot', 'daily_report', 'business_report', 'top3_recommendation', 'mandalart_suggest'] as const;

type AiTask = typeof TIER1_TASKS[number] | typeof TIER2_TASKS[number];

interface CallAIOptions<T> {
  task: AiTask;
  systemPromptKey: string;
  userInput: string;
  outputSchema: z.ZodType<T>;
  contextData?: Record<string, unknown>;
}

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다');
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

function selectModel(task: AiTask): string {
  return (TIER1_TASKS as readonly string[]).includes(task) ? FLASH_LITE_MODEL : FLASH_MODEL;
}

export async function callAI<T>(options: CallAIOptions<T>): Promise<T> {
  const { task, systemPromptKey, userInput, outputSchema, contextData } = options;

  // 프롬프트 인젝션 방어
  const safeInput = sanitizeUserInput(userInput);
  const systemPrompt = getSystemPrompt(systemPromptKey, contextData);
  const modelName = selectModel(task);

  const model = getGenAI().getGenerativeModel({
    model: modelName,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: task === 'chatbot' ? 0.8 : 0.2,
      maxOutputTokens: task === 'daily_report' || task === 'business_report' ? 2048 : 1024,
    },
    systemInstruction: systemPrompt,
  });

  try {
    const result = await model.generateContent(safeInput);
    const rawText = result.response.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new functions.https.HttpsError('internal', `AI 응답 JSON 파싱 실패: ${rawText.slice(0, 200)}`);
    }

    const validated = outputSchema.safeParse(parsed);
    if (!validated.success) {
      throw new functions.https.HttpsError('internal', `AI 출력 스키마 검증 실패: ${validated.error.message}`);
    }

    return validated.data;
  } catch (e) {
    if (e instanceof functions.https.HttpsError) throw e;
    throw new functions.https.HttpsError('internal', `AI 호출 실패: ${e instanceof Error ? e.message : String(e)}`);
  }
}
