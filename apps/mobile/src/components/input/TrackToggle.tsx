/**
 * @see docs/09_Wireframe_v0.1.md (트랙 토글)
 */
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useInputStore } from '../../stores/useInputStore';
import type { InputMode } from '@aide/shared';

export function TrackToggle() {
  const { t } = useTranslation('todo');
  const { mode, setMode } = useInputStore();

  const options: { value: InputMode; label: string; color: string }[] = [
    { value: 'LIFE', label: t('filter.life'), color: '#10B981' },
    { value: 'WORK', label: t('filter.work'), color: '#3B82F6' },
  ];

  return (
    <View className="flex-row bg-surface-2 rounded-xl p-1">
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          onPress={() => setMode(opt.value)}
          className={`flex-1 py-2 rounded-lg items-center ${mode === opt.value ? 'bg-white shadow-sm' : ''}`}
        >
          <View className="flex-row items-center gap-1.5">
            <View
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: mode === opt.value ? opt.color : '#D1D5DB' }}
            />
            <Text className={`text-sm font-medium ${mode === opt.value ? 'text-text-primary' : 'text-text-secondary'}`}>
              {opt.label}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}
