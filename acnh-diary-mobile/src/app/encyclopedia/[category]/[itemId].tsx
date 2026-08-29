import { useLocalSearchParams } from 'expo-router';

import { EncyclopediaDetailScreen } from '../../../screens/EncyclopediaDetailScreen';
import type { EncyclopediaCategory } from '../../../types/encyclopedia';

const categories: EncyclopediaCategory[] = ['bugs', 'fish', 'sea', 'fossils', 'art'];

export default function EncyclopediaItemRoute() {
  const { category, itemId } = useLocalSearchParams<{ category: string; itemId: string }>();
  if (!categories.includes(category as EncyclopediaCategory) || !itemId) return null;
  return <EncyclopediaDetailScreen category={category as EncyclopediaCategory} itemId={itemId} />;
}
