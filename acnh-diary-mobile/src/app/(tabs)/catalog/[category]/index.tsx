import { useLocalSearchParams } from 'expo-router';

import { CatalogListScreen } from '@/screens/CatalogListScreen';
import type { CatalogCategory } from '@/types/catalog';

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
  'seasonal_recipes',
  'reactions',
];

export default function CatalogCategoryRoute() {
  const { category } = useLocalSearchParams<{ category: string }>();
  if (!categories.includes(category as CatalogCategory)) return null;
  return <CatalogListScreen initialCategory={category as CatalogCategory} />;
}
