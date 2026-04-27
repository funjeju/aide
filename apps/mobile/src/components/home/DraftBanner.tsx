/**
 * @see docs/08_User_Flow_v0.1.md (Draft 검토 배너)
 */
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface Props {
  count: number;
  onPress: () => void;
}

export function DraftBanner({ count, onPress }: Props) {
  const { t } = useTranslation('home');

  return (
    <TouchableOpacity
      onPress={onPress}
      className="mx-5 mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex-row items-center gap-3"
    >
      <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center">
        <Ionicons name="time-outline" size={16} color="#D97706" />
      </View>
      <Text className="flex-1 text-sm text-amber-800 font-medium">
        {t('pendingDrafts', { count })}
      </Text>
      <Ionicons name="chevron-forward" size={16} color="#D97706" />
    </TouchableOpacity>
  );
}
