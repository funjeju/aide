/**
 * @see docs/08_User_Flow_v0.1.md (FR-012 홈 대시보드)
 * @see docs/09_Wireframe_v0.1.md (홈 화면)
 */
import { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { TaskCard } from '../../components/home/TaskCard';
import { DraftBanner } from '../../components/home/DraftBanner';
import { Top3Section } from '../../components/home/Top3Section';

export default function HomeScreen() {
  const { t } = useTranslation('home');
  const { dashboard, loading, error, fetchDashboard } = useDashboardStore();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading && !dashboard) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const stats = dashboard?.stats;
  const today = new Date();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-sm text-text-secondary">
            {today.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
          </Text>
          <Text className="text-2xl font-bold text-text-primary mt-1">
            {t('greeting', { nickname: dashboard?.user?.nickname ?? '' })}
          </Text>
        </View>

        {/* 진행률 */}
        {stats && (
          <View className="mx-5 mt-3 bg-white rounded-xl p-4 border border-border">
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm font-medium text-text-secondary">{t('todayProgress')}</Text>
              <Text className="text-sm font-bold text-life">
                {stats.completedToday}/{stats.totalToday}
              </Text>
            </View>
            <View className="h-2 bg-surface-2 rounded-full overflow-hidden">
              <View
                className="h-2 bg-life rounded-full"
                style={{ width: `${stats.completionRate}%` }}
              />
            </View>
          </View>
        )}

        {/* 대기중인 Draft */}
        {(dashboard?.pendingDraftsCount ?? 0) > 0 && (
          <DraftBanner
            count={dashboard!.pendingDraftsCount}
            onPress={() => router.push('/drafts')}
          />
        )}

        {/* Top 3 추천 */}
        {dashboard?.top3Recommendations && dashboard.top3Recommendations.length > 0 && (
          <Top3Section recommendations={dashboard.top3Recommendations} tasks={dashboard.todayTasks} />
        )}

        {/* 오늘 할 일 목록 */}
        <View className="mx-5 mt-4">
          <Text className="text-base font-semibold text-text-primary mb-3">{t('todayTasks')}</Text>
          {dashboard?.todayTasks?.length === 0 ? (
            <View className="bg-white rounded-xl p-8 border border-border items-center">
              <Text className="text-text-tertiary text-sm">{t('noTasks')}</Text>
            </View>
          ) : (
            dashboard?.todayTasks?.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))
          )}
        </View>

        {error && (
          <Text className="mx-5 mt-4 text-sm text-urgent text-center">{error}</Text>
        )}

        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
