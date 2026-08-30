import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppChrome } from '@/components/AppChrome';
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
    <View style={styles.screenRoot}>
      <AppChrome title="카탈로그" />
      <SafeAreaView edges={[]} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryLabel}>CATALOG LOG</Text>
            <Text style={styles.summaryTitle}>전체 카탈로그 수집률</Text>
            <View style={styles.summaryStats}>
              <Text style={styles.summaryValue}>{summaryPercent}%</Text>
              <Text style={styles.summaryTotal}>{ownedCount.toLocaleString('ko-KR')} / {totalCount.toLocaleString('ko-KR')}</Text>
            </View>
            <View style={styles.summaryTrack}>
              <View style={[styles.summaryFill, { width: `${summaryPercent}%` }]} />
            </View>
          </View>
          <Text style={styles.summaryArrow}>›</Text>
        </View>

        <View style={styles.categoryGrid}>
          {catalogHomeCategories.map((category) => {
            const progress = progressFor(category.key);
            const tone = CATEGORY_TONES[category.key];
            const percent = progress.total ? Math.round((progress.owned / progress.total) * 100) : 0;
            return (
              <Pressable
                accessibilityLabel={`${category.label} 카탈로그 열기`}
                accessibilityRole="button"
                key={category.key}
                onPress={() =>
                  router.push({
                    pathname: '/catalog/[category]' as never,
                    params: { category: category.key },
                  })
                }
                style={({ pressed }) => [
                  styles.categoryCard,
                  { backgroundColor: tone.card },
                  pressed && styles.categoryCardPressed,
                ]}>
                <View style={[styles.categoryIcon, { backgroundColor: tone.icon }]}>
                  <Text style={styles.categoryIconText}>{CATEGORY_ICONS[category.key]}</Text>
                </View>
                <View style={styles.categoryCardCopy}>
                  <Text numberOfLines={1} style={styles.categoryLabel}>{category.label}</Text>
                  <Text style={styles.progressText}>
                    {progress.owned.toLocaleString('ko-KR')} / {progress.total.toLocaleString('ko-KR')} · {percent}%
                  </Text>
                  <View style={[styles.progressTrack, { backgroundColor: tone.track }]}>
                    <View style={[styles.progressFill, { backgroundColor: tone.accent, width: `${percent}%` }]} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#F6F8F2' },
  content: { paddingBottom: 8, paddingHorizontal: 12, paddingTop: 8 },
  hero: {
    alignItems: 'center',
    backgroundColor: '#2F503B',
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    minHeight: 164,
    overflow: 'hidden',
    padding: 22,
  },
  heroCopy: { flex: 1, paddingRight: 12 },
  kicker: { color: '#B9D4A9', fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: '#FFF', fontSize: 38, fontWeight: '800', marginTop: 6 },
  subtitle: { color: '#D7E6D0', fontSize: 14, lineHeight: 21, marginTop: 8 },
  heroBadge: {
    alignItems: 'center',
    backgroundColor: '#46684D',
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  heroBadgeText: { color: '#E1F0D6', fontSize: 34, fontWeight: '700' },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: '#E6F0DF',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    minHeight: 82,
    padding: 12,
  },
  summaryLabel: { color: '#6F8A6B', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryTitle: { color: '#2E4834', fontSize: 13, fontWeight: '800', marginTop: 2 },
  summaryStats: { alignItems: 'baseline', flexDirection: 'row', gap: 6, marginTop: 1 },
  summaryValue: { color: '#2F6D48', fontSize: 24, fontWeight: '800' },
  summaryTotal: { color: '#6C896E', fontSize: 10, fontWeight: '700' },
  summaryTrack: { backgroundColor: '#CFE3D2', borderRadius: 4, height: 6, marginTop: 4, overflow: 'hidden', width: '100%' },
  summaryFill: { backgroundColor: '#5B9F7B', borderRadius: 5, height: '100%' },
  summaryArrow: { color: '#4A8B6C', fontSize: 26, lineHeight: 28, marginLeft: 8 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between' },
  categoryCard: {
    borderColor: '#E4E9E0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 78,
    padding: 8,
    width: '48.5%',
  },
  categoryCardPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  categoryIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  categoryIconText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  categoryCardCopy: { flex: 1, justifyContent: 'center', marginLeft: 7, minWidth: 0 },
  categoryLabel: { color: '#2F4033', fontSize: 13, fontWeight: '800' },
  progressText: { color: '#6C7B72', fontSize: 8, fontWeight: '700', marginTop: 2 },
  progressTrack: { borderRadius: 3, height: 4, marginTop: 4, overflow: 'hidden', width: '100%' },
  progressFill: { borderRadius: 4, height: '100%' },
});
