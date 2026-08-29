import { useLocalSearchParams } from 'expo-router';

import { CatalogDetailScreen } from '../../../screens/CatalogDetailScreen';
import type { CatalogCategory } from '../../../types/catalog';

const categories: CatalogCategory[] = [
  'furniture',
  'interior',
  'clothing',
  'music',
  'items',
  'tools',
  'special_items',
  'gyroids',
  'photos',
  'recipes',
  'reactions',
];

export default function CatalogItemRoute() {
  const { category, itemId } = useLocalSearchParams<{ category: string; itemId: string }>();
  if (!categories.includes(category as CatalogCategory) || !itemId) return null;
  return <CatalogDetailScreen category={category as CatalogCategory} itemId={itemId} />;
}
