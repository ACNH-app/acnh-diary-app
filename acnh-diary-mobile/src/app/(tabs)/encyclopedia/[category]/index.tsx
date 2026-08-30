import { useLocalSearchParams } from 'expo-router';

import { EncyclopediaListScreen } from '@/screens/EncyclopediaListScreen';
import type { EncyclopediaCategory } from '@/types/encyclopedia';

const categories: EncyclopediaCategory[] = ['bugs', 'fish', 'sea', 'fossils', 'art'];

export default function EncyclopediaCategoryRoute() {
  const { category } = useLocalSearchParams<{ category: string }>();
  if (!categories.includes(category as EncyclopediaCategory)) return null;
  return <EncyclopediaListScreen category={category as EncyclopediaCategory} />;
}
