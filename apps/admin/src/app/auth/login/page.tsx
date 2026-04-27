/**
 * @see docs/14_어드민_운영_v0.1.md (FR-A01 2FA 로그인)
 * @see docs/07_인증_보안_v0.1.md (TOTP)
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogleWeb } from '@aide/firebase';
import { useAdminAuthStore } from '@/stores/useAdminAuthStore';

type Step = 'google' | 'totp';

export default function AdminLoginPage() {
  const router = useRouter();
  const { setAdmin } = useAdminAuthStore();
  const [step, setStep] = useState<Step>('google');
  const [totpCode, setTotpCode] = useState('');
  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGoogleSignIn() {
    setLoading(true);
    setError('');
    const result = await signInWithGoogleWeb();
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setUid(result.data.uid);
    setStep('totp');
    setLoading(false);
  }

  async function handleTotpVerify(e: React.FormEvent) {
    e.preventDefault();
    if (totpCode.length !== 6) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/verify-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, code: totpCode }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        setAdmin({ uid });
        router.replace('/dashboard');
      } else {
        setError(data.error ?? 'TOTP 인증 실패');
      }
    } catch {
      setError('서버 오류');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-bold">A</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Aide Admin</h1>
          <p className="text-sm text-gray-500 mt-1">운영 콘솔</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {step === 'google' ? (
            <>
              <h2 className="text-base font-semibold text-gray-800 mb-4">관리자 로그인</h2>
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-xl py-3 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {loading ? '로그인 중...' : 'Google 계정으로 계속'}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-gray-800 mb-1">2단계 인증</h2>
              <p className="text-sm text-gray-500 mb-4">인증 앱의 6자리 코드를 입력하세요</p>
              <form onSubmit={handleTotpVerify}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoFocus
                  className="w-full text-center text-2xl tracking-widest border border-gray-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={totpCode.length !== 6 || loading}
                  className="mt-3 w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {loading ? '확인 중...' : '확인'}
                </button>
              </form>
            </>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
