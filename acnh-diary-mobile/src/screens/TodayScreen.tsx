import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  type ColorValue,
  Image,
  Modal,
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

import { AppChrome } from '@/components/AppChrome';
import { AppColors, AppControlSizes, AppRadii, AppShadows, Fonts } from '@/constants/theme';
import { CollectionStatusIcon } from '@/components/CollectionStatusIcon';
import { FloatingTopButton } from '@/components/FloatingTopButton';
import { getMonthlyAvailabilityFlags, isAvailableAtMinute } from '@/data/availability';
import { getBloomingBushes, type BloomingBush } from '@/data/bush-blooms';
import { getCatalogItems } from '@/data/catalog';
import { getEncyclopediaItems } from '@/data/encyclopedia';
import { getEncyclopediaAsset } from '@/data/encyclopedia-assets';
import { localizeAvailabilityLabel, localizeAvailabilityTime, localizeLocation } from '@/data/encyclopedia-labels';
import { npcAssets } from '@/data/npc-assets';
import { DEFAULT_ROUTINE_OPTIONS } from '@/data/routines';
import { villagers } from '@/data/villagers';
import {
  addRoutine,
  clearNpcVisitsForWeek,
  deleteRoutine,
  getActiveIsland,
  getCollectionStatesForIsland,
  getManualGameDate,
  getManualGameTime,
  getNpcVisitsForIsland,
  getRoutineProgressForIsland,
  getRoutinesForIsland,
  getVillagerStatesForIsland,
  initializeDatabase,
  setCollectionStatus,
  setManualGameDate,
  setManualGameTime,
  setNpcVisit,
  setRoutineProgress,
  updateRoutine,
} from '@/db/database';
import type { EncyclopediaItem, EncyclopediaState, EncyclopediaStatus } from '@/types/encyclopedia';
import type { Island, NpcVisit, Routine, RoutineProgress } from '@/types/island';
import type { VillagerState } from '@/types/villager-state';

type TodayScreenProps = { island?: Island | null; routines?: Routine[] };
type CalendarMode = 'week' | 'month';
type CalendarItemKind = 'birthday' | 'event';
type CalendarItem = { id: string; kind: CalendarItemKind; label: string };
type CritterTab = 'bugs' | 'fish' | 'sea' | 'newThisMonth' | 'leavingThisMonth';
type CritterCategory = 'bugs' | 'fish' | 'sea';
type TodaySectionIcon = 'summary' | 'routine' | 'npc' | 'critter' | 'calendar';
type TodayActionIcon = 'edit' | 'reset' | 'open';

const EMPTY_STATE: EncyclopediaState = { caught: false, owned: false, donated: false, genuineOwned: false, fakeOwned: false };
const DEFAULT_ROUTINE_TITLES = new Set(DEFAULT_ROUTINE_OPTIONS.map((routine) => routine.title));
const CRITTER_CATEGORIES: CritterCategory[] = ['bugs', 'fish', 'sea'];
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const ROUTINE_MARKS = ['DIY', '$', 'R', 'F', 'T', 'F', 'B', '$', 'S', 'N', 'DIY', 'D', 'S', 'K', 'M', 'M', 'FR', 'VG', 'G'];
const DAY_NPC_OPTIONS = ['레온', '저스틴', '고숙이', '사하라', '패트릭', '여욱', '늘봉'];
const WEEKEND_NPC_OPTIONS = ['K.K.', '무파니'];
const NIGHT_NPC_OPTIONS = ['부옥', '깨빈'];
const NPC_OPTIONS = [...DAY_NPC_OPTIONS, ...WEEKEND_NPC_OPTIONS, ...NIGHT_NPC_OPTIONS];
const NPC_ASSET_KEYS: Record<string, string> = {
  레온: 'flick',
  저스틴: 'c-j',
  고숙이: 'label',
  사하라: 'saharah',
  패트릭: 'kicks',
  여욱: 'redd',
  늘봉: 'leif',
  'K.K.': 'k-k-slider',
  무파니: 'daisy-mae',
  부옥: 'celeste',
  깨빈: 'wisp',
};
const NPC_ICON_LABELS: Record<string, string> = {
  레온: '레',
  저스틴: '저',
  고숙이: '고',
  사하라: '사',
  패트릭: '패',
  여욱: '여',
  늘봉: '늘',
  'K.K.': 'KK',
  무파니: '무',
  부옥: '부',
  깨빈: '깨',
};

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

function getCurrentGameTime(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    timeZone: timezone,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  const safeHour = Number.isInteger(hour) ? (hour === 24 ? 0 : hour) : 0;
  return `${String(safeHour).padStart(2, '0')}:${String(Number.isInteger(minute) ? minute : 0).padStart(2, '0')}`;
}

