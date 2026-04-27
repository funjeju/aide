/**
 * @see docs/06_API_Spec_v0.1.md (onUserDeleted)
 */
import * as functions from 'firebase-functions';
import { getAdminFirestore, FieldValue } from '../utils/admin';
import { COLLECTIONS, FUNCTIONS_REGION } from '@aide/shared';

export const onUserDeleted = functions
  .region(FUNCTIONS_REGION)
  .auth.user()
  .onDelete(async (user) => {
    const db = getAdminFirestore();
    const now = FieldValue.serverTimestamp();

    // 소프트 삭제 + 개인정보 마스킹
    await db.collection(COLLECTIONS.USERS).doc(user.uid).update({
      email: '[deleted]',
      nickname: '[삭제된 사용자]',
      photoURL: null,
      fcmTokens: [],
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    });

    functions.logger.info(`사용자 삭제 처리: ${user.uid}`);
  });
