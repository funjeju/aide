/**
 * @see docs/08_User_Flow_v0.1.md (5탭 네비게이션 + 중앙 FAB)
 * @see docs/09_Wireframe_v0.1.md (탭바 디자인)
 */
import { Tabs } from 'expo-router';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { InputModal } from '../../components/input/InputModal';

export default function TabsLayout() {
  const { t } = useTranslation('common');
  const [inputModalVisible, setInputModalVisible] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#10B981',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
            height: 56,
            paddingBottom: 6,
          },
          tabBarLabelStyle: { fontSize: 11, fontFamily: 'Pretendard' },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: t('tabs.home'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="todo"
          options={{
            title: t('tabs.todo'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'checkbox' : 'checkbox-outline'} size={22} color={color} />
            ),
          }}
        />
        {/* 중앙 FAB 자리 확보 */}
        <Tabs.Screen
          name="input"
          options={{
            title: '',
            tabBarIcon: () => <View className="w-6 h-6" />,
            tabBarButton: () => (
              <View className="flex-1 items-center justify-center">
                <TouchableOpacity
                  onPress={() => setInputModalVisible(true)}
                  className="w-14 h-14 rounded-full bg-life items-center justify-center shadow-lg -mt-4"
                  style={{ elevation: 6, shadowColor: '#10B981', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 }}
                >
                  <Ionicons name="add" size={28} color="white" />
                </TouchableOpacity>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="mandalart"
          options={{
            title: t('tabs.mandalart'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('tabs.settings'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
            ),
          }}
        />
      </Tabs>

      <InputModal visible={inputModalVisible} onClose={() => setInputModalVisible(false)} />
    </>
  );
}
