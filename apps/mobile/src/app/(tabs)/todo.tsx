/**
 * @see docs/08_User_Flow_v0.1.md (FR-007 ToDo 목록)
 * @see docs/09_Wireframe_v0.1.md (ToDo 화면)
 */
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTasksStore } from '../../stores/useTasksStore';
import { TaskListItem } from '../../components/todo/TaskListItem';
import type { Track } from '@aide/shared';

type FilterTab = 'ALL' | Track;

export default function TodoScreen() {
  const { t } = useTranslation('todo');
  const { tasks, subscribeTasks } = useTasksStore();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  useEffect(() => {
    return subscribeTasks();
  }, [subscribeTasks]);

  const filtered = tasks.filter((task) => {
    if (activeFilter === 'ALL') return true;
    return task.track === activeFilter;
  });

  const FILTERS: FilterTab[] = ['ALL', 'LIFE', 'WORK'];

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* 헤더 */}
      <View className="px-5 pt-4 pb-3">
        <Text className="text-2xl font-bold text-text-primary">{t('title')}</Text>
      </View>

      {/* 필터 탭 */}
      <View className="flex-row px-5 gap-2 mb-3">
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-full border ${
              activeFilter === f
                ? f === 'WORK' ? 'bg-work border-work' : 'bg-life border-life'
                : 'bg-white border-border'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                activeFilter === f ? 'text-white' : 'text-text-secondary'
              }`}
            >
              {t(`filter.${f.toLowerCase()}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Text className="text-text-tertiary text-sm">{t('messages.noTasks')}</Text>
          </View>
        ) : (
          filtered.map((task) => <TaskListItem key={task.id} task={task} />)
        )}
        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
