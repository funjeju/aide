/**
 * @see docs/09_Wireframe_v0.1.md (태스크 카드)
 */
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TRACKS, PRIORITIES } from '@aide/shared';
import type { Task } from '@aide/shared';

interface Props {
  task: Task;
  onPress?: () => void;
}

export function TaskCard({ task, onPress }: Props) {
  const track = TRACKS[task.track];
  const priority = PRIORITIES[task.priority];

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-xl p-4 border border-border mb-2 active:bg-surface"
    >
      <View className="flex-row items-start gap-3">
        {/* 우선순위 인디케이터 */}
        <View className="w-1 h-full rounded-full mt-1" style={{ backgroundColor: priority.color, minHeight: 40 }} />

        <View className="flex-1">
          <Text className="text-sm font-medium text-text-primary" numberOfLines={2}>
            {task.title}
          </Text>
          <View className="flex-row items-center gap-2 mt-1.5">
            <View className="flex-row items-center gap-1">
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: track.color }} />
              <Text className="text-xs text-text-tertiary">{track.label}</Text>
            </View>
            {task.dueDate && (
              <Text className="text-xs text-text-tertiary">
                {new Date((task.dueDate as unknown as { seconds: number }).seconds * 1000).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity className="w-6 h-6 rounded-full border-2 border-border items-center justify-center">
          {task.status === 'DONE' && <Ionicons name="checkmark" size={12} color="#10B981" />}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
