/**
 * @see docs/07_인증_보안_v0.1.md (한도 체크 시스템)
 * @see docs/01_MVP_정의서_v0.4.md (Tier 한도)
 */
import * as functions from 'firebase-functions';
import { getAdminFirestore, FieldValue, Timestamp } from './admin';
import { COLLECTIONS, TIER_LIMITS } from '@aide/shared';
import type { UserTier } from '@aide/shared';

type LimitAction = 'voiceInput' | 'textInput' | 'aiCall';

const ACTION_FIELD_MAP: Record<LimitAction, keyof typeof TIER_LIMITS['FREE']> = {
  voiceInput: 'voiceInputPerDay',
  textInput: 'textInputPerDay',
  aiCall: 'aiCallsPerDay',
};

const COUNTER_FIELD_MAP: Record<LimitAction, string> = {
  voiceInput: 'voiceInputToday',
  textInput: 'textInputToday',
  aiCall: 'aiCallsToday',
};

export async function checkUserLimit(uid: string, action: LimitAction): Promise<void> {
  const db = getAdminFirestore();
  const limitRef = db.collection(COLLECTIONS.USER_LIMITS).doc(uid);
  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);

  await db.runTransaction(async (tx) => {
    const [limitSnap, userSnap] = await Promise.all([tx.get(limitRef), tx.get(userRef)]);

    const tier: UserTier = userSnap.exists ? (userSnap.data()?.['userTier'] as UserTier) ?? 'FREE' : 'FREE';
    const tierLimits = TIER_LIMITS[tier];
    const maxAllowed = tierLimits[ACTION_FIELD_MAP[action]] as number;

    const now = Timestamp.now();
    const limitData = limitSnap.data();
    const lastReset = limitData?.['lastResetAt'] as admin.firestore.Timestamp | undefined;

    // 날짜가 바뀌면 카운터 리셋
    const isNewDay = !lastReset || lastReset.toDate().toDateString() !== new Date().toDateString();
    const currentCount: number = isNewDay ? 0 : (limitData?.[COUNTER_FIELD_MAP[action]] as number) ?? 0;

    if (currentCount >= maxAllowed) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `일일 ${action} 한도(${maxAllowed}회)를 초과했습니다. 플랜을 업그레이드해주세요.`
      );
    }

    const updateData: Record<string, unknown> = {
      [COUNTER_FIELD_MAP[action]]: isNewDay ? 1 : FieldValue.increment(1),
    };
    if (isNewDay) {
      updateData['lastResetAt'] = now;
      updateData['voiceInputToday'] = action === 'voiceInput' ? 1 : 0;
      updateData['textInputToday'] = action === 'textInput' ? 1 : 0;
      updateData['aiCallsToday'] = action === 'aiCall' ? 1 : 0;
    }

    tx.set(limitRef, updateData, { merge: true });
  });
}
