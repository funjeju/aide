/**
 * @see docs/08_User_Flow_v0.1.md (진입점 리다이렉트)
 */
import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/useAuthStore';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!user) return <Redirect href="/auth/login" />;
  return <Redirect href="/(tabs)/home" />;
}
