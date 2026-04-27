/**
 * @see docs/07_인증_보안_v0.1.md
 * @see docs/08_User_Flow_v0.1.md
 */
import {
  getAuth,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { getFirebaseApp } from '../config';
import type { Result } from '@aide/shared';
import { ok, err } from '@aide/shared';

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

// 웹(어드민)용 Google 로그인
export async function signInWithGoogleWeb(): Promise<Result<FirebaseUser>> {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(getFirebaseAuth(), provider);
    return ok(result.user);
  } catch (e) {
    return err(e instanceof Error ? e.message : '로그인 실패');
  }
}

// 모바일용 (idToken 기반)
export async function signInWithGoogleCredential(idToken: string): Promise<Result<FirebaseUser>> {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(getFirebaseAuth(), credential);
    return ok(result.user);
  } catch (e) {
    return err(e instanceof Error ? e.message : '로그인 실패');
  }
}

export async function signOut(): Promise<Result<void>> {
  try {
    await firebaseSignOut(getFirebaseAuth());
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : '로그아웃 실패');
  }
}

export function subscribeAuthState(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export async function getCurrentIdToken(): Promise<Result<string>> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return err('로그인되지 않은 상태입니다');
  try {
    const token = await user.getIdToken();
    return ok(token);
  } catch (e) {
    return err(e instanceof Error ? e.message : '토큰 조회 실패');
  }
}
