import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Island, Routine } from '../types/island';

type TodayScreenProps = {
  island: Island | null;
  routines: Routine[];
};

function formatToday() {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date());
}

export function TodayScreen({ island, routines }: TodayScreenProps) {
  if (!island) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>아직 섬이 없어요</Text>
        <Text style={styles.emptyDescription}>온보딩에서 첫 섬을 만들어 주세요.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>TODAY ON</Text>
          <Text style={styles.title}>오늘</Text>
          <Text style={styles.date}>{formatToday()}</Text>
        </View>
        <View style={styles.leafBadge}>
          <Text style={styles.leafBadgeText}>✦</Text>
        </View>
      </View>

      <View style={styles.islandCard}>
        <View style={styles.islandCardTopRow}>
          <View>
            <Text style={styles.cardEyebrow}>ACTIVE ISLAND</Text>
            <Text style={styles.islandName}>{island.name}</Text>
          </View>
          <View style={styles.islandMark}>
            <Text style={styles.islandMarkText}>島</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.profileRow}>
          <View>
            <Text style={styles.detailLabel}>주민대표</Text>
            <Text style={styles.detailValue}>{island.playerName ?? '미입력'}</Text>
          </View>
          <View>
            <Text style={styles.detailLabel}>반구</Text>
            <Text style={styles.detailValue}>
              {island.hemisphere === 'north'
                ? '북반구'
                : island.hemisphere === 'south'
                  ? '남반구'
                  : '미입력'}
            </Text>
          </View>
          <View>
            <Text style={styles.detailLabel}>시간대</Text>
            <Text style={styles.detailValue}>{island.timezone ?? '미입력'}</Text>
          </View>
        </View>
        <View style={styles.natureRow}>
          <View style={styles.naturePill}>
            <Text style={styles.naturePillText}>{island.fruit ?? '미입력'} · 대표 과일</Text>
          </View>
          <View style={styles.naturePill}>
            <Text style={styles.naturePillText}>{island.flower ?? '미입력'} · 자생 꽃</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>오늘의 루틴</Text>
          <Text style={styles.sectionDescription}>작은 기록을 하나씩 남겨 보세요.</Text>
        </View>
        <Text style={styles.countLabel}>{routines.length}개</Text>
      </View>

      <View style={styles.routineCard}>
        {routines.length > 0 ? (
          routines.map((routine, index) => (
            <View key={routine.id} style={[styles.routineRow, index > 0 && styles.routineRowBorder]}>
              <View style={styles.routineIcon}>
                <Text style={styles.routineIconText}>{index === 0 ? '＋' : '⌂'}</Text>
              </View>
              <View style={styles.routineCopy}>
                <Text style={styles.routineTitle}>{routine.title}</Text>
                <Text style={styles.routineGoal}>목표 {routine.goalCount}회 · 매일</Text>
              </View>
              <View style={styles.routineCheck}>
                <Text style={styles.routineCheckText}>○</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noRoutineText}>등록된 루틴이 없습니다.</Text>
        )}
      </View>

      <View style={styles.nextStepCard}>
        <Text style={styles.nextStepLabel}>NEXT STEP</Text>
        <Text style={styles.nextStepTitle}>오늘의 기록을 차곡차곡</Text>
        <Text style={styles.nextStepDescription}>루틴 체크와 날짜별 저장은 다음 단계에서 연결됩니다.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F7F8F2',
    flex: 1,
  },
  content: {
    paddingBottom: 42,
    paddingHorizontal: 20,
    paddingTop: 26,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  kicker: {
    color: '#829080',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  title: {
    color: '#29352C',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: 4,
  },
  date: {
    color: '#788077',
    fontSize: 14,
    marginTop: 4,
  },
  leafBadge: {
    alignItems: 'center',
    backgroundColor: '#E4F0DE',
    borderRadius: 20,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  leafBadgeText: {
    color: '#5D9361',
    fontSize: 23,
  },
  islandCard: {
    backgroundColor: '#314D39',
    borderRadius: 24,
    padding: 20,
  },
  islandCardTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardEyebrow: {
    color: '#B8D2AF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  islandName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 5,
  },
  islandMark: {
    alignItems: 'center',
    backgroundColor: '#45664D',
    borderRadius: 18,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  islandMarkText: {
    color: '#D7E9C8',
    fontSize: 20,
  },
  divider: {
    backgroundColor: '#59735E',
    height: 1,
    marginBottom: 15,
    marginTop: 18,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: '#ABC5A8',
    fontSize: 11,
    marginBottom: 4,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  natureRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  naturePill: {
    backgroundColor: '#45664D',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  naturePillText: {
    color: '#D7E9C8',
    fontSize: 10,
    fontWeight: '700',
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 11,
    marginTop: 30,
  },
  sectionTitle: {
    color: '#334036',
    fontSize: 19,
    fontWeight: '800',
  },
  sectionDescription: {
    color: '#8B938A',
    fontSize: 12,
    marginTop: 3,
  },
  countLabel: {
    color: '#709177',
    fontSize: 12,
    fontWeight: '800',
  },
  routineCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E9E0',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  routineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 78,
  },
  routineRowBorder: {
    borderTopColor: '#EFF0EB',
    borderTopWidth: 1,
  },
  routineIcon: {
    alignItems: 'center',
    backgroundColor: '#EEF6EA',
    borderRadius: 14,
    height: 38,
    justifyContent: 'center',
    marginRight: 12,
    width: 38,
  },
  routineIconText: {
    color: '#5D9361',
    fontSize: 20,
    fontWeight: '600',
  },
  routineCopy: {
    flex: 1,
  },
  routineTitle: {
    color: '#3C493F',
    fontSize: 15,
    fontWeight: '800',
  },
  routineGoal: {
    color: '#9AA29A',
    fontSize: 11,
    marginTop: 4,
  },
  routineCheck: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  routineCheckText: {
    color: '#B9C4B7',
    fontSize: 27,
    lineHeight: 28,
  },
  noRoutineText: {
    color: '#8B938A',
    paddingVertical: 22,
    textAlign: 'center',
  },
  nextStepCard: {
    backgroundColor: '#F0E9D9',
    borderRadius: 20,
    marginTop: 16,
    padding: 18,
  },
  nextStepLabel: {
    color: '#B17D4F',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  nextStepTitle: {
    color: '#76583F',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },
  nextStepDescription: {
    color: '#9B795B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: '#F7F8F2',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: '#29352C',
    fontSize: 22,
    fontWeight: '800',
  },
  emptyDescription: {
    color: '#788077',
    fontSize: 14,
    marginTop: 8,
  },
});
