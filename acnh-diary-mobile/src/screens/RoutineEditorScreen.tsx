import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppTopBar } from '@/components/AppTopBar';
import { AppColors, AppRadii, AppShadows, Fonts } from '@/constants/theme';
import { DEFAULT_ROUTINE_OPTIONS } from '@/data/routines';
import { getRoutineIconSource } from '@/data/routine-assets';
import {
  addRoutine,
  deleteRoutine,
  getActiveIsland,
  getRoutinesForIsland,
  initializeDatabase,
  updateRoutine,
} from '@/db/database';
import type { Routine } from '@/types/island';

type DraftRoutine = Routine;

const DEFAULT_ICON_KEY = DEFAULT_ROUTINE_OPTIONS.find((option) => option.title === '화석 캐기')?.iconKey
  ?? DEFAULT_ROUTINE_OPTIONS[0]?.iconKey
  ?? '화석 캐기';
const ICON_SURFACES = ['#FFF0C9', '#E5F4EC', '#EEE6FF', '#E6F3F0', '#FFF1D9', '#E7F5EE'];

function clampGoal(value: number) {
  return Math.max(1, Math.min(99, Math.round(value) || 1));
}

function RoutineAssetIcon({ iconKey, title, surfaceIndex }: { iconKey: string | null; title: string; surfaceIndex: number }) {
  const source = getRoutineIconSource(iconKey, title);
  return (
    <View style={[styles.iconFrame, { backgroundColor: ICON_SURFACES[surfaceIndex % ICON_SURFACES.length] }]}>
      {source ? (
        <Image accessibilityLabel={`${title} 아이콘`} resizeMode="contain" source={source} style={styles.routineIcon} />
      ) : (
        <MaterialCommunityIcons color={AppColors.inkMuted} name="checkbox-marked-circle-outline" size={25} />
      )}
    </View>
  );
}

function RoutineSwitch({
  enabled,
  onChange,
  onPressIn,
  onPressOut,
  title,
}: {
  enabled: boolean;
  onChange: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
  title: string;
}) {
  return (
    <Pressable
      accessibilityLabel={`${title} ${enabled ? '활성화' : '비활성화'}`}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      hitSlop={8}
      onPress={onChange}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.switchTrack, enabled && styles.switchTrackOn]}>
      <View style={[styles.switchThumb, enabled && styles.switchThumbOn]} />
    </Pressable>
  );
}

