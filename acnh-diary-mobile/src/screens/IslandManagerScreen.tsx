import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createIsland,
  deleteIsland,
  getIslands,
  getPlayerProfileForIsland,
  initializeDatabase,
  setActiveIsland,
  updateIsland,
} from '@/db/database';
import type { Hemisphere, Island, IslandInput } from '@/types/island';

type FormState = {
  name: string;
  playerName: string;
  birthdayMonth: string;
  birthdayDay: string;
  fruit: string;
  flower: string;
  hemisphere: Hemisphere;
  timezone: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  playerName: '',
  birthdayMonth: '',
  birthdayDay: '',
  fruit: '사과',
  flower: '장미',
  hemisphere: 'north',
  timezone: 'Asia/Seoul',
};

function formFromIsland(island: Island): FormState {
  const profile = getPlayerProfileForIsland(island.id);
  return {
    name: island.name,
    playerName: profile?.name ?? island.playerName ?? '',
    birthdayMonth: profile?.birthdayMonth?.toString() ?? '',
    birthdayDay: profile?.birthdayDay?.toString() ?? '',
    fruit: island.fruit ?? '',
    flower: island.flower ?? '',
    hemisphere: island.hemisphere ?? 'north',
    timezone: island.timezone ?? 'Asia/Seoul',
  };
}

function toInput(form: FormState): IslandInput {
  if (!form.birthdayMonth.trim() || !form.birthdayDay.trim()) {
    throw new Error('BIRTHDAY_REQUIRED');
  }

  return {
    name: form.name,
    playerName: form.playerName,
    birthdayMonth: form.birthdayMonth ? Number(form.birthdayMonth) : undefined,
    birthdayDay: form.birthdayDay ? Number(form.birthdayDay) : undefined,
    fruit: form.fruit,
    flower: form.flower,
    hemisphere: form.hemisphere,
    timezone: form.timezone,
  };
}

