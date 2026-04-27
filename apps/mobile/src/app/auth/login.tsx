/**
 * @see docs/08_User_Flow_v0.1.md (FR-001 로그인)
 * @see docs/09_Wireframe_v0.1.md (로그인 화면)
 */
import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { signInWithGoogleCredential } from '@aide/firebase';
import { useAuthStore } from '../../stores/useAuthStore';

export default function LoginScreen() {
  const { t } = useTranslation('auth');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();

  async function handleGoogleSignIn() {
    if (loading) return;
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const { idToken } = await GoogleSignin.signIn();
      if (!idToken) throw new Error('idToken 없음');

      const result = await signInWithGoogleCredential(idToken);
      if (!result.ok) throw new Error(result.error);

      const u = result.data;
      setUser({ uid: u.uid, email: u.email ?? '', displayName: u.displayName ?? '', photoURL: u.photoURL });
      router.replace('/(tabs)/home');
    } catch (e) {
      Alert.alert(t('loginError'), e instanceof Error ? e.message : '');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      {/* 로고 */}
      <View className="mb-12 items-center">
        <View className="w-20 h-20 rounded-2xl bg-life items-center justify-center mb-4">
          <Text className="text-white text-3xl font-bold">A</Text>
        </View>
        <Text className="text-3xl font-bold text-text-primary">Aide</Text>
        <Text className="text-base text-text-secondary mt-2">{t('tagline')}</Text>
      </View>

      {/* 로그인 버튼 */}
      <TouchableOpacity
        onPress={handleGoogleSignIn}
        disabled={loading}
        className="w-full flex-row items-center justify-center border border-border rounded-xl py-4 px-6 gap-3 bg-white active:bg-surface"
      >
        <Image
          source={{ uri: 'https://www.google.com/favicon.ico' }}
          className="w-5 h-5"
        />
        <Text className="text-base font-semibold text-text-primary">
          {loading ? t('signingIn') : t('signInWithGoogle')}
        </Text>
      </TouchableOpacity>

      <Text className="mt-8 text-xs text-text-tertiary text-center px-4">
        {t('termsNotice')}
      </Text>
    </View>
  );
}
