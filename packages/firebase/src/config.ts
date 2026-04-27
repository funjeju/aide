/**
 * @see docs/10_환경변수_v0.1.md
 * @see docs/07_인증_보안_v0.1.md
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

function getFirebaseConfig(): FirebaseConfig {
  // React Native (Expo) 환경
  if (typeof process !== 'undefined' && process.env['EXPO_PUBLIC_FIREBASE_API_KEY']) {
    return {
      apiKey: process.env['EXPO_PUBLIC_FIREBASE_API_KEY']!,
      authDomain: process.env['EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN']!,
      projectId: process.env['EXPO_PUBLIC_FIREBASE_PROJECT_ID']!,
      storageBucket: process.env['EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET']!,
      messagingSenderId: process.env['EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID']!,
      appId: process.env['EXPO_PUBLIC_FIREBASE_APP_ID']!,
    };
  }

  // Next.js 어드민 환경
  if (typeof process !== 'undefined' && process.env['NEXT_PUBLIC_FIREBASE_API_KEY']) {
    return {
      apiKey: process.env['NEXT_PUBLIC_FIREBASE_API_KEY']!,
      authDomain: process.env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN']!,
      projectId: process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID']!,
      storageBucket: process.env['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET']!,
      messagingSenderId: process.env['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID']!,
      appId: process.env['NEXT_PUBLIC_FIREBASE_APP_ID']!,
    };
  }

  throw new Error('Firebase 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.');
}

let app: FirebaseApp;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const existingApps = getApps();
    app = existingApps.length > 0 ? existingApps[0]! : initializeApp(getFirebaseConfig());
  }
  return app;
}
