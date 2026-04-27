/**
 * @see docs/06_API_Spec_v0.1.md (onUserCreated)
 * @see docs/03_Firestore_스키마_v0.1.md (users 컬렉션)
 */
import * as functions from 'firebase-functions';
import { getAdminFirestore, FieldValue } from '../utils/admin';
import { COLLECTIONS, FUNCTIONS_REGION } from '@aide/shared';

export const onUserCreated = functions
  .region(FUNCTIONS_REGION)
  .auth.user()
  .onCreate(async (user) => {
    const db = getAdminFirestore();
    const now = FieldValue.serverTimestamp();

    const batch = db.batch();

    // users 문서 생성
    const userRef = db.collection(COLLECTIONS.USERS).doc(user.uid);
    batch.set(userRef, {
      uid: user.uid,
      email: user.email ?? '',
      nickname: user.displayName ?? user.email?.split('@')[0] ?? '사용자',
      photoURL: user.photoURL ?? null,
      userTier: 'FREE',
      language: 'ko',
      timezone: 'Asia/Seoul',
      fcmTokens: [],
      onboardingDone: false,
      trialUsed: false,
      trialEndsAt: null,
      googleCalendarConnected: false,
      googleCalendarId: null,
      preferences: {
        defaultTrack: 'LIFE',
        notificationEnabled: true,
        morningBriefingTime: '08:00',
        eveningReviewEnabled: true,
        language: 'ko',
      },
      createdAt: now,
      updatedAt: now,
    });

    // userLimits 문서 생성
    const limitRef = db.collection(COLLECTIONS.USER_LIMITS).doc(user.uid);
    batch.set(limitRef, {
      uid: user.uid,
      voiceInputToday: 0,
      textInputToday: 0,
      aiCallsToday: 0,
      projectCount: 0,
      memberCount: 0,
      lastResetAt: now,
    });

    await batch.commit();
    functions.logger.info(`신규 사용자 생성: ${user.uid}`);
  });
