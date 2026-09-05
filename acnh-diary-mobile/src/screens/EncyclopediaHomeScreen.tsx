import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
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
import { encyclopediaCategories, getEncyclopediaItems } from '@/data/encyclopedia';
import {
  getActiveIsland,
  getCollectionStatesForIsland,
  initializeDatabase,
} from '@/db/database';
import type { EncyclopediaCategory, EncyclopediaState } from '@/types/encyclopedia';

const EMPTY_STATE: EncyclopediaState = {
  caught: false,
  owned: false,
  donated: false,
  genuineOwned: false,
  fakeOwned: false,
};

const CATEGORY_ICONS: Record<EncyclopediaCategory, string> = {
  bugs: '✦',
  fish: '≈',
  sea: '◒',
  fossils: '◇',
  art: '▱',
};

const CATEGORY_TONES: Record<EncyclopediaCategory, { accent: string; card: string; icon: string; track: string }> = {
  bugs: { card: '#FFF1E8', icon: '#F2A174', accent: '#DE8063', track: '#F1D9CF' },
  fish: { card: '#EAF6F7', icon: '#76BBC1', accent: '#54A5AF', track: '#D4E8EA' },
  sea: { card: '#EAF2FB', icon: '#7EAED2', accent: '#5D94BF', track: '#D7E4F0' },
  fossils: { card: '#F5F0E5', icon: '#B99A6A', accent: '#9D7D4B', track: '#E5DCCB' },
  art: { card: '#FCEEF2', icon: '#D58EA4', accent: '#C4788D', track: '#EDD9E0' },
};

export function EncyclopediaHomeScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
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

  const progressFor = (category: EncyclopediaCategory) => {
    const items = getEncyclopediaItems(category);
    const count = (status: keyof EncyclopediaState) =>
      items.filter((item) => (states[`${category}/${item.id}`] ?? EMPTY_STATE)[status]).length;

    if (category === 'bugs' || category === 'fish' || category === 'sea') {
      return {
        metrics: [
          { count: count('caught'), label: '채집' },
          { count: count('donated'), label: '기증' },
        ],
        total: items.length,
      };
    }

    if (category === 'fossils') {
      return {
        metrics: [
          { count: count('owned'), label: '보유' },
          { count: count('donated'), label: '기증' },
        ],
        total: items.length,
      };
    }

    return {
      metrics: [
        { count: count('genuineOwned'), label: '진품' },
        { count: count('fakeOwned'), label: '가품' },
        { count: count('donated'), label: '기증' },
      ],
      total: items.length,
    };
  };

  const totalDonated = encyclopediaCategories.reduce(
    (sum, item) => sum + progressFor(item.category).metrics.find((metric) => metric.label === '기증')!.count,
    0,
  );
  const totalItems = encyclopediaCategories.reduce((sum, item) => sum + progressFor(item.category).total, 0);

  const donatedPercent = totalItems ? Math.round((totalDonated / totalItems) * 100) : 0;
  const normalizedSearch = search.trim().toLocaleLowerCase('ko-KR');
  const visibleCategories = useMemo(
    () => encyclopediaCategories.filter((category) => {
      if (!normalizedSearch) return true;
      const matchesCategory = category.label.toLocaleLowerCase('ko-KR').includes(normalizedSearch);
      const matchesItem = getEncyclopediaItems(category.category).some((item) =>
        item.nameKo.toLocaleLowerCase('ko-KR').includes(normalizedSearch) ||
        item.nameEn.toLocaleLowerCase('ko-KR').includes(normalizedSearch) ||
        String(item.number ?? '').includes(normalizedSearch),
      );
      return matchesCategory || matchesItem;
    }),
    [normalizedSearch],
  );

  return (
    <CollectionHomeShell>
      <AppChrome
        search={{
          accessibilityLabel: '도감 검색',
          onChangeText: setSearch,
          onClear: () => setSearch(''),
          placeholder: '도감 이름 또는 번호 검색',
          value: search,
        }}
        title="도감"
      />
      <SafeAreaView edges={[]} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <CollectionHomeSummaryCard
            detail={`${totalDonated.toLocaleString('ko-KR')} / ${totalItems.toLocaleString('ko-KR')} 기증`}
            eyebrow="MUSEUM LOG"
            progress={donatedPercent}
            title="박물관 기증률"
            value={`${donatedPercent}%`}
          />

          <CollectionHomeSectionHeading countLabel={`${encyclopediaCategories.length}개 분류`} title="도감" />

          <CollectionHomeCategoryGrid>
            {visibleCategories.map((category) => {
              const progress = progressFor(category.category);
              return (
                <CollectionHomeCategoryCard
                  accessibilityLabel={`${category.label} 도감 열기`}
                  key={category.category}
                  icon={CATEGORY_ICONS[category.category]}
                  label={category.label}
                  metrics={progress.metrics.map((metric) => ({
                    count: metric.count,
                    label: metric.label,
                    total: progress.total,
                  }))}
                  onPress={() =>
                    router.push({
                      // Expo Router's generated route types are refreshed when the dev server starts.
                      pathname: '/encyclopedia/[category]' as never,
                      params: { category: category.category, search },
                    })
                  }
                  tone={CATEGORY_TONES[category.category]}
                />
              );
            })}
            {visibleCategories.length === 0 ? <Text style={styles.emptySearch}>검색 결과가 없어요.</Text> : null}
          </CollectionHomeCategoryGrid>
        </ScrollView>
      </SafeAreaView>
    </CollectionHomeShell>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: AppColors.background, flex: 1 },
  content: { padding: 14, paddingBottom: 28 },
  emptySearch: { color: AppColors.inkMuted, padding: 18, textAlign: 'center', width: '100%' },
});
