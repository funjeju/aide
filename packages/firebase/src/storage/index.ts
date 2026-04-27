/**
 * @see docs/03_Firestore_스키마_v0.1.md (Storage 경로 규칙)
 */
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { getFirebaseApp } from '../config';
import type { Result } from '@aide/shared';
import { ok, err } from '@aide/shared';

export function getFirebaseStorage() {
  return getStorage(getFirebaseApp());
}

// 음성 파일 업로드: voices/{uid}/{rawDataId}.webm
export async function uploadVoiceFile(
  uid: string,
  rawDataId: string,
  blob: Blob
): Promise<Result<string>> {
  try {
    const storageRef = ref(getFirebaseStorage(), `voices/${uid}/${rawDataId}.webm`);
    await uploadBytes(storageRef, blob, { contentType: 'audio/webm' });
    const url = await getDownloadURL(storageRef);
    return ok(url);
  } catch (e) {
    return err(e instanceof Error ? e.message : '음성 파일 업로드 실패');
  }
}

// 프로필 이미지 업로드: avatars/{uid}.jpg
export async function uploadAvatar(uid: string, blob: Blob): Promise<Result<string>> {
  try {
    const storageRef = ref(getFirebaseStorage(), `avatars/${uid}.jpg`);
    await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
    const url = await getDownloadURL(storageRef);
    return ok(url);
  } catch (e) {
    return err(e instanceof Error ? e.message : '프로필 이미지 업로드 실패');
  }
}

export async function deleteFile(path: string): Promise<Result<void>> {
  try {
    await deleteObject(ref(getFirebaseStorage(), path));
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : '파일 삭제 실패');
  }
}
