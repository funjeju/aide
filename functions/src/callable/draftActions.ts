/**
 * @see docs/06_API_Spec_v0.1.md (updateDraft, confirmDraft, bulkConfirmDrafts)
 */
import * as functions from 'firebase-functions';
import { getAdminFirestore, FieldValue, Timestamp } from '../utils/admin';
import { COLLECTIONS, FUNCTIONS_REGION, UpdateDraftRequestSchema, ConfirmDraftRequestSchema, BulkConfirmDraftsRequestSchema } from '@aide/shared';
import type { Task } from '@aide/shared';

export const updateDraft = functions
  .region(FUNCTIONS_REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다');
    const uid = context.auth.uid;

    const parsed = UpdateDraftRequestSchema.safeParse(data);
    if (!parsed.success) throw new functions.https.HttpsError('invalid-argument', parsed.error.message);

    const { draftId, ...updates } = parsed.data;
    const db = getAdminFirestore();

    const draftRef = db.collection(COLLECTIONS.DRAFTS).doc(draftId);
    const snap = await draftRef.get();
    if (!snap.exists || snap.data()?.['userId'] !== uid) {
      throw new functions.https.HttpsError('not-found', 'Draft를 찾을 수 없습니다');
    }

    const updateData: Record<string, unknown> = { ...updates, editedByUser: true, updatedAt: FieldValue.serverTimestamp() };
    if (updates.dueDate !== undefined) {
      updateData['dueDate'] = updates.dueDate ? Timestamp.fromDate(new Date(updates.dueDate)) : null;
    }

    await draftRef.update(updateData);
    return { ok: true };
  });

export const confirmDraft = functions
  .region(FUNCTIONS_REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다');
    const uid = context.auth.uid;

    const parsed = ConfirmDraftRequestSchema.safeParse(data);
    if (!parsed.success) throw new functions.https.HttpsError('invalid-argument', parsed.error.message);

    const db = getAdminFirestore();
    const now = FieldValue.serverTimestamp();

    const draftRef = db.collection(COLLECTIONS.DRAFTS).doc(parsed.data.draftId);
    const snap = await draftRef.get();
    if (!snap.exists || snap.data()?.['userId'] !== uid) {
      throw new functions.https.HttpsError('not-found', 'Draft를 찾을 수 없습니다');
    }

    const draft = snap.data()!;
    const taskRef = db.collection(COLLECTIONS.TASKS).doc();

    await db.runTransaction(async (tx) => {
      tx.set(taskRef, {
        id: taskRef.id,
        userId: uid,
        track: draft['track'],
        title: draft['title'],
        body: draft['body'] ?? null,
        priority: draft['priority'],
        status: 'CONFIRMED',
        dueDate: draft['dueDate'] ?? null,
        startDate: null,
        completedAt: null,
        tags: draft['tags'] ?? [],
        projectId: draft['projectId'] ?? null,
        sectionId: draft['sectionId'] ?? null,
        subSectionId: null,
        mandalartTaskId: null,
        personIds: draft['personIds'] ?? [],
        recurringTaskId: null,
        googleEventId: null,
        sourceRawDataId: draft['rawDataId'] ?? null,
        sourceDraftId: snap.id,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      } satisfies Omit<Task, 'id'> & { id: string });

      tx.update(draftRef, {
        status: 'CONFIRMED',
        confirmedAt: now,
        updatedAt: now,
      });
    });

    return { ok: true, data: { taskId: taskRef.id } };
  });

export const bulkConfirmDrafts = functions
  .region(FUNCTIONS_REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다');
    const uid = context.auth.uid;

    const parsed = BulkConfirmDraftsRequestSchema.safeParse(data);
    if (!parsed.success) throw new functions.https.HttpsError('invalid-argument', parsed.error.message);

    const db = getAdminFirestore();
    const now = FieldValue.serverTimestamp();
    const taskIds: string[] = [];

    // 배치로 처리 (최대 500개 제한, 여기서는 50개)
    for (const draftId of parsed.data.draftIds) {
      const draftRef = db.collection(COLLECTIONS.DRAFTS).doc(draftId);
      const snap = await draftRef.get();
      if (!snap.exists || snap.data()?.['userId'] !== uid) continue;

      const draft = snap.data()!;
      const taskRef = db.collection(COLLECTIONS.TASKS).doc();
      taskIds.push(taskRef.id);

      await db.runTransaction(async (tx) => {
        tx.set(taskRef, {
          id: taskRef.id,
          userId: uid,
          track: draft['track'],
          title: draft['title'],
          body: draft['body'] ?? null,
          priority: draft['priority'],
          status: 'CONFIRMED',
          dueDate: draft['dueDate'] ?? null,
          startDate: null,
          completedAt: null,
          tags: draft['tags'] ?? [],
          projectId: draft['projectId'] ?? null,
          sectionId: draft['sectionId'] ?? null,
          subSectionId: null,
          mandalartTaskId: null,
          personIds: draft['personIds'] ?? [],
          recurringTaskId: null,
          googleEventId: null,
          sourceRawDataId: draft['rawDataId'] ?? null,
          sourceDraftId: snap.id,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        });
        tx.update(draftRef, { status: 'CONFIRMED', confirmedAt: now, updatedAt: now });
      });
    }

    return { ok: true, data: { taskIds } };
  });
