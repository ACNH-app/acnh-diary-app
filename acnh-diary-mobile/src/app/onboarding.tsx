import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { createIsland, initializeDatabase } from '../db/database';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import type { IslandInput } from '../types/island';

export default function OnboardingRoute() {
  const router = useRouter();

  const handleComplete = (island: IslandInput) => {
    try {
      initializeDatabase();
      createIsland(island);
      router.replace('/today');
    } catch {
      Alert.alert('저장 실패', '섬 정보를 저장하지 못했습니다. 다시 시도해 주세요.');
    }
  };

  return <OnboardingScreen onComplete={handleComplete} />;
}
