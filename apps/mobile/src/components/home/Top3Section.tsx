/**
 * @see docs/08_User_Flow_v0.1.md (Top3 추천)
 */
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Task } from '@aide/shared';

interface Props {
  recommendations: { taskId: string; reasoning: string; score: number }[];
  tasks: Task[];
}

export function Top3Section({ recommendations, tasks }: Props) {
  const { t } = useTranslation('home');
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  return (
    <View className="mx-5 mt-4">
      <Text className="text-base font-semibold text-text-primary mb-3">{t('top3Title')}</Text>
      {recommendations.map((rec, idx) => {
        const task = taskMap.get(rec.taskId);
        if (!task) return null;
        return (
          <View key={rec.taskId} className="flex-row items-start gap-3 bg-white rounded-xl p-3 border border-border mb-2">
            <View className="w-6 h-6 rounded-full bg-life items-center justify-center shrink-0 mt-0.5">
              <Text className="text-white text-xs font-bold">{idx + 1}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-text-primary" numberOfLines={1}>{task.title}</Text>
              <Text className="text-xs text-text-tertiary mt-0.5">{rec.reasoning}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
