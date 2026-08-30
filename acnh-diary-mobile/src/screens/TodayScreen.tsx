import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppChrome } from '@/components/AppChrome';
import { AppColors } from '@/constants/theme';
import { CollectionStatusIcon } from '@/components/CollectionStatusIcon';
import { getCatalogItems } from '@/data/catalog';
import { getEncyclopediaItems } from '@/data/encyclopedia';
import { getEncyclopediaAsset } from '@/data/encyclopedia-assets';
import { localizeAvailabilityLabel, localizeAvailabilityTime, localizeLocation } from '@/data/encyclopedia-labels';
import { villagers } from '@/data/villagers';
import {
  addRoutine,
  clearNpcVisitsForWeek,
  deleteRoutine,
  getActiveIsland,
  getCollectionStatesForIsland,
  getManualGameDate,
  getNpcVisitsForIsland,
  getRoutineProgressForIsland,
  getRoutinesForIsland,
  initializeDatabase,
  setCollectionStatus,
  setManualGameDate,
  setNpcVisit,
  setRoutineProgress,
  updateRoutine,
} from '@/db/database';
import type { EncyclopediaItem, EncyclopediaState, EncyclopediaStatus } from '@/types/encyclopedia';
import type { Island, NpcVisit, Routine, RoutineProgress } from '@/types/island';

type TodayScreenProps = { island?: Island | null; routines?: Routine[] };
type CalendarMode = 'week' | 'month';
type CritterTab = 'bugs' | 'fish' | 'sea';

const EMPTY_STATE: EncyclopediaState = { caught: false, owned: false, donated: false, genuineOwned: false, fakeOwned: false };
const NPC_OPTIONS = ['K.K.', '무파니', '여울', '너굴', '콩돌', '밤돌', '부옥', '갑돌', '마추릴라'];

function getDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  if (Number.isInteger(year) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
    return { year, month, day };
  }

  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

function formatIsoDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function toIsoDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return '';
  }
  return formatIsoDate(date);
}

function shiftIsoDate(value: string, amount: number) {
  const date = parseIsoDate(value);
  if (!date) return '';
  date.setUTCDate(date.getUTCDate() + amount);
  return formatIsoDate(date);
}

function getGameDate(timezone: string) {
  const now = new Date();
  const parts = getDateParts(now, timezone);
  const hour = getCurrentHour(timezone);
  const current = toIsoDate(parts.year, parts.month, parts.day) || formatIsoDate(now);
  return hour < 5 ? shiftIsoDate(current, -1) : current;
}

function getCurrentHour(timezone: string) {
  const value = Number(new Intl.DateTimeFormat('en-US', { hour: '2-digit', hour12: false, timeZone: timezone }).format(new Date()));
  return value === 24 ? 0 : value;
}

function parseTime(value: string) {
  const match = value.match(/(\d{1,2})\s*(AM|PM)\s*[–-]\s*(\d{1,2})\s*(AM|PM)/i);
  if (!match) return null;
  const toHour = (hourValue: string, meridiem: string) => {
    const hour = Number(hourValue) % 12;
    return meridiem.toUpperCase() === 'PM' ? hour + 12 : hour;
  };
  return { start: toHour(match[1], match[2]), end: toHour(match[3], match[4]) };
}

function getWeekDates(gameDate: string) {
  const date = parseIsoDate(gameDate);
  if (!date) return [];
  const day = date.getUTCDay();
  const monday = shiftIsoDate(gameDate, day === 0 ? -6 : 1 - day);
  return Array.from({ length: 7 }, (_, index) => shiftIsoDate(monday, index));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long', timeZone: 'UTC' }).format(parseIsoDate(value) ?? new Date());
}

function seasonFor(month: number, hemisphere: Island['hemisphere']) {
  const north = month <= 2 || month === 12 ? '겨울' : month <= 5 ? '봄' : month <= 8 ? '여름' : '가을';
  if (hemisphere !== 'south') return north;
  return north === '겨울' ? '여름' : north === '여름' ? '겨울' : north === '봄' ? '가을' : '봄';
}

function zodiacFor(month: number, day: number) {
  const signs: Array<[string, number, number]> = [['염소자리', 122, 219], ['물병자리', 220, 320], ['물고기자리', 321, 419], ['양자리', 420, 520], ['황소자리', 521, 621], ['쌍둥이자리', 622, 722], ['게자리', 723, 822], ['사자자리', 823, 922], ['처녀자리', 923, 1023], ['천칭자리', 1024, 1122], ['전갈자리', 1123, 1221], ['사수자리', 1222, 121]];
  const key = month * 100 + day;
  return signs.find(([, start, end]) => start <= end ? key >= start && key <= end : key >= start || key <= end)?.[0] ?? '염소자리';
}

