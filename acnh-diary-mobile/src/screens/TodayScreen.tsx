import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../components/ScreenHeader';

type TodayScreenProps = {
  islandName?: string;
};

export function TodayScreen({ islandName = '내 섬' }: TodayScreenProps) {
  const todayDate = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ScreenHeader title="오늘" subtitle={todayDate} />

      <View style={styles.card}>
        <Text style={styles.cardLabel}>활성 섬</Text>
        <Text style={styles.cardValue}>{islandName}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>이번 달 미완료</Text>
        <Text style={styles.cardValue}>12개</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>오늘 루틴</Text>
        <Text style={styles.cardValue}>토마토 심기, 집 정리</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardLabel: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 8,
  },
  cardValue: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '600',
  },
});
