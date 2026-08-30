import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppChrome } from '@/components/AppChrome';
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

export function EncyclopediaHomeScreen() {
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

  return (
    <View style={styles.screenRoot}>
      <AppChrome title="도감" />
      <SafeAreaView edges={[]} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>COLLECTION LOG</Text>
            <Text style={styles.summaryTitle}>나의 박물관 기록</Text>
          </View>
          <Text style={styles.summaryValue}>
            {totalDonated}
            <Text style={styles.summaryTotal}>
              {' '}/ {totalItems} 기증
            </Text>
          </Text>
        </View>

        <Text style={styles.sectionTitle}>분류별 도감</Text>

        <View style={styles.categoryGrid}>
          {encyclopediaCategories.map((category) => {
            const progress = progressFor(category.category);
            return (
              <Pressable
                accessibilityLabel={`${category.label} 도감 열기`}
                accessibilityRole="button"
                key={category.category}
                onPress={() =>
                  router.push({
                    // Expo Router's generated route types are refreshed when the dev server starts.
                    pathname: '/encyclopedia/[category]' as never,
                    params: { category: category.category },
                  })
                }
                style={({ pressed }) => [
                  styles.categoryCard,
                  pressed && styles.categoryCardPressed,
                ]}>
                <View style={styles.categoryIcon}>
                  <Text style={styles.categoryIconText}>
                    {category.category === 'bugs'
                      ? '✦'
                      : category.category === 'fish'
                        ? '≈'
                        : category.category === 'sea'
                          ? '◒'
                          : category.category === 'fossils'
                            ? '◇'
                            : '▱'}
                  </Text>
                </View>
                <View style={styles.categoryCopy}>
                  <Text style={styles.categoryLabel}>{category.label}</Text>
                  <View style={styles.progressLines}>
                    {progress.metrics.map((metric) => (
                      <Text key={metric.label} style={styles.progressText}>
                        {metric.label} {metric.count} / {progress.total}
                      </Text>
                    ))}
                  </View>
                </View>
                <Text style={styles.arrow}>›</Text>
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
  content: { padding: 16, paddingBottom: 20 },
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
    marginBottom: 16,
    padding: 14,
  },
  summaryLabel: { color: '#6F8A6B', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  summaryTitle: { color: '#2E4834', fontSize: 17, fontWeight: '800', marginTop: 4 },
  summaryValue: { color: '#2F6D48', fontSize: 28, fontWeight: '800' },
  summaryTotal: { color: '#6C896E', fontSize: 14, fontWeight: '600' },
  sectionTitle: { color: '#29382C', fontSize: 22, fontWeight: '800' },
  sectionSubtitle: { color: '#7A857B', fontSize: 13, marginTop: 5 },
  categoryGrid: { flexDirection: 'column', gap: 8, marginTop: 12 },
  categoryCard: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderColor: '#E4E9E0',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 82,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
  },
  categoryCardPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  categoryIcon: {
    alignItems: 'center',
    backgroundColor: '#EEF5E9',
    borderRadius: 17,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  categoryIconText: { color: '#4F885A', fontSize: 21, fontWeight: '700' },
  categoryCopy: { flex: 1, marginLeft: 12 },
  categoryLabel: { color: '#2F4033', fontSize: 16, fontWeight: '800' },
  progressLines: { marginTop: 3 },
  progressText: { color: '#5D7B60', fontSize: 10, fontWeight: '700', lineHeight: 15 },
  arrow: { color: '#5D9361', fontSize: 22, lineHeight: 22, marginLeft: 8 },
});
