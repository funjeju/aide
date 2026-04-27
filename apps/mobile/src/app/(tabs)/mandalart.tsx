/**
 * @see docs/08_User_Flow_v0.1.md (FR-008 만다라트)
 * @see docs/09_Wireframe_v0.1.md (만다라트 화면)
 */
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMandalartStore } from '../../stores/useMandalartStore';

export default function MandalartScreen() {
  const { t } = useTranslation('mandalart');
  const { projects } = useMandalartStore();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-text-primary">{t('title')}</Text>
        <TouchableOpacity
          onPress={() => router.push('/mandalart/new')}
          className="w-8 h-8 rounded-full bg-life items-center justify-center"
        >
          <Ionicons name="add" size={18} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5">
        {projects.length === 0 ? (
          <View className="items-center justify-center py-20">
            <View className="w-16 h-16 rounded-2xl bg-life-light items-center justify-center mb-4">
              <Ionicons name="grid-outline" size={32} color="#10B981" />
            </View>
            <Text className="text-base font-semibold text-text-primary mb-2">{t('empty.title')}</Text>
            <Text className="text-sm text-text-secondary text-center px-8">{t('empty.description')}</Text>
            <TouchableOpacity
              onPress={() => router.push('/mandalart/new')}
              className="mt-6 bg-life px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">{t('createFirst')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          projects.map((project) => (
            <TouchableOpacity
              key={project.id}
              onPress={() => router.push(`/mandalart/${project.id}`)}
              className="bg-white rounded-xl p-4 border border-border mb-3"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: project.color ?? '#D1FAE5' }}>
                  <Ionicons name="grid" size={20} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-text-primary">{project.title}</Text>
                  <Text className="text-xs text-text-tertiary mt-0.5">{t('depth4')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))
        )}
        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
