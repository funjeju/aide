/**
 * @see docs/09_Wireframe_v0.1.md (ToDo 리스트 아이템)
 */
import { View, Text, TouchableOpacity } from 'react-native';
import { PRIORITIES, TRACKS } from '@aide/shared';
import type { Task } from '@aide/shared';

interface Props {
  task: Task;
}

export function TaskListItem({ task }: Props) {
  const priority = PRIORITIES[task.priority];
  const track = TRACKS[task.track];

  return (
    <View className="flex-row items-center bg-white rounded-xl px-4 py-3 border border-border mb-2 gap-3">
      <TouchableOpacity className="w-5 h-5 rounded-full border-2 items-center justify-center shrink-0" style={{ borderColor: priority.color }}>
        {task.status === 'DONE' && (
          <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: priority.color }} />
        )}
      </TouchableOpacity>
      <View className="flex-1">
        <Text className={`text-sm font-medium ${task.status === 'DONE' ? 'line-through text-text-tertiary' : 'text-text-primary'}`} numberOfLines={1}>
          {task.title}
        </Text>
        <View className="flex-row items-center gap-2 mt-0.5">
          <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: track.color }} />
          <Text className="text-xs text-text-tertiary">{track.label}</Text>
          {task.dueDate && (
            <Text className="text-xs text-text-tertiary">
              {new Date((task.dueDate as unknown as { seconds: number }).seconds * 1000).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            </Text>
          )}
        </View>
      </View>
      <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: `${priority.color}20` }}>
        <Text className="text-xs font-medium" style={{ color: priority.color }}>{priority.label}</Text>
      </View>
    </View>
  );
}
