import { Tabs } from 'expo-router';

import { AppBottomNav } from '@/components/AppBottomNav';
import { AppTabBarStyle } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: AppTabBarStyle,
      }}
      tabBar={(props) => <AppBottomNav {...props} />}>
      <Tabs.Screen name="today" options={{ title: '오늘', tabBarLabel: '오늘' }} />
      <Tabs.Screen name="villagers" options={{ title: '주민', tabBarLabel: '주민' }} />
      <Tabs.Screen name="encyclopedia" options={{ title: '도감', tabBarLabel: '도감' }} />
      <Tabs.Screen name="catalog" options={{ title: '카탈로그', tabBarLabel: '카탈로그' }} />
      <Tabs.Screen name="guides" options={{ title: '공략', tabBarLabel: '공략' }} />
    </Tabs>
  );
}
