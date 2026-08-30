import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppChrome } from '@/components/AppChrome';
import { AppColors } from '@/constants/theme';
import {
  CollectionHomeCategoryCard,
  CollectionHomeCategoryGrid,
  CollectionHomeSectionHeading,
  CollectionHomeShell,
  CollectionHomeSummaryCard,
} from '@/components/CollectionHomeShell';
import { catalogCategories, getCatalogItems } from '@/data/catalog';
import { getActiveIsland, getCollectionStatesForIsland, initializeDatabase } from '@/db/database';
import type { CatalogCategory } from '@/types/catalog';
import type { EncyclopediaState } from '@/types/encyclopedia';

const CATEGORY_ICONS: Record<CatalogCategory, string> = {
  furniture: '⌂',
  interior: '▦',
  clothing: '◌',
  music: '♫',
  items: '✦',
  tools: '⌁',
  special_items: '◇',
  gyroids: '◉',
  photos: '▣',
  recipes: '♨',
  seasonal_recipes: '✿',
  reactions: '✋',
};

const CATEGORY_TONES: Record<CatalogCategory, { card: string; icon: string; accent: string; track: string }> = {
  furniture: { card: '#FFF1E8', icon: '#F4A98C', accent: '#E9856F', track: '#F2D9CF' },
  interior: { card: '#EDF8F0', icon: '#8BCDA5', accent: '#63B084', track: '#D7E9DC' },
  clothing: { card: '#F3EEFC', icon: '#B09BD9', accent: '#9278C4', track: '#E2D9F0' },
  music: { card: '#FFF7DA', icon: '#E2BA4D', accent: '#D4A936', track: '#F0E7BC' },
  items: { card: '#EAF7FA', icon: '#78BECA', accent: '#55A8B8', track: '#D4E9ED' },
  tools: { card: '#FFF0EE', icon: '#ED9181', accent: '#DF7668', track: '#F0D8D4' },
  gyroids: { card: '#F4F0E5', icon: '#C3A16B', accent: '#A9844D', track: '#E6DCC8' },
  photos: { card: '#FCEEF2', icon: '#D795A8', accent: '#C77991', track: '#EDD9E0' },
  recipes: { card: '#EEF8F0', icon: '#7DB38B', accent: '#65A578', track: '#D7E9DB' },
  seasonal_recipes: { card: '#F8EFF8', icon: '#C990C0', accent: '#B473AB', track: '#EADCE8' },
  reactions: { card: '#FFF7DA', icon: '#E2BA4D', accent: '#D4A936', track: '#F0E7BC' },
  special_items: { card: '#F4F0E5', icon: '#C3A16B', accent: '#A9844D', track: '#E6DCC8' },
};

const catalogHomeCategories = [
  ...catalogCategories.filter((category) => category.key !== 'special_items'),
  ...catalogCategories.filter((category) => category.key === 'special_items'),
];

export function CatalogHomeScreen() {
  const router = useRouter();
  const [states, setStates] = useState<Record<string, EncyclopediaState>>({});

  const refresh = useCallback(() => {
    try {
      initializeDatabase();
      const island = getActiveIsland();
      setStates(island ? getCollectionStatesForIsland(island.id) : {});
    } catch {
      setStates({});
    }
  }, []);

  useFocusEffect(refresh);

  const uniqueItems = useMemo(() => {
    const items = new Map<string, ReturnType<typeof getCatalogItems>[number]>();
    for (const category of catalogCategories) {
      for (const item of getCatalogItems(category.key)) {
        items.set(`${item.catalogType}/${item.id}`, item);
      }
    }
    return Array.from(items.values());
  }, []);
  const totalCount = uniqueItems.length;
  const ownedCount = uniqueItems.filter((item) => states[`${item.catalogType}/${item.id}`]?.owned).length;
  const summaryPercent = totalCount ? Math.round((ownedCount / totalCount) * 100) : 0;

  const progressFor = (category: CatalogCategory) => {
    const items = getCatalogItems(category);
    const owned = items.filter((item) => states[`${item.catalogType}/${item.id}`]?.owned).length;
    return { owned, total: items.length };
  };

  return (
    <CollectionHomeShell>
      <AppChrome title="카탈로그" />
      <SafeAreaView edges={[]} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <CollectionHomeSummaryCard
            detail={`${ownedCount.toLocaleString('ko-KR')} / ${totalCount.toLocaleString('ko-KR')} 보유`}
            eyebrow="CATALOG LOG"
            progress={summaryPercent}
            title="전체 카탈로그 수집률"
            value={`${summaryPercent}%`}
          />

          <CollectionHomeSectionHeading countLabel={`${catalogHomeCategories.length}개 분류`} title="카탈로그" />

          <CollectionHomeCategoryGrid>
            {catalogHomeCategories.map((category) => {
              const progress = progressFor(category.key);
              const tone = CATEGORY_TONES[category.key];
              return (
                <CollectionHomeCategoryCard
                  accessibilityLabel={`${category.label} 카탈로그 열기`}
                  key={category.key}
                  icon={CATEGORY_ICONS[category.key]}
                  label={category.label}
                  metrics={[{ count: progress.owned, label: '보유', total: progress.total }]}
                  onPress={() =>
                    router.push({
                      pathname: '/catalog/[category]' as never,
                      params: { category: category.key },
                    })
                  }
                  tone={tone}
                />
              );
            })}
          </CollectionHomeCategoryGrid>
        </ScrollView>
      </SafeAreaView>
    </CollectionHomeShell>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: AppColors.background, flex: 1 },
  content: { padding: 14, paddingBottom: 28 },
});
