/**
 * @see docs/06_API_Spec_v0.1.md (getHomeDashboard)
 * @see docs/05_AI_파이프라인_v0.1.md (top3_recommendation)
 */
import * as functions from 'firebase-functions';
import { getAdminFirestore } from '../utils/admin';
import { callAI } from '../ai/client';
import { COLLECTIONS, FUNCTIONS_REGION, Top3RecommendationOutputSchema } from '@aide/shared';
import type { Task } from '@aide/shared';

export const getHomeDashboard = functions
  .region(FUNCTIONS_REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다');
    const uid = context.auth.uid;

    const { date, timezone = 'Asia/Seoul' } = data as { date: string; timezone?: string };
    const targetDate = date ? new Date(date) : new Date();

    const db = getAdminFirestore();

    // 오늘 태스크 조회
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [todayTasksSnap, pendingDraftsSnap, userSnap] = await Promise.all([
      db.collection(COLLECTIONS.TASKS)
        .where('userId', '==', uid)
        .where('isDeleted', '==', false)
        .where('status', 'in', ['CONFIRMED', 'IN_PROGRESS'])
        .orderBy('priority')
        .limit(50)
        .get(),
      db.collection(COLLECTIONS.DRAFTS)
        .where('userId', '==', uid)
        .where('status', '==', 'PENDING')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get(),
      db.collection(COLLECTIONS.USERS).doc(uid).get(),
    ]);

    const tasks = todayTasksSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Task);
    const pendingDrafts = pendingDraftsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const user = userSnap.data();

    // AI Top3 추천 (태스크 3개 이상일 때만)
    let top3: { taskId: string; reasoning: string; score: number }[] = [];
    if (tasks.length >= 3) {
      try {
        const taskSummary = tasks.slice(0, 20).map((t) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          dueDate: t.dueDate,
          status: t.status,
        }));

        const result = await callAI({
          task: 'top3_recommendation',
          systemPromptKey: 'top3_recommendation',
          userInput: `오늘 날짜: ${targetDate.toISOString()}, timezone: ${timezone}`,
          outputSchema: Top3RecommendationOutputSchema,
          contextData: { context: JSON.stringify(taskSummary) },
        });
        top3 = result.recommendations;
      } catch {
        // Top3 실패해도 대시보드는 정상 반환
        functions.logger.warn('Top3 추천 실패, 기본값 사용');
      }
    }

    const completedToday = tasks.filter((t) => t.status === 'DONE').length;

    return {
      ok: true,
      data: {
        user: { nickname: user?.['nickname'], userTier: user?.['userTier'] },
        todayTasks: tasks,
        pendingDraftsCount: pendingDrafts.length,
        pendingDrafts: pendingDrafts.slice(0, 5),
        top3Recommendations: top3,
        stats: {
          totalToday: tasks.length,
          completedToday,
          completionRate: tasks.length > 0 ? Math.round((completedToday / tasks.length) * 100) : 0,
        },
      },
    };
  });