function isAvailableNow(item: EncyclopediaItem, island: Island, gameDate: string) {
  const date = parseIsoDate(gameDate);
  if (!date) return false;
  const month = date.getUTCMonth() + 1;
  const availability = item.availability[island.hemisphere === 'south' ? 'south' : 'north'];
  const time = availability.timesByMonth[String(month)] ?? '';
  if (!availability.months.includes(month) || !time || time === 'NA') return false;
  if (time.toLowerCase() === 'all day') return true;
  const range = parseTime(time);
  if (!range) return true;
  const hour = getCurrentHour(island.timezone ?? 'Asia/Seoul');
  return range.start <= range.end
    ? hour >= range.start && hour < range.end
    : hour >= range.start || hour < range.end;
}

function isAvailableInMonth(item: EncyclopediaItem, hemisphere: 'north' | 'south', month: number) {
  return item.availability[hemisphere].months.includes(month);
}

function getMonthlyFlags(item: EncyclopediaItem, hemisphere: 'north' | 'south', month: number) {
  const previousMonth = month === 1 ? 12 : month - 1;
  const nextMonth = month === 12 ? 1 : month + 1;
  const availableThisMonth = isAvailableInMonth(item, hemisphere, month);

  return {
    isLeavingThisMonth: availableThisMonth && !isAvailableInMonth(item, hemisphere, nextMonth),
    isNewThisMonth: availableThisMonth && !isAvailableInMonth(item, hemisphere, previousMonth),
  };
}

