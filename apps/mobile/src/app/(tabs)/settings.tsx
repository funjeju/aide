/**
 * @see docs/08_User_Flow_v0.1.md (설정 화면)
 */
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from '@aide/firebase';
import { useAuthStore } from '../../stores/useAuthStore';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const { t } = useTranslation('settings');
  const { user, clear } = useAuthStore();

  async function handleSignOut() {
    Alert.alert(t('signOutConfirm.title'), t('signOutConfirm.message'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('signOut'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          clear();
          router.replace('/auth/login');
        },
      },
    ]);
  }

  const MENU_ITEMS = [
    { icon: 'notifications-outline', label: t('notifications'), onPress: () => {} },
    { icon: 'language-outline', label: t('language'), onPress: () => {} },
    { icon: 'calendar-outline', label: t('googleCalendar'), onPress: () => router.push('/settings/google-calendar') },
    { icon: 'diamond-outline', label: t('subscription'), onPress: () => router.push('/settings/subscription') },
    { icon: 'shield-outline', label: t('privacy'), onPress: () => {} },
    { icon: 'document-text-outline', label: t('terms'), onPress: () => {} },
  ] as const;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-5 pt-4 pb-3">
        <Text className="text-2xl font-bold text-text-primary">{t('title')}</Text>
      </View>

      <ScrollView className="flex-1">
        {/* 프로필 카드 */}
        <View className="mx-5 bg-white rounded-xl p-4 border border-border mb-4">
          <View className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-full bg-life items-center justify-center">
              <Text className="text-white text-xl font-bold">
                {(user?.displayName ?? user?.email ?? 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-text-primary">{user?.displayName || t('noName')}</Text>
              <Text className="text-sm text-text-secondary">{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* 메뉴 목록 */}
        <View className="mx-5 bg-white rounded-xl border border-border overflow-hidden mb-4">
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              onPress={item.onPress}
              className={`flex-row items-center px-4 py-4 gap-3 ${idx < MENU_ITEMS.length - 1 ? 'border-b border-border' : ''}`}
            >
              <Ionicons name={item.icon as 'notifications-outline'} size={20} color="#6B7280" />
              <Text className="flex-1 text-sm text-text-primary">{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* 로그아웃 */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="mx-5 bg-white rounded-xl p-4 border border-border items-center"
        >
          <Text className="text-urgent font-medium">{t('signOut')}</Text>
        </TouchableOpacity>

        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