function isValidGameTime(value: string | null) {
  if (!value) return false;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function parseGameTimeToMinute(value: string) {
  if (!isValidGameTime(value)) return 0;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
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

function formatMonthDayShort(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', timeZone: 'UTC' }).format(parseIsoDate(value) ?? new Date());
}

function formatWeekdayShort(value: string) {
  const date = parseIsoDate(value);
  return date ? `${DAY_LABELS[date.getUTCDay()] ?? ''}요일` : '';
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

function monthDayKey(month: number, day: number) {
  return month * 100 + day;
}

function isMonthDayInRange(month: number, day: number, start: number, end: number) {
  const key = monthDayKey(month, day);
  return start <= end ? key >= start && key <= end : key >= start || key <= end;
}

const RECIPE_SEASONS = [
  { key: 'young_spring_bamboo', label: '봄의 대나무', north: [[225, 531]], south: [[825, 1130]] },
  { key: 'cherry_blossom', label: '벚꽃', north: [[401, 410]], south: [[1001, 1010]] },
  { key: 'summer_shell', label: '여름 조개껍데기', north: [[601, 831]], south: [[1201, 224]] },
  { key: 'tree_bounty', label: '도토리/솔방울', north: [[901, 1210]], south: [[301, 610]] },
  { key: 'maple_leaf', label: '단풍잎', north: [[1116, 1125]], south: [[516, 525]] },
  { key: 'mushroom', label: '버섯', north: [[1101, 1130]], south: [[501, 531]] },
  { key: 'winter_snowflake', label: '눈의 결정', north: [[1211, 224]], south: [[611, 824]] },
  { key: 'christmas_ornament', label: '크리스마스 오너먼트', north: [[1215, 106]], south: [[615, 706]] },
] as const;

const NOOK_SHOPPING_WINDOWS: Record<string, Array<[number, number]>> = {
  '포도 수확 바구니': [[901, 930]],
  '포도알 12개': [[901, 930]],
  '달맞이떡': [[912, 921]],
  '송편': [[912, 921]],
  '월병': [[912, 921]],
  '보름달 러그': [[912, 921]],
};

function normalizeSeason(value: unknown) {
  if (value === 'Fall' || value === 'Autumn') return '가을';
  return typeof value === 'string' ? value : '';
}

function getRecipeFilters(item: ReturnType<typeof getCatalogItems>[number]) {
  const filters = item.details.recipeFilters;
  return Array.isArray(filters) ? filters.map(String) : [];
}

function getActiveRecipeSeasons(month: number, day: number, hemisphere: Island['hemisphere']) {
  const side = hemisphere === 'south' ? 'south' : 'north';
  return RECIPE_SEASONS.filter((season) => season[side].some(([start, end]) => isMonthDayInRange(month, day, start, end)));
}

function summarizeNames(names: string[], emptyLabel: string) {
  if (!names.length) return emptyLabel;
  const visible = names.slice(0, 3).join(', ');
  return names.length > 3 ? `${visible} 외 ${names.length - 3}개` : visible;
}

function getNookShoppingItems(month: number, day: number, season: string) {
  return getCatalogItems('seasonal_recipes')
    .concat(getCatalogItems('furniture'), getCatalogItems('interior'), getCatalogItems('clothing'), getCatalogItems('items'), getCatalogItems('special_items'))
    .filter((item) => `${item.source ?? ''} ${item.sourceNotes ?? ''}`.includes('너굴 쇼핑'))
    .filter((item) => {
      const windows = NOOK_SHOPPING_WINDOWS[item.nameKo];
      if (windows?.some(([start, end]) => isMonthDayInRange(month, day, start, end))) return true;
      return String(item.sourceNotes ?? '').includes('계절 한정') && normalizeSeason(item.details.seasonality) === season;
    });
}

function isNthWeekday(date: Date, nth: number, weekday: number) {
  if (date.getUTCDay() !== weekday) return false;
  const firstDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).getUTCDay();
  const firstWeekdayDate = 1 + ((weekday - firstDay + 7) % 7);
  return date.getUTCDate() === firstWeekdayDate + (nth - 1) * 7;
}

function getTodayEventNames(date: Date, hemisphere: Island['hemisphere']) {
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const events: string[] = [];

  if ([1, 4, 7, 10].includes(month) && isNthWeekday(date, 2, 6)) events.push('낚시대회');
  if (hemisphere === 'south') {
    if ([1, 2, 11, 12].includes(month) && isNthWeekday(date, 3, 6)) events.push('곤충채집대회');
  } else if ([6, 7, 8, 9].includes(month) && isNthWeekday(date, 4, 6)) {
    events.push('곤충채집대회');
  }
  if (month === 8 && date.getUTCDay() === 0) events.push('불꽃놀이');
  if (month === 5 && day >= 1 && day <= 7) events.push('근로자의 날 투어');
  if (month === 5 && day >= 18 && day <= 31) events.push('국제 박물관 데이');
  if (month === 6) events.push('웨딩 시즌');
  if (month === 10 && day === 31) events.push('할로윈');
  if (month === 11 && isNthWeekday(date, 4, 4)) events.push('추수감사절');
  if (month === 12 && day === 24) events.push('크리스마스 이브');
  if (month === 12 && day === 31) events.push('카운트다운');

  return events;
}

function getCalendarItemsForDate(date: string, hemisphere: Island['hemisphere'], residentVillagerIds?: Set<string>): CalendarItem[] {
  const dateObject = parseIsoDate(date);
  if (!dateObject) return [];

  const month = dateObject.getUTCMonth() + 1;
  const day = dateObject.getUTCDate();
  const birthdays = villagers
    .filter((villager) => villager.birth_month === month && villager.birth_day === day)
    .filter((villager) => !residentVillagerIds || residentVillagerIds.has(villager.id))
    .map((villager) => ({
      id: `birthday-${villager.id}`,
      kind: 'birthday' as const,
      label: `${villager.name_ko} 생일`,
    }));
  const events = getTodayEventNames(dateObject, hemisphere).map((eventName, index) => ({
    id: `event-${date}-${index}`,
    kind: 'event' as const,
    label: eventName,
  }));

  return [...birthdays, ...events];
}

function getCalendarGridCells(mode: CalendarMode, dates: string[]) {
  if (mode === 'week') return dates;
  const firstDate = dates[0] ? parseIsoDate(dates[0]) : null;
  const leadingDays = firstDate?.getUTCDay() ?? 0;
  return [
    ...Array.from({ length: leadingDays }, () => null),
    ...dates,
  ];
}

function sortNpcNames(names: string[]) {
  return NPC_OPTIONS.filter((name) => names.includes(name));
}

function getDefaultNpcNames(date: string) {
  const dateObject = parseIsoDate(date) ?? new Date();
  const dayIndex = dateObject.getUTCDay();
  if (dayIndex === 6) return ['K.K.'];
  if (dayIndex === 0) return ['무파니'];
  return [];
}

function getResolvedNpcNames(date: string, visits: Record<string, string[]>) {
  return sortNpcNames(Object.prototype.hasOwnProperty.call(visits, date) ? visits[date] : getDefaultNpcNames(date));
}

function toggleNpcName(names: string[], name: string) {
  if (names.includes(name)) {
    return sortNpcNames(names.filter((item) => item !== name));
  }
  if (DAY_NPC_OPTIONS.includes(name)) {
    return sortNpcNames([...names.filter((item) => !DAY_NPC_OPTIONS.includes(item)), name]);
  }
  return sortNpcNames([...names, name]);
}

function getNpcIconLabel(name: string | null) {
  return name ? NPC_ICON_LABELS[name] ?? name.slice(0, 1) : '+';
}

function getNpcAssetForName(name: string | null) {
  if (!name) return null;
  const key = NPC_ASSET_KEYS[name];
  return key ? npcAssets[key] ?? null : null;
}

function getNpcDisplayLabel(names: string[]) {
  if (names.length <= 2) return names.join('\n');
  return `${names[0]}\n외 ${names.length - 1}명`;
}

function getRoutineMark(title: string) {
  const defaultIndex = DEFAULT_ROUTINE_OPTIONS.findIndex((routine) => routine.title === title);
  if (defaultIndex >= 0) return ROUTINE_MARKS[defaultIndex] ?? 'OK';
  return title.trim().slice(0, 2).toUpperCase() || 'OK';
}

function getCritterStateRank(state: EncyclopediaState) {
  if (!state.caught) return 0;
  if (!state.donated) return 1;
  return 2;
}

function getCategoryLabel(category: CritterCategory) {
  if (category === 'fish') return '물고기';
  if (category === 'bugs') return '곤충';
  return '해산물';
}

function isAvailableNow(item: EncyclopediaItem, island: Island, gameDate: string, gameTime: string) {
  const date = parseIsoDate(gameDate);
  if (!date) return false;
  const month = date.getUTCMonth() + 1;
  const availability = item.availability[island.hemisphere === 'south' ? 'south' : 'north'];
  return isAvailableAtMinute(availability, month, parseGameTimeToMinute(gameTime));
}

export function TodayScreen({ island: initialIsland, routines: initialRoutines }: TodayScreenProps) {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [island, setIsland] = useState<Island | null>(initialIsland ?? null);
  const [routines, setRoutines] = useState<Routine[]>(initialRoutines ?? []);
  const [gameDate, setGameDateState] = useState('');
  const [manualTime, setManualTime] = useState<string | null>(null);
  const [routineProgress, setRoutineProgressState] = useState<Record<string, RoutineProgress>>({});
  const [collectionStates, setCollectionStates] = useState<Record<string, EncyclopediaState>>({});
  const [villagerStates, setVillagerStates] = useState<Record<string, VillagerState>>({});
  const [npcVisits, setNpcVisits] = useState<Record<string, string[]>>({});
  const [npcDate, setNpcDate] = useState<string | null>(null);
  const [dateTimeModalOpen, setDateTimeModalOpen] = useState(false);
  const [routineModalOpen, setRoutineModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineGoal, setRoutineGoal] = useState('1');
  const [clockNow, setClockNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setClockNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const refresh = useCallback(() => {
    try {
      initializeDatabase();
      const activeIsland = getActiveIsland();
      setIsland(activeIsland);
      if (!activeIsland) return;
      const savedManualDate = getManualGameDate();
      const savedManualTime = getManualGameTime();
      const validManualDate = savedManualDate && parseIsoDate(savedManualDate) ? savedManualDate : null;
      const validManualTime = isValidGameTime(savedManualTime) ? savedManualTime : null;
      const date = validManualDate ?? getGameDate(activeIsland.timezone ?? 'Asia/Seoul');
      setManualTime(validManualTime);
      setGameDateState(date);
      const nextRoutines = getRoutinesForIsland(activeIsland.id);
      setRoutines(nextRoutines);
      setRoutineProgressState(getRoutineProgressForIsland(activeIsland.id, date));
      setCollectionStates(getCollectionStatesForIsland(activeIsland.id));
      setVillagerStates(getVillagerStatesForIsland(activeIsland.id));
      const week = getWeekDates(date);
      setNpcVisits(getNpcVisitsForIsland(activeIsland.id, week[0], week[6]));
    } catch {
      Alert.alert('오늘 기록을 불러오지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  }, []);

  useFocusEffect(refresh);

  const applyGameDateTime = (date: string, time: string) => {
    try {
      if (!parseIsoDate(date) || !isValidGameTime(time)) throw new Error('VALIDATION_ERROR');
      setManualGameDate(date);
      setManualGameTime(time);
      setManualTime(time);
      setGameDateState(date);
      if (island) setRoutineProgressState(getRoutineProgressForIsland(island.id, date));
      setDateTimeModalOpen(false);
    } catch {
      Alert.alert('게임 날짜와 시간을 변경하지 못했어요', '날짜와 시간을 다시 확인해 주세요.');
    }
  };

  const resetGameDateTime = () => {
    try {
      setManualGameDate(null);
      setManualGameTime(null);
      setManualTime(null);
      const next = island ? getGameDate(island.timezone ?? 'Asia/Seoul') : '';
      setGameDateState(next);
      if (island) setRoutineProgressState(getRoutineProgressForIsland(island.id, next));
      setDateTimeModalOpen(false);
    } catch {
      Alert.alert('현실 시간으로 돌리지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  };

  const dateObject = parseIsoDate(gameDate) ?? new Date();
  const month = dateObject.getUTCMonth() + 1;
  const day = dateObject.getUTCDate();
  const season = seasonFor(month, island?.hemisphere ?? 'north');
  const zodiac = zodiacFor(month, day);
  const timezone = island?.timezone ?? 'Asia/Seoul';
  const hemisphere = island?.hemisphere ?? 'north';
  const gameTime = manualTime ?? getCurrentGameTime(clockNow, timezone);
  const availableCritters = useMemo(() => {
    if (!island || !gameDate) return [];

    const sourceItems = CRITTER_CATEGORIES.flatMap((category) => getEncyclopediaItems(category));

    return sourceItems.filter((item) => {
      if (!isAvailableNow(item, island, gameDate, gameTime)) return false;
      return true;
    });
  }, [gameDate, gameTime, island]);
  const calendarDates = useMemo(() => gameDate ? getWeekDates(gameDate) : [], [gameDate]);
  const residentVillagerIds = useMemo(
    () => new Set(Object.entries(villagerStates).filter(([, state]) => state.islandResident).map(([key]) => key.split('/').pop() ?? key)),
    [villagerStates],
  );
  const calendarItemsByDate = useMemo(() => Object.fromEntries(calendarDates.map((date) => {
    const items = getCalendarItemsForDate(date, hemisphere, residentVillagerIds);
    return [date, items];
  }).filter(([, items]) => items.length)), [calendarDates, hemisphere, residentVillagerIds]);
  const selectedDefaultRoutineTitles = useMemo(
    () => routines.filter((routine) => DEFAULT_ROUTINE_TITLES.has(routine.title)).map((routine) => routine.title),
    [routines],
  );
  const activeRecipeSeasons = getActiveRecipeSeasons(month, day, hemisphere);
  const seasonalRecipeSummary = activeRecipeSeasons.length
    ? activeRecipeSeasons.map((recipeSeason) => {
      const count = getCatalogItems('seasonal_recipes').filter((item) => getRecipeFilters(item).includes(`season:${recipeSeason.key}`)).length;
      return `${recipeSeason.label} ${count}개`;
    }).join(', ')
    : '진행 중인 시즌 없음';
  const nookShoppingItems = getNookShoppingItems(month, day, season);
  const nookShoppingSummary = summarizeNames(nookShoppingItems.map((item) => item.nameKo), '오늘 판매 시즌 아이템 없음');
  const todayBirthdays = villagers
    .filter((villager) => villager.birth_month === month && villager.birth_day === day)
    .filter((villager) => residentVillagerIds.has(villager.id))
    .map((villager) => `${villager.name_ko} 생일`);
  const todayEventSummary = summarizeNames(getTodayEventNames(dateObject, hemisphere), '이벤트 없음');
  const bloomingBushes = getBloomingBushes(month, day, hemisphere);
  const allMonthlyCritters = CRITTER_CATEGORIES.flatMap((category) => getEncyclopediaItems(category));
  const leavingThisMonthCount = allMonthlyCritters.filter((item) => getMonthlyAvailabilityFlags(item, hemisphere, month).isLeavingThisMonth).length;
  const newThisMonthCount = allMonthlyCritters.filter((item) => getMonthlyAvailabilityFlags(item, hemisphere, month).isNewThisMonth).length;
  const prioritizedCritters = [...availableCritters].sort((a, b) => {
    const aState = collectionStates[`${a.category}/${a.id}`] ?? EMPTY_STATE;
    const bState = collectionStates[`${b.category}/${b.id}`] ?? EMPTY_STATE;
    const rankDiff = getCritterStateRank(aState) - getCritterStateRank(bState);
    if (rankDiff !== 0) return rankDiff;
    return a.nameKo.localeCompare(b.nameKo, 'ko-KR');
  });
  const progressNeededCritters = prioritizedCritters.filter((item) => {
    const state = collectionStates[`${item.category}/${item.id}`] ?? EMPTY_STATE;
    return getCritterStateRank(state) < 2;
  });
  const critterPreviewItems = (progressNeededCritters.length ? progressNeededCritters : prioritizedCritters).slice(0, 4);
  const progressCountsByCategory = CRITTER_CATEGORIES.map((category) => ({
    category,
    count: progressNeededCritters.filter((item) => item.category === category).length,
  })).filter((item) => item.count > 0);

  const toggleRoutine = (routine: Routine) => {
    if (!island || !gameDate) return;
    const current = routineProgress[routine.id]?.currentCount ?? 0;
    const next = current >= routine.goalCount ? 0 : routine.goalCount;
    try {
      setRoutineProgress(island.id, routine.id, gameDate, next, routine.goalCount);
      setRoutineProgressState((currentState) => ({ ...currentState, [routine.id]: { currentCount: next, isComplete: next >= routine.goalCount } }));
    } catch {
      Alert.alert('루틴을 저장하지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  };

  const saveRoutineEdit = () => {
    if (!island) return;
    try {
      const goal = Number(routineGoal);
      if (editingRoutine) updateRoutine(editingRoutine.id, routineTitle, goal);
      setRoutines(getRoutinesForIsland(island.id));
      setRoutineModalOpen(false);
    } catch {
      Alert.alert('루틴을 저장하지 못했어요', '이름과 목표 횟수를 확인해 주세요.');
    }
  };

  const saveRoutineSelection = (selectedTitles: string[], customTitle: string, customGoal: string) => {
    if (!island) return;
    try {
      const selectedTitleSet = new Set(selectedTitles);
      const currentDefaultRoutines = new Map(
        routines
          .filter((routine) => DEFAULT_ROUTINE_TITLES.has(routine.title))
          .map((routine) => [routine.title, routine]),
      );

      for (const option of DEFAULT_ROUTINE_OPTIONS) {
        const existingRoutine = currentDefaultRoutines.get(option.title);
        if (selectedTitleSet.has(option.title) && !existingRoutine) {
          addRoutine(island.id, option.title, option.goalCount);
        }
        if (!selectedTitleSet.has(option.title) && existingRoutine) {
          deleteRoutine(existingRoutine.id);
        }
      }

      if (customTitle.trim()) {
        addRoutine(island.id, customTitle, Number(customGoal));
      }

      setRoutines(getRoutinesForIsland(island.id));
      setRoutineModalOpen(false);
    } catch {
      Alert.alert('루틴을 저장하지 못했어요', '선택한 루틴과 목표 횟수를 확인해 주세요.');
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

  const saveNpc = (names: string[]) => {
    if (!island || !npcDate) return;
    const npcNames = sortNpcNames(names);
    const visit: NpcVisit = { islandId: island.id, visitDate: npcDate, npcNames };
    try {
      setNpcVisit(visit);
      setNpcVisits((current) => {
        const next = { ...current };
        next[npcDate] = npcNames;
        return next;
      });
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
      <AppChrome contextLabel={island.name} title="오늘" />
      <SafeAreaView edges={[]} style={[styles.safeArea, { backgroundColor: AppColors.background }]}>
        <ScrollView contentContainerStyle={todayStyles.content} ref={scrollRef} showsVerticalScrollIndicator={false}>
          <View style={todayStyles.summaryCard}>
            <View style={todayStyles.summaryHeader}>
              <View style={todayStyles.summaryTitleBlock}>
                <SectionGlyph kind="summary" tone="leaf" />
                <Text style={todayStyles.summaryTitle}>오늘의 섬 요약</Text>
              </View>
            </View>
            <Pressable
              accessibilityLabel="게임 날짜와 시간 변경"
              accessibilityRole="button"
              onPress={() => setDateTimeModalOpen(true)}
              style={({ pressed }) => [todayStyles.dateTimeControl, pressed && todayStyles.dateTimeControlPressed]}>
              <View style={todayStyles.dateBlock}>
                <Text numberOfLines={1} style={todayStyles.dateBlockMonth}>{formatMonthDayShort(gameDate)}</Text>
                <Text numberOfLines={1} style={todayStyles.dateBlockZone}>{formatWeekdayShort(gameDate)}</Text>
              </View>
              <View style={todayStyles.dateTimeDivider} />
              <View style={todayStyles.timeBlock}>
                <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={todayStyles.timeBlockValue}>{gameTime}</Text>
                <ActionGlyph kind="edit" tone="leaf" />
              </View>
            </Pressable>
            <View style={todayStyles.summaryGrid}>
              <SummaryItem label="시즌" value={season} mark="SE" tone="leaf" />
              <SummaryItem label="시즌 레시피" value={seasonalRecipeSummary} mark="DIY" tone="catalog" />
              <SummaryItem label="별자리" value={zodiac} mark="ST" tone="museum" />
              <SummaryItem label="개화 낮은나무" value={bloomingBushes.length ? bloomingBushes.map((bush) => bush.nameKo).join(', ') : '개화 중인 낮은나무 없음'} mark="FL" tone="leaf">
                <BloomingBushIcons bushes={bloomingBushes} />
              </SummaryItem>
              <SummaryItem label="이벤트" value={todayEventSummary} mark="EV" tone="camp" />
              <SummaryItem label="월말 생물" value={`종료 ${leavingThisMonthCount} · 신규 ${newThisMonthCount}`} mark="CR" tone="museum" />
              {todayBirthdays.length ? <SummaryItem label="우리 섬 생일" value={todayBirthdays.join(', ')} mark="BD" tone="resident" /> : null}
            </View>
          </View>

          <SectionHeader icon="routine" title="매일 루틴" actionIcon="edit" actionLabel="루틴 편집" onAction={() => { setEditingRoutine(null); setRoutineTitle(''); setRoutineGoal('1'); setRoutineModalOpen(true); }} />
          <RoutineGrid progressById={routineProgress} routines={routines} onToggle={toggleRoutine} />

          <SectionHeader icon="npc" tone="resident" title="이번 주 방문 NPC" actionIcon="reset" actionLabel="주간 초기화" onAction={() => { clearNpcVisitsForWeek(island.id, weekDates[0], weekDates[6]); setNpcVisits({}); }} />
          <NpcWeekCard currentDate={gameDate} visits={npcVisits} weekDates={weekDates} onSelectDate={setNpcDate} />

          <CritterPreview
            availableCount={availableCritters.length}
            categoryCounts={progressCountsByCategory}
            items={critterPreviewItems}
            progressNeededCount={progressNeededCritters.length}
            month={month}
            hemisphere={island.hemisphere === 'south' ? 'south' : 'north'}
            states={collectionStates}
            onOpenFull={() => router.push('/encyclopedia')}
            onToggle={updateCritterStatus}
          />

          <CalendarPreview currentDate={gameDate} dates={weekDates} itemsByDate={calendarItemsByDate} />
        </ScrollView>
        <FloatingTopButton
          accessibilityLabel="오늘 화면 맨 위로 이동"
          onPress={() => scrollRef.current?.scrollTo({ animated: true, y: 0 })}
        />
        <DateTimeModal date={gameDate} time={gameTime} visible={dateTimeModalOpen} onApply={applyGameDateTime} onClose={() => setDateTimeModalOpen(false)} onReset={resetGameDateTime} />
        <NpcModal date={npcDate} selectedNames={npcDate ? getResolvedNpcNames(npcDate, npcVisits) : []} visible={Boolean(npcDate)} onClose={() => setNpcDate(null)} onSave={saveNpc} />
        <RoutineModal visible={routineModalOpen} editingRoutine={editingRoutine} title={routineTitle} goal={routineGoal} selectedDefaultTitles={selectedDefaultRoutineTitles} onChangeTitle={setRoutineTitle} onChangeGoal={setRoutineGoal} onClose={() => setRoutineModalOpen(false)} onSaveEdit={saveRoutineEdit} onSaveSelection={saveRoutineSelection} onDelete={editingRoutine ? () => { setRoutineModalOpen(false); removeRoutine(editingRoutine); } : undefined} />
      </SafeAreaView>
    </View>
  );
}

type TileTone = 'leaf' | 'resident' | 'museum' | 'catalog' | 'camp';

function getTone(tone: TileTone) {
  if (tone === 'resident') return { backgroundColor: AppColors.residentSoft, borderColor: '#F2B6AC', color: AppColors.resident };
  if (tone === 'museum') return { backgroundColor: AppColors.museumSoft, borderColor: '#A7D3EA', color: AppColors.museum };
  if (tone === 'catalog') return { backgroundColor: AppColors.catalogSoft, borderColor: '#EBC276', color: AppColors.catalog };
  if (tone === 'camp') return { backgroundColor: AppColors.campSoft, borderColor: '#9AD8D0', color: AppColors.camp };
  return { backgroundColor: AppColors.leafSoft, borderColor: '#BFD7A7', color: AppColors.leaf };
}

function SectionHeader({
  actionIcon,
  actionLabel,
  icon,
  title,
  tone = 'leaf',
  onAction,
}: {
  actionIcon?: TodayActionIcon;
  actionLabel?: string;
  icon: TodaySectionIcon;
  title: string;
  tone?: TileTone;
  onAction?: () => void;
}) {
  return (
    <View style={todayStyles.sectionHeader}>
      <View style={todayStyles.sectionTitleWrap}>
        <SectionGlyph kind={icon} tone={tone} />
        <Text adjustsFontSizeToFit minimumFontScale={0.86} numberOfLines={1} style={todayStyles.sectionTitle}>{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityLabel={actionLabel} accessibilityRole="button" onPress={onAction} style={actionIcon ? todayStyles.sectionIconActionButton : todayStyles.sectionActionButton}>
          {actionIcon ? <ActionGlyph kind={actionIcon} tone={tone} /> : <Text style={todayStyles.sectionAction}>{actionLabel}</Text>}
        </Pressable>
      ) : null}
    </View>
  );
}

function SectionGlyph({ kind, tone }: { kind: TodaySectionIcon; tone: TileTone }) {
  const colors = getTone(tone);
  const iconName = kind === 'summary'
    ? 'island'
    : kind === 'routine'
      ? 'format-list-checks'
      : kind === 'npc'
        ? 'account-star-outline'
        : kind === 'critter'
          ? 'butterfly-outline'
          : 'calendar-week-outline';
  return (
    <View style={[todayStyles.sectionGlyph, { backgroundColor: colors.backgroundColor, borderColor: colors.borderColor }]}>
      <MaterialCommunityIcons color={colors.color as ColorValue} name={iconName} size={18} />
    </View>
  );
}

function ActionGlyph({ kind, tone }: { kind: TodayActionIcon; tone: TileTone }) {
  const colors = getTone(tone);
  const iconName = kind === 'edit' ? 'pencil-outline' : kind === 'reset' ? 'restart' : 'chevron-right';
  return (
    <View style={todayStyles.actionGlyph}>
      <MaterialCommunityIcons color={colors.color as ColorValue} name={iconName} size={kind === 'open' ? 20 : 19} />
    </View>
  );
}

function SummaryItem({
  children,
  label,
  value,
  mark,
  tone,
}: {
  children?: ReactNode;
  label: string;
  value: string;
  mark: string;
  tone: TileTone;
}) {
  const colors = getTone(tone);
  return (
    <View style={[todayStyles.summaryItem, { backgroundColor: colors.backgroundColor, borderColor: colors.borderColor }]}>
      <View style={[todayStyles.summaryMark, { backgroundColor: AppColors.card }]}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={[todayStyles.summaryMarkText, { color: colors.color }]}>{mark}</Text>
      </View>
      <View style={todayStyles.summaryItemCopy}>
        <Text style={todayStyles.summaryItemLabel}>{label}</Text>
        {children ?? <Text numberOfLines={2} style={todayStyles.summaryItemValue}>{value}</Text>}
      </View>
    </View>
  );
}

function BloomingBushIcons({ bushes }: { bushes: BloomingBush[] }) {
  if (!bushes.length) {
    return <Text numberOfLines={2} style={todayStyles.summaryItemValue}>개화 중인 낮은나무 없음</Text>;
  }

  return (
    <View accessibilityLabel={`개화 중인 낮은나무 ${bushes.map((bush) => bush.nameKo).join(', ')}`} style={todayStyles.bushIconRow}>
      {bushes.map((bush) => (
        <View key={bush.id} style={todayStyles.bushIconChip}>
          <Image accessibilityLabel={bush.nameKo} resizeMode="contain" source={bush.icon} style={todayStyles.bushIconImage} />
        </View>
      ))}
    </View>
  );
}

function RoutineGrid({ routines, progressById, onToggle }: { routines: Routine[]; progressById: Record<string, RoutineProgress>; onToggle: (routine: Routine) => void }) {
  if (!routines.length) {
    return <Text style={todayStyles.noData}>루틴 편집에서 표시할 루틴을 선택해 주세요.</Text>;
  }

  return (
    <View style={todayStyles.routineCard}>
      {routines.map((routine) => {
        const progress = progressById[routine.id]?.currentCount ?? 0;
        const complete = progress >= routine.goalCount;
        return (
          <Pressable
            accessibilityLabel={`${routine.title} ${complete ? '완료' : '미완료'}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: complete }}
            key={routine.id}
            onPress={() => onToggle(routine)}
            style={[todayStyles.routineTile, !complete && todayStyles.routineTileIdle, complete && todayStyles.routineTileComplete]}>
            <View style={[todayStyles.routineIcon, complete && todayStyles.routineIconComplete]}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[todayStyles.routineIconText, complete && todayStyles.routineIconTextComplete]}>
                {getRoutineMark(routine.title)}
              </Text>
            </View>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              numberOfLines={2}
              style={[todayStyles.routineTileText, !complete && todayStyles.routineTileTextIdle, complete && todayStyles.routineTileTextComplete]}>
              {routine.title}
            </Text>
            {complete ? (
              <View style={todayStyles.routineCheckBadge}>
                <Text style={todayStyles.routineCheckText}>✓</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
function NpcWeekCard({ currentDate, visits, weekDates, onSelectDate }: { currentDate: string; visits: Record<string, string[]>; weekDates: string[]; onSelectDate: (date: string) => void }) {
  return (
    <View style={todayStyles.npcCard}>
      {weekDates.map((date) => {
        const dateObject = parseIsoDate(date) ?? new Date();
        const weekday = DAY_LABELS[dateObject.getUTCDay()] ?? '';
        const npcs = getResolvedNpcNames(date, visits);
        const isCurrentDate = date === currentDate;
        const hasNpcs = npcs.length > 0;

        return (
          <Pressable
            accessibilityLabel={`${formatDate(date)} 방문 NPC ${hasNpcs ? npcs.join(', ') : '선택 안 됨'}`}
            accessibilityRole="button"
            key={date}
            onPress={() => onSelectDate(date)}
            style={[todayStyles.npcDayCell, isCurrentDate && todayStyles.npcDayCellToday]}>
            <Text style={[todayStyles.npcWeekday, isCurrentDate && todayStyles.npcWeekdayToday]}>{isCurrentDate ? '오늘' : weekday}</Text>
            <View style={todayStyles.npcAvatarStack}>
              {hasNpcs ? npcs.map((npc) => (
                <NpcAvatar current={isCurrentDate} key={npc} name={npc} />
              )) : (
                <NpcAvatar current={isCurrentDate} empty name={null} />
              )}
            </View>
            <Text numberOfLines={1} style={[todayStyles.npcName, !hasNpcs && todayStyles.npcNameEmpty]}>{hasNpcs ? getNpcDisplayLabel(npcs).replace('\n', ' ') : '선택'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function NpcAvatar({
  current = false,
  empty = false,
  name,
  selected = false,
  variant = 'week',
}: {
  current?: boolean;
  empty?: boolean;
  name: string | null;
  selected?: boolean;
  variant?: 'week' | 'option';
}) {
  const asset = getNpcAssetForName(name);
  return (
    <View
      style={[
        todayStyles.npcAvatar,
        variant === 'option' && todayStyles.npcOptionAvatar,
        empty && todayStyles.npcAvatarEmpty,
        current && todayStyles.npcAvatarToday,
        selected && todayStyles.npcAvatarSelected,
      ]}>
      {asset ? (
        <Image source={asset.icon} style={variant === 'option' ? todayStyles.npcOptionAvatarImage : todayStyles.npcAvatarImage} />
      ) : (
        <Text style={[todayStyles.npcAvatarText, empty && todayStyles.npcAvatarEmptyText]}>{getNpcIconLabel(name)}</Text>
      )}
    </View>
  );
}

function CritterPreview({
  availableCount,
  categoryCounts,
  hemisphere,
  items,
  month,
  progressNeededCount,
  states,
  onOpenFull,
  onToggle,
}: {
  availableCount: number;
  categoryCounts: Array<{ category: CritterCategory; count: number }>;
  hemisphere: 'north' | 'south';
  items: EncyclopediaItem[];
  month: number;
  progressNeededCount: number;
  states: Record<string, EncyclopediaState>;
  onOpenFull: () => void;
  onToggle: (item: EncyclopediaItem, status: EncyclopediaStatus) => void;
}) {
  return (
    <View style={todayStyles.critterSection}>
      <View style={todayStyles.sectionHeader}>
        <View style={todayStyles.sectionTitleWrap}>
          <SectionGlyph kind="critter" tone="museum" />
          <Text adjustsFontSizeToFit minimumFontScale={0.86} numberOfLines={1} style={todayStyles.sectionTitle}>지금 잡을 수 있는 생물</Text>
        </View>
        <Pressable accessibilityLabel={`지금 잡을 수 있는 생물 전체 ${availableCount}개 보기`} accessibilityRole="button" onPress={onOpenFull} style={todayStyles.sectionActionButton}>
          <Text style={[todayStyles.sectionAction, todayStyles.museumAction]}>전체 {availableCount} 보기</Text>
          <ActionGlyph kind="open" tone="museum" />
        </Pressable>
      </View>
      <View style={todayStyles.critterCard}>
        <View style={todayStyles.critterStatRail}>
          <View style={todayStyles.critterMainStat}>
            <Text style={todayStyles.critterStatLabel}>진척 필요</Text>
            <Text style={todayStyles.critterStatValue}>{progressNeededCount}</Text>
          </View>
          <View style={todayStyles.critterCategoryRow}>
            {categoryCounts.length ? categoryCounts.map((item) => (
              <View key={item.category} style={todayStyles.critterCategoryChip}>
                <Text style={todayStyles.critterCategoryText}>{getCategoryLabel(item.category)} {item.count}</Text>
              </View>
            )) : (
              <Text style={todayStyles.critterHelperText}>진척 필요한 생물이 없어요. 전체보기에서 완료 생물까지 확인할 수 있어요.</Text>
            )}
          </View>
        </View>
        <ScrollView contentContainerStyle={todayStyles.critterPreviewList} horizontal showsHorizontalScrollIndicator={false}>
          {items.length ? items.map((item) => {
            const availability = item.availability[hemisphere];
            const availabilityTime = availability.timesByMonth[String(month)] ?? null;
            return (
              <TodayCritterPreviewCard
                key={`${item.category}/${item.id}`}
                availabilityLabel={localizeAvailabilityLabel(availability.label)}
                availabilityTime={localizeAvailabilityTime(availabilityTime)}
                item={item}
                state={states[`${item.category}/${item.id}`] ?? EMPTY_STATE}
                onToggle={(status) => onToggle(item, status)}
              />
            );
          }) : (
            <Text style={todayStyles.noData}>선택한 게임 시간에 출현하는 생물이 없어요.</Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function CalendarPreview({ currentDate, dates, itemsByDate }: { currentDate: string; dates: string[]; itemsByDate: Record<string, CalendarItem[]> }) {
  return (
    <View style={todayStyles.calendarPreview}>
      <SectionHeader icon="calendar" tone="catalog" title="이번 주 한눈에 보기" />
      <View style={todayStyles.calendarStrip}>
        {dates.map((date) => {
          const dateObject = parseIsoDate(date) ?? new Date();
          const isCurrentDate = date === currentDate;
          const items = itemsByDate[date] ?? [];
          const firstItem = items[0];
          return (
            <View key={date} style={[todayStyles.calendarPreviewDay, isCurrentDate && todayStyles.calendarPreviewDayToday]}>
              <Text style={[todayStyles.calendarPreviewWeekday, isCurrentDate && todayStyles.calendarPreviewWeekdayToday]}>{DAY_LABELS[dateObject.getUTCDay()]}</Text>
              <Text style={[todayStyles.calendarPreviewDate, isCurrentDate && todayStyles.calendarPreviewDateToday]}>{dateObject.getUTCDate()}</Text>
              <View style={[todayStyles.calendarDot, firstItem?.kind === 'birthday' && todayStyles.calendarBirthdayDot, firstItem?.kind === 'event' && todayStyles.calendarEventDot]} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

function CalendarSection({
  cells,
  currentDate,
  itemsByDate,
  mode,
  onChangeMode,
}: {
  cells: Array<string | null>;
  currentDate: string;
  itemsByDate: Record<string, CalendarItem[]>;
  mode: CalendarMode;
  onChangeMode: (mode: CalendarMode) => void;
}) {
  const currentDateObject = parseIsoDate(currentDate) ?? new Date();
  const visibleDates = cells.filter((date): date is string => Boolean(date));
  const title = mode === 'week' && visibleDates.length
    ? `${formatMonthDayShort(visibleDates[0])} - ${formatMonthDayShort(visibleDates[visibleDates.length - 1])}`
    : `${currentDateObject.getUTCFullYear()}년 ${currentDateObject.getUTCMonth() + 1}월`;

  return (
    <View style={styles.calendarCard}>
      <View style={styles.calendarToggle}>
        {(['week', 'month'] as CalendarMode[]).map((value) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: mode === value }}
            key={value}
            onPress={() => onChangeMode(value)}
            style={[styles.calendarToggleButton, mode === value && styles.calendarToggleActive]}>
            <Text style={[styles.calendarToggleText, mode === value && styles.calendarToggleTextActive]}>{value === 'week' ? '주간' : '월간'}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.calendarPeriodTitle}>{title}</Text>
      <View style={styles.calendarWeekdayRow}>
        {['일', '월', '화', '수', '목', '금', '토'].map((label) => <Text key={label} style={styles.calendarWeekdayText}>{label}</Text>)}
      </View>
      <View style={styles.calendarBoard}>
        {cells.map((date, index) => (
          date ? (
            <CalendarDayCell
              date={date}
              isCurrentDate={date === currentDate}
              items={itemsByDate[date] ?? []}
              key={date}
              mode={mode}
            />
          ) : (
            <View key={`calendar-empty-${index}`} style={[styles.calendarDayCell, styles.calendarDayCellEmpty]} />
          )
        ))}
      </View>
    </View>
  );
}

function CalendarDayCell({
  date,
  isCurrentDate,
  items,
  mode,
}: {
  date: string;
  isCurrentDate: boolean;
  items: CalendarItem[];
  mode: CalendarMode;
}) {
  const dateObject = parseIsoDate(date) ?? new Date();
  const visibleItems = items.slice(0, mode === 'week' ? 3 : 2);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);

  return (
    <View
      accessibilityLabel={`${formatDate(date)} ${items.length ? items.map((item) => item.label).join(', ') : '기록된 일정 없음'}`}
      style={[
        styles.calendarDayCell,
        mode === 'week' && styles.calendarWeekCell,
        isCurrentDate && styles.calendarDayCellToday,
      ]}>
      <Text style={[styles.calendarDayNumber, isCurrentDate && styles.calendarDayNumberToday]}>{dateObject.getUTCDate()}</Text>
      <View style={styles.calendarItemStack}>
        {visibleItems.map((item) => (
          <View
            key={item.id}
            style={[
              styles.calendarBadge,
              item.kind === 'birthday' ? styles.calendarBirthdayBadge : styles.calendarEventBadge,
            ]}>
            <Text
              numberOfLines={1}
              style={[
                styles.calendarBadgeText,
                item.kind === 'birthday' ? styles.calendarBirthdayText : styles.calendarEventText,
              ]}>
              {item.kind === 'birthday' ? `생일 ${item.label.replace(' 생일', '')}` : item.label}
            </Text>
          </View>
        ))}
        {hiddenCount > 0 ? (
          <Text numberOfLines={1} style={styles.calendarMoreText}>+{hiddenCount}</Text>
        ) : null}
      </View>
    </View>
  );
}
function DateTimeModal({
  date,
  time,
  visible,
  onApply,
  onClose,
  onReset,
}: {
  date: string;
  time: string;
  visible: boolean;
  onApply: (date: string, time: string) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const [draftDate, setDraftDate] = useState(date);
  const [visibleMonth, setVisibleMonth] = useState(date.slice(0, 7));
  const [draftHour, setDraftHour] = useState(0);
  const [draftMinute, setDraftMinute] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setDraftDate(date);
    setVisibleMonth(date.slice(0, 7));
    const [hour, minute] = (isValidGameTime(time) ? time : '00:00').split(':').map(Number);
    setDraftHour(hour);
    setDraftMinute(minute);
  }, [date, time, visible]);

  const monthStart = parseIsoDate(`${visibleMonth}-01`) ?? new Date();
  const year = monthStart.getUTCFullYear();
  const month = monthStart.getUTCMonth() + 1;
  const firstWeekday = monthStart.getUTCDay();
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: dayCount }, (_, index) => index + 1),
  ];

  const changeMonth = (amount: number) => {
    const next = new Date(Date.UTC(year, month - 1 + amount, 1));
    setVisibleMonth(formatIsoDate(next).slice(0, 7));
  };

  const adjustHour = (amount: number) => setDraftHour((current) => (current + amount + 24) % 24);
  const adjustMinute = (amount: number) => setDraftMinute((current) => (current + amount + 60) % 60);
  const draftTime = `${String(draftHour).padStart(2, '0')}:${String(draftMinute).padStart(2, '0')}`;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalBackdrop}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.bottomSheet}>
          <Text style={styles.sheetTitle}>게임 날짜와 시간</Text>
          <View style={styles.calendarHeader}>
            <Pressable accessibilityLabel="이전 달" onPress={() => changeMonth(-1)} style={styles.monthButton}><Text style={styles.monthButtonText}>‹</Text></Pressable>
            <Text style={styles.monthTitle}>{year}년 {month}월</Text>
            <Pressable accessibilityLabel="다음 달" onPress={() => changeMonth(1)} style={styles.monthButton}><Text style={styles.monthButtonText}>›</Text></Pressable>
          </View>
          <View style={styles.weekdayRow}>
            {['일', '월', '화', '수', '목', '금', '토'].map((label) => <Text key={label} style={styles.weekdayText}>{label}</Text>)}
          </View>
          <View style={styles.calendarGrid}>
            {cells.map((dayNumber, index) => {
              const value = dayNumber ? toIsoDate(year, month, dayNumber) : '';
              const selected = value === draftDate;
              return dayNumber ? (
                <Pressable key={value} onPress={() => setDraftDate(value)} style={[styles.dayCell, selected && styles.dayCellSelected]}>
                  <Text style={[styles.dayCellText, selected && styles.dayCellTextSelected]}>{dayNumber}</Text>
                </Pressable>
              ) : <View key={`blank-${index}`} style={styles.dayCell} />;
            })}
          </View>
          <View style={styles.timePicker}>
            <View style={styles.timeColumn}>
              <Text style={styles.timeLabel}>시</Text>
              <Pressable accessibilityLabel="한 시간 올리기" onPress={() => adjustHour(1)} style={styles.timeAdjustButton}><Text style={styles.timeAdjustText}>＋</Text></Pressable>
              <Text style={styles.timeValue}>{String(draftHour).padStart(2, '0')}</Text>
              <Pressable accessibilityLabel="한 시간 내리기" onPress={() => adjustHour(-1)} style={styles.timeAdjustButton}><Text style={styles.timeAdjustText}>－</Text></Pressable>
            </View>
            <Text style={styles.timeDivider}>:</Text>
            <View style={styles.timeColumn}>
              <Text style={styles.timeLabel}>분</Text>
              <Pressable accessibilityLabel="5분 올리기" onPress={() => adjustMinute(5)} style={styles.timeAdjustButton}><Text style={styles.timeAdjustText}>＋</Text></Pressable>
              <Text style={styles.timeValue}>{String(draftMinute).padStart(2, '0')}</Text>
              <Pressable accessibilityLabel="5분 내리기" onPress={() => adjustMinute(-5)} style={styles.timeAdjustButton}><Text style={styles.timeAdjustText}>－</Text></Pressable>
            </View>
          </View>
          <View style={styles.modalActions}>
            <Pressable onPress={onReset} style={styles.resetButton}><Text style={styles.resetButtonText}>현실 시간</Text></Pressable>
            <Pressable onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelButtonText}>취소</Text></Pressable>
            <Pressable onPress={() => onApply(draftDate, draftTime)} style={styles.saveButton}><Text style={styles.saveButtonText}>적용</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
function TodayCritterPreviewCard({
  item,
  availabilityLabel,
  availabilityTime,
  state,
  onToggle,
}: {
  item: EncyclopediaItem;
  availabilityLabel: string | null;
  availabilityTime: string | null;
  state: EncyclopediaState;
  onToggle: (status: EncyclopediaStatus) => void;
}) {
  const image = getEncyclopediaAsset(item.category, item.id);
  const rank = getCritterStateRank(state);
  const statusLabel = rank === 0 ? '미채집' : rank === 1 ? '미기증' : '완료';

  return (
    <View style={todayStyles.critterPreviewItem}>
      <View style={todayStyles.critterPreviewImageFrame}>
        {image ? (
          <Image source={image} resizeMode="contain" style={[todayStyles.critterPreviewImage, !state.caught && todayStyles.critterPreviewImageUncaught]} />
        ) : (
          <Text style={todayStyles.critterFallback}>?</Text>
        )}
      </View>
      <Text numberOfLines={1} style={todayStyles.critterPreviewName}>{item.nameKo}</Text>
      <Text numberOfLines={1} style={todayStyles.critterPreviewMeta}>{localizeLocation(item.location) ?? '출현 장소 정보 없음'}</Text>
      <Text numberOfLines={1} style={todayStyles.critterPreviewMeta}>{availabilityLabel ?? '출현 정보 확인 중'} · {availabilityTime ?? '시간 정보 없음'}</Text>
      <Text style={[todayStyles.critterStateLabel, rank === 0 && todayStyles.critterStateUncaught, rank === 1 && todayStyles.critterStateUndonated]}>{statusLabel}</Text>
      <View style={todayStyles.critterStatus}>
        {(['caught', 'donated'] as EncyclopediaStatus[]).map((status) => (
          <Pressable
            accessibilityLabel={`${item.nameKo} ${status === 'caught' ? '채집' : '기증'} ${state[status] ? '해제' : '설정'}`}
            key={status}
            onPress={() => onToggle(status)}
            style={todayStyles.critterStatusButton}>
            <CollectionStatusIcon active={state[status]} status={status} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

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
  const { isLeavingThisMonth, isNewThisMonth } = getMonthlyAvailabilityFlags(item, hemisphere, month);

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

const dateTimeFieldStyles = StyleSheet.create({
  field: {
    alignItems: 'center',
    backgroundColor: '#F8FBF5',
    borderColor: '#D6E4CF',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    minHeight: 48,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  fieldPressed: {
    backgroundColor: '#EEF6E8',
    borderColor: AppColors.primaryBorder,
  },
  valueBlock: {
    flex: 1,
    minWidth: 0,
  },
  value: {
    color: AppColors.primaryText,
    fontSize: 16,
    fontWeight: '900',
  },
  hint: {
    color: '#819082',
    fontSize: 10,
    marginTop: 3,
  },
  editIcon: {
    color: AppColors.primaryText,
    fontSize: 15,
    fontWeight: '900',
  },
});
function DrawerModal({ island, visible, onClose, onManage }: { island: Island; visible: boolean; onClose: () => void; onManage: () => void }) { return <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}><View style={styles.modalBackdrop}><Pressable onPress={onClose} style={StyleSheet.absoluteFill} /><View style={styles.drawer}><SafeAreaView edges={['top', 'bottom']}><View style={styles.drawerHeader}><Text style={styles.drawerKicker}>ISLAND PASSPORT</Text><Pressable onPress={onClose}><Text style={styles.closeText}>×</Text></Pressable></View><Text style={styles.drawerTitle}>{island.name}</Text><View style={styles.passportCard}><Text style={styles.passportLabel}>주민대표</Text><Text style={styles.passportValue}>{island.playerName ?? '미입력'}</Text><Text style={styles.passportLabel}>섬 정보</Text><Text style={styles.passportValue}>{island.hemisphere === 'south' ? '남반구' : '북반구'} · {island.fruit ?? '과일 미입력'} · {island.flower ?? '꽃 미입력'}</Text></View><Pressable onPress={onManage} style={styles.drawerAction}><Text style={styles.drawerActionText}>섬 추가·변경·수정·삭제</Text><Text style={styles.rowArrow}>›</Text></Pressable><View style={styles.drawerAction}><Text style={styles.drawerMuted}>날씨 데이터 추가</Text><Text style={styles.drawerBadge}>MVP 제외</Text></View><View style={styles.drawerAction}><Text style={styles.drawerMuted}>데이터 출처 및 라이선스</Text><Text style={styles.rowArrow}>›</Text></View></SafeAreaView></View></View></Modal>; }
function NpcModal({
  date,
  selectedNames,
  visible,
  onClose,
  onSave,
}: {
  date: string | null;
  selectedNames: string[];
  visible: boolean;
  onClose: () => void;
  onSave: (names: string[]) => void;
}) {
  const [draftNames, setDraftNames] = useState<string[]>([]);

  useEffect(() => {
    if (visible) setDraftNames(sortNpcNames(selectedNames));
  }, [selectedNames, visible]);

  const renderOption = (name: string) => {
    const selected = draftNames.includes(name);
    return (
      <Pressable
        accessibilityLabel={`${name} ${selected ? '선택됨' : '선택 안 됨'}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        key={name}
        onPress={() => setDraftNames((current) => toggleNpcName(current, name))}
        style={[todayStyles.npcOptionTile, selected && todayStyles.npcOptionTileSelected]}>
        <NpcAvatar name={name} selected={selected} variant="option" />
        {selected ? (
          <View style={todayStyles.npcOptionCheck}>
            <Text style={todayStyles.npcOptionCheckText}>✓</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalBackdrop}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.bottomSheet}>
          <Text style={styles.sheetTitle}>{date ? `${formatDate(date)} 방문 NPC` : '방문 NPC'}</Text>
          <Text style={styles.npcModalHint}>낮 방문 NPC는 하루 한 명만, K.K./무파니와 밤 NPC는 함께 기록할 수 있어요.</Text>
          <Text style={styles.optionGroupTitle}>낮 방문</Text>
          <View style={todayStyles.npcOptionGrid}>{DAY_NPC_OPTIONS.map(renderOption)}</View>
          <Text style={styles.optionGroupTitle}>주말 고정 방문</Text>
          <View style={todayStyles.npcOptionGrid}>{WEEKEND_NPC_OPTIONS.map(renderOption)}</View>
          <Text style={styles.optionGroupTitle}>밤 방문</Text>
          <View style={todayStyles.npcOptionGrid}>{NIGHT_NPC_OPTIONS.map(renderOption)}</View>
          <View style={styles.modalActions}>
            <Pressable onPress={() => setDraftNames([])} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>비우기</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </Pressable>
            <Pressable onPress={() => onSave(draftNames)} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>저장</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
function RoutineModal({
  visible,
  editingRoutine,
  title,
  goal,
  selectedDefaultTitles,
  onChangeTitle,
  onChangeGoal,
  onClose,
  onSaveEdit,
  onSaveSelection,
  onDelete,
}: {
  visible: boolean;
  editingRoutine: Routine | null;
  title: string;
  goal: string;
  selectedDefaultTitles: string[];
  onChangeTitle: (value: string) => void;
  onChangeGoal: (value: string) => void;
  onClose: () => void;
  onSaveEdit: () => void;
  onSaveSelection: (selectedTitles: string[], customTitle: string, customGoal: string) => void;
  onDelete?: () => void;
}) {
  const [draftTitles, setDraftTitles] = useState<string[]>([]);
  const [customTitle, setCustomTitle] = useState('');
  const [customGoal, setCustomGoal] = useState('1');

  useEffect(() => {
    if (!visible || editingRoutine) return;
    setDraftTitles(selectedDefaultTitles);
    setCustomTitle('');
    setCustomGoal('1');
  }, [editingRoutine, selectedDefaultTitles, visible]);

  const toggleTitle = (routineTitle: string) => {
    setDraftTitles((current) => current.includes(routineTitle)
      ? current.filter((item) => item !== routineTitle)
      : [...current, routineTitle]);
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalBackdrop}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.bottomSheet}>
          <Text style={styles.sheetTitle}>{editingRoutine ? '루틴 수정' : '루틴 편집'}</Text>
          {editingRoutine ? (
            <>
              <Text style={styles.modalLabel}>루틴 이름</Text>
              <TextInput accessibilityLabel="루틴 이름" onChangeText={onChangeTitle} placeholder="예: 매일 산책" placeholderTextColor="#A2AAA0" style={styles.modalInput} value={title} />
              <Text style={styles.modalLabel}>목표 횟수</Text>
              <TextInput accessibilityLabel="목표 횟수" keyboardType="number-pad" onChangeText={onChangeGoal} style={styles.modalInput} value={goal} />
              <View style={styles.modalActions}>
                {onDelete ? <Pressable onPress={onDelete} style={styles.deleteButton}><Text style={styles.deleteButtonText}>삭제</Text></Pressable> : null}
                <Pressable onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelButtonText}>취소</Text></Pressable>
                <Pressable onPress={onSaveEdit} style={styles.saveButton}><Text style={styles.saveButtonText}>저장</Text></Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.npcModalHint}>기본 루틴을 선택하면 오늘의 루틴에 바로 표시돼요.</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.optionGroupTitle}>기본 루틴</Text>
                <View style={todayStyles.routineEditGrid}>
                  {DEFAULT_ROUTINE_OPTIONS.map((routine) => {
                    const selected = draftTitles.includes(routine.title);
                    return (
                      <Pressable
                        accessibilityLabel={`${routine.title} ${routine.goalLabel ?? `${routine.goalCount}회`} ${selected ? '선택됨' : '선택 안 됨'}`}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        key={routine.title}
                        onPress={() => toggleTitle(routine.title)}
                        style={[todayStyles.routineEditTile, selected && todayStyles.routineEditTileSelected]}>
                        <Text numberOfLines={1} adjustsFontSizeToFit style={[todayStyles.routineEditMark, selected && todayStyles.routineEditMarkSelected]}>
                          {selected ? '✓' : getRoutineMark(routine.title)}
                        </Text>
                        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72} style={[todayStyles.routineEditLabel, selected && todayStyles.routineEditLabelSelected]}>
                          {routine.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.optionGroupTitle}>직접 추가</Text>
                <TextInput accessibilityLabel="직접 추가할 루틴 이름" onChangeText={setCustomTitle} placeholder="예: 꽃 물주기" placeholderTextColor="#A2AAA0" style={styles.modalInput} value={customTitle} />
                <Text style={styles.modalLabel}>목표 횟수</Text>
                <TextInput accessibilityLabel="직접 추가할 루틴 목표 횟수" keyboardType="number-pad" onChangeText={setCustomGoal} style={styles.modalInput} value={customGoal} />
              </ScrollView>
              <View style={styles.modalActions}>
                <Pressable onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelButtonText}>취소</Text></Pressable>
                <Pressable onPress={() => onSaveSelection(draftTitles, customTitle, customGoal)} style={styles.saveButton}><Text style={styles.saveButtonText}>저장</Text></Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const todayStyles = StyleSheet.create({
  content: { gap: 18, padding: 18, paddingBottom: 112 },
  summaryCard: { backgroundColor: AppColors.card, borderRadius: AppRadii.panel, padding: 14, ...AppShadows.card },
  summaryHeader: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  summaryTitleBlock: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 9, minWidth: 0 },
  summaryTitle: { color: AppColors.ink, flex: 1, fontFamily: Fonts.rounded, fontSize: 20, fontWeight: '900' },
  summaryMeta: { color: AppColors.inkMuted, fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '800', marginTop: 3 },
  dateTimeControl: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderColor: AppColors.primaryBorder, borderRadius: AppRadii.control, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 12, minHeight: 58, paddingHorizontal: 13, paddingVertical: 9 },
  dateTimeControlPressed: { backgroundColor: AppColors.leafSoft },
  dateBlock: { minWidth: 82 },
  dateBlockMonth: { color: AppColors.ink, fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '900', lineHeight: 19 },
  dateBlockZone: { color: AppColors.inkMuted, fontFamily: Fonts.rounded, fontSize: 9, fontWeight: '900', lineHeight: 12, marginTop: 2 },
  dateTimeDivider: { alignSelf: 'stretch', backgroundColor: AppColors.line, width: 1 },
  timeBlock: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'flex-end', minWidth: 0 },
  timeBlockValue: { color: AppColors.ink, flexShrink: 1, fontFamily: Fonts.rounded, fontSize: 28, fontWeight: '900', lineHeight: 32, textAlign: 'right' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryItem: { borderRadius: AppRadii.control, borderWidth: 1, flexDirection: 'row', gap: 8, minHeight: 62, padding: 9, width: '48.6%' },
  summaryMark: { alignItems: 'center', borderRadius: 10, height: 34, justifyContent: 'center', width: 34 },
  summaryMarkText: { fontFamily: Fonts.rounded, fontSize: 10, fontWeight: '900', maxWidth: 28 },
  summaryItemCopy: { flex: 1, minWidth: 0 },
  summaryItemLabel: { color: AppColors.inkMuted, fontFamily: Fonts.rounded, fontSize: 10, fontWeight: '900' },
  summaryItemValue: { color: AppColors.ink, fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '900', lineHeight: 16, marginTop: 4 },
  bushIconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5, minHeight: 32 },
  bushIconChip: { alignItems: 'center', backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: AppRadii.pill, borderWidth: 1, height: 30, justifyContent: 'center', width: 30 },
  bushIconImage: { height: 25, width: 25 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  sectionTitleWrap: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 9, minWidth: 0 },
  sectionTitle: { color: AppColors.ink, flex: 1, fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '900', lineHeight: 19 },
  sectionGlyph: { alignItems: 'center', borderRadius: 10, borderWidth: 1, height: 30, justifyContent: 'center', width: 30 },
  sectionActionButton: { alignItems: 'center', borderRadius: AppRadii.pill, flexDirection: 'row', gap: 2, minHeight: 34, paddingHorizontal: 4, paddingVertical: 6 },
  sectionIconActionButton: { alignItems: 'center', backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: AppRadii.pill, borderWidth: 1, height: AppControlSizes.navMin, justifyContent: 'center', width: AppControlSizes.navMin },
  sectionAction: { color: AppColors.leaf, fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '900' },
  museumAction: { color: AppColors.museum },
  actionGlyph: { alignItems: 'center', height: 20, justifyContent: 'center', width: 20 },
  routineCard: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  routineTile: { alignItems: 'center', borderColor: AppColors.line, borderRadius: 10, borderWidth: 1, justifyContent: 'center', minHeight: 58, overflow: 'hidden', paddingHorizontal: 3, paddingVertical: 5, position: 'relative', width: '15.25%' },
  routineTileIdle: { backgroundColor: AppColors.card },
  routineTileComplete: { backgroundColor: AppColors.leafSoft, borderColor: AppColors.leaf },
  routineIcon: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.pill, height: 24, justifyContent: 'center', marginBottom: 4, width: 30 },
  routineIconComplete: { backgroundColor: AppColors.card },
  routineIconText: { color: AppColors.inkMuted, fontFamily: Fonts.rounded, fontSize: 8, fontWeight: '900', maxWidth: 26 },
  routineIconTextComplete: { color: AppColors.leaf },
  routineTileText: { color: AppColors.ink, fontFamily: Fonts.rounded, fontSize: 8, fontWeight: '900', lineHeight: 10, textAlign: 'center' },
  routineTileTextIdle: { color: AppColors.inkMuted },
  routineTileTextComplete: { color: AppColors.ink },
  routineCheckBadge: { alignItems: 'center', backgroundColor: AppColors.leaf, borderRadius: AppRadii.pill, height: 14, justifyContent: 'center', position: 'absolute', right: 3, top: 3, width: 14 },
  routineCheckText: { color: AppColors.card, fontFamily: Fonts.rounded, fontSize: 9, fontWeight: '900', lineHeight: 12 },
  routineEditGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  routineEditTile: { alignItems: 'center', backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: 10, borderWidth: 1, justifyContent: 'center', minHeight: 56, paddingHorizontal: 3, paddingVertical: 5, width: '15.25%' },
  routineEditTileSelected: { backgroundColor: AppColors.leafSoft, borderColor: AppColors.leaf },
  routineEditMark: { color: AppColors.inkMuted, fontFamily: Fonts.rounded, fontSize: 8, fontWeight: '900', maxWidth: 26 },
  routineEditMarkSelected: { color: AppColors.leaf, fontSize: 12 },
  routineEditLabel: { color: AppColors.inkMuted, fontFamily: Fonts.rounded, fontSize: 7, fontWeight: '900', lineHeight: 9, marginTop: 4, textAlign: 'center' },
  routineEditLabelSelected: { color: AppColors.ink },
  npcCard: { backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: AppRadii.card, borderWidth: 1, flexDirection: 'row', overflow: 'hidden', ...AppShadows.card },
  npcDayCell: { alignItems: 'center', borderRightColor: AppColors.line, borderRightWidth: 1, flex: 1, minHeight: 88, minWidth: 0, paddingHorizontal: 2, paddingVertical: 8 },
  npcDayCellToday: { backgroundColor: AppColors.residentSoft },
  npcWeekday: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '900', marginBottom: 6 },
  npcWeekdayToday: { color: AppColors.resident },
  npcAvatarStack: { alignItems: 'center', justifyContent: 'center', minHeight: 32 },
  npcAvatar: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderColor: AppColors.line, borderRadius: AppRadii.pill, borderWidth: 1, height: 30, justifyContent: 'center', width: 30 },
  npcAvatarToday: { borderColor: AppColors.resident },
  npcAvatarEmpty: { backgroundColor: AppColors.card },
  npcAvatarSelected: { borderColor: AppColors.resident, borderWidth: 2 },
  npcAvatarImage: { height: 26, resizeMode: 'contain', width: 26 },
  npcAvatarText: { color: AppColors.ink, fontSize: 10, fontWeight: '900' },
  npcAvatarEmptyText: { color: AppColors.resident, fontSize: 15 },
  npcName: { color: AppColors.ink, fontSize: 9, fontWeight: '900', lineHeight: 12, marginTop: 6, maxWidth: '100%', textAlign: 'center' },
  npcNameEmpty: { color: AppColors.inkMuted },
  npcOptionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 8 },
  npcOptionTile: { alignItems: 'center', backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: AppRadii.control, borderWidth: 1, height: 58, justifyContent: 'center', position: 'relative', width: 58 },
  npcOptionTileSelected: { backgroundColor: AppColors.residentSoft, borderColor: AppColors.resident },
  npcOptionAvatar: { backgroundColor: AppColors.card, height: 44, width: 44 },
  npcOptionAvatarImage: { height: 40, resizeMode: 'contain', width: 40 },
  npcOptionCheck: { alignItems: 'center', backgroundColor: AppColors.resident, borderColor: AppColors.card, borderRadius: AppRadii.pill, borderWidth: 1, height: 18, justifyContent: 'center', position: 'absolute', right: 3, top: 3, width: 18 },
  npcOptionCheckText: { color: AppColors.card, fontSize: 11, fontWeight: '900', lineHeight: 14 },
  critterSection: { gap: 10 },
  critterCard: { backgroundColor: AppColors.card, borderRadius: AppRadii.card, padding: 12, ...AppShadows.card },
  critterStatRail: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 10 },
  critterMainStat: { alignItems: 'center', backgroundColor: AppColors.museumSoft, borderRadius: AppRadii.control, minWidth: 82, paddingHorizontal: 10, paddingVertical: 8 },
  critterStatLabel: { color: AppColors.museum, fontSize: 10, fontWeight: '900' },
  critterStatValue: { color: AppColors.museum, fontSize: 28, fontWeight: '900', lineHeight: 31 },
  critterCategoryRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  critterCategoryChip: { backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.pill, paddingHorizontal: 8, paddingVertical: 5 },
  critterCategoryText: { color: AppColors.ink, fontSize: 10, fontWeight: '900' },
  critterHelperText: { color: AppColors.inkMuted, flex: 1, fontSize: 11, fontWeight: '800', lineHeight: 15 },
  critterPreviewList: { gap: 9 },
  critterPreviewItem: { backgroundColor: AppColors.museumSoft, borderRadius: AppRadii.control, padding: 8, width: 112 },
  critterPreviewImageFrame: { alignItems: 'center', backgroundColor: AppColors.card, borderRadius: AppRadii.control, height: 58, justifyContent: 'center' },
  critterPreviewImage: { height: 52, width: 52 },
  critterPreviewImageUncaught: { opacity: 0.48 },
  critterFallback: { color: AppColors.inkMuted, fontSize: 15, fontWeight: '900' },
  critterPreviewName: { color: AppColors.ink, fontSize: 11, fontWeight: '900', marginTop: 7, textAlign: 'center' },
  critterPreviewMeta: { color: AppColors.inkMuted, fontSize: 8, fontWeight: '800', marginTop: 3, textAlign: 'center' },
  critterStateLabel: { color: AppColors.inkMuted, fontSize: 9, fontWeight: '900', marginTop: 5, textAlign: 'center' },
  critterStateUncaught: { color: AppColors.resident },
  critterStateUndonated: { color: AppColors.museum },
  critterStatus: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 7 },
  critterStatusButton: { alignItems: 'center', backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: AppRadii.pill, borderWidth: 1, height: AppControlSizes.compactStatus, justifyContent: 'center', width: AppControlSizes.compactStatus },
  calendarPreview: { gap: 10 },
  calendarStrip: { backgroundColor: AppColors.paperRaised, borderColor: AppColors.line, borderRadius: AppRadii.card, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  calendarPreviewDay: { alignItems: 'center', flex: 1, minHeight: 58, paddingVertical: 8 },
  calendarPreviewDayToday: { backgroundColor: AppColors.residentSoft },
  calendarPreviewWeekday: { color: AppColors.inkMuted, fontSize: 9, fontWeight: '900' },
  calendarPreviewWeekdayToday: { color: AppColors.resident },
  calendarPreviewDate: { color: AppColors.ink, fontSize: 15, fontWeight: '900', marginTop: 3 },
  calendarPreviewDateToday: { color: AppColors.resident },
  calendarDot: { backgroundColor: AppColors.line, borderRadius: AppRadii.pill, height: 6, marginTop: 5, width: 6 },
  calendarBirthdayDot: { backgroundColor: AppColors.resident },
  calendarEventDot: { backgroundColor: AppColors.museum },
  noData: { color: AppColors.inkMuted, padding: 18, textAlign: 'center' },
});

const styles = StyleSheet.create({
  screenRoot: { flex: 1 }, safeArea: { backgroundColor: AppColors.background, flex: 1 }, content: { padding: 20, paddingBottom: 112 }, headerRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }, kicker: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0 }, title: { color: AppColors.ink, fontSize: 36, fontWeight: '800', marginTop: 4 }, date: { color: AppColors.inkMuted, fontSize: 13, marginTop: 4 }, menuButton: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderColor: AppColors.line, borderRadius: AppRadii.pill, borderWidth: 1, height: AppControlSizes.navMin, justifyContent: 'center', width: AppControlSizes.navMin }, menuText: { color: AppColors.ink, fontSize: 22 }, islandCard: { backgroundColor: AppColors.leafSoft, borderRadius: AppRadii.panel, padding: 20, ...AppShadows.card }, cardEyebrow: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0 }, islandName: { color: AppColors.ink, fontSize: 27, fontWeight: '800', marginTop: 5 }, islandRule: { backgroundColor: AppColors.primaryBorder, height: 1, marginVertical: 16 }, profileText: { color: AppColors.ink, fontSize: 12, fontWeight: '700' }, summaryCard: { backgroundColor: AppColors.card, borderRadius: AppRadii.card, padding: 14, ...AppShadows.card }, summaryHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' }, summaryCopy: { borderRadius: 12, flex: 1, minWidth: 0, padding: 2 }, summaryDatePressed: { backgroundColor: AppColors.paperRaised }, summaryLabel: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '800' }, summaryTitle: { color: AppColors.ink, fontSize: 20, fontWeight: '800', marginTop: 3 }, summaryMeta: { color: AppColors.inkMuted, fontSize: 10, marginTop: 4 }, summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 }, summaryItem: { backgroundColor: AppColors.paperRaised, borderColor: AppColors.line, borderRadius: AppRadii.control, borderWidth: 1, minHeight: 74, padding: 10, width: '48%' }, summaryItemLabel: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '800', marginBottom: 5 }, summaryItemValue: { color: AppColors.ink, fontSize: 12, fontWeight: '800', lineHeight: 17 }, eventStrip: { alignItems: 'center', backgroundColor: AppColors.leafSoft, borderRadius: AppRadii.control, flexDirection: 'row', gap: 10, marginTop: 10, padding: 10 }, eventLabel: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '800' }, eventText: { color: AppColors.ink, flex: 1, fontSize: 12, fontWeight: '800' }, dateCard: { alignItems: 'center', backgroundColor: AppColors.card, borderRadius: AppRadii.card, flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, padding: 14, ...AppShadows.card }, dateCopy: { flex: 1 }, dateHint: { color: AppColors.inkMuted, fontSize: 10, marginTop: 4 }, dateActions: { alignItems: 'center', flexDirection: 'row', gap: 5 }, dateButton: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderColor: AppColors.line, borderRadius: AppRadii.control, borderWidth: 1, height: 32, justifyContent: 'center', width: 32 }, dateButtonText: { color: AppColors.ink, fontSize: 22, lineHeight: 25 }, todayButton: { backgroundColor: AppColors.leaf, borderRadius: AppRadii.control, paddingHorizontal: 9, paddingVertical: 8 }, todayButtonText: { color: AppColors.card, fontSize: 10, fontWeight: '800' }, sectionHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, marginTop: 24 }, sectionHeaderCopy: { flex: 1 }, sectionTitle: { color: AppColors.ink, fontSize: 19, fontWeight: '800' }, sectionDescription: { color: AppColors.inkMuted, fontSize: 11, marginTop: 3 }, sectionAction: { color: AppColors.leaf, fontSize: 11, fontWeight: '800', paddingBottom: 2 }, infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, infoTile: { alignItems: 'center', backgroundColor: AppColors.card, borderRadius: AppRadii.card, flexDirection: 'row', minHeight: 70, padding: 12, width: '48%', ...AppShadows.card }, infoIcon: { color: AppColors.leaf, fontSize: 22, marginRight: 9 }, infoLabel: { color: AppColors.inkMuted, fontSize: 10 }, infoValue: { color: AppColors.ink, fontSize: 13, fontWeight: '800', marginTop: 4 }, noticeCard: { backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.card, marginTop: 10, padding: 14 }, noticeTitle: { color: AppColors.ink, fontSize: 12, fontWeight: '800' }, noticeText: { color: AppColors.inkMuted, fontSize: 11, lineHeight: 17, marginTop: 4 }, tabRow: { gap: 8, paddingBottom: 10 }, tabChip: { backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: AppRadii.pill, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 }, tabChipActive: { backgroundColor: AppColors.leafSoft, borderColor: AppColors.leaf }, tabChipText: { color: AppColors.inkMuted, fontSize: 12, fontWeight: '800' }, tabChipTextActive: { color: AppColors.ink }, critterList: { backgroundColor: AppColors.card, borderRadius: AppRadii.card, overflow: 'hidden', ...AppShadows.card }, critterRow: { alignItems: 'center', borderBottomColor: AppColors.line, borderBottomWidth: 1, flexDirection: 'row', minHeight: 78, padding: 9 }, critterImageFrame: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.control, height: 58, justifyContent: 'center', width: 58 }, critterImage: { height: 52, width: 52 }, critterImageUncaught: { opacity: 0.35 }, critterCopy: { flex: 1, marginLeft: 10, minWidth: 0 }, critterName: { color: AppColors.ink, fontSize: 13, fontWeight: '800' }, critterMeta: { color: AppColors.inkMuted, fontSize: 10, marginTop: 5 }, critterStatus: { flexDirection: 'row', gap: 4 }, critterStatusButton: { alignItems: 'center', backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: AppRadii.pill, borderWidth: 1, height: AppControlSizes.compactStatus, justifyContent: 'center', width: AppControlSizes.compactStatus }, noData: { color: AppColors.inkMuted, padding: 22, textAlign: 'center' }, routineCard: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, routineTile: { alignItems: 'center', backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: AppRadii.control, borderWidth: 1, justifyContent: 'center', minHeight: 58, overflow: 'hidden', paddingHorizontal: 5, paddingVertical: 8, position: 'relative', width: '23%' }, routineTileDimmed: { backgroundColor: AppColors.paperRaised, borderColor: AppColors.line, opacity: 0.55 }, routineTileComplete: { backgroundColor: AppColors.leafSoft, borderColor: AppColors.leaf, opacity: 1 }, routineTileText: { color: AppColors.ink, fontSize: 10, fontWeight: '900', lineHeight: 13, textAlign: 'center' }, routineTileTextDimmed: { color: AppColors.inkMuted }, routineTileTextComplete: { color: AppColors.ink }, routineCheckBadge: { alignItems: 'center', backgroundColor: AppColors.leaf, borderRadius: 8, height: 16, justifyContent: 'center', position: 'absolute', right: 3, top: 3, width: 16 }, routineCheckText: { color: AppColors.card, fontSize: 10, fontWeight: '900', lineHeight: 13 }, routineRow: { alignItems: 'center', flexDirection: 'row', minHeight: 66 }, routineDivider: { borderTopColor: AppColors.line, borderTopWidth: 1 }, routineIcon: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.pill, height: 35, justifyContent: 'center', marginRight: 11, width: 35 }, routineIconDone: { backgroundColor: AppColors.leafSoft }, routineIconText: { color: AppColors.ink, fontSize: 20, fontWeight: '800' }, routineIconTextDone: { color: AppColors.leaf }, routineCopy: { flex: 1 }, routineTitle: { color: AppColors.ink, fontSize: 13, fontWeight: '800' }, routineTitleDone: { color: AppColors.leaf }, routineGoal: { color: AppColors.inkMuted, fontSize: 10, marginTop: 4 }, smallAction: { color: AppColors.leaf, fontSize: 10, fontWeight: '800', padding: 6 }, npcCard: { backgroundColor: AppColors.card, borderRadius: AppRadii.card, flexDirection: 'row', padding: 7, ...AppShadows.card }, npcDayCell: { alignItems: 'center', borderRadius: AppRadii.control, flex: 1, minHeight: 126, minWidth: 0, paddingHorizontal: 2, paddingVertical: 8 }, npcDayCellToday: { backgroundColor: AppColors.leafSoft }, npcWeekday: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '800' }, npcDateNumber: { color: AppColors.ink, fontSize: 11, fontWeight: '800', marginTop: 3 }, npcAvatarStack: { alignContent: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 3, justifyContent: 'center', marginTop: 7, minHeight: 51 }, npcAvatar: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.pill, height: 32, justifyContent: 'center', width: 32 }, npcWeekAvatar: { borderRadius: 12, height: 24, width: 24 }, npcAvatarEmpty: { backgroundColor: '#F5F1E8', borderColor: AppColors.line, borderWidth: 1 }, npcAvatarSelected: { backgroundColor: AppColors.leafSoft, borderColor: AppColors.leaf, borderWidth: 1 }, npcAvatarText: { color: AppColors.ink, fontSize: 13, fontWeight: '800' }, npcName: { color: AppColors.ink, fontSize: 10, fontWeight: '800', lineHeight: 13, marginTop: 5, maxWidth: '100%', textAlign: 'center' }, npcNameEmpty: { color: AppColors.inkMuted }, rowArrow: { color: AppColors.inkMuted, fontSize: 21 }, calendarCard: { backgroundColor: AppColors.card, borderRadius: AppRadii.card, paddingHorizontal: 10, paddingBottom: 12, ...AppShadows.card }, calendarToggle: { backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.control, flexDirection: 'row', marginVertical: 12, padding: 3 }, calendarToggleButton: { alignItems: 'center', borderRadius: 8, flex: 1, paddingVertical: 7 }, calendarToggleActive: { backgroundColor: AppColors.leafSoft }, calendarToggleText: { color: AppColors.inkMuted, fontSize: 11, fontWeight: '800' }, calendarToggleTextActive: { color: AppColors.ink }, calendarPeriodTitle: { color: AppColors.ink, fontSize: 14, fontWeight: '900', marginBottom: 10, textAlign: 'center' }, calendarWeekdayRow: { borderBottomColor: AppColors.line, borderBottomWidth: 1, flexDirection: 'row', paddingBottom: 7 }, calendarWeekdayText: { color: AppColors.inkMuted, flex: 1, fontSize: 10, fontWeight: '800', textAlign: 'center' }, calendarBoard: { flexDirection: 'row', flexWrap: 'wrap' }, calendarDayCell: { borderBottomColor: AppColors.line, borderBottomWidth: 1, borderRightColor: AppColors.line, borderRightWidth: 1, minHeight: 78, padding: 4, width: '14.2857%' }, calendarWeekCell: { minHeight: 104 }, calendarDayCellEmpty: { backgroundColor: '#FAFBF8' }, calendarDayCellToday: { backgroundColor: AppColors.leafSoft }, calendarDayNumber: { color: AppColors.ink, fontSize: 11, fontWeight: '800', marginBottom: 4, textAlign: 'center' }, calendarDayNumberToday: { color: AppColors.leaf, fontWeight: '900' }, calendarItemStack: { gap: 3, minHeight: 40 }, calendarBadge: { borderRadius: 5, minHeight: 16, paddingHorizontal: 3, paddingVertical: 2 }, calendarBirthdayBadge: { backgroundColor: AppColors.catalogSoft }, calendarEventBadge: { backgroundColor: AppColors.museumSoft }, calendarBadgeText: { fontSize: 8, fontWeight: '800', lineHeight: 11 }, calendarBirthdayText: { color: '#A26A2D' }, calendarEventText: { color: AppColors.museum }, calendarMoreText: { color: AppColors.inkMuted, fontSize: 8, fontWeight: '800', textAlign: 'center' }, calendarHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, monthButton: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderColor: AppColors.line, borderRadius: AppRadii.control, borderWidth: 1, height: 34, justifyContent: 'center', width: 34 }, monthButtonText: { color: AppColors.ink, fontSize: 24, lineHeight: 28 }, monthTitle: { color: AppColors.ink, fontSize: 16, fontWeight: '800' }, weekdayRow: { flexDirection: 'row', marginTop: 14 }, weekdayText: { color: AppColors.inkMuted, flex: 1, fontSize: 10, fontWeight: '800', textAlign: 'center' }, calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }, dayCell: { alignItems: 'center', aspectRatio: 1, borderRadius: 10, justifyContent: 'center', width: '14.2857%' }, dayCellSelected: { backgroundColor: AppColors.leafSoft }, dayCellText: { color: AppColors.ink, fontSize: 12, fontWeight: '700' }, dayCellTextSelected: { color: AppColors.leaf, fontWeight: '900' }, timePicker: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 16 }, timeColumn: { alignItems: 'center', width: 76 }, timeLabel: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '800', marginBottom: 5 }, timeAdjustButton: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderColor: AppColors.line, borderRadius: AppRadii.control, borderWidth: 1, height: 32, justifyContent: 'center', width: 48 }, timeAdjustText: { color: AppColors.ink, fontSize: 16, fontWeight: '900' }, timeValue: { color: AppColors.ink, fontSize: 26, fontWeight: '900', marginVertical: 5 }, timeDivider: { color: AppColors.ink, fontSize: 24, fontWeight: '900', marginTop: 18 }, resetButton: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.control, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 12 }, resetButtonText: { color: AppColors.ink, fontSize: 12, fontWeight: '800' }, floatingTop: { alignItems: 'center', backgroundColor: AppColors.leaf, borderRadius: 22, bottom: 23, paddingHorizontal: 14, paddingVertical: 11, position: 'absolute', right: 18, ...AppShadows.floating }, floatingTopText: { color: AppColors.card, fontSize: 11, fontWeight: '800' }, modalBackdrop: { backgroundColor: 'rgba(63, 42, 20, 0.26)', flex: 1, justifyContent: 'flex-end' }, drawer: { backgroundColor: AppColors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, minHeight: '78%', padding: 21 }, drawerHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, drawerKicker: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0 }, closeText: { color: AppColors.ink, fontSize: 28 }, drawerTitle: { color: AppColors.ink, fontSize: 27, fontWeight: '800', marginTop: 9 }, passportCard: { backgroundColor: AppColors.leafSoft, borderRadius: AppRadii.card, marginTop: 17, padding: 17 }, passportLabel: { color: AppColors.inkMuted, fontSize: 10, marginTop: 7 }, passportValue: { color: AppColors.ink, fontSize: 14, fontWeight: '800', marginTop: 3 }, drawerAction: { alignItems: 'center', backgroundColor: AppColors.card, borderBottomColor: AppColors.line, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 57, paddingHorizontal: 14 }, drawerActionText: { color: AppColors.ink, fontSize: 12, fontWeight: '800' }, drawerMuted: { color: AppColors.inkMuted, fontSize: 12, fontWeight: '700' }, drawerBadge: { backgroundColor: AppColors.paperRaised, borderRadius: 9, color: AppColors.inkMuted, fontSize: 9, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 5 }, bottomSheet: { backgroundColor: AppColors.background, borderTopLeftRadius: 25, borderTopRightRadius: 25, maxHeight: '82%', padding: 21 }, sheetTitle: { color: AppColors.ink, fontSize: 20, fontWeight: '800', marginBottom: 8 }, npcModalHint: { color: AppColors.inkMuted, fontSize: 11, lineHeight: 17, marginBottom: 8 }, optionGroupTitle: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '900', marginTop: 12 }, optionRow: { alignItems: 'center', borderBottomColor: AppColors.line, borderBottomWidth: 1, flexDirection: 'row', minHeight: 48 }, optionRowSelected: { backgroundColor: AppColors.leafSoft }, optionText: { color: AppColors.ink, flex: 1, fontSize: 13, fontWeight: '700', marginLeft: 10 }, optionCheck: { color: AppColors.leaf, fontSize: 16, fontWeight: '900', width: 22 }, cancelButton: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.control, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 12 }, cancelButtonText: { color: AppColors.ink, fontSize: 12, fontWeight: '800' }, modalLabel: { color: AppColors.inkMuted, fontSize: 11, fontWeight: '800', marginBottom: 5, marginTop: 10 }, modalInput: { backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: AppRadii.control, borderWidth: 1, color: AppColors.ink, fontSize: 14, paddingHorizontal: 12, paddingVertical: 11 }, modalActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 18 }, deleteButton: { alignItems: 'center', backgroundColor: AppColors.residentSoft, borderRadius: AppRadii.control, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 12 }, deleteButtonText: { color: AppColors.danger, fontSize: 12, fontWeight: '800' }, saveButton: { alignItems: 'center', backgroundColor: AppColors.leaf, borderRadius: AppRadii.control, justifyContent: 'center', paddingHorizontal: 19, paddingVertical: 12 }, saveButtonText: { color: AppColors.card, fontSize: 12, fontWeight: '800' }, emptyContainer: { alignItems: 'center', backgroundColor: AppColors.background, flex: 1, justifyContent: 'center', padding: 24 }, emptyTitle: { color: AppColors.ink, fontSize: 22, fontWeight: '800' }, emptyDescription: { color: AppColors.inkMuted, fontSize: 14, marginTop: 8 },
});
