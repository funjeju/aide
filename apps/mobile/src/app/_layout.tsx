/**
 * @see docs/08_User_Flow_v0.1.md (앱 루트 레이아웃)
 * @see docs/09_Wireframe_v0.1.md (디자인 시스템)
 */
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../i18n';
import { useAuthStore } from '../stores/useAuthStore';
import { subscribeAuthState } from '@aide/firebase';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { setUser, setLoading } = useAuthStore();

  const [fontsLoaded] = useFonts({
    Pretendard: require('../../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('../../assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('../../assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('../../assets/fonts/Pretendard-Bold.otf'),
  });

  useEffect(() => {
    const unsubscribe = subscribeAuthState((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          displayName: firebaseUser.displayName ?? '',
          photoURL: firebaseUser.photoURL ?? null,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [setUser, setLoading]);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView className="flex-1">
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
