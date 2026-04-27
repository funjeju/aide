/**
 * @see docs/07_인증_보안_v0.1.md (TOTP 검증)
 * @see docs/14_어드민_운영_v0.1.md (FR-A01)
 */
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import * as speakeasy from 'speakeasy';

// Firebase Admin 초기화 (싱글톤)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { uid, code } = (await req.json()) as { uid: string; code: string };

    if (!uid || !code || code.length !== 6) {
      return NextResponse.json({ ok: false, error: '잘못된 요청' }, { status: 400 });
    }

    // admin_users에서 TOTP 시크릿 조회
    const db = admin.firestore();
    const snap = await db.collection('admin_users').doc(uid).get();

    if (!snap.exists) {
      return NextResponse.json({ ok: false, error: '관리자 계정이 아닙니다' }, { status: 403 });
    }

    const data = snap.data()!;

    if (!data['totpEnabled'] || !data['totpSecret']) {
      return NextResponse.json({ ok: false, error: 'TOTP가 설정되지 않았습니다' }, { status: 403 });
    }

    const encryptedSecret = data['totpSecret'] as string;
    // KMS 복호화 (Phase 1에서는 간단한 base64로 처리, 실제 배포 전 KMS로 교체)
    const secret = Buffer.from(encryptedSecret, 'base64').toString('utf-8');

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      // 실패 로그
      await db.collection('admin_logs').add({
        adminUid: uid,
        action: 'totp_verify_failed',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ ok: false, error: '인증 코드가 올바르지 않습니다' }, { status: 401 });
    }

    // 성공 → Custom Claims 설정 (admin: true)
    await admin.auth().setCustomUserClaims(uid, {
      admin: true,
      role: data['role'] ?? 'admin',
    });

    await db.collection('admin_logs').add({
      adminUid: uid,
      action: 'login_success',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection('admin_users').doc(uid).update({
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('TOTP verify error:', e);
    return NextResponse.json({ ok: false, error: '서버 오류' }, { status: 500 });
  }
}