function SwipeRoutineCard({
  index,
  routine,
  titleEditing,
  onAdjustGoal,
  onBeginTitleEdit,
  onChangeTitle,
  onDelete,
  onIconPress,
  onToggleEnabled,
  onTitleEditingEnd,
}: {
  index: number;
  routine: DraftRoutine;
  titleEditing: boolean;
  onAdjustGoal: (delta: number) => void;
  onBeginTitleEdit: () => void;
  onChangeTitle: (value: string) => void;
  onDelete: () => void;
  onIconPress: () => void;
  onToggleEnabled: () => void;
  onTitleEditingEnd: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isCardControlActive = useRef(false);

  const closeSwipe = () => {
    Animated.timing(translateX, { duration: 140, toValue: 0, useNativeDriver: true }).start();
  };

  const beginCardControl = () => {
    isCardControlActive.current = true;
    closeSwipe();
  };

  const endCardControl = () => {
    isCardControlActive.current = false;
  };

  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => (
        !isCardControlActive.current
        && Math.abs(gesture.dx) > 8
        && Math.abs(gesture.dx) > Math.abs(gesture.dy)
      ),
      onPanResponderMove: (_, gesture) => {
        translateX.setValue(Math.min(0, Math.max(-88, gesture.dx)));
      },
      onPanResponderRelease: (_, gesture) => {
        Animated.timing(translateX, {
          duration: 180,
          toValue: gesture.dx < -40 ? -76 : 0,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.timing(translateX, { duration: 160, toValue: 0, useNativeDriver: true }).start();
      },
    }),
    [translateX],
  );

  return (
    <View style={styles.swipeCardWrap}>
      <View style={styles.deleteReveal}>
        <Pressable accessibilityLabel={`${routine.title} 삭제`} accessibilityRole="button" onPress={onDelete} style={styles.deleteRevealButton}>
          <MaterialCommunityIcons color={AppColors.card} name="trash-can-outline" size={21} />
          <Text style={styles.deleteRevealText}>삭제</Text>
        </Pressable>
      </View>
      <Animated.View {...panResponder.panHandlers} style={[styles.routineCard, !routine.isEnabled && styles.routineCardDisabled, { transform: [{ translateX }] }]}>
        <View style={styles.dragHandle}>
          <MaterialCommunityIcons color="#A7B7B0" name="drag-horizontal-variant" size={25} />
        </View>
        <Pressable
          accessibilityLabel={`${routine.title} 아이콘 변경`}
          accessibilityRole="button"
          onPress={onIconPress}
          onPressIn={beginCardControl}
          onPressOut={endCardControl}
          style={styles.iconButton}>
          <RoutineAssetIcon iconKey={routine.iconKey} surfaceIndex={index} title={routine.title} />
        </Pressable>
        <View style={styles.routineCopy}>
          {titleEditing ? (
            <TextInput
              accessibilityLabel="루틴 이름"
              autoFocus
              maxLength={40}
              onBlur={onTitleEditingEnd}
              onChangeText={onChangeTitle}
              onSubmitEditing={onTitleEditingEnd}
              selectTextOnFocus
              style={styles.routineTitleInput}
              value={routine.title}
            />
          ) : (
            <Pressable
              accessibilityLabel={`${routine.title} 이름 변경`}
              accessibilityRole="button"
              hitSlop={6}
              onPress={onBeginTitleEdit}
              onPressIn={beginCardControl}
              onPressOut={endCardControl}>
              <Text numberOfLines={1} style={styles.routineTitle}>{routine.title}</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.goalStepper}>
          <Pressable
            accessibilityLabel={`${routine.title} 목표 횟수 늘리기`}
            accessibilityRole="button"
            hitSlop={4}
            onPress={() => onAdjustGoal(1)}
            onPressIn={beginCardControl}
            onPressOut={endCardControl}
            style={styles.stepperButton}>
            <MaterialCommunityIcons color={AppColors.inkMuted} name="chevron-up" size={17} />
          </Pressable>
          <Text style={styles.goalValue}>{routine.goalCount === 1 ? '1회' : `목표 ${routine.goalCount}`}</Text>
          <Pressable
            accessibilityLabel={`${routine.title} 목표 횟수 줄이기`}
            accessibilityRole="button"
            disabled={routine.goalCount <= 1}
            hitSlop={4}
            onPress={() => onAdjustGoal(-1)}
            onPressIn={beginCardControl}
            onPressOut={endCardControl}
            style={[styles.stepperButton, routine.goalCount <= 1 && styles.stepperButtonDisabled]}>
            <MaterialCommunityIcons color={AppColors.inkMuted} name="chevron-down" size={17} />
          </Pressable>
        </View>
        <RoutineSwitch
          enabled={routine.isEnabled}
          onChange={onToggleEnabled}
          onPressIn={beginCardControl}
          onPressOut={endCardControl}
          title={routine.title}
        />
      </Animated.View>
    </View>
  );
}

export function RoutineEditorScreen() {
  const router = useRouter();
  const [islandId, setIslandId] = useState<string | null>(null);
  const [draftRoutines, setDraftRoutines] = useState<DraftRoutine[]>([]);
  const [titleEditingId, setTitleEditingId] = useState<string | null>(null);
  const [iconPickerRoutineId, setIconPickerRoutineId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    initializeDatabase();
    const island = getActiveIsland();
    const nextRoutines = island ? getRoutinesForIsland(island.id) : [];
    setIslandId(island?.id ?? null);
    setDraftRoutines(nextRoutines);
  }, []);

  useFocusEffect(refresh);

  const updateRoutineImmediately = (routineId: string, update: Partial<DraftRoutine>) => {
    const currentRoutine = draftRoutines.find((routine) => routine.id === routineId);
    if (!currentRoutine) return;

    const nextRoutine = { ...currentRoutine, ...update };
    setDraftRoutines((current) => current.map((routine) => (
      routine.id === routineId ? nextRoutine : routine
    )));

    // An empty title stays in the editor until focus leaves, but never replaces valid saved data.
    if (!nextRoutine.title.trim()) return;

    try {
      updateRoutine(
        nextRoutine.id,
        nextRoutine.title,
        nextRoutine.goalCount,
        nextRoutine.iconKey ?? nextRoutine.title,
        nextRoutine.isEnabled,
      );
    } catch {
      Alert.alert('루틴을 변경하지 못했어요', '이름과 목표 횟수를 다시 확인해 주세요.');
      refresh();
    }
  };

  const addRoutineCard = () => {
    if (!islandId) return;

    try {
      const existingIds = new Set(draftRoutines.map((routine) => routine.id));
      addRoutine(islandId, '새 루틴', 1, DEFAULT_ICON_KEY, true);
      const nextRoutines = getRoutinesForIsland(islandId);
      const addedRoutine = nextRoutines.find((routine) => !existingIds.has(routine.id));
      setDraftRoutines(nextRoutines);
      setTitleEditingId(addedRoutine?.id ?? null);
    } catch {
      Alert.alert('루틴을 추가하지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  };

  const removeRoutineImmediately = (routineId: string) => {
    try {
      deleteRoutine(routineId);
      setDraftRoutines((current) => current.filter((routine) => routine.id !== routineId));
      setTitleEditingId((current) => current === routineId ? null : current);
    } catch {
      Alert.alert('루틴을 삭제하지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  };

  const finishTitleEditing = (routineId: string) => {
    const routine = draftRoutines.find((item) => item.id === routineId);
    setTitleEditingId(null);
    if (!routine?.title.trim()) {
      Alert.alert('루틴 이름을 입력해 주세요', '빈 이름은 저장할 수 없어요.');
    }
    refresh();
  };

  const selectedRoutine = draftRoutines.find((routine) => routine.id === iconPickerRoutineId) ?? null;
  const activeCount = draftRoutines.filter((routine) => routine.isEnabled).length;

  return (
    <View style={styles.screenRoot}>
      <AppTopBar
        onBack={() => router.back()}
        showBack
        showMenu={false}
        title="루틴 편집"
      />
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>사용 중인 루틴</Text>
              <Text numberOfLines={1} style={styles.sectionHint}>왼쪽으로 밀어 삭제하고, 아이콘·이름을 누르거나 화살표로 목표 횟수를 바꿀 수 있어요.</Text>
            </View>
            <Text style={styles.sectionCount}>{activeCount}개</Text>
          </View>

          <View style={styles.routineList}>
            {draftRoutines.map((routine, index) => (
              <SwipeRoutineCard
                index={index}
                key={routine.id}
                onAdjustGoal={(delta) => updateRoutineImmediately(routine.id, { goalCount: clampGoal(routine.goalCount + delta) })}
                onBeginTitleEdit={() => setTitleEditingId(routine.id)}
                onChangeTitle={(value) => {
                  updateRoutineImmediately(routine.id, { title: value });
                }}
                onDelete={() => removeRoutineImmediately(routine.id)}
                onIconPress={() => setIconPickerRoutineId(routine.id)}
                onToggleEnabled={() => updateRoutineImmediately(routine.id, { isEnabled: !routine.isEnabled })}
                onTitleEditingEnd={() => finishTitleEditing(routine.id)}
                routine={routine}
                titleEditing={titleEditingId === routine.id}
              />
            ))}
          </View>

          <Pressable accessibilityLabel="새 루틴 추가" accessibilityRole="button" onPress={addRoutineCard} style={styles.addButton}>
            <View style={styles.addIcon}><MaterialCommunityIcons color={AppColors.card} name="plus" size={21} /></View>
            <Text style={styles.addButtonText}>새 루틴 추가</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <Modal animationType="fade" onRequestClose={() => setIconPickerRoutineId(null)} transparent visible={Boolean(selectedRoutine)}>
        <View style={styles.iconPickerBackdrop}>
          <Pressable onPress={() => setIconPickerRoutineId(null)} style={StyleSheet.absoluteFill} />
          <View style={styles.iconPickerDialog}>
            <View style={styles.iconPickerHeader}>
              <Text style={styles.iconPickerTitle}>아이콘 선택</Text>
              <Pressable accessibilityLabel="아이콘 선택 닫기" accessibilityRole="button" onPress={() => setIconPickerRoutineId(null)} style={styles.iconPickerClose}>
                <MaterialCommunityIcons color={AppColors.ink} name="close" size={19} />
              </Pressable>
            </View>
            <View style={styles.iconPickerGrid}>
              {DEFAULT_ROUTINE_OPTIONS.map((option, index) => {
                const selected = option.iconKey === selectedRoutine?.iconKey;
                return (
                  <Pressable
                    accessibilityLabel={`${option.title} 아이콘 ${selected ? '선택됨' : '선택 안 됨'}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    key={option.iconKey}
                    onPress={() => {
                      if (selectedRoutine) updateRoutineImmediately(selectedRoutine.id, { iconKey: option.iconKey });
                      setIconPickerRoutineId(null);
                    }}
                    style={[styles.iconPickerOption, selected && styles.iconPickerOptionSelected]}>
                    <RoutineAssetIcon iconKey={option.iconKey} surfaceIndex={index} title={option.title} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { backgroundColor: AppColors.background, flex: 1 },
  safeArea: { flex: 1 },
  content: { gap: 14, padding: 16, paddingBottom: 38 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2, marginTop: 4 },
  sectionHeaderCopy: { flex: 1, minWidth: 0, paddingRight: 12 },
  sectionTitle: { color: AppColors.ink, fontFamily: Fonts.rounded, fontSize: 16, fontWeight: '900' },
  sectionHint: { color: AppColors.inkMuted, fontFamily: Fonts.rounded, fontSize: 10, fontWeight: '700', lineHeight: 15, marginTop: 2 },
  sectionCount: { color: AppColors.leaf, fontFamily: Fonts.sans, fontSize: 12, fontVariant: ['tabular-nums'], fontWeight: '900' },
  routineList: { gap: 10 },
  swipeCardWrap: { minHeight: 84, overflow: 'hidden' },
  deleteReveal: { alignItems: 'flex-end', backgroundColor: AppColors.danger, borderRadius: AppRadii.card, bottom: 0, justifyContent: 'center', overflow: 'hidden', position: 'absolute', right: 0, top: 0, width: 90 },
  deleteRevealButton: { alignItems: 'center', height: '100%', justifyContent: 'center', width: 76 },
  deleteRevealText: { color: AppColors.card, fontFamily: Fonts.rounded, fontSize: 10, fontWeight: '900', marginTop: 2 },
  routineCard: { alignItems: 'center', backgroundColor: AppColors.card, borderRadius: AppRadii.card, flexDirection: 'row', minHeight: 84, paddingHorizontal: 11, paddingVertical: 10, ...AppShadows.card },
  routineCardDisabled: { backgroundColor: '#F5F8F4' },
  dragHandle: { alignItems: 'center', justifyContent: 'center', width: 27 },
  iconButton: { borderRadius: 14, marginLeft: 2 },
  iconFrame: { alignItems: 'center', borderRadius: 14, height: 58, justifyContent: 'center', width: 58 },
  routineIcon: { height: 44, width: 44 },
  routineCopy: { flex: 1, marginLeft: 10, minWidth: 0 },
  routineTitle: { color: AppColors.ink, fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '900', lineHeight: 19 },
  routineTitleInput: { borderBottomColor: AppColors.leaf, borderBottomWidth: 1, color: AppColors.ink, fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '900', height: 26, padding: 0 },
  goalStepper: { alignItems: 'center', backgroundColor: AppColors.catalogSoft, borderRadius: 14, justifyContent: 'center', marginHorizontal: 8, minHeight: 54, minWidth: 62, paddingVertical: 1 },
  stepperButton: { alignItems: 'center', height: 16, justifyContent: 'center', width: 46 },
  stepperButtonDisabled: { opacity: 0.3 },
  goalValue: { color: AppColors.inkMuted, fontFamily: Fonts.rounded, fontSize: 10, fontVariant: ['tabular-nums'], fontWeight: '900', lineHeight: 17, minWidth: 52, textAlign: 'center' },
  switchTrack: { backgroundColor: '#D6DEDA', borderRadius: AppRadii.pill, height: 32, padding: 4, width: 54 },
  switchTrackOn: { backgroundColor: '#48A98A' },
  switchThumb: { backgroundColor: AppColors.card, borderRadius: AppRadii.pill, height: 24, width: 24 },
  switchThumbOn: { alignSelf: 'flex-end' },
  addButton: { alignItems: 'center', backgroundColor: '#E5F5F0', borderColor: '#A8DCCF', borderRadius: AppRadii.card, borderWidth: 1, flexDirection: 'row', gap: 12, justifyContent: 'center', minHeight: 66, marginTop: 2 },
  addIcon: { alignItems: 'center', backgroundColor: '#48A98A', borderRadius: AppRadii.pill, height: 30, justifyContent: 'center', width: 30 },
  addButtonText: { color: '#2B866D', fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '900' },
  iconPickerBackdrop: { alignItems: 'center', backgroundColor: 'rgba(63, 42, 20, 0.28)', flex: 1, justifyContent: 'center', padding: 22 },
  iconPickerDialog: { backgroundColor: AppColors.background, borderRadius: 20, maxWidth: 430, padding: 16, width: '100%', ...AppShadows.floating },
  iconPickerHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  iconPickerTitle: { color: AppColors.ink, fontFamily: Fonts.rounded, fontSize: 17, fontWeight: '900' },
  iconPickerClose: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.pill, height: 32, justifyContent: 'center', width: 32 },
  iconPickerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  iconPickerOption: { alignItems: 'center', borderColor: 'transparent', borderRadius: 14, borderWidth: 2, height: 58, justifyContent: 'center', width: '15%' },
  iconPickerOptionSelected: { backgroundColor: AppColors.leafSoft, borderColor: AppColors.leaf },
});
