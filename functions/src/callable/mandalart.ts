/**
 * @see docs/06_API_Spec_v0.1.md (suggestMandalartSections/SubSections/Tasks, linkMandalartTaskToTodo)
 * @see docs/05_AI_파이프라인_v0.1.md
 */
import * as functions from 'firebase-functions';
import { getAdminFirestore, FieldValue } from '../utils/admin';
import { checkUserLimit } from '../utils/limits';
import { callAI } from '../ai/client';
import {
  COLLECTIONS,
  FUNCTIONS_REGION,
  SuggestMandalartSectionsRequestSchema,
  MandalartSuggestOutputSchema,
} from '@aide/shared';

export const suggestMandalartSections = functions
  .region(FUNCTIONS_REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다');

    const parsed = SuggestMandalartSectionsRequestSchema.safeParse(data);
    if (!parsed.success) throw new functions.https.HttpsError('invalid-argument', parsed.error.message);

    await checkUserLimit(context.auth.uid, 'aiCall');

    const { centralTheme, language = 'ko' } = parsed.data;
    const suggestions = await callAI({
      task: 'mandalart_suggest',
      systemPromptKey: 'mandalart_suggest_sections',
      userInput: centralTheme,
      outputSchema: MandalartSuggestOutputSchema,
      contextData: { context: `중심 주제: ${centralTheme}`, language },
    });

    return { ok: true, data: suggestions };
  });

export const suggestMandalartSubSections = functions
  .region(FUNCTIONS_REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다');

    const { nodeId, sectionTitle, centralTheme, language = 'ko' } = data as { nodeId: string; sectionTitle: string; centralTheme: string; language?: string };
    if (!nodeId || !sectionTitle || !centralTheme) throw new functions.https.HttpsError('invalid-argument', '필수 파라미터 누락');

    await checkUserLimit(context.auth.uid, 'aiCall');

    const suggestions = await callAI({
      task: 'mandalart_suggest',
      systemPromptKey: 'mandalart_suggest_sub_sections',
      userInput: sectionTitle,
      outputSchema: MandalartSuggestOutputSchema,
      contextData: { context: `중심 주제: ${centralTheme}, 상위 영역: ${sectionTitle}`, language },
    });

    return { ok: true, data: suggestions };
  });

export const suggestMandalartTasks = functions
  .region(FUNCTIONS_REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다');

    const { nodeId, subSectionTitle, sectionTitle, centralTheme, language = 'ko' } = data as {
      nodeId: string; subSectionTitle: string; sectionTitle: string; centralTheme: string; language?: string
    };
    if (!nodeId || !subSectionTitle || !sectionTitle || !centralTheme) {
      throw new functions.https.HttpsError('invalid-argument', '필수 파라미터 누락');
    }

    await checkUserLimit(context.auth.uid, 'aiCall');

    const suggestions = await callAI({
      task: 'mandalart_suggest',
      systemPromptKey: 'mandalart_suggest_tasks',
      userInput: subSectionTitle,
      outputSchema: MandalartSuggestOutputSchema,
      contextData: {
        context: `중심: ${centralTheme}, 영역: ${sectionTitle}, 세부영역: ${subSectionTitle}`,
        language,
      },
    });

    return { ok: true, data: suggestions };
  });

export const linkMandalartTaskToTodo = functions
  .region(FUNCTIONS_REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다');
    const uid = context.auth.uid;

    const { mandalartNodeId, taskId } = data as { mandalartNodeId: string; taskId: string };
    if (!mandalartNodeId || !taskId) throw new functions.https.HttpsError('invalid-argument', '필수 파라미터 누락');

    const db = getAdminFirestore();
    const [nodeSnap, taskSnap] = await Promise.all([
      db.collection(COLLECTIONS.MANDALART_NODES).doc(mandalartNodeId).get(),
      db.collection(COLLECTIONS.TASKS).doc(taskId).get(),
    ]);

    if (!nodeSnap.exists || nodeSnap.data()?.['userId'] !== uid) throw new functions.https.HttpsError('not-found', '노드를 찾을 수 없습니다');
    if (!taskSnap.exists || taskSnap.data()?.['userId'] !== uid) throw new functions.https.HttpsError('not-found', '태스크를 찾을 수 없습니다');

    const batch = db.batch();
    batch.update(nodeSnap.ref, {
      linkedTaskIds: FieldValue.arrayUnion(taskId),
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.update(taskSnap.ref, {
      mandalartTaskId: mandalartNodeId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    return { ok: true };
  });
