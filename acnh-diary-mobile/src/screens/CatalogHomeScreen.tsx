import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { catalogCategories, catalogCategoryDescriptions, getCatalogItems } from '@/data/catalog';
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
  reactions: '✋',
};

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

  const totalCount = catalogCategories.reduce((sum, category) => sum + category.itemCount, 0);
  const ownedCount = useMemo(
    () =>
      catalogCategories.reduce(
        (sum, category) =>
          sum + getCatalogItems(category.key).filter((item) => states[`${category.key}/${item.id}`]?.owned).length,
        0,
      ),
    [states],
  );

  const progressFor = (category: CatalogCategory) => {
    const items = getCatalogItems(category);
    const owned = items.filter((item) => states[`${category}/${item.id}`]?.owned).length;
    return { owned, total: items.length };
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>ISLAND CATALOG</Text>
            <Text style={styles.title}>카탈로그</Text>
            <Text style={styles.subtitle}>섬에서 만난 아이템을 분류별로 찾아보고 보유 기록을 남겨 보세요.</Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>品</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>CATALOG LOG</Text>
            <Text style={styles.summaryTitle}>나의 카탈로그 기록</Text>
          </View>
          <Text style={styles.summaryValue}>
            {ownedCount.toLocaleString('ko-KR')}
            <Text style={styles.summaryTotal}> / {totalCount.toLocaleString('ko-KR')}</Text>
          </Text>
        </View>

        <Text style={styles.sectionTitle}>분류별 카탈로그</Text>
        <Text style={styles.sectionSubtitle}>대분류를 선택하면 해당 아이템 목록과 상세 정보를 확인할 수 있어요.</Text>

        <View style={styles.categoryGrid}>
          {catalogCategories.map((category, index) => {
            const progress = progressFor(category.key);
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
                  index === catalogCategories.length - 1 && styles.categoryCardWide,
                  pressed && styles.categoryCardPressed,
                ]}>
                <View style={styles.categoryIcon}>
                  <Text style={styles.categoryIconText}>{CATEGORY_ICONS[category.key]}</Text>
                </View>
                <Text style={styles.categoryLabel}>{category.label}</Text>
                <Text style={styles.categoryDescription}>{catalogCategoryDescriptions[category.key]}</Text>
                <View style={styles.progressRow}>
                  <Text style={styles.progressText}>
                    {progress.owned.toLocaleString('ko-KR')} / {progress.total.toLocaleString('ko-KR')} 보유
                  </Text>
                  <Text style={styles.arrow}>›</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F8F2' },
  content: { padding: 20, paddingBottom: 42 },
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
    marginBottom: 28,
    padding: 18,
  },
  summaryLabel: { color: '#6F8A6B', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  summaryTitle: { color: '#2E4834', fontSize: 17, fontWeight: '800', marginTop: 4 },
  summaryValue: { color: '#2F6D48', fontSize: 28, fontWeight: '800' },
  summaryTotal: { color: '#6C896E', fontSize: 14, fontWeight: '600' },
  sectionTitle: { color: '#29382C', fontSize: 22, fontWeight: '800' },
  sectionSubtitle: { color: '#7A857B', fontSize: 13, lineHeight: 19, marginTop: 5 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  categoryCard: {
    backgroundColor: '#FFF',
    borderColor: '#E4E9E0',
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 174,
    padding: 16,
    width: '48%',
  },
  categoryCardWide: { width: '100%' },
  categoryCardPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  categoryIcon: {
    alignItems: 'center',
    backgroundColor: '#EEF5E9',
    borderRadius: 18,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  categoryIconText: { color: '#4F885A', fontSize: 23, fontWeight: '700' },
  categoryLabel: { color: '#2F4033', fontSize: 19, fontWeight: '800', marginTop: 14 },
  categoryDescription: { color: '#7C877E', fontSize: 12, lineHeight: 17, marginTop: 4 },
  progressRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  progressText: { color: '#5D7B60', fontSize: 11, fontWeight: '700' },
  arrow: { color: '#5D9361', fontSize: 22, lineHeight: 18 },
});
