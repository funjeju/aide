/**
 * @see docs/03_Firestore_스키마_v0.1.md
 * @see docs/07_인증_보안_v0.1.md
 */
import {
  getFirestore,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
  type DocumentReference,
  type CollectionReference,
} from 'firebase/firestore';
import { getFirebaseApp } from '../config';
import type { Result } from '@aide/shared';
import { ok, err } from '@aide/shared';

export { serverTimestamp, Timestamp };

export function getFirestoreDB() {
  return getFirestore(getFirebaseApp());
}

// ─── 제네릭 CRUD 헬퍼 ─────────────────────────────────────────────

export function docRef<T = DocumentData>(path: string, ...segments: string[]): DocumentReference<T> {
  return doc(getFirestoreDB(), path, ...segments) as DocumentReference<T>;
}

export function colRef<T = DocumentData>(path: string): CollectionReference<T> {
  return collection(getFirestoreDB(), path) as CollectionReference<T>;
}

export async function getDocument<T>(path: string, ...segments: string[]): Promise<Result<T | null>> {
  try {
    const snap = await getDoc(docRef<T>(path, ...segments));
    return ok(snap.exists() ? (snap.data() as T) : null);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Firestore 읽기 실패');
  }
}

export async function setDocument<T extends DocumentData>(
  data: T,
  path: string,
  ...segments: string[]
): Promise<Result<void>> {
  try {
    await setDoc(docRef(path, ...segments), { ...data, updatedAt: serverTimestamp() });
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Firestore 쓰기 실패');
  }
}

export async function updateDocument<T extends DocumentData>(
  data: Partial<T>,
  path: string,
  ...segments: string[]
): Promise<Result<void>> {
  try {
    await updateDoc(docRef(path, ...segments), { ...data, updatedAt: serverTimestamp() });
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Firestore 업데이트 실패');
  }
}

export async function softDelete(path: string, ...segments: string[]): Promise<Result<void>> {
  try {
    await updateDoc(docRef(path, ...segments), {
      isDeleted: true,
      updatedAt: serverTimestamp(),
    });
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Firestore 삭제 실패');
  }
}

export async function queryDocuments<T>(
  collectionPath: string,
  constraints: QueryConstraint[]
): Promise<Result<T[]>> {
  try {
    const q = query(colRef<T>(collectionPath), ...constraints);
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
    return ok(docs);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Firestore 쿼리 실패');
  }
}

export function subscribeDocument<T>(
  path: string,
  segments: string[],
  callback: (data: T | null) => void
): () => void {
  return onSnapshot(docRef<T>(path, ...segments), (snap) => {
    callback(snap.exists() ? (snap.data() as T) : null);
  });
}

export function subscribeQuery<T>(
  collectionPath: string,
  constraints: QueryConstraint[],
  callback: (data: T[]) => void
): () => void {
  const q = query(colRef<T>(collectionPath), ...constraints);
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T));
  });
}

// re-export query helpers
export { where, orderBy, limit, query };
