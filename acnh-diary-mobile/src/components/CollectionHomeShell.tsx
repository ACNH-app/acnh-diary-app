import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { AppColors } from '@/constants/theme';

export type CollectionHomeTone = {
  accent: string;
  card: string;
  icon: string;
  track: string;
};

export type CollectionHomeMetric = {
  count: number;
  label: string;
  total: number;
};

export function CollectionHomeShell({ children }: { children: ReactNode }) {
  return <View style={styles.background}>{children}</View>;
}

export function CollectionHomeSummaryCard({
  detail,
  eyebrow,
  progress,
  title,
  value,
}: {
  detail: string;
  eyebrow: string;
  progress: number;
  title: string;
  value: string;
}) {
  const safeProgress = Math.max(0, Math.min(100, progress));

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryCopy}>
        <Text style={styles.summaryEyebrow}>{eyebrow}</Text>
        <Text style={styles.summaryTitle}>{title}</Text>
        <View style={styles.summaryStats}>
          <Text style={styles.summaryValue}>{value}</Text>
          <Text style={styles.summaryDetail}>{detail}</Text>
        </View>
        <View style={styles.summaryTrack}>
          <View style={[styles.summaryFill, { width: `${safeProgress}%` }]} />
        </View>
      </View>
      <Text style={styles.summaryArrow}>›</Text>
    </View>
  );
}

export function CollectionHomeSectionHeading({ countLabel, title }: { countLabel: string; title: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{countLabel}</Text>
    </View>
  );
}

export function CollectionHomeCategoryGrid({ children }: { children: ReactNode }) {
  return <View style={styles.categoryGrid}>{children}</View>;
}

export function CollectionHomeCategoryCard({
  accessibilityLabel,
  icon,
  label,
  metrics,
  onPress,
  tone,
}: {
  accessibilityLabel: string;
  icon: string;
  label: string;
  metrics: CollectionHomeMetric[];
  onPress: () => void;
  tone: CollectionHomeTone;
}) {
  const primaryMetric = metrics[0];
  const progress = primaryMetric?.total ? (primaryMetric.count / primaryMetric.total) * 100 : 0;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryCard,
        { backgroundColor: tone.card, borderColor: tone.track },
        pressed && styles.categoryCardPressed,
      ]}>
      <View style={[styles.categoryIcon, { backgroundColor: tone.icon }]}>
        <Text style={styles.categoryIconText}>{icon}</Text>
      </View>
      <View style={styles.categoryCopy}>
        <Text numberOfLines={1} style={styles.categoryLabel}>
          {label}
        </Text>
        <View style={styles.metricLines}>
          {metrics.map((metric) => (
            <Text key={metric.label} style={styles.metricText}>
              {metric.label} {metric.count.toLocaleString('ko-KR')} / {metric.total.toLocaleString('ko-KR')}
            </Text>
          ))}
        </View>
        <View style={[styles.progressTrack, { backgroundColor: tone.track }]}>
          <View style={[styles.progressFill, { backgroundColor: tone.accent, width: `${Math.min(100, progress)}%` }]} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: AppColors.background,
    flex: 1,
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: '#DCEBDD',
    borderRadius: 23,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  summaryEyebrow: {
    color: '#64816B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  summaryTitle: {
    color: '#314F3A',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 3,
  },
  summaryStats: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 7,
    marginTop: 2,
  },
  summaryValue: {
    color: '#2F7653',
    fontSize: 28,
    fontWeight: '800',
  },
  summaryDetail: {
    color: '#66836D',
    fontSize: 11,
    fontWeight: '700',
  },
  summaryTrack: {
    backgroundColor: '#C8E0CD',
    borderRadius: 5,
    height: 7,
    marginTop: 5,
    overflow: 'hidden',
    width: '100%',
  },
  summaryFill: {
    backgroundColor: '#61AA82',
    borderRadius: 5,
    height: '100%',
  },
  summaryArrow: {
    color: '#5A9A78',
    fontSize: 30,
    lineHeight: 32,
    marginLeft: 10,
  },
  sectionHeading: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#34443A',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionCount: {
    color: '#7B887E',
    fontSize: 11,
    fontWeight: '800',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  categoryCard: {
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 94,
    padding: 10,
    width: '48.4%',
  },
  categoryCardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  categoryIcon: {
    alignItems: 'center',
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  categoryIconText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  categoryCopy: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 8,
    minWidth: 0,
  },
  categoryLabel: {
    color: '#35473B',
    fontSize: 13,
    fontWeight: '800',
  },
  metricLines: {
    marginTop: 2,
  },
  metricText: {
    color: '#6D7C72',
    fontSize: 8,
    fontWeight: '700',
    lineHeight: 13,
  },
  progressTrack: {
    borderRadius: 3,
    height: 4,
    marginTop: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    borderRadius: 3,
    height: '100%',
  },
});