export function IslandManagerScreen() {
  const router = useRouter();
  const [islands, setIslands] = useState<Island[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    initializeDatabase();
    setIslands(getIslands());
  }, []);

  useFocusEffect(refresh);

  const beginAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const beginEdit = (island: Island) => {
    setEditingId(island.id);
    setForm(formFromIsland(island));
    setError(null);
  };

  const save = () => {
    try {
      const input = toInput(form);
      if (editingId) updateIsland(editingId, input);
      else createIsland(input);
      refresh();
      setEditingId(null);
      setForm(EMPTY_FORM);
      setError(null);
    } catch {
      setError('섬 이름·주민대표·생일·시간대를 올바르게 입력해 주세요.');
    }
  };

  const switchIsland = (island: Island) => {
    try {
      setActiveIsland(island.id);
      router.replace('/today');
    } catch {
      Alert.alert('섬을 변경하지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  };

  const remove = (island: Island) => {
    Alert.alert('섬 삭제', `${island.name}을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          try {
            deleteIsland(island.id);
            refresh();
            if (editingId === island.id) beginAdd();
          } catch (cause) {
            Alert.alert(
              cause instanceof Error && cause.message === 'LAST_ISLAND' ? '마지막 섬은 삭제할 수 없어요' : '삭제하지 못했어요',
              '섬 기록을 확인한 뒤 다시 시도해 주세요.',
            );
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Pressable accessibilityLabel="오늘로 돌아가기" onPress={() => router.replace('/today')} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>ISLAND MANAGEMENT</Text>
            <Text style={styles.title}>섬 관리</Text>
          </View>
          <Pressable accessibilityLabel="새 섬 추가" onPress={beginAdd} style={styles.addButton}>
            <Text style={styles.addButtonText}>＋ 추가</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>등록된 섬</Text>
        <View style={styles.islandList}>
          {islands.map((island) => (
            <View key={island.id} style={[styles.islandRow, island.isActive && styles.islandRowActive]}>
              <Pressable accessibilityLabel={`${island.name} 섬으로 변경`} onPress={() => switchIsland(island)} style={styles.islandMain}>
                <View style={styles.islandMark}><Text style={styles.islandMarkText}>島</Text></View>
                <View style={styles.islandCopy}>
                  <Text style={styles.islandName}>{island.name}</Text>
                  <Text style={styles.islandMeta}>{island.playerName ?? '주민대표 미입력'} · {island.isActive ? '현재 섬' : '섬 변경'}</Text>
                </View>
              </Pressable>
              <Pressable accessibilityLabel={`${island.name} 수정`} onPress={() => beginEdit(island)} style={styles.rowAction}>
                <Text style={styles.rowActionText}>수정</Text>
              </Pressable>
              <Pressable accessibilityLabel={`${island.name} 삭제`} onPress={() => remove(island)} style={styles.rowAction}>
                <Text style={styles.deleteText}>삭제</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.formHeader}>
          <View>
            <Text style={styles.sectionTitle}>{editingId ? '섬 정보 수정' : '새 섬 등록'}</Text>
            <Text style={styles.sectionHint}>저장 후 선택한 섬이 활성 섬이 됩니다.</Text>
          </View>
          {editingId ? <Pressable onPress={beginAdd}><Text style={styles.cancelText}>새로 입력</Text></Pressable> : null}
        </View>
        <View style={styles.formCard}>
          <Field label="섬 이름" value={form.name} onChangeText={(value) => setForm((current) => ({ ...current, name: value }))} />
          <Field label="주민대표" value={form.playerName} onChangeText={(value) => setForm((current) => ({ ...current, playerName: value }))} />
          <View style={styles.inlineRow}>
            <Field label="생일 월" keyboardType="number-pad" value={form.birthdayMonth} onChangeText={(value) => setForm((current) => ({ ...current, birthdayMonth: value }))} />
            <Field label="생일 일" keyboardType="number-pad" value={form.birthdayDay} onChangeText={(value) => setForm((current) => ({ ...current, birthdayDay: value }))} />
          </View>
          <View style={styles.inlineRow}>
            <Field label="대표 과일" value={form.fruit} onChangeText={(value) => setForm((current) => ({ ...current, fruit: value }))} />
            <Field label="자생 꽃" value={form.flower} onChangeText={(value) => setForm((current) => ({ ...current, flower: value }))} />
          </View>
          <Text style={styles.fieldLabel}>반구</Text>
          <View style={styles.choiceRow}>
            {([['north', '북반구'], ['south', '남반구']] as Array<[Hemisphere, string]>).map(([value, label]) => (
              <Pressable key={value} onPress={() => setForm((current) => ({ ...current, hemisphere: value }))} style={[styles.choice, form.hemisphere === value && styles.choiceActive]}>
                <Text style={[styles.choiceText, form.hemisphere === value && styles.choiceTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Field label="시간대" value={form.timezone} onChangeText={(value) => setForm((current) => ({ ...current, timezone: value }))} />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" onPress={save} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>{editingId ? '변경사항 저장' : '섬 추가하기'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: 'default' | 'number-pad' }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput accessibilityLabel={label} keyboardType={keyboardType} onChangeText={onChangeText} placeholder={label} placeholderTextColor="#A7AEA4" style={styles.input} value={value} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#F6F8F2', flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  headerRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 28 },
  backButton: { alignItems: 'center', backgroundColor: '#E5EEE0', borderRadius: 20, height: 40, justifyContent: 'center', marginRight: 12, width: 40 },
  backText: { color: '#456B4D', fontSize: 30, lineHeight: 32, marginTop: -3 },
  headerCopy: { flex: 1 },
  kicker: { color: '#799078', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#29382C', fontSize: 30, fontWeight: '800', marginTop: 4 },
  addButton: { backgroundColor: '#31573D', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  addButtonText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  sectionTitle: { color: '#334036', fontSize: 18, fontWeight: '800' },
  sectionHint: { color: '#8B958D', fontSize: 11, marginTop: 4 },
  islandList: { backgroundColor: '#FFF', borderColor: '#E2E8DF', borderRadius: 18, borderWidth: 1, marginTop: 10, overflow: 'hidden' },
  islandRow: { alignItems: 'center', borderBottomColor: '#EDF1EB', borderBottomWidth: 1, flexDirection: 'row', padding: 12 },
  islandRowActive: { backgroundColor: '#F0F7ED' },
  islandMain: { alignItems: 'center', flex: 1, flexDirection: 'row', minWidth: 0 },
  islandMark: { alignItems: 'center', backgroundColor: '#DDECDD', borderRadius: 16, height: 38, justifyContent: 'center', width: 38 },
  islandMarkText: { color: '#3F724B', fontSize: 17 },
  islandCopy: { flex: 1, marginLeft: 10 },
  islandName: { color: '#354A39', fontSize: 14, fontWeight: '800' },
  islandMeta: { color: '#89968B', fontSize: 10, marginTop: 3 },
  rowAction: { paddingHorizontal: 5, paddingVertical: 8 },
  rowActionText: { color: '#4A7C51', fontSize: 11, fontWeight: '800' },
  deleteText: { color: '#B96C62', fontSize: 11, fontWeight: '800' },
  formHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, marginTop: 28 },
  cancelText: { color: '#4A7C51', fontSize: 11, fontWeight: '800' },
  formCard: { backgroundColor: '#FFF', borderColor: '#E2E8DF', borderRadius: 18, borderWidth: 1, padding: 16 },
  field: { flex: 1, marginBottom: 14 },
  fieldLabel: { color: '#68766B', fontSize: 11, fontWeight: '800', marginBottom: 5 },
  input: { borderBottomColor: '#DCE4D9', borderBottomWidth: 1, color: '#334036', fontSize: 14, paddingBottom: 8, paddingTop: 0 },
  inlineRow: { flexDirection: 'row', gap: 12 },
  choiceRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  choice: { backgroundColor: '#EDF2EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  choiceActive: { backgroundColor: '#31573D' },
  choiceText: { color: '#718074', fontSize: 12, fontWeight: '700' },
  choiceTextActive: { color: '#FFF' },
  error: { color: '#B75F55', fontSize: 11, lineHeight: 17, marginBottom: 10 },
  saveButton: { alignItems: 'center', backgroundColor: '#31573D', borderRadius: 14, paddingVertical: 13 },
  saveButtonText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
});
