import { useLocalSearchParams } from 'expo-router';

import { VillagerDetailScreen } from '@/screens/VillagersScreen';

export default function VillagerDetailRoute() {
  const { villagerId } = useLocalSearchParams<{ villagerId: string }>();

  return <VillagerDetailScreen villagerId={villagerId} />;
}