export function TodayScreen({ island: initialIsland, routines: initialRoutines }: TodayScreenProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [island, setIsland] = useState<Island | null>(initialIsland ?? null);
  const [routines, setRoutines] = useState<Routine[]>(initialRoutines ?? []);
  const [gameDate, setGameDateState] = useState('');
  const [manualDate, setManualDate] = useState<string | null>(null);
  const [routineProgress, setRoutineProgressState] = useState<Record<string, RoutineProgress>>({});
  const [collectionStates, setCollectionStates] = useState<Record<string, EncyclopediaState>>({});
  const [npcVisits, setNpcVisits] = useState<Record<string, string>>({});
  const [critterTab, setCritterTab] = useState<CritterTab>('bugs');
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('week');
  const [npcDate, setNpcDate] = useState<string | null>(null);
  const [routineModalOpen, setRoutineModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineGoal, setRoutineGoal] = useState('1');

  const refresh = useCallback(() => {
    try {
      initializeDatabase();
      const activeIsland = getActiveIsland();
      setIsland(activeIsland);
      if (!activeIsland) return;
      const savedManualDate = getManualGameDate();
      const validManualDate = savedManualDate && parseIsoDate(savedManualDate) ? savedManualDate : null;
      const date = validManualDate ?? getGameDate(activeIsland.timezone ?? 'Asia/Seoul');
      setManualDate(validManualDate);
      setGameDateState(date);
      const nextRoutines = getRoutinesForIsland(activeIsland.id);
      setRoutines(nextRoutines);
      setRoutineProgressState(getRoutineProgressForIsland(activeIsland.id, date));
      setCollectionStates(getCollectionStatesForIsland(activeIsland.id));
      const week = getWeekDates(date);
      setNpcVisits(getNpcVisitsForIsland(activeIsland.id, week[0], week[6]));
    } catch {
      Alert.alert('오늘 기록을 불러오지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  }, []);

  useFocusEffect(refresh);

  const setDate = (date: string | null) => {
    try {
      setManualGameDate(date);
      setManualDate(date);
      const next = date ?? (island ? getGameDate(island.timezone ?? 'Asia/Seoul') : '');
      setGameDateState(next);
      if (island) setRoutineProgressState(getRoutineProgressForIsland(island.id, next));
    } catch {
      Alert.alert('날짜를 변경하지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  };

  const dateObject = parseIsoDate(gameDate) ?? new Date();
  const month = dateObject.getUTCMonth() + 1;
  const day = dateObject.getUTCDate();
  const season = seasonFor(month, island?.hemisphere ?? 'north');
  const zodiac = zodiacFor(month, day);
  const availableCritters = useMemo(() => island && gameDate ? getEncyclopediaItems(critterTab).filter((item) => isAvailableNow(item, island, gameDate)) : [], [critterTab, gameDate, island]);
  const calendarDates = useMemo(() => {
    if (!gameDate) return [];
    if (calendarMode === 'week') return getWeekDates(gameDate);
    const start = `${gameDate.slice(0, 8)}01`;
    const days = new Date(Date.UTC(Number(gameDate.slice(0, 4)), month, 0)).getUTCDate();
    return Array.from({ length: days }, (_, index) => shiftIsoDate(start, index));
  }, [calendarMode, gameDate, month]);
  const birthdaysByDate = useMemo(() => Object.fromEntries(calendarDates.map((date) => {
    const monthDay = date.slice(5);
    const names = villagers.filter((villager) => `${String(villager.birth_month).padStart(2, '0')}-${String(villager.birth_day).padStart(2, '0')}` === monthDay).map((villager) => villager.name_ko);
    return [date, names];
  }).filter(([, names]) => names.length)), [calendarDates]);
  const seasonalRecipeCount = getCatalogItems('recipes').filter((item) => `${item.source ?? ''} ${item.sourceNotes ?? ''}`.includes(season)).length;
  const shoppingCount = getCatalogItems('furniture').filter((item) => (item.source ?? '').includes('너굴')).length;

  const toggleRoutine = (routine: Routine) => {
    if (!island || !gameDate) return;
    const current = routineProgress[routine.id]?.currentCount ?? 0;
    const next = current >= routine.goalCount ? 0 : current + 1;
    try {
      setRoutineProgress(island.id, routine.id, gameDate, next, routine.goalCount);
      setRoutineProgressState((currentState) => ({ ...currentState, [routine.id]: { currentCount: next, isComplete: next >= routine.goalCount } }));
    } catch {
      Alert.alert('루틴을 저장하지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  };

  const saveRoutine = () => {
    if (!island) return;
    try {
      const goal = Number(routineGoal);
      if (editingRoutine) updateRoutine(editingRoutine.id, routineTitle, goal);
      else addRoutine(island.id, routineTitle, goal);
      setRoutines(getRoutinesForIsland(island.id));
      setRoutineModalOpen(false);
    } catch {
      Alert.alert('루틴을 저장하지 못했어요', '이름과 목표 횟수를 확인해 주세요.');
    }
  };

  const removeRoutine = (routine: Routine) => {
    Alert.alert('루틴 삭제', `${routine.title}을(를) 삭제할까요?`, [{ text: '취소', style: 'cancel' }, { text: '삭제', style: 'destructive', onPress: () => { deleteRoutine(routine.id); if (island) setRoutines(getRoutinesForIsland(island.id)); } }]);
  };

  const updateCritterStatus = (item: EncyclopediaItem, status: EncyclopediaStatus) => {
    if (!island) return;
    const key = `${item.category}/${item.id}`;
    const current = collectionStates[key] ?? EMPTY_STATE;
    const value = !current[status];
    try {
      setCollectionStatus(island.id, item.category, item.id, status, value);
      setCollectionStates((states) => ({ ...states, [key]: { ...current, [status]: value } }));
    } catch {
      Alert.alert('생물 상태를 저장하지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  };

  const saveNpc = (name: string) => {
    if (!island || !npcDate) return;
    const visit: NpcVisit = { islandId: island.id, visitDate: npcDate, npcName: name };
    try {
      setNpcVisit(visit);
      setNpcVisits((current) => ({ ...current, [npcDate]: name }));
      setNpcDate(null);
    } catch {
      Alert.alert('NPC 기록을 저장하지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  };

  if (!island) {
    return (
      <View style={styles.screenRoot}>
        <AppChrome title="오늘" />
        <SafeAreaView edges={[]} style={[styles.emptyContainer, { backgroundColor: AppColors.background }]}>
          <Text style={styles.emptyTitle}>아직 섬이 없어요</Text>
          <Text style={styles.emptyDescription}>온보딩에서 첫 섬을 만들어 주세요.</Text>
        </SafeAreaView>
      </View>
    );
  }

  const weekDates = getWeekDates(gameDate);
  return (
    <View style={styles.screenRoot}>
      <AppChrome title="오늘" />
      <SafeAreaView edges={[]} style={[styles.safeArea, { backgroundColor: AppColors.background }]}>
        <ScrollView contentContainerStyle={styles.content} ref={scrollRef} showsVerticalScrollIndicator={false}>
        <View style={styles.islandCard}><Text style={styles.cardEyebrow}>ACTIVE ISLAND</Text><Text style={styles.islandName}>{island.name}</Text><View style={styles.islandRule} /><Text style={styles.profileText}>{island.playerName ?? '주민대표 미입력'} · {island.hemisphere === 'south' ? '남반구' : '북반구'}</Text></View>
        <View style={styles.dateCard}><View style={styles.dateCopy}><Text style={styles.sectionTitle}>{formatDate(gameDate)}{manualDate ? ' · 수동 날짜' : ''}</Text><Text style={styles.dateHint}>오전 5시 기준 · {island.timezone ?? 'Asia/Seoul'}</Text></View><View style={styles.dateActions}><Pressable accessibilityLabel="하루 전" onPress={() => setDate(shiftIsoDate(gameDate, -1))} style={styles.dateButton}><Text style={styles.dateButtonText}>‹</Text></Pressable><Pressable accessibilityLabel="오늘 날짜로 돌아가기" onPress={() => setDate(null)} style={styles.todayButton}><Text style={styles.todayButtonText}>오늘</Text></Pressable><Pressable accessibilityLabel="하루 뒤" onPress={() => setDate(shiftIsoDate(gameDate, 1))} style={styles.dateButton}><Text style={styles.dateButtonText}>›</Text></Pressable></View></View>

        <SectionHeader title="시즌과 이벤트" description="현재 섬과 게임 날짜를 기준으로 표시해요." />
        <View style={styles.infoGrid}><InfoTile label="계절" value={season} icon="✦" /><InfoTile label="별자리" value={zodiac} icon="☆" /><InfoTile label="시즌 레시피" value={seasonalRecipeCount ? `${seasonalRecipeCount}개` : '데이터 확인 중'} icon="♨" /><InfoTile label="너굴쇼핑" value={`${shoppingCount}개 기준`} icon="▣" /></View>
        <View style={styles.noticeCard}><Text style={styles.noticeTitle}>날씨 데이터</Text><Text style={styles.noticeText}>MeteoNook 날씨 데이터는 MVP 범위에서 제외되어 있어요.</Text></View>

        <SectionHeader title="지금 잡을 수 있는 생물" description="현재 시간에 출현하는 생물과 이번 달 변동을 확인해요." />
        <ScrollView contentContainerStyle={styles.tabRow} horizontal showsHorizontalScrollIndicator={false}>{([['bugs', '곤충'], ['fish', '물고기'], ['sea', '해산물']] as Array<[CritterTab, string]>).map(([value, label]) => <Pressable key={value} onPress={() => setCritterTab(value)} style={[styles.tabChip, critterTab === value && styles.tabChipActive]}><Text style={[styles.tabChipText, critterTab === value && styles.tabChipTextActive]}>{label}</Text></Pressable>)}</ScrollView>
        <View style={styles.critterList}>{availableCritters.length ? availableCritters.map((item) => { const availability = item.availability[island.hemisphere === 'south' ? 'south' : 'north']; const availabilityTime = availability.timesByMonth[String(month)] ?? null; return <TodayCritterCard key={item.id} item={item} month={month} hemisphere={island.hemisphere === 'south' ? 'south' : 'north'} availabilityLabel={localizeAvailabilityLabel(availability.label)} availabilityTime={localizeAvailabilityTime(availabilityTime)} state={collectionStates[`${item.category}/${item.id}`] ?? EMPTY_STATE} onToggle={(status) => updateCritterStatus(item, status)} />; }) : <Text style={styles.noData}>현재 시간에 출현하는 생물이 없어요.</Text>}</View>

        <SectionHeader title="오늘의 루틴" description="체크하면 오늘 날짜에 진행 상태를 저장해요." actionLabel="루틴 편집" onAction={() => { setEditingRoutine(null); setRoutineTitle(''); setRoutineGoal('1'); setRoutineModalOpen(true); }} />
        <View style={styles.routineCard}>{routines.map((routine, index) => { const progress = routineProgress[routine.id]?.currentCount ?? 0; const complete = progress >= routine.goalCount; return <Pressable accessibilityLabel={`${routine.title} ${progress}/${routine.goalCount} ${complete ? '완료' : '미완료'}`} accessibilityRole="checkbox" accessibilityState={{ checked: complete }} key={routine.id} onPress={() => toggleRoutine(routine)} style={[styles.routineRow, index > 0 && styles.routineDivider]}><View style={[styles.routineIcon, complete && styles.routineIconDone]}><Text style={[styles.routineIconText, complete && styles.routineIconTextDone]}>{complete ? '✓' : '○'}</Text></View><View style={styles.routineCopy}><Text style={[styles.routineTitle, complete && styles.routineTitleDone]}>{routine.title}</Text><Text style={styles.routineGoal}>{progress} / {routine.goalCount}회 · 매일</Text></View><Pressable accessibilityLabel={`${routine.title} 편집`} onPress={() => { setEditingRoutine(routine); setRoutineTitle(routine.title); setRoutineGoal(String(routine.goalCount)); setRoutineModalOpen(true); }}><Text style={styles.smallAction}>편집</Text></Pressable></Pressable>; })}</View>

        <SectionHeader title="최근 방문 NPC" description="현재 날짜가 포함된 월요일부터 일요일까지 기록해요." actionLabel="주간 초기화" onAction={() => { clearNpcVisitsForWeek(island.id, weekDates[0], weekDates[6]); setNpcVisits({}); }} />
        <View style={styles.npcCard}>{weekDates.map((date) => { const dateObject = parseIsoDate(date) ?? new Date(); const dayIndex = dateObject.getUTCDay(); const npc = npcVisits[date] ?? (dayIndex === 6 ? 'K.K.' : dayIndex === 0 ? '무파니' : null); return <Pressable key={date} onPress={() => setNpcDate(date)} style={styles.npcRow}><Text style={styles.npcDay}>{new Intl.DateTimeFormat('ko-KR', { weekday: 'short', timeZone: 'UTC' }).format(dateObject)}</Text><View style={styles.npcAvatar}><Text style={styles.npcAvatarText}>{npc ? npc.slice(0, 1) : '?'}</Text></View><Text style={styles.npcName}>{npc ?? '방문 NPC 선택'}</Text><Text style={styles.rowArrow}>›</Text></Pressable>; })}</View>

        <SectionHeader title="캘린더" description="주민 생일과 기준 데이터 이벤트를 확인해요." />
        <View style={styles.calendarCard}><View style={styles.calendarToggle}>{(['week', 'month'] as CalendarMode[]).map((value) => <Pressable key={value} onPress={() => setCalendarMode(value)} style={[styles.calendarToggleButton, calendarMode === value && styles.calendarToggleActive]}><Text style={[styles.calendarToggleText, calendarMode === value && styles.calendarToggleTextActive]}>{value === 'week' ? '주간' : '월간'}</Text></Pressable>)}</View>{calendarDates.map((date) => <View key={date} style={styles.calendarRow}><Text style={styles.calendarDate}>{date.slice(5).replace('-', '.')}</Text><Text style={styles.calendarEvent}>{birthdaysByDate[date]?.join(', ') ?? '기록된 일정 없음'}</Text></View>)}</View>
        </ScrollView>
        <NpcModal date={npcDate} visible={Boolean(npcDate)} onClose={() => setNpcDate(null)} onSelect={saveNpc} />
        <RoutineModal visible={routineModalOpen} editingRoutine={editingRoutine} title={routineTitle} goal={routineGoal} onChangeTitle={setRoutineTitle} onChangeGoal={setRoutineGoal} onClose={() => setRoutineModalOpen(false)} onSave={saveRoutine} onDelete={editingRoutine ? () => { setRoutineModalOpen(false); removeRoutine(editingRoutine); } : undefined} />
      </SafeAreaView>
    </View>
  );
}

function SectionHeader({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel?: string; onAction?: () => void }) { return <View style={styles.sectionHeader}><View style={styles.sectionHeaderCopy}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionDescription}>{description}</Text></View>{actionLabel && onAction ? <Pressable onPress={onAction}><Text style={styles.sectionAction}>{actionLabel}</Text></Pressable> : null}</View>; }
function InfoTile({ label, value, icon }: { label: string; value: string; icon: string }) { return <View style={styles.infoTile}><Text style={styles.infoIcon}>{icon}</Text><View><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View></View>; }
function TodayCritterCard({
  item,
  availabilityLabel,
  availabilityTime,
  hemisphere,
  month,
  state,
  onToggle,
}: {
  item: EncyclopediaItem;
  availabilityLabel: string | null;
  availabilityTime: string | null;
  hemisphere: 'north' | 'south';
  month: number;
  state: EncyclopediaState;
  onToggle: (status: EncyclopediaStatus) => void;
}) {
  const image = getEncyclopediaAsset(item.category, item.id);
  const { isLeavingThisMonth, isNewThisMonth } = getMonthlyFlags(item, hemisphere, month);

  return (
    <View style={styles.critterRow}>
      <View style={styles.critterImageFrame}>
        {image ? <Image source={image} resizeMode="contain" style={[styles.critterImage, !state.caught && styles.critterImageUncaught]} /> : <Text>?</Text>}
      </View>
      <View style={styles.critterCopy}>
        <Text style={styles.critterName}>{item.nameKo}</Text>
        {isNewThisMonth || isLeavingThisMonth ? (
          <View style={critterBadgeStyles.badgeRow}>
            {isNewThisMonth ? (
              <View style={[critterBadgeStyles.badge, critterBadgeStyles.newBadge]}>
                <Text style={[critterBadgeStyles.badgeText, critterBadgeStyles.newBadgeText]}>이번 달 신규</Text>
              </View>
            ) : null}
            {isLeavingThisMonth ? (
              <View style={[critterBadgeStyles.badge, critterBadgeStyles.leavingBadge]}>
                <Text style={[critterBadgeStyles.badgeText, critterBadgeStyles.leavingBadgeText]}>이번 달 종료</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <Text style={styles.critterMeta}>{localizeLocation(item.location) ?? '출현 장소 정보 없음'} · {availabilityLabel ?? '출현 정보 확인 중'} · {availabilityTime ?? '시간 정보 없음'}</Text>
      </View>
      <View style={styles.critterStatus}>
        {(['caught', 'donated'] as EncyclopediaStatus[]).map((status) => (
          <Pressable
            accessibilityLabel={`${item.nameKo} ${status === 'caught' ? '채집' : '기증'} ${state[status] ? '해제' : '설정'}`}
            key={status}
            onPress={() => onToggle(status)}
            style={styles.critterStatusButton}>
            <CollectionStatusIcon active={state[status]} status={status} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const critterBadgeStyles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  badge: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3 },
  badgeText: { fontSize: 9, fontWeight: '800' },
  newBadge: { backgroundColor: '#FFF0D8' },
  newBadgeText: { color: '#A26A2D' },
  leavingBadge: { backgroundColor: '#FBE3E0' },
  leavingBadgeText: { color: '#AE584B' },
});
function DrawerModal({ island, visible, onClose, onManage }: { island: Island; visible: boolean; onClose: () => void; onManage: () => void }) { return <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}><View style={styles.modalBackdrop}><Pressable onPress={onClose} style={StyleSheet.absoluteFill} /><View style={styles.drawer}><SafeAreaView edges={['top', 'bottom']}><View style={styles.drawerHeader}><Text style={styles.drawerKicker}>ISLAND PASSPORT</Text><Pressable onPress={onClose}><Text style={styles.closeText}>×</Text></Pressable></View><Text style={styles.drawerTitle}>{island.name}</Text><View style={styles.passportCard}><Text style={styles.passportLabel}>주민대표</Text><Text style={styles.passportValue}>{island.playerName ?? '미입력'}</Text><Text style={styles.passportLabel}>섬 정보</Text><Text style={styles.passportValue}>{island.hemisphere === 'south' ? '남반구' : '북반구'} · {island.fruit ?? '과일 미입력'} · {island.flower ?? '꽃 미입력'}</Text></View><Pressable onPress={onManage} style={styles.drawerAction}><Text style={styles.drawerActionText}>섬 추가·변경·수정·삭제</Text><Text style={styles.rowArrow}>›</Text></Pressable><View style={styles.drawerAction}><Text style={styles.drawerMuted}>날씨 데이터 추가</Text><Text style={styles.drawerBadge}>MVP 제외</Text></View><View style={styles.drawerAction}><Text style={styles.drawerMuted}>데이터 출처 및 라이선스</Text><Text style={styles.rowArrow}>›</Text></View></SafeAreaView></View></View></Modal>; }
function NpcModal({ date, visible, onClose, onSelect }: { date: string | null; visible: boolean; onClose: () => void; onSelect: (name: string) => void }) { return <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}><View style={styles.modalBackdrop}><Pressable onPress={onClose} style={StyleSheet.absoluteFill} /><View style={styles.bottomSheet}><Text style={styles.sheetTitle}>{date ? `${formatDate(date)} 방문 NPC` : '방문 NPC'}</Text>{NPC_OPTIONS.map((name) => <Pressable key={name} onPress={() => onSelect(name)} style={styles.optionRow}><View style={styles.npcAvatar}><Text style={styles.npcAvatarText}>{name.slice(0, 1)}</Text></View><Text style={styles.optionText}>{name}</Text></Pressable>)}<Pressable onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelButtonText}>취소</Text></Pressable></View></View></Modal>; }
function RoutineModal({ visible, editingRoutine, title, goal, onChangeTitle, onChangeGoal, onClose, onSave, onDelete }: { visible: boolean; editingRoutine: Routine | null; title: string; goal: string; onChangeTitle: (value: string) => void; onChangeGoal: (value: string) => void; onClose: () => void; onSave: () => void; onDelete?: () => void }) { return <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}><View style={styles.modalBackdrop}><Pressable onPress={onClose} style={StyleSheet.absoluteFill} /><View style={styles.bottomSheet}><Text style={styles.sheetTitle}>{editingRoutine ? '루틴 수정' : '루틴 추가'}</Text><Text style={styles.modalLabel}>루틴 이름</Text><TextInput accessibilityLabel="루틴 이름" onChangeText={onChangeTitle} placeholder="예: 매일 산책" placeholderTextColor="#A2AAA0" style={styles.modalInput} value={title} /><Text style={styles.modalLabel}>목표 횟수</Text><TextInput accessibilityLabel="목표 횟수" keyboardType="number-pad" onChangeText={onChangeGoal} style={styles.modalInput} value={goal} /><View style={styles.modalActions}>{onDelete ? <Pressable onPress={onDelete} style={styles.deleteButton}><Text style={styles.deleteButtonText}>삭제</Text></Pressable> : null}<Pressable onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelButtonText}>취소</Text></Pressable><Pressable onPress={onSave} style={styles.saveButton}><Text style={styles.saveButtonText}>저장</Text></Pressable></View></View></View></Modal>; }

const styles = StyleSheet.create({
  screenRoot: { flex: 1 }, safeArea: { backgroundColor: AppColors.background, flex: 1 }, content: { padding: 20, paddingBottom: 112 }, headerRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }, kicker: { color: AppColors.primaryText, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 }, title: { color: AppColors.primaryText, fontSize: 36, fontWeight: '800', marginTop: 4 }, date: { color: '#788077', fontSize: 13, marginTop: 4 }, menuButton: { alignItems: 'center', backgroundColor: AppColors.primarySurface, borderRadius: 20, height: 44, justifyContent: 'center', width: 44 }, menuText: { color: AppColors.primaryText, fontSize: 22 }, islandCard: { backgroundColor: AppColors.primarySoft, borderRadius: 24, padding: 20 }, cardEyebrow: { color: AppColors.primaryText, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 }, islandName: { color: AppColors.primaryText, fontSize: 27, fontWeight: '800', marginTop: 5 }, islandRule: { backgroundColor: AppColors.primaryBorder, height: 1, marginVertical: 16 }, profileText: { color: AppColors.primaryText, fontSize: 12, fontWeight: '700' }, dateCard: { alignItems: 'center', backgroundColor: '#FFF', borderColor: '#E2E8DF', borderRadius: 18, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, padding: 14 }, dateCopy: { flex: 1 }, dateHint: { color: '#89968B', fontSize: 10, marginTop: 4 }, dateActions: { alignItems: 'center', flexDirection: 'row', gap: 5 }, dateButton: { alignItems: 'center', backgroundColor: AppColors.primarySurface, borderRadius: 10, height: 30, justifyContent: 'center', width: 30 }, dateButtonText: { color: AppColors.primaryText, fontSize: 22, lineHeight: 25 }, todayButton: { backgroundColor: AppColors.primaryAction, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8 }, todayButtonText: { color: AppColors.primaryText, fontSize: 10, fontWeight: '800' }, sectionHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, marginTop: 28 }, sectionHeaderCopy: { flex: 1 }, sectionTitle: { color: AppColors.primaryText, fontSize: 19, fontWeight: '800' }, sectionDescription: { color: '#8B938A', fontSize: 11, marginTop: 3 }, sectionAction: { color: AppColors.primaryText, fontSize: 11, fontWeight: '800', paddingBottom: 2 }, infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, infoTile: { alignItems: 'center', backgroundColor: '#FFF', borderColor: '#E4E9E0', borderRadius: 16, borderWidth: 1, flexDirection: 'row', minHeight: 70, padding: 12, width: '48%' }, infoIcon: { color: AppColors.primaryAction, fontSize: 22, marginRight: 9 }, infoLabel: { color: '#8A978D', fontSize: 10 }, infoValue: { color: AppColors.primaryText, fontSize: 13, fontWeight: '800', marginTop: 4 }, noticeCard: { backgroundColor: '#F0E9D9', borderRadius: 16, marginTop: 10, padding: 14 }, noticeTitle: { color: '#76583F', fontSize: 12, fontWeight: '800' }, noticeText: { color: '#9B795B', fontSize: 11, lineHeight: 17, marginTop: 4 }, tabRow: { gap: 8, paddingBottom: 10 }, tabChip: { backgroundColor: AppColors.primarySurface, borderRadius: 15, paddingHorizontal: 13, paddingVertical: 8 }, tabChipActive: { backgroundColor: AppColors.primary }, tabChipText: { color: '#68766B', fontSize: 12, fontWeight: '800' }, tabChipTextActive: { color: AppColors.primaryText }, critterList: { backgroundColor: '#FFF', borderColor: '#E2E8DF', borderRadius: 17, borderWidth: 1, overflow: 'hidden' }, critterRow: { alignItems: 'center', borderBottomColor: '#EDF1EB', borderBottomWidth: 1, flexDirection: 'row', minHeight: 78, padding: 9 }, critterImageFrame: { alignItems: 'center', backgroundColor: '#F5F8F2', borderRadius: 11, height: 58, justifyContent: 'center', width: 58 }, critterImage: { height: 52, width: 52 }, critterImageUncaught: { opacity: 0.35 }, critterCopy: { flex: 1, marginLeft: 10, minWidth: 0 }, critterName: { color: AppColors.primaryText, fontSize: 13, fontWeight: '800' }, critterMeta: { color: '#8B978D', fontSize: 10, marginTop: 5 }, critterStatus: { flexDirection: 'row', gap: 4 }, critterStatusButton: { alignItems: 'center', backgroundColor: AppColors.primarySurface, borderRadius: 10, height: 27, justifyContent: 'center', width: 27 }, noData: { color: '#8B978D', padding: 22, textAlign: 'center' }, routineCard: { backgroundColor: '#FFF', borderColor: '#E7E9E0', borderRadius: 19, borderWidth: 1, paddingHorizontal: 14 }, routineRow: { alignItems: 'center', flexDirection: 'row', minHeight: 66 }, routineDivider: { borderTopColor: '#EFF0EB', borderTopWidth: 1 }, routineIcon: { alignItems: 'center', backgroundColor: AppColors.primarySurface, borderRadius: 14, height: 35, justifyContent: 'center', marginRight: 11, width: 35 }, routineIconDone: { backgroundColor: AppColors.primaryAction }, routineIconText: { color: AppColors.primaryText, fontSize: 20, fontWeight: '800' }, routineIconTextDone: { color: AppColors.primaryText }, routineCopy: { flex: 1 }, routineTitle: { color: AppColors.primaryText, fontSize: 13, fontWeight: '800' }, routineTitleDone: { color: AppColors.primaryAction }, routineGoal: { color: '#9AA29A', fontSize: 10, marginTop: 4 }, smallAction: { color: AppColors.primaryText, fontSize: 10, fontWeight: '800', padding: 6 }, npcCard: { backgroundColor: '#FFF', borderColor: '#E2E8DF', borderRadius: 17, borderWidth: 1, overflow: 'hidden' }, npcRow: { alignItems: 'center', borderBottomColor: '#EDF1EB', borderBottomWidth: 1, flexDirection: 'row', minHeight: 55, paddingHorizontal: 13 }, npcDay: { color: '#829080', fontSize: 11, fontWeight: '800', width: 32 }, npcAvatar: { alignItems: 'center', backgroundColor: AppColors.primarySurface, borderRadius: 16, height: 32, justifyContent: 'center', width: 32 }, npcAvatarText: { color: AppColors.primaryText, fontSize: 13, fontWeight: '800' }, npcName: { color: AppColors.primaryText, flex: 1, fontSize: 12, fontWeight: '700', marginLeft: 10 }, rowArrow: { color: '#82959A', fontSize: 21 }, calendarCard: { backgroundColor: '#FFF', borderColor: '#E2E8DF', borderRadius: 17, borderWidth: 1, paddingHorizontal: 13 }, calendarToggle: { backgroundColor: AppColors.primarySurface, borderRadius: 11, flexDirection: 'row', marginVertical: 12, padding: 3 }, calendarToggleButton: { alignItems: 'center', borderRadius: 8, flex: 1, paddingVertical: 7 }, calendarToggleActive: { backgroundColor: AppColors.primaryAction }, calendarToggleText: { color: '#7A8A7B', fontSize: 11, fontWeight: '800' }, calendarToggleTextActive: { color: AppColors.primaryText }, calendarRow: { alignItems: 'center', borderTopColor: '#EDF1EB', borderTopWidth: 1, flexDirection: 'row', minHeight: 42 }, calendarDate: { color: AppColors.primaryText, fontSize: 11, fontWeight: '800', width: 46 }, calendarEvent: { color: AppColors.primaryText, flex: 1, fontSize: 11 }, floatingTop: { alignItems: 'center', backgroundColor: AppColors.primaryAction, borderRadius: 22, bottom: 23, elevation: 4, paddingHorizontal: 14, paddingVertical: 11, position: 'absolute', right: 18, shadowColor: AppColors.primaryBorder, shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.2, shadowRadius: 6 }, floatingTopText: { color: AppColors.primaryText, fontSize: 11, fontWeight: '800' }, modalBackdrop: { backgroundColor: 'rgba(70, 84, 89, 0.28)', flex: 1, justifyContent: 'flex-end' }, drawer: { backgroundColor: AppColors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, minHeight: '78%', padding: 21 }, drawerHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, drawerKicker: { color: AppColors.primaryText, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }, closeText: { color: AppColors.primaryText, fontSize: 28 }, drawerTitle: { color: AppColors.primaryText, fontSize: 27, fontWeight: '800', marginTop: 9 }, passportCard: { backgroundColor: AppColors.primaryAction, borderRadius: 19, marginTop: 17, padding: 17 }, passportLabel: { color: AppColors.primarySoft, fontSize: 10, marginTop: 7 }, passportValue: { color: AppColors.primaryText, fontSize: 14, fontWeight: '800', marginTop: 3 }, drawerAction: { alignItems: 'center', backgroundColor: '#FFF', borderBottomColor: '#EDF1EB', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 57, paddingHorizontal: 14 }, drawerActionText: { color: AppColors.primaryText, fontSize: 12, fontWeight: '800' }, drawerMuted: { color: '#687A80', fontSize: 12, fontWeight: '700' }, drawerBadge: { backgroundColor: '#F0E9D9', borderRadius: 9, color: '#9B795B', fontSize: 9, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 5 }, bottomSheet: { backgroundColor: AppColors.background, borderTopLeftRadius: 25, borderTopRightRadius: 25, maxHeight: '82%', padding: 21 }, sheetTitle: { color: AppColors.primaryText, fontSize: 20, fontWeight: '800', marginBottom: 14 }, optionRow: { alignItems: 'center', borderBottomColor: '#E7ECE4', borderBottomWidth: 1, flexDirection: 'row', minHeight: 48 }, optionText: { color: AppColors.primaryText, fontSize: 13, fontWeight: '700', marginLeft: 10 }, cancelButton: { alignItems: 'center', backgroundColor: AppColors.primarySurface, borderRadius: 13, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 12 }, cancelButtonText: { color: AppColors.primaryText, fontSize: 12, fontWeight: '800' }, modalLabel: { color: '#687A80', fontSize: 11, fontWeight: '800', marginBottom: 5, marginTop: 10 }, modalInput: { backgroundColor: '#FFF', borderColor: '#DDE6DB', borderRadius: 12, borderWidth: 1, color: AppColors.primaryText, fontSize: 14, paddingHorizontal: 12, paddingVertical: 11 }, modalActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 18 }, deleteButton: { alignItems: 'center', backgroundColor: '#F5E1DE', borderRadius: 13, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 12 }, deleteButtonText: { color: '#B15F56', fontSize: 12, fontWeight: '800' }, saveButton: { alignItems: 'center', backgroundColor: AppColors.primaryAction, borderRadius: 13, justifyContent: 'center', paddingHorizontal: 19, paddingVertical: 12 }, saveButtonText: { color: AppColors.primaryText, fontSize: 12, fontWeight: '800' }, emptyContainer: { alignItems: 'center', backgroundColor: AppColors.background, flex: 1, justifyContent: 'center', padding: 24 }, emptyTitle: { color: AppColors.primaryText, fontSize: 22, fontWeight: '800' }, emptyDescription: { color: '#788077', fontSize: 14, marginTop: 8 },
});
