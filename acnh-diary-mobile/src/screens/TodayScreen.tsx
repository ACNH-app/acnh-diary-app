import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  type ColorValue,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
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
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppChrome } from '@/components/AppChrome';
import { AppColors, AppControlSizes, AppRadii, AppShadows, Fonts } from '@/constants/theme';
import { CollectionStatusIcon } from '@/components/CollectionStatusIcon';
import { FloatingTopButton } from '@/components/FloatingTopButton';
import { UnderlineTabs } from '@/components/UnderlineTabs';
import { getMonthlyAvailabilityFlags, isAvailableAtMinute } from '@/data/availability';
import { getBloomingBushes, type BloomingBush } from '@/data/bush-blooms';
import { catalogItems, getCatalogAssetForItem, getCatalogItems } from '@/data/catalog';
import { getEncyclopediaItems } from '@/data/encyclopedia';
import { getEncyclopediaAsset } from '@/data/encyclopedia-assets';
import { localizeAvailabilityLabel, localizeAvailabilityTime, localizeLocation } from '@/data/encyclopedia-labels';
import { npcAssets } from '@/data/npc-assets';
import { DEFAULT_ROUTINE_OPTIONS } from '@/data/routines';
import { getRoutineIconSource } from '@/data/routine-assets';
import { villagers } from '@/data/villagers';
import {
  addRoutine,
  clearNpcVisitsForWeek,
  deleteRoutine,
  getActiveIsland,
  getCollectionStatesForIsland,
  getIslands,
  getManualGameDate,
  getManualGameTime,
  getNpcVisitsForIsland,
  getRoutineProgressForIsland,
  getRoutinesForIsland,
  getVillagerStatesForIsland,
  initializeDatabase,
  setCollectionStatus,
  setActiveIsland,
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
type CalendarPickerKind = 'year' | 'month';
type TimePickerKind = 'hour' | 'minute';
type CalendarItemKind = 'birthday' | 'event';
type CalendarItem = { id: string; kind: CalendarItemKind; label: string };
type CritterTab = 'bugs' | 'fish' | 'sea' | 'newThisMonth' | 'leavingThisMonth';
type CritterCategory = 'bugs' | 'fish' | 'sea';
type TodaySectionIcon = 'summary' | 'routine' | 'npc' | 'critter' | 'calendar';
type TodayActionIcon = 'edit' | 'reset' | 'open';

const EMPTY_STATE: EncyclopediaState = { caught: false, owned: false, donated: false, genuineOwned: false, fakeOwned: false };
const CRITTERPEDIA_ICON = require('../data/assets/icons/critterpedia.png');
const ZODIAC_ICON_ASSETS: Record<string, ImageSourcePropType> = {
  aquarius: require('../data/assets/icons/zodiac/aquarius.png'),
  aries: require('../data/assets/icons/zodiac/aries.png'),
  cancer: require('../data/assets/icons/zodiac/cancer.png'),
  capricorn: require('../data/assets/icons/zodiac/capricorn.png'),
  gemini: require('../data/assets/icons/zodiac/gemini.png'),
  leo: require('../data/assets/icons/zodiac/leo.png'),
  libra: require('../data/assets/icons/zodiac/libra.png'),
  pisces: require('../data/assets/icons/zodiac/pisces.png'),
  sagittarius: require('../data/assets/icons/zodiac/sagittarius.png'),
  scorpio: require('../data/assets/icons/zodiac/scorpio.png'),
  taurus: require('../data/assets/icons/zodiac/taurus.png'),
  virgo: require('../data/assets/icons/zodiac/virgo.png'),
};
const DEFAULT_ROUTINE_TITLES = new Set(DEFAULT_ROUTINE_OPTIONS.map((routine) => routine.title));
const CRITTER_CATEGORIES: CritterCategory[] = ['bugs', 'fish', 'sea'];
const CRITTER_BROWSER_TABS: Array<{ key: CritterTab; label: string }> = [
  { key: 'bugs', label: '곤충' },
  { key: 'fish', label: '물고기' },
  { key: 'sea', label: '해산물' },
  { key: 'newThisMonth', label: '이번 달 신규' },
  { key: 'leavingThisMonth', label: '이번 달 종료' },
];
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_NPC_OPTIONS = ['레온', '저스틴', '고숙이', '사하라', '패트릭', '여욱', '늘봉'];
const WEEKEND_NPC_OPTIONS = ['K.K.', '무파니'];
const NIGHT_NPC_OPTIONS = ['부옥', '깨빈'];
const NPC_OPTIONS = [...DAY_NPC_OPTIONS, ...WEEKEND_NPC_OPTIONS, ...NIGHT_NPC_OPTIONS];
const EVENT_NPC_KEYS: Record<string, string> = {
  곤충채집대회: 'flick',
  국제박물관데이: 'blathers',
  근로자의날투어: 'rover',
  낚시대회: 'c-j',
  불꽃놀이: 'isabelle',
  웨딩시즌: 'reese',
  이스터: 'zipper-t-bunny',
  카운트다운: 'isabelle',
  크리스마스이브: 'jingle',
  추수감사절: 'franklin',
  할로윈: 'jack',
};
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

function getMonthDates(gameDate: string) {
  const date = parseIsoDate(gameDate);
  if (!date) return [];
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: dayCount }, (_, index) => toIsoDate(year, month, index + 1));
}

function getCalendarYearOptions(centerYear: number) {
  return Array.from({ length: 9 }, (_, index) => centerYear - 4 + index);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long', timeZone: 'UTC' }).format(parseIsoDate(value) ?? new Date());
}

function formatMonthDayShort(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', timeZone: 'UTC' }).format(parseIsoDate(value) ?? new Date());
}

function formatWeekdayInitial(value: string) {
  const date = parseIsoDate(value);
  return date ? DAY_LABELS[date.getUTCDay()] ?? '' : '';
}

function formatDashboardDate(value: string) {
  const date = parseIsoDate(value);
  if (!date) return value;
  return `${date.getUTCFullYear()}. ${String(date.getUTCMonth() + 1).padStart(2, '0')}. ${String(date.getUTCDate()).padStart(2, '0')} ${formatWeekdayInitial(value)}`;
}

const ZODIAC_SIGNS = [
  { key: 'capricorn', name: '염소자리', start: [12, 22], end: [1, 19] },
  { key: 'aquarius', name: '물병자리', start: [1, 20], end: [2, 18] },
  { key: 'pisces', name: '물고기자리', start: [2, 19], end: [3, 20] },
  { key: 'aries', name: '양자리', start: [3, 21], end: [4, 19] },
  { key: 'taurus', name: '황소자리', start: [4, 20], end: [5, 20] },
  { key: 'gemini', name: '쌍둥이자리', start: [5, 21], end: [6, 21] },
  { key: 'cancer', name: '게자리', start: [6, 22], end: [7, 22] },
  { key: 'leo', name: '사자자리', start: [7, 23], end: [8, 22] },
  { key: 'virgo', name: '처녀자리', start: [8, 23], end: [9, 22] },
  { key: 'libra', name: '천칭자리', start: [9, 23], end: [10, 22] },
  { key: 'scorpio', name: '전갈자리', start: [10, 23], end: [11, 21] },
  { key: 'sagittarius', name: '사수자리', start: [11, 22], end: [12, 21] },
] as const;

function getZodiacDefinition(month: number, day: number) {
  const key = month * 100 + day;
  return ZODIAC_SIGNS.find(({ start, end }) => {
    const startKey = start[0] * 100 + start[1];
    const endKey = end[0] * 100 + end[1];
    return startKey <= endKey ? key >= startKey && key <= endKey : key >= startKey || key <= endKey;
  }) ?? ZODIAC_SIGNS[0];
}

function formatZodiacPeriod(zodiac: (typeof ZODIAC_SIGNS)[number]) {
  return `${zodiac.start[0]}.${String(zodiac.start[1]).padStart(2, '0')} — ${zodiac.end[0]}.${String(zodiac.end[1]).padStart(2, '0')}`;
}

function formatMonthDayCode(value: number) {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`;
}

function formatBloomWindow(bush: BloomingBush, hemisphere: Island['hemisphere']) {
  const side = hemisphere === 'south' ? 'south' : 'north';
  return bush.bloomWindows[side].map(([start, end]) => `${formatMonthDayCode(start)} — ${formatMonthDayCode(end)}`).join(' · ');
}

function getMaterialParts(material: string) {
  const match = /^(.*?)\s*×\s*(\d+)$/.exec(material.trim());
  return { amount: match ? Number(match[2]) : null, name: (match?.[1] ?? material).trim() };
}

function getMaterialAsset(material: string) {
  const { name } = getMaterialParts(material);
  const item = catalogItems.find((candidate) => candidate.nameKo === name);
  return item ? getCatalogAssetForItem(item) : undefined;
}

function getEventNpcImage(eventName: string) {
  const key = Object.entries(EVENT_NPC_KEYS).find(([label]) => eventName.replaceAll(' ', '').startsWith(label))?.[1] ?? 'isabelle';
  return npcAssets[key]?.image;
}

function getEventSchedule(eventName: string) {
  const normalized = eventName.replaceAll(' ', '');
  if (normalized === '곤충채집대회') return { host: '레온', location: '광장', time: '09:00 — 18:00' };
  if (normalized === '낚시대회') return { host: '저스틴', location: '광장', time: '09:00 — 18:00' };
  if (normalized === '불꽃놀이') return { host: '여울', location: '광장', time: '19:00 — 24:00' };
  if (normalized === '근로자의날투어') return { host: '로버', location: '섬 외', time: '00:00 — 24:00' };
  if (normalized === '국제박물관데이') return { host: '부엉', location: '박물관', time: '00:00 — 24:00' };
  if (normalized === '웨딩시즌') return { host: '리사 & 리포', location: '파니의 섬', time: '00:00 — 24:00' };
  if (normalized === '이스터') return { host: '토빗', location: '섬 전체', time: '00:00 — 24:00' };
  if (normalized === '카운트다운') return { host: '여울', location: '광장', time: '23:00 — 00:00' };
  if (normalized === '크리스마스이브') return { host: '루돌', location: '광장', time: '18:00 — 24:00' };
  if (normalized === '추수감사절') return { host: '프랭클린', location: '광장', time: '09:00 — 24:00' };
  if (normalized === '할로윈') return { host: '잭', location: '광장', time: '17:00 — 24:00' };
  return { host: '', location: '섬 전체', time: '종일' };
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

function getRecipeFilters(item: ReturnType<typeof getCatalogItems>[number]) {
  const filters = item.details.recipeFilters;
  return Array.isArray(filters) ? filters.map(String) : [];
}

function getRecipeSeasonMaterialName(key: string) {
  if (key === 'young_spring_bamboo') return '봄의 대나무';
  if (key === 'cherry_blossom') return '벚꽃잎';
  if (key === 'summer_shell') return '여름 조개껍데기';
  if (key === 'tree_bounty') return '도토리';
  if (key === 'maple_leaf') return '단풍잎';
  if (key === 'mushroom') return '버섯';
  if (key === 'winter_snowflake') return '눈의 결정';
  if (key === 'christmas_ornament') return '오너먼트';
  return '';
}

function getRecipeSeriesTitle(key: string) {
  if (key === 'tree_bounty') return '도토리·솔방울';
  if (key === 'mushroom') return '버섯';
  if (key === 'christmas_ornament') return '오너먼트';
  return getRecipeSeasonMaterialName(key);
}

function getRecipeMaterialNames(key: string) {
  if (key === 'tree_bounty') return ['도토리', '솔방울'];
  if (key === 'mushroom') return ['가는 버섯', '둥근 버섯', '넓은 버섯', '멋진 버섯', '희귀 버섯'];
  if (key === 'christmas_ornament') return ['빨간 오너먼트', '파란 오너먼트', '금 오너먼트'];
  return [getRecipeSeasonMaterialName(key)].filter(Boolean);
}

function getRecipeMaterialLabel(key: string) {
  if (key === 'tree_bounty') return '도토리 · 솔방울';
  if (key === 'mushroom') return '둥근 · 홀쭉 · 납작 · 멋진 · 희귀 버섯';
  if (key === 'christmas_ornament') return '빨간 · 파란 · 금 오너먼트';
  return getRecipeSeasonMaterialName(key);
}

function formatRecipeMonthDay(value: number) {
  const month = Math.floor(value / 100);
  const day = value % 100;
  return `${month}.${day}`;
}

function formatRecipePeriod(recipeSeason: (typeof RECIPE_SEASONS)[number], hemisphere: Island['hemisphere']) {
  const side = hemisphere === 'south' ? 'south' : 'north';
  const [start, end] = recipeSeason[side][0] ?? [];
  if (!start || !end) return '기간 정보 없음';
  return `${formatRecipeMonthDay(start)} – ${formatRecipeMonthDay(end)}`;
}

function formatRecipePeriodKo(recipeSeason: (typeof RECIPE_SEASONS)[number], hemisphere: Island['hemisphere']) {
  const side = hemisphere === 'south' ? 'south' : 'north';
  const [start, end] = recipeSeason[side][0] ?? [];
  if (!start || !end) return '기간 정보 없음';
  const format = (value: number) => `${Math.floor(value / 100)}월 ${value % 100}일`;
  return `${format(start)} – ${format(end)}`;
}

function getRecipeMaterialAssets(key: string) {
  return getRecipeMaterialNames(key)
    .map((name) => catalogItems.find((item) => item.catalogType === 'items' && item.nameKo === name))
    .filter((item): item is (typeof catalogItems)[number] => Boolean(item))
    .map((item) => getCatalogAssetForItem(item))
    .filter((asset): asset is ImageSourcePropType => Boolean(asset));
}

function getRecipeSeasonLabel(key: string) {
  if (key === 'young_spring_bamboo' || key === 'cherry_blossom') return '봄';
  if (key === 'summer_shell') return '여름';
  if (key === 'tree_bounty' || key === 'maple_leaf' || key === 'mushroom') return '가을';
  if (key === 'winter_snowflake' || key === 'christmas_ornament') return '겨울';
  return '';
}

function getRecipeSeasonVariant(key: string) {
  if (key === 'young_spring_bamboo') {
    return {
      accent: '#70AA65',
      cardColors: ['#F1FAED', '#DDF3D9'] as [ColorValue, ColorValue],
      cardBorder: '#C8E4BE',
      decor: 'spring' as const,
      header: '#DDF1D8',
      iconBackground: '#E6F5E1',
      ink: '#465C4A',
      layout: 'feature' as const,
      muted: '#718574',
      rail: '#D5E8D0',
      surface: '#FCFFFB',
      surfaceBorder: '#D9EBD4',
    };
  }
  const season = getRecipeSeasonLabel(key);
  if (season === '봄') {
    return {
      accent: '#E96F96',
      cardColors: ['#FFF4F7', '#FFEAF0'] as [ColorValue, ColorValue],
      cardBorder: '#F6CAD7',
      decor: 'spring' as const,
      header: '#FFE1E9',
      iconBackground: '#FFE8EF',
      ink: '#5A4450',
      layout: 'compact' as const,
      muted: '#8D6D79',
      rail: '#F5D9E1',
      surface: '#FFF9FA',
      surfaceBorder: '#F7D5DE',
    };
  }
  if (season === '가을') {
    return {
      accent: '#D8872F',
      cardColors: ['#FFF7E7', '#FFF0D0'] as [ColorValue, ColorValue],
      cardBorder: '#F2D49A',
      decor: 'autumn' as const,
      header: '#FFE6B1',
      iconBackground: '#FAE8C5',
      ink: '#5E4934',
      layout: 'compact' as const,
      muted: '#8C714F',
      rail: '#F0DFC2',
      surface: '#FFFCF5',
      surfaceBorder: '#F0D9AE',
    };
  }
  if (season === '겨울') {
    return {
      accent: '#52B8CB',
      cardColors: ['#F1FAFD', '#E3F5F8'] as [ColorValue, ColorValue],
      cardBorder: '#C8E5ED',
      decor: 'winter' as const,
      header: '#DDF4F7',
      iconBackground: '#E2F7FA',
      ink: '#385B69',
      layout: 'feature' as const,
      muted: '#66828B',
      rail: '#D4EAEE',
      surface: '#FBFDFF',
      surfaceBorder: '#D2E9EE',
    };
  }
  return {
    accent: '#379FD7',
    cardColors: ['#EFF9FF', '#E2F4FF'] as [ColorValue, ColorValue],
    cardBorder: '#BFDFF2',
    decor: 'summer' as const,
    header: '#D9F1FC',
    iconBackground: '#E0F4FD',
    ink: '#35566A',
    layout: 'feature' as const,
    muted: '#6D8190',
    rail: '#D7EAF4',
    surface: '#FAFDFF',
    surfaceBorder: '#CDE5F2',
  };
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

function getCritterStateRank(state: EncyclopediaState) {
  if (!state.caught) return 0;
  if (!state.donated) return 1;
  return 2;
}

function getCategoryLabel(category: EncyclopediaItem['category']) {
  if (category === 'fish') return '물고기';
  if (category === 'bugs') return '곤충';
  if (category === 'sea') return '해산물';
  if (category === 'fossils') return '화석';
  return '미술품';
}

function getCritterLocationText(item: EncyclopediaItem) {
  const locations = [
    localizeLocation(item.location),
    ...(item.locationTags ?? []).map((tag) => localizeLocation(tag) ?? tag),
  ].filter((value): value is string => Boolean(value));

  return [...new Set(locations)].join(' · ') || '출현 장소 정보 없음';
}

function getCritterPriceText(item: EncyclopediaItem) {
  return item.prices.primary == null ? null : `${item.prices.primary.toLocaleString('ko-KR')}벨`;
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
  const [islands, setIslands] = useState<Island[]>(initialIsland ? [initialIsland] : []);
  const [islandPickerOpen, setIslandPickerOpen] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>(initialRoutines ?? []);
  const [gameDate, setGameDateState] = useState('');
  const [manualTime, setManualTime] = useState<string | null>(null);
  const [routineProgress, setRoutineProgressState] = useState<Record<string, RoutineProgress>>({});
  const [collectionStates, setCollectionStates] = useState<Record<string, EncyclopediaState>>({});
  const [villagerStates, setVillagerStates] = useState<Record<string, VillagerState>>({});
  const [npcVisits, setNpcVisits] = useState<Record<string, string[]>>({});
  const [npcDate, setNpcDate] = useState<string | null>(null);
  const [dateTimeModalOpen, setDateTimeModalOpen] = useState(false);
  const [timePickerKind, setTimePickerKind] = useState<TimePickerKind | null>(null);
  const [routineModalOpen, setRoutineModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineGoal, setRoutineGoal] = useState('1');
  const [clockNow, setClockNow] = useState(() => new Date());
  const [critterBrowserOpen, setCritterBrowserOpen] = useState(false);
  const [critterBrowserTab, setCritterBrowserTab] = useState<CritterTab>('bugs');
  const [critterBrowserOnlyIncomplete, setCritterBrowserOnlyIncomplete] = useState(false);
  const [critterPreviewCategory, setCritterPreviewCategory] = useState<CritterCategory | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setClockNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const refresh = useCallback(() => {
    try {
      initializeDatabase();
      const activeIsland = getActiveIsland();
      setIsland(activeIsland);
      setIslands(getIslands());
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

  const applyGameTime = (time: string) => {
    try {
      if (!isValidGameTime(time)) throw new Error('VALIDATION_ERROR');
      setManualGameTime(time);
      setManualTime(time);
      setTimePickerKind(null);
    } catch {
      Alert.alert('게임 시간을 변경하지 못했어요', '시간을 다시 확인해 주세요.');
    }
  };

  const switchIsland = (islandId: string) => {
    if (island?.id === islandId) {
      setIslandPickerOpen(false);
      return;
    }
    try {
      setActiveIsland(islandId);
      setIslandPickerOpen(false);
      refresh();
    } catch {
      Alert.alert('섬을 변경하지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  };

  const dateObject = parseIsoDate(gameDate) ?? new Date();
  const month = dateObject.getUTCMonth() + 1;
  const day = dateObject.getUTCDate();
  const zodiacDefinition = getZodiacDefinition(month, day);
  const timezone = island?.timezone ?? 'Asia/Seoul';
  const hemisphere = island?.hemisphere ?? 'north';
  const gameTime = manualTime ?? getCurrentGameTime(clockNow, timezone);
  const [gameHour, gameMinute] = gameTime.split(':').map(Number);
  const applyGameDate = (date: string) => applyGameDateTime(date, gameTime);
  const availableCritters = useMemo(() => {
    if (!island || !gameDate) return [];

    const sourceItems = CRITTER_CATEGORIES.flatMap((category) => getEncyclopediaItems(category));

    return sourceItems.filter((item) => {
      if (!isAvailableNow(item, island, gameDate, gameTime)) return false;
      return true;
    });
  }, [gameDate, gameTime, island]);
  const residentVillagerIds = useMemo(
    () => new Set(Object.entries(villagerStates).filter(([, state]) => state.islandResident).map(([key]) => key.split('/').pop() ?? key)),
    [villagerStates],
  );
  const selectedDefaultRoutineTitles = useMemo(
    () => routines.filter((routine) => DEFAULT_ROUTINE_TITLES.has(routine.title)).map((routine) => routine.title),
    [routines],
  );
  const activeRecipeSeasons = getActiveRecipeSeasons(month, day, hemisphere);
  const allSeasonalRecipeItems = [...getCatalogItems('seasonal_recipes')].sort((left, right) => left.nameKo.localeCompare(right.nameKo, 'ko-KR'));
  const activeRecipeGroups = activeRecipeSeasons.map((recipeSeason) => {
    const recipeItems = allSeasonalRecipeItems.filter((item) => getRecipeFilters(item).includes(`season:${recipeSeason.key}`));
    return {
      collectedCount: recipeItems.filter((item) => collectionStates[`${item.catalogType}/${item.id}`]?.owned).length,
      key: recipeSeason.key,
      materialAssets: getRecipeMaterialAssets(recipeSeason.key),
      materialLabel: getRecipeMaterialLabel(recipeSeason.key),
      materialName: getRecipeSeriesTitle(recipeSeason.key),
      period: formatRecipePeriod(recipeSeason, hemisphere),
      periodKo: formatRecipePeriodKo(recipeSeason, hemisphere),
      recipeCount: recipeItems.length,
      seasonLabel: getRecipeSeasonLabel(recipeSeason.key),
    };
  }).filter((group) => group.recipeCount > 0);
  const zodiacFragmentItem = catalogItems.find((item) => item.nameKo === `${zodiacDefinition.name} 조각`);
  const todayEventNames = getTodayEventNames(dateObject, hemisphere);
  const bloomingBushes = getBloomingBushes(month, day, hemisphere);
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
  const critterPreviewSource = critterPreviewCategory
    ? progressNeededCritters.filter((item) => item.category === critterPreviewCategory)
    : (progressNeededCritters.length ? progressNeededCritters : prioritizedCritters);
  const critterPreviewItems = critterPreviewSource.slice(0, 4);
  const progressCountsByCategory = CRITTER_CATEGORIES.map((category) => ({
    category,
    count: progressNeededCritters.filter((item) => item.category === category).length,
  }));

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

  const resetRoutineProgress = () => {
    if (!island || !gameDate || !routines.length) return;
    Alert.alert('루틴 체크 초기화', '오늘 체크한 루틴을 모두 초기화할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '초기화',
        style: 'destructive',
        onPress: () => {
          try {
            routines.forEach((routine) => setRoutineProgress(island.id, routine.id, gameDate, 0, routine.goalCount));
            setRoutineProgressState(
              Object.fromEntries(routines.map((routine) => [routine.id, { currentCount: 0, isComplete: false }])),
            );
          } catch {
            Alert.alert('루틴을 초기화하지 못했어요', '잠시 후 다시 시도해 주세요.');
          }
        },
      },
    ]);
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
        <AppChrome
          islandPicker={{
            onChange: switchIsland,
            onToggle: () => setIslandPickerOpen((value) => !value),
            open: islandPickerOpen,
            options: islands.map((availableIsland) => ({ id: availableIsland.id, label: availableIsland.name, selected: availableIsland.id === island.id })),
            value: island.name,
          }}
          title="오늘"
        />
      <SafeAreaView edges={[]} style={[styles.safeArea, { backgroundColor: AppColors.background }]}>
        <ScrollView contentContainerStyle={todayStyles.content} ref={scrollRef} showsVerticalScrollIndicator={false}>
          <TodayDateTimeCard
            gameHour={gameHour}
            gameMinute={gameMinute}
            gameDate={gameDate}
            onOpenCalendar={() => { setTimePickerKind(null); setDateTimeModalOpen(true); }}
            onSelectTime={(value) => applyGameTime(`${String(timePickerKind === 'hour' ? value : gameHour).padStart(2, '0')}:${String(timePickerKind === 'minute' ? value : gameMinute).padStart(2, '0')}`)}
            onToggleTime={(kind) => setTimePickerKind((current) => current === kind ? null : kind)}
            timePickerKind={timePickerKind}
          />
          <SeasonalRecipeCard
            groups={activeRecipeGroups}
            onOpenSeries={(key) => router.push({
              pathname: '/catalog/[category]' as never,
              params: { category: 'seasonal_recipes', subcategory: `season:${key}` },
            })}
          />
          <View style={todayStyles.dashboardTwoColumn}>
            <BloomingBushCard bushes={bloomingBushes} hemisphere={hemisphere} />
            <ZodiacCard definition={zodiacDefinition} fragmentItem={zodiacFragmentItem} />
          </View>
          <TodayEventCard events={todayEventNames} />

          <View style={todayStyles.sectionBlock}>
            <SectionHeader
              actionIcon="edit"
              actionLabel="루틴 편집"
              icon="routine"
              onAction={() => { setEditingRoutine(null); setRoutineTitle(''); setRoutineGoal('1'); setRoutineModalOpen(true); }}
              onSecondaryAction={resetRoutineProgress}
              secondaryActionIcon="reset"
              secondaryActionLabel="루틴 체크 초기화"
              title="루틴 체크"
            />
            <SectionCard>
              <RoutineGrid progressById={routineProgress} routines={routines} onToggle={toggleRoutine} />
            </SectionCard>
          </View>

          <View style={todayStyles.sectionBlock}>
            <SectionHeader icon="npc" tone="resident" title="이번 주 방문 NPC" actionIcon="reset" actionLabel="주간 초기화" onAction={() => { clearNpcVisitsForWeek(island.id, weekDates[0], weekDates[6]); setNpcVisits({}); }} />
            <SectionCard>
              <NpcWeekCard currentDate={gameDate} visits={npcVisits} weekDates={weekDates} onSelectDate={setNpcDate} />
            </SectionCard>
          </View>

          <CritterPreview
            availableCount={availableCritters.length}
            categoryCounts={progressCountsByCategory}
            items={critterPreviewItems}
            progressNeededCount={progressNeededCritters.length}
            month={month}
            hemisphere={island.hemisphere === 'south' ? 'south' : 'north'}
            states={collectionStates}
            selectedCategory={critterPreviewCategory}
            onSelectCategory={(category) => setCritterPreviewCategory((current) => current === category ? null : category)}
            onOpenFull={() => {
              setCritterPreviewCategory(null);
              setCritterBrowserTab('bugs');
              setCritterBrowserOnlyIncomplete(false);
              setCritterBrowserOpen(true);
            }}
            onToggle={updateCritterStatus}
          />

        </ScrollView>
        <FloatingTopButton
          accessibilityLabel="오늘 화면 맨 위로 이동"
          onPress={() => scrollRef.current?.scrollTo({ animated: true, y: 0 })}
        />
        <DateTimeModal
          date={gameDate}
          hemisphere={hemisphere}
          todayDate={getGameDate(timezone)}
          visible={dateTimeModalOpen}
          onApply={applyGameDate}
          onClose={() => setDateTimeModalOpen(false)}
        />
        <NpcModal date={npcDate} selectedNames={npcDate ? getResolvedNpcNames(npcDate, npcVisits) : []} visible={Boolean(npcDate)} onClose={() => setNpcDate(null)} onSave={saveNpc} />
        <RoutineModal visible={routineModalOpen} editingRoutine={editingRoutine} title={routineTitle} goal={routineGoal} selectedDefaultTitles={selectedDefaultRoutineTitles} onChangeTitle={setRoutineTitle} onChangeGoal={setRoutineGoal} onClose={() => setRoutineModalOpen(false)} onSaveEdit={saveRoutineEdit} onSaveSelection={saveRoutineSelection} onDelete={editingRoutine ? () => { setRoutineModalOpen(false); removeRoutine(editingRoutine); } : undefined} />
        <TodayCritterBrowserSheet
          hemisphere={island.hemisphere === 'south' ? 'south' : 'north'}
          items={availableCritters}
          month={month}
          onChangeTab={setCritterBrowserTab}
          onClose={() => setCritterBrowserOpen(false)}
          onOpenItem={(item) => {
            setCritterBrowserOpen(false);
            router.push({
              pathname: '/encyclopedia/[category]/[itemId]' as never,
              params: { category: item.category, itemId: item.id },
            });
          }}
          onToggle={updateCritterStatus}
          onlyIncomplete={critterBrowserOnlyIncomplete}
          onToggleIncomplete={() => setCritterBrowserOnlyIncomplete((value) => !value)}
          states={collectionStates}
          tab={critterBrowserTab}
          visible={critterBrowserOpen}
        />
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
  onSecondaryAction,
  title,
  tone = 'leaf',
  onAction,
  secondaryActionIcon,
  secondaryActionLabel,
}: {
  actionIcon?: TodayActionIcon;
  actionLabel?: string;
  icon: TodaySectionIcon;
  onSecondaryAction?: () => void;
  title: string;
  tone?: TileTone;
  onAction?: () => void;
  secondaryActionIcon?: TodayActionIcon;
  secondaryActionLabel?: string;
}) {
  return (
    <View style={todayStyles.sectionHeader}>
      <View style={todayStyles.sectionTitleWrap}>
        <SectionGlyph kind={icon} tone={tone} />
        <Text adjustsFontSizeToFit minimumFontScale={0.86} numberOfLines={1} style={todayStyles.sectionTitle}>{title}</Text>
      </View>
      <View style={todayStyles.sectionActions}>
        {secondaryActionLabel && onSecondaryAction ? (
          <Pressable accessibilityLabel={secondaryActionLabel} accessibilityRole="button" onPress={onSecondaryAction} style={secondaryActionIcon ? todayStyles.sectionIconActionButton : todayStyles.sectionActionButton}>
            {secondaryActionIcon ? <ActionGlyph kind={secondaryActionIcon} tone={tone} /> : <Text style={todayStyles.sectionAction}>{secondaryActionLabel}</Text>}
          </Pressable>
        ) : null}
        {actionLabel && onAction ? (
          <Pressable accessibilityLabel={actionLabel} accessibilityRole="button" onPress={onAction} style={actionIcon ? todayStyles.sectionIconActionButton : todayStyles.sectionActionButton}>
            {actionIcon ? <ActionGlyph kind={actionIcon} tone={tone} /> : <Text style={todayStyles.sectionAction}>{actionLabel}</Text>}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function SectionCard({ children }: { children: ReactNode }) {
  return <View style={todayStyles.sectionCard}>{children}</View>;
}

function SectionGlyph({ kind, tone }: { kind: TodaySectionIcon; tone: TileTone }) {
  const colors = getTone(tone);
  const iconName = kind === 'summary'
    ? 'island'
    : kind === 'routine'
      ? 'format-list-checks'
      : kind === 'npc'
        ? 'account-star-outline'
        : 'calendar-week-outline';
  return (
    <View style={todayStyles.sectionGlyph}>
      {kind === 'npc' ? (
        <Image source={npcAssets.isabelle.icon} style={todayStyles.sectionGlyphImage} />
      ) : kind === 'critter' ? (
        <Image source={CRITTERPEDIA_ICON} style={todayStyles.sectionGlyphImage} />
      ) : (
        <MaterialCommunityIcons color={colors.color as ColorValue} name={iconName} size={18} />
      )}
    </View>
  );
}

function TodayDateTimeCard({
  gameDate,
  gameHour,
  gameMinute,
  onOpenCalendar,
  onSelectTime,
  onToggleTime,
  timePickerKind,
}: {
  gameDate: string;
  gameHour: number;
  gameMinute: number;
  onOpenCalendar: () => void;
  onSelectTime: (value: number) => void;
  onToggleTime: (kind: TimePickerKind) => void;
  timePickerKind: TimePickerKind | null;
}) {
  return (
    <View style={todayStyles.dateTimeCard}>
      <View style={todayStyles.dateTimeRow}>
        <Pressable accessibilityLabel="게임 날짜 캘린더 열기" accessibilityRole="button" onPress={onOpenCalendar} style={todayStyles.dateControl}>
          <View style={todayStyles.dateTimeValueRow}>
            <MaterialCommunityIcons color={AppColors.leaf} name="calendar-month-outline" size={17} />
            <Text numberOfLines={1} style={todayStyles.dateTimeValue}>{formatDashboardDate(gameDate)}</Text>
            <MaterialCommunityIcons color={AppColors.inkMuted} name="chevron-down" size={16} />
          </View>
        </Pressable>

        <View style={todayStyles.timeControl}>
          <View style={todayStyles.timeControlRow}>
            <MaterialCommunityIcons color={AppColors.catalog} name="clock-outline" size={16} />
            <Pressable
              accessibilityLabel={`${gameHour}시 선택`}
              accessibilityRole="button"
              accessibilityState={{ expanded: timePickerKind === 'hour' }}
              onPress={() => onToggleTime('hour')}
              style={[todayStyles.timePickerButton, timePickerKind === 'hour' && todayStyles.timePickerButtonSelected]}>
              <Text style={todayStyles.timePickerValue}>{String(gameHour).padStart(2, '0')}</Text>
            </Pressable>
            <Text style={todayStyles.timePickerDivider}>:</Text>
            <Pressable
              accessibilityLabel={`${gameMinute}분 선택`}
              accessibilityRole="button"
              accessibilityState={{ expanded: timePickerKind === 'minute' }}
              onPress={() => onToggleTime('minute')}
              style={[todayStyles.timePickerButton, timePickerKind === 'minute' && todayStyles.timePickerButtonSelected]}>
              <Text style={todayStyles.timePickerValue}>{String(gameMinute).padStart(2, '0')}</Text>
            </Pressable>
            <MaterialCommunityIcons color={AppColors.catalog} name="chevron-down" size={14} />
          </View>
        </View>
      </View>
      {timePickerKind ? (
        <TimePickerMenu kind={timePickerKind} onClose={() => onToggleTime(timePickerKind)} onSelect={onSelectTime} value={timePickerKind === 'hour' ? gameHour : gameMinute} />
      ) : null}
    </View>
  );
}

function DashboardGradientCard({ children, colors, style }: { children: ReactNode; colors: [ColorValue, ColorValue]; style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient colors={colors} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={[todayStyles.dashboardCard, style]}>
      <View style={todayStyles.dashboardCardContent}>{children}</View>
    </LinearGradient>
  );
}

function SeasonalRecipeCard({ groups, onOpenSeries }: {
  groups: Array<{
    collectedCount: number;
    key: string;
    materialAssets: ImageSourcePropType[];
    materialLabel: string;
    materialName: string;
    period: string;
    periodKo: string;
    recipeCount: number;
    seasonLabel: string;
  }>;
  onOpenSeries: (key: string) => void;
}) {
  const seasonLabels = [...new Set(groups.map((group) => group.seasonLabel).filter(Boolean))];
  const variantKey = groups.some((group) => group.key === 'cherry_blossom')
    ? 'cherry_blossom'
    : groups[0]?.key ?? 'summer_shell';
  const variant = getRecipeSeasonVariant(variantKey);
  const headerPeriod = groups[0]?.period ?? '기간 정보 없음';

  return (
    <LinearGradient colors={variant.cardColors} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={[todayStyles.dashboardCard, todayStyles.recipeCard, { borderColor: variant.cardBorder }]}>
      <View pointerEvents="none" style={[todayStyles.recipeHeaderBand, { backgroundColor: variant.header }]} />
      <SeasonRecipeDecor decor={variant.decor} />
      <View style={todayStyles.dashboardCardContent}>
        <View style={todayStyles.recipeDashboardHeader}>
          <View style={todayStyles.recipeDashboardHeaderCopy}>
            <View style={todayStyles.recipeDashboardTitleRow}>
              {seasonLabels.length ? <Text style={[todayStyles.seasonChip, { backgroundColor: variant.accent }]}>{seasonLabels.join(' · ')}</Text> : null}
              <View style={todayStyles.recipeDashboardTitleCopy}>
                <Text numberOfLines={1} style={[todayStyles.recipeDashboardTitle, { color: variant.ink }]}>시즌 레시피</Text>
                <Text style={[todayStyles.recipeDashboardSubtitle, { color: variant.muted }]}>{groups.length}개 시리즈 진행 중</Text>
              </View>
            </View>
          </View>
          <View style={todayStyles.recipeDashboardPeriod}>
            <Text style={[todayStyles.recipeDashboardPeriodLabel, { color: variant.muted }]}>시즌 기간</Text>
            <Text numberOfLines={1} style={[todayStyles.recipeDashboardPeriodValue, { color: variant.accent }]}>{headerPeriod}</Text>
          </View>
        </View>
        {groups.length ? groups.map((group) => {
          const progress = group.recipeCount ? Math.round((group.collectedCount / group.recipeCount) * 100) : 0;
          return (
            <View key={group.key} style={[todayStyles.recipeGroupRow, { backgroundColor: variant.surface, borderColor: variant.surfaceBorder }] }>
              <View style={todayStyles.recipeGroupTop}>
                <View style={todayStyles.recipeMaterialIcons}>
                  {group.materialAssets.length ? group.materialAssets.slice(0, 3).map((asset, index) => (
                    <Image
                      accessibilityLabel={`${group.materialName} 재료 ${index + 1}`}
                      key={`${group.key}-material-${index}`}
                      resizeMode="contain"
                      source={asset}
                      style={[todayStyles.recipeMaterialImage, index > 0 && todayStyles.recipeMaterialImageOverlap]}
                    />
                  )) : <MaterialCommunityIcons color={variant.accent} name="leaf" size={42} />}
                </View>
                <View style={todayStyles.recipeGroupCopy}>
                  <Text numberOfLines={1} style={[todayStyles.recipeGroupName, { color: variant.ink }]}>{group.materialName} 레시피</Text>
                  <View style={todayStyles.recipeGroupInfoRow}>
                    <Text style={[todayStyles.recipeGroupInfoLabel, { color: variant.accent }]}>기간</Text>
                    <Text numberOfLines={1} style={[todayStyles.recipeGroupInfoValue, { color: variant.muted }]}>{group.periodKo}</Text>
                  </View>
                  <View style={todayStyles.recipeGroupInfoRow}>
                    <Text style={[todayStyles.recipeGroupInfoLabel, { color: variant.accent }]}>재료</Text>
                    <Text numberOfLines={2} style={[todayStyles.recipeGroupInfoValue, { color: variant.muted }]}>{group.materialLabel}</Text>
                  </View>
                </View>
                <View style={todayStyles.recipeGroupAside}>
                  <Pressable
                    accessibilityLabel={`${group.materialName} 레시피 전체보기`}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => onOpenSeries(group.key)}
                    style={todayStyles.recipeViewAllButton}>
                    <Text style={[todayStyles.recipeViewAllText, { color: variant.accent }]}>전체보기</Text>
                    <MaterialCommunityIcons color={variant.accent} name="chevron-right" size={17} />
                  </Pressable>
                </View>
              </View>
              <View style={todayStyles.recipeProgressHeader}>
                <Text style={[todayStyles.recipeProgressLabel, { color: variant.muted }]}>레시피 수집률</Text>
                <Text style={[todayStyles.recipeGroupCount, { color: variant.ink }]}>{group.collectedCount} / {group.recipeCount}</Text>
              </View>
              <View style={[todayStyles.recipeProgressRail, { backgroundColor: variant.rail }]}>
                <View style={[todayStyles.recipeProgressFill, { backgroundColor: variant.accent, width: `${progress}%` }]} />
              </View>
            </View>
          );
        }) : <Text style={[todayStyles.dashboardEmptyText, { color: variant.muted }]}>현재 진행 중인 시즌 레시피가 없어요.</Text>}
      </View>
    </LinearGradient>
  );
}

function SeasonRecipeDecor({ decor }: { decor: 'autumn' | 'spring' | 'summer' | 'winter' }) {
  if (decor === 'spring') {
    return (
      <View pointerEvents="none" style={todayStyles.recipeDecorLayer}>
        <View style={[todayStyles.recipeDecorCircle, todayStyles.recipeDecorSpringLarge]} />
        <View style={[todayStyles.recipeDecorCircle, todayStyles.recipeDecorSpringSmall]} />
      </View>
    );
  }
  if (decor === 'summer') {
    return (
      <View pointerEvents="none" style={todayStyles.recipeDecorLayer}>
        <View style={todayStyles.recipeDecorWave} />
        <View style={todayStyles.recipeDecorWaveSmall} />
      </View>
    );
  }
  if (decor === 'autumn') {
    return (
      <View pointerEvents="none" style={todayStyles.recipeDecorLayer}>
        <View style={[todayStyles.recipeDecorLeaf, todayStyles.recipeDecorAutumnGold]} />
        <View style={[todayStyles.recipeDecorLeaf, todayStyles.recipeDecorAutumnRust]} />
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={todayStyles.recipeDecorLayer}>
      <View style={[todayStyles.recipeDecorSnow, { right: 82, top: 20 }]} />
      <View style={[todayStyles.recipeDecorSnow, { right: 60, top: 42, transform: [{ scale: 0.65 }] }]} />
      <View style={[todayStyles.recipeDecorSnow, { right: 36, top: 18, transform: [{ scale: 0.8 }] }]} />
      <View style={[todayStyles.recipeDecorSnow, { right: 10, top: 38, transform: [{ scale: 1.1 }] }]} />
    </View>
  );
}

function BloomingBushCard({ bushes, hemisphere }: { bushes: BloomingBush[]; hemisphere: Island['hemisphere'] }) {
  return (
    <DashboardGradientCard colors={['#DCF4E2', '#C9EDDA']} style={[todayStyles.dashboardHalfCard, todayStyles.bushCard]}>
      <View style={todayStyles.dashboardCardHeader}>
        <View style={todayStyles.dashboardCardTitleRow}>
          <Text numberOfLines={2} style={todayStyles.dashboardCardTitle}>개화한 낮은나무</Text>
        </View>
        <Text style={todayStyles.dashboardCardCountChip}>{bushes.length}종</Text>
      </View>
      {bushes.length ? (
        <View style={todayStyles.bushList}>
          {bushes.map((bush) => (
            <View key={bush.id} style={[todayStyles.bushItem, bushes.length === 1 && todayStyles.bushItemSingle]}>
              <View style={todayStyles.bushImageFrame}>
                <Image accessibilityLabel={bush.nameKo} resizeMode="contain" source={bush.icon} style={todayStyles.bushImage} />
              </View>
              <View style={todayStyles.bushCopy}>
                <Text numberOfLines={1} style={todayStyles.bushName}>{bush.nameKo}</Text>
                <Text numberOfLines={1} style={todayStyles.bushPeriod}>{formatBloomWindow(bush, hemisphere)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : <Text style={todayStyles.dashboardEmptyText}>지금 개화한 낮은나무가 없어요.</Text>}
    </DashboardGradientCard>
  );
}

function ZodiacCard({ definition, fragmentItem }: { definition: (typeof ZODIAC_SIGNS)[number]; fragmentItem?: ReturnType<typeof getCatalogItems>[number] }) {
  const zodiacIcon = ZODIAC_ICON_ASSETS[definition.key];
  const fragmentAsset = fragmentItem ? getCatalogAssetForItem(fragmentItem) : undefined;
  return (
    <DashboardGradientCard colors={['#ECE5FF', '#D8CCFA']} style={[todayStyles.dashboardHalfCard, todayStyles.zodiacCard]}>
      <View style={todayStyles.dashboardCardHeader}>
        <View style={todayStyles.dashboardCardTitleRow}>
          <Text style={todayStyles.dashboardCardTitle}>별자리</Text>
        </View>
      </View>
      <View style={todayStyles.zodiacBody}>
        <Image accessibilityLabel={definition.name} source={zodiacIcon} style={todayStyles.zodiacImage} />
        <View style={todayStyles.zodiacCopy}>
          <Text style={todayStyles.zodiacName}>{definition.name}</Text>
          <Text style={todayStyles.zodiacPeriod}>{formatZodiacPeriod(definition)}</Text>
        </View>
      </View>
      <View style={todayStyles.fragmentRow}>
        {fragmentAsset ? <Image accessibilityLabel={`${definition.name} 조각`} source={fragmentAsset} style={todayStyles.fragmentImage} /> : <MaterialCommunityIcons color="#8D78B8" name="star-outline" size={19} />}
        <Text numberOfLines={1} style={todayStyles.fragmentText}>{definition.name} 조각</Text>
      </View>
      <Text style={todayStyles.zodiacFooter}>해변에서 획득</Text>
    </DashboardGradientCard>
  );
}

function TodayEventCard({ events }: { events: string[] }) {
  return (
    <DashboardGradientCard colors={['#FFE4CF', '#FFCFAF']} style={todayStyles.eventCard}>
      <View style={todayStyles.dashboardCardHeader}>
        <View style={todayStyles.dashboardCardTitleRow}>
          <Text style={todayStyles.dashboardCardTitle}>오늘의 이벤트</Text>
        </View>
        <Text style={todayStyles.dashboardCardCountChip}>{events.length}개</Text>
      </View>
      {events.length ? events.map((eventName) => {
        const asset = getEventNpcImage(eventName);
        const schedule = getEventSchedule(eventName);
        return (
          <View key={eventName} style={todayStyles.eventRow}>
            {asset ? <Image accessibilityLabel={`${eventName} 캐릭터`} source={asset} style={todayStyles.eventImage} /> : <MaterialCommunityIcons color={AppColors.resident} name="account-star-outline" size={34} />}
            <View style={todayStyles.eventCopy}>
              <Text numberOfLines={1} style={todayStyles.eventName}>{eventName}</Text>
              <Text style={todayStyles.eventMeta}>{schedule.time} · {schedule.location}</Text>
            </View>
            {schedule.host ? <Text style={todayStyles.eventHost}>{schedule.host}</Text> : null}
          </View>
        );
      }) : <Text style={todayStyles.dashboardEmptyText}>오늘 예정된 이벤트가 없어요.</Text>}
    </DashboardGradientCard>
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

function RoutineIcon({ title, complete = false, variant = 'card', selected = false }: { title: string; complete?: boolean; variant?: 'card' | 'edit'; selected?: boolean }) {
  const source = getRoutineIconSource(title);
  const isEdit = variant === 'edit';
  const isCompactImage = title === '나무 흔들기 · 가구';
  const iconColor = complete || selected ? AppColors.leaf : AppColors.inkMuted;

  return (
    <View style={isEdit ? todayStyles.routineEditIcon : todayStyles.routineIcon}>
      {source ? (
        <Image
          accessibilityLabel={`${title} 아이콘`}
          resizeMode="contain"
          source={source}
          style={isEdit
            ? [todayStyles.routineEditIconImage, isCompactImage && todayStyles.routineEditIconImageCompact]
            : [todayStyles.routineIconImage, isCompactImage && todayStyles.routineIconImageCompact]}
        />
      ) : (
        <MaterialCommunityIcons color={iconColor} name="clipboard-check-outline" size={isEdit ? 16 : 32} />
      )}
      {isEdit && selected ? (
        <View style={todayStyles.routineEditCheckBadge}>
          <MaterialCommunityIcons color={AppColors.card} name="check" size={9} />
        </View>
      ) : null}
    </View>
  );
}

function RoutineGrid({ routines, progressById, onToggle }: { routines: Routine[]; progressById: Record<string, RoutineProgress>; onToggle: (routine: Routine) => void }) {
  if (!routines.length) {
    return <Text style={todayStyles.noData}>루틴 편집에서 표시할 루틴을 선택해 주세요.</Text>;
  }

  const rows = Array.from({ length: Math.ceil(routines.length / 6) }, (_, index) => routines.slice(index * 6, index * 6 + 6));

  return (
    <View style={todayStyles.routineCard}>
      {rows.map((row, rowIndex) => (
        <View key={`routine-row-${rowIndex}`} style={todayStyles.routineRowGrid}>
          {row.map((routine) => {
            const progress = progressById[routine.id]?.currentCount ?? 0;
            const complete = progress >= routine.goalCount;
            return (
              <Pressable
                accessibilityLabel={`${routine.title} ${complete ? '완료' : '미완료'}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: complete }}
                key={routine.id}
                onPress={() => onToggle(routine)}
                style={todayStyles.routineTile}>
                <RoutineIcon complete={complete} title={routine.title} />
                {complete ? (
                  <View style={todayStyles.routineCheckBadge}>
                    <MaterialCommunityIcons color={AppColors.card} name="check" size={10} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
          {row.length < 6 ? Array.from({ length: 6 - row.length }, (_, index) => <View key={`routine-spacer-${rowIndex}-${index}`} style={todayStyles.routineTileSpacer} />) : null}
        </View>
      ))}
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
  selectedCategory,
  states,
  onSelectCategory,
  onOpenFull,
  onToggle,
}: {
  availableCount: number;
  categoryCounts: Array<{ category: CritterCategory; count: number }>;
  hemisphere: 'north' | 'south';
  items: EncyclopediaItem[];
  month: number;
  progressNeededCount: number;
  selectedCategory: CritterCategory | null;
  states: Record<string, EncyclopediaState>;
  onSelectCategory: (category: CritterCategory) => void;
  onOpenFull: () => void;
  onToggle: (item: EncyclopediaItem, status: EncyclopediaStatus) => void;
}) {
  return (
    <View style={todayStyles.sectionBlock}>
      <SectionHeader
        actionLabel={`전체 ${availableCount} 보기`}
        icon="critter"
        onAction={onOpenFull}
        title="지금 잡을 수 있는 생물"
        tone="museum"
      />
      <View style={[todayStyles.sectionCard, todayStyles.critterSection]}>
        <View style={todayStyles.critterCard}>
        <View style={todayStyles.critterStatRail}>
          <View style={todayStyles.critterMainStat}>
            <Text style={todayStyles.critterStatLabel}>진척 필요</Text>
            <Text style={todayStyles.critterStatValue}>{progressNeededCount}</Text>
          </View>
          <View style={todayStyles.critterCategoryRow}>
            {categoryCounts.map((item) => (
              <Pressable
                accessibilityLabel={`${getCategoryLabel(item.category)} 미채집 또는 미기증 생물 보기`}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedCategory === item.category }}
                key={item.category}
                onPress={() => onSelectCategory(item.category)}
                style={[
                  todayStyles.critterCategoryChip,
                  selectedCategory === item.category && todayStyles.critterCategoryChipSelected,
                ]}>
                <Text style={[
                  todayStyles.critterCategoryText,
                  selectedCategory === item.category && todayStyles.critterCategoryTextSelected,
                ]}>{getCategoryLabel(item.category)} {item.count}</Text>
              </Pressable>
            ))}
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
            <Text style={todayStyles.noData}>
              {selectedCategory
                ? `${getCategoryLabel(selectedCategory)} 중 미채집·미기증 생물이 없어요.`
                : '선택한 게임 시간에 출현하는 생물이 없어요.'}
            </Text>
          )}
        </ScrollView>
        </View>
      </View>
    </View>
  );
}

function TodayCritterBrowserSheet({
  hemisphere,
  items,
  month,
  onChangeTab,
  onClose,
  onOpenItem,
  onToggle,
  onlyIncomplete,
  onToggleIncomplete,
  states,
  tab,
  visible,
}: {
  hemisphere: 'north' | 'south';
  items: EncyclopediaItem[];
  month: number;
  onChangeTab: (tab: CritterTab) => void;
  onClose: () => void;
  onOpenItem: (item: EncyclopediaItem) => void;
  onToggle: (item: EncyclopediaItem, status: EncyclopediaStatus) => void;
  onlyIncomplete: boolean;
  onToggleIncomplete: () => void;
  states: Record<string, EncyclopediaState>;
  tab: CritterTab;
  visible: boolean;
}) {
  const filteredItems = items
    .filter((item) => {
      if (tab === 'newThisMonth') return getMonthlyAvailabilityFlags(item, hemisphere, month).isNewThisMonth;
      if (tab === 'leavingThisMonth') return getMonthlyAvailabilityFlags(item, hemisphere, month).isLeavingThisMonth;
      return item.category === tab;
    })
    .filter((item) => {
      if (!onlyIncomplete) return true;
      const state = states[`${item.category}/${item.id}`] ?? EMPTY_STATE;
      return !state.caught || !state.donated;
    })
    .sort((left, right) => {
      const numberDifference = (left.number ?? Number.MAX_SAFE_INTEGER) - (right.number ?? Number.MAX_SAFE_INTEGER);
      return numberDifference || left.nameKo.localeCompare(right.nameKo, 'ko-KR');
    });

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={todayStyles.critterBrowserBackdrop}>
        <Pressable accessibilityLabel="현재 출현 생물 닫기" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={todayStyles.critterBrowserSheet}>
          <SafeAreaView edges={['bottom']} style={todayStyles.critterBrowserSafeArea}>
            <View style={todayStyles.critterBrowserHeader}>
              <View style={todayStyles.critterBrowserTitleWrap}>
                <Text style={todayStyles.critterBrowserTitle}>현재 출현 생물</Text>
                <Text style={todayStyles.critterBrowserSubtitle}>지금 잡을 수 있는 생물 전체</Text>
              </View>
              <Pressable
                accessibilityLabel="현재 출현 생물 닫기"
                accessibilityRole="button"
                hitSlop={10}
                onPress={onClose}
                style={todayStyles.critterBrowserClose}>
                <MaterialCommunityIcons color={AppColors.ink} name="close" size={22} />
              </Pressable>
            </View>
            <UnderlineTabs
              accessibilityLabel={(item) => `${item.label} 현재 출현 생물 보기`}
              fitToWidth
              onChange={onChangeTab}
              tabs={CRITTER_BROWSER_TABS}
              value={tab}
            />
            <View style={todayStyles.critterBrowserCountRow}>
              <Text style={todayStyles.critterBrowserCount}>{filteredItems.length}종 출현 중</Text>
              <Pressable
                accessibilityLabel="미채집 또는 미기증 생물만 표시"
                accessibilityRole="switch"
                accessibilityState={{ checked: onlyIncomplete }}
                onPress={onToggleIncomplete}
                style={[todayStyles.critterBrowserFilterButton, onlyIncomplete && todayStyles.critterBrowserFilterButtonActive]}>
                <MaterialCommunityIcons color={onlyIncomplete ? AppColors.leaf : AppColors.inkMuted} name="filter-variant" size={14} />
                <Text style={[todayStyles.critterBrowserFilterText, onlyIncomplete && todayStyles.critterBrowserFilterTextActive]}>미채집·미기증만</Text>
              </Pressable>
              <Text style={todayStyles.critterBrowserHint}>채집·기증 아이콘을 눌러 기록하세요</Text>
            </View>
            <ScrollView contentContainerStyle={todayStyles.critterBrowserList} showsVerticalScrollIndicator={false}>
              {filteredItems.length ? filteredItems.map((item) => {
                const key = `${item.category}/${item.id}`;
                return (
                  <TodayCritterBrowserCard
                    hemisphere={hemisphere}
                    item={item}
                    key={key}
                    month={month}
                    onOpen={() => onOpenItem(item)}
                    onToggle={(status) => onToggle(item, status)}
                    state={states[key] ?? EMPTY_STATE}
                  />
                );
              }) : (
                <View style={todayStyles.critterBrowserEmpty}>
                  <Text style={todayStyles.critterBrowserEmptyTitle}>해당 생물이 없어요</Text>
                  <Text style={todayStyles.critterBrowserEmptyText}>{onlyIncomplete ? '현재 출현 생물이 모두 채집·기증 완료되었어요.' : '현재 날짜와 시간 기준으로 출현하는 생물만 표시됩니다.'}</Text>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

function TodayCritterBrowserCard({
  hemisphere,
  item,
  month,
  onOpen,
  onToggle,
  state,
}: {
  hemisphere: 'north' | 'south';
  item: EncyclopediaItem;
  month: number;
  onOpen: () => void;
  onToggle: (status: EncyclopediaStatus) => void;
  state: EncyclopediaState;
}) {
  const image = getEncyclopediaAsset(item.category, item.id);
  const availability = item.availability[hemisphere];
  const monthlyFlags = getMonthlyAvailabilityFlags(item, hemisphere, month);
  const availabilityLabel = localizeAvailabilityLabel(availability.label);
  const availabilityTime = localizeAvailabilityTime(availability.timesByMonth[String(month)] ?? null);
  const price = getCritterPriceText(item);

  return (
    <Pressable accessibilityLabel={`${item.nameKo} 상세 정보 보기`} accessibilityRole="button" onPress={onOpen} style={todayStyles.critterBrowserCard}>
      <View style={todayStyles.critterBrowserImageFrame}>
        {image ? (
          <Image source={image} resizeMode="contain" style={[todayStyles.critterBrowserImage, !state.caught && todayStyles.critterBrowserImageUncaught]} />
        ) : (
          <Text style={todayStyles.critterFallback}>?</Text>
        )}
      </View>
      <View style={todayStyles.critterBrowserCopy}>
        <View style={todayStyles.critterBrowserNameRow}>
          <View style={todayStyles.critterBrowserNameWrap}>
            <Text style={todayStyles.critterBrowserNumber}>{item.number ? `No.${String(item.number).padStart(3, '0')}` : getCategoryLabel(item.category)}</Text>
            <Text numberOfLines={1} style={todayStyles.critterBrowserName}>{item.nameKo}</Text>
            <Text numberOfLines={1} style={todayStyles.critterBrowserNameEn}>{item.nameEn}</Text>
          </View>
          <View style={todayStyles.critterBrowserStatus}>
            {(['caught', 'donated'] as EncyclopediaStatus[]).map((status) => (
              <Pressable
                accessibilityLabel={`${item.nameKo} ${status === 'caught' ? '채집' : '기증'} ${state[status] ? '해제' : '설정'}`}
                accessibilityRole="button"
                accessibilityState={{ checked: state[status] }}
                hitSlop={5}
                key={status}
                onPress={() => onToggle(status)}
                style={todayStyles.critterBrowserStatusButton}>
                <CollectionStatusIcon active={state[status]} status={status} />
              </Pressable>
            ))}
          </View>
        </View>
        {monthlyFlags.isNewThisMonth || monthlyFlags.isLeavingThisMonth ? (
          <View style={critterBadgeStyles.badgeRow}>
            {monthlyFlags.isNewThisMonth ? (
              <View style={[critterBadgeStyles.badge, critterBadgeStyles.newBadge]}>
                <Text style={[critterBadgeStyles.badgeText, critterBadgeStyles.newBadgeText]}>이번 달 신규</Text>
              </View>
            ) : null}
            {monthlyFlags.isLeavingThisMonth ? (
              <View style={[critterBadgeStyles.badge, critterBadgeStyles.leavingBadge]}>
                <Text style={[critterBadgeStyles.badgeText, critterBadgeStyles.leavingBadgeText]}>이번 달 종료</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <Text numberOfLines={1} style={todayStyles.critterBrowserMeta}>{getCritterLocationText(item)}</Text>
        <Text numberOfLines={1} style={todayStyles.critterBrowserMeta}>{availabilityLabel ?? '출현 정보 확인 중'} · {availabilityTime ?? '시간 정보 없음'}</Text>
        {price ? <Text style={todayStyles.critterBrowserPrice}>판매가 {price}</Text> : null}
      </View>
    </Pressable>
  );
}

const calendarStyles = StyleSheet.create({
  calendarSheet: { height: '82%', overflow: 'hidden', paddingBottom: 16 },
  calendarCardCompact: { backgroundColor: 'transparent', borderRadius: 0, elevation: 0, paddingBottom: 0, paddingHorizontal: 0, shadowOpacity: 0 },
  calendarDayCellCompact: { minHeight: 48, padding: 2 },
  calendarDayCellSelected: { backgroundColor: AppColors.calendarSelected, borderColor: AppColors.calendarSelectedBorder, borderWidth: 1 },
  calendarDayCellToday: { backgroundColor: AppColors.calendarToday },
  calendarDayNumberCompact: { fontSize: 10, marginBottom: 2 },
  calendarDayNumberSelected: { color: AppColors.calendarSelectedText, fontWeight: '900' },
  calendarDayNumberToday: { color: AppColors.calendarTodayText, fontWeight: '900' },
  calendarDayNumberRow: { alignItems: 'center', flexDirection: 'row', gap: 3, justifyContent: 'center' },
  calendarTodayMarker: { backgroundColor: AppColors.calendarTodayText, borderRadius: 3, height: 5, width: 5 },
  calendarTodayMarkerSelected: { backgroundColor: AppColors.calendarTodayText },
  calendarItemStackCompact: { gap: 1, minHeight: 20 },
  calendarBadgeCompact: { borderRadius: 3, minHeight: 11, paddingHorizontal: 1, paddingVertical: 1 },
  calendarBadgeTextCompact: { fontSize: 8, lineHeight: 10 },
  calendarBirthdayBadge: { backgroundColor: AppColors.calendarBirthday },
  calendarEventBadge: { backgroundColor: AppColors.calendarEvent },
  calendarBirthdayText: { color: AppColors.calendarBirthdayText },
  calendarEventText: { color: AppColors.calendarEventText },
  calendarMoreTextCompact: { fontSize: 8 },
  calendarPeriodButton: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderColor: AppColors.line, borderRadius: AppRadii.control, borderWidth: 1, height: 30, justifyContent: 'center', width: 30 },
  calendarPeriodNavigation: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  calendarPeriodNavigationCompact: { marginBottom: 5 },
  calendarPeriodTitleCompact: { marginBottom: 0 },
  calendarMonthHeader: { alignItems: 'center', flexDirection: 'row', gap: 4, justifyContent: 'center' },
  calendarMonthPickerButton: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderColor: AppColors.line, borderRadius: AppRadii.control, borderWidth: 1, flexDirection: 'row', gap: 3, height: 30, justifyContent: 'center', paddingHorizontal: 5, width: 78 },
  calendarMonthPickerText: { color: AppColors.ink, fontSize: 12, fontWeight: '900' },
  calendarMonthPickerIcon: { color: AppColors.inkMuted },
  calendarPickerPanel: { backgroundColor: AppColors.paperRaised, borderColor: AppColors.line, borderRadius: AppRadii.control, borderWidth: 1, marginBottom: 6, padding: 7 },
  calendarPickerPanelTitle: { color: AppColors.inkMuted, fontSize: 9, fontWeight: '900', marginBottom: 5 },
  calendarPickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  calendarPickerOption: { alignItems: 'center', borderColor: 'transparent', borderRadius: 8, borderWidth: 1, justifyContent: 'center', minHeight: 26, width: '23%' },
  calendarPickerOptionSelected: { backgroundColor: AppColors.calendarSelected, borderColor: AppColors.calendarSelectedBorder },
  calendarPickerOptionText: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '800' },
  calendarPickerOptionTextSelected: { color: AppColors.calendarSelectedText, fontWeight: '900' },
  calendarCloseButton: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderColor: AppColors.line, borderRadius: AppRadii.pill, borderWidth: 1, height: 32, justifyContent: 'center', marginLeft: 6, width: 32 },
  calendarToggleCompact: { marginVertical: 6 },
  calendarWeekCellCompact: { minHeight: 60 },
  calendarWeekdayRowCompact: { paddingBottom: 4 },
  calendarWeekdayTextCompact: { fontSize: 9 },
  calendarWeekList: { borderColor: AppColors.line, borderTopWidth: 1 },
  calendarWeekRow: { alignItems: 'center', borderBottomColor: AppColors.line, borderBottomWidth: 1, flexDirection: 'row', minHeight: 38, paddingHorizontal: 6, paddingVertical: 3 },
  calendarWeekRowToday: { backgroundColor: AppColors.calendarToday },
  calendarWeekRowSelected: { backgroundColor: AppColors.calendarSelected, borderColor: AppColors.calendarSelectedBorder, borderWidth: 1 },
  calendarWeekDateColumn: { alignItems: 'center', borderRightColor: AppColors.line, borderRightWidth: 1, justifyContent: 'center', width: 54 },
  calendarWeekdayLabel: { color: AppColors.inkMuted, fontSize: 9, fontWeight: '800' },
  calendarWeekDateText: { color: AppColors.ink, fontSize: 12, fontWeight: '900', marginTop: 1 },
  calendarWeekDateTextToday: { color: AppColors.calendarTodayText },
  calendarWeekDateTextSelected: { color: AppColors.calendarSelectedText },
  calendarWeekItemStack: { alignItems: 'center', flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginLeft: 8, minWidth: 0 },
  calendarWeekItemBadge: { borderRadius: 3, maxWidth: '46%', minHeight: 14, paddingHorizontal: 4, paddingVertical: 1 },
  calendarWeekItemText: { fontSize: 8, fontWeight: '800', lineHeight: 11 },
  calendarWeekEmptyText: { color: AppColors.inkMuted, fontSize: 9 },
  calendarWeekArrow: { color: AppColors.inkMuted, marginLeft: 4 },
  calendarSelectedDateCard: { backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: AppRadii.control, borderWidth: 1, marginTop: 8, paddingHorizontal: 10, paddingVertical: 7 },
  calendarSelectedDateHeader: { alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 4 },
  calendarSelectedDateIcon: { color: AppColors.calendarSelectedText },
  calendarSelectedDateTitle: { color: AppColors.ink, flex: 1, fontSize: 13, fontWeight: '900' },
  calendarDetailRow: { alignItems: 'center', flexDirection: 'row', gap: 6, minHeight: 15 },
  calendarDetailDot: { borderRadius: 4, height: 8, width: 8 },
  calendarDetailBirthdayDot: { backgroundColor: AppColors.calendarBirthdayText },
  calendarDetailEventDot: { backgroundColor: AppColors.calendarEventText },
  calendarDetailText: { color: AppColors.inkMuted, flex: 1, fontSize: 12, fontWeight: '700' },
  calendarNoDetail: { color: AppColors.inkMuted, fontSize: 11 },
  calendarLegend: { alignItems: 'center', flexDirection: 'row', gap: 14, justifyContent: 'flex-start', marginBottom: 4 },
  calendarLegendItem: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  calendarLegendText: { color: AppColors.inkMuted, fontSize: 9, fontWeight: '700' },
  calendarLegendTodayDot: { backgroundColor: AppColors.calendarTodayText, borderRadius: 4, height: 8, width: 8 },
  calendarLegendSelectedDot: { backgroundColor: AppColors.calendarSelected, borderColor: AppColors.calendarSelectedBorder, borderRadius: 4, borderWidth: 1, height: 8, width: 8 },
  calendarLegendBirthdayDot: { backgroundColor: AppColors.calendarBirthdayText, borderRadius: 4, height: 8, width: 8 },
  calendarLegendEventDot: { backgroundColor: AppColors.calendarEventText, borderRadius: 4, height: 8, width: 8 },
  sheetHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sheetTitleCompact: { flex: 1, marginBottom: 0, marginRight: 10 },
  todayPickerButton: { alignItems: 'center', backgroundColor: AppColors.leafSoft, borderColor: AppColors.primaryBorder, borderRadius: AppRadii.control, borderWidth: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 40, paddingHorizontal: 10, paddingVertical: 8 },
  todayPickerButtonText: { color: AppColors.leaf, fontSize: 11, fontWeight: '900' },
});

function CalendarSection({
  cells,
  currentDate,
  itemsByDate,
  mode,
  onChangeMode,
  compact = false,
  onSelectDate,
  periodHeader,
  periodNavigation,
  periodPicker,
  selectedDate,
}: {
  cells: Array<string | null>;
  currentDate: string;
  itemsByDate: Record<string, CalendarItem[]>;
  mode: CalendarMode;
  onChangeMode: (mode: CalendarMode) => void;
  compact?: boolean;
  onSelectDate?: (date: string) => void;
  periodHeader?: ReactNode;
  periodNavigation?: { onNext: () => void; onPrevious: () => void };
  periodPicker?: ReactNode;
  selectedDate?: string;
}) {
  const currentDateObject = parseIsoDate(currentDate) ?? new Date();
  const visibleDates = cells.filter((date): date is string => Boolean(date));
  const periodDate = visibleDates[0] ? (parseIsoDate(visibleDates[0]) ?? currentDateObject) : currentDateObject;
  const title = mode === 'week'
    ? `${formatMonthDayShort(selectedDate ?? currentDate)} (${formatWeekdayInitial(selectedDate ?? currentDate)})`
    : `${periodDate.getUTCFullYear()}년 ${periodDate.getUTCMonth() + 1}월`;
  const weekdayLabels = mode === 'week'
    ? visibleDates.map((date) => (parseIsoDate(date) ?? new Date()).getUTCDay()).map((dayIndex) => DAY_LABELS[dayIndex])
    : ['일', '월', '화', '수', '목', '금', '토'];
  const cardStyle = [styles.calendarCard, compact && calendarStyles.calendarCardCompact];
  const weekdayStyle = [styles.calendarWeekdayRow, compact && calendarStyles.calendarWeekdayRowCompact];
  const weekdayTextStyle = [styles.calendarWeekdayText, compact && calendarStyles.calendarWeekdayTextCompact];

  return (
    <View style={cardStyle}>
      <View style={[styles.calendarToggle, compact && calendarStyles.calendarToggleCompact]}>
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
      <View style={[calendarStyles.calendarPeriodNavigation, compact && calendarStyles.calendarPeriodNavigationCompact]}>
        {periodNavigation ? (
          <Pressable accessibilityLabel="이전 기간" onPress={periodNavigation.onPrevious} style={calendarStyles.calendarPeriodButton}>
            <MaterialCommunityIcons color={AppColors.ink} name="chevron-left" size={18} />
          </Pressable>
        ) : null}
        {periodHeader ?? <Text style={[styles.calendarPeriodTitle, compact && calendarStyles.calendarPeriodTitleCompact]}>{title}</Text>}
        {periodNavigation ? (
          <Pressable accessibilityLabel="다음 기간" onPress={periodNavigation.onNext} style={calendarStyles.calendarPeriodButton}>
            <MaterialCommunityIcons color={AppColors.ink} name="chevron-right" size={18} />
          </Pressable>
        ) : null}
      </View>
      {periodPicker ?? (mode === 'week' ? (
        <View style={calendarStyles.calendarWeekList}>
          {visibleDates.map((date) => (
            <CalendarWeekRow
              date={date}
              isCurrentDate={date === currentDate}
              items={itemsByDate[date] ?? []}
              key={date}
              onSelectDate={onSelectDate}
              selected={date === selectedDate}
            />
          ))}
        </View>
      ) : (
        <>
          <View style={weekdayStyle}>
            {weekdayLabels.map((label, index) => <Text key={`${label}-${index}`} style={weekdayTextStyle}>{label}</Text>)}
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
                  onSelectDate={onSelectDate}
                  selected={date === selectedDate}
                  compact={compact}
                />
              ) : (
                <View key={`calendar-empty-${index}`} style={[styles.calendarDayCell, compact && calendarStyles.calendarDayCellCompact, styles.calendarDayCellEmpty]} />
              )
            ))}
          </View>
        </>
      ))}
    </View>
  );
}

function CalendarPickerPanel({
  kind,
  selectedYear,
  selectedMonth,
  yearOptions,
  onSelectYear,
  onSelectMonth,
}: {
  kind: CalendarPickerKind;
  selectedYear: number;
  selectedMonth: number;
  yearOptions: number[];
  onSelectYear: (year: number) => void;
  onSelectMonth: (month: number) => void;
}) {
  const isYearPicker = kind === 'year';
  const options = isYearPicker ? yearOptions : Array.from({ length: 12 }, (_, index) => index + 1);

  return (
    <View style={calendarStyles.calendarPickerPanel}>
      <Text style={calendarStyles.calendarPickerPanelTitle}>{isYearPicker ? '연도 선택' : '월 선택'}</Text>
      <View style={calendarStyles.calendarPickerGrid}>
        {options.map((value) => {
          const selected = isYearPicker ? value === selectedYear : value === selectedMonth;
          return (
            <Pressable
              accessibilityLabel={isYearPicker ? `${value}년 선택` : `${value}월 선택`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={value}
              onPress={() => (isYearPicker ? onSelectYear(value) : onSelectMonth(value))}
              style={[calendarStyles.calendarPickerOption, selected && calendarStyles.calendarPickerOptionSelected]}>
              <Text style={[calendarStyles.calendarPickerOptionText, selected && calendarStyles.calendarPickerOptionTextSelected]}>
                {isYearPicker ? `${value}년` : `${value}월`}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CalendarDateHeader({
  year,
  month,
  openPicker,
  onTogglePicker,
}: {
  year: number;
  month: number;
  openPicker: CalendarPickerKind | null;
  onTogglePicker: (kind: CalendarPickerKind) => void;
}) {
  return (
    <View style={calendarStyles.calendarMonthHeader}>
      {(['year', 'month'] as CalendarPickerKind[]).map((kind) => {
        const isYear = kind === 'year';
        const isOpen = openPicker === kind;
        return (
          <Pressable
            accessibilityLabel={isYear ? `${year}년 선택` : `${month}월 선택`}
            accessibilityRole="button"
            accessibilityState={{ expanded: isOpen }}
            key={kind}
            onPress={() => onTogglePicker(kind)}
            style={calendarStyles.calendarMonthPickerButton}>
            <Text style={calendarStyles.calendarMonthPickerText}>{isYear ? `${year}년` : `${month}월`}</Text>
            <MaterialCommunityIcons color={AppColors.inkMuted} name={isOpen ? 'chevron-up' : 'chevron-down'} size={15} style={calendarStyles.calendarMonthPickerIcon} />
          </Pressable>
        );
      })}
    </View>
  );
}

function TimePickerMenu({
  kind,
  value,
  onClose,
  onSelect,
}: {
  kind: TimePickerKind;
  value: number;
  onClose: () => void;
  onSelect: (value: number) => void;
}) {
  const isHour = kind === 'hour';
  const options = isHour ? Array.from({ length: 24 }, (_, index) => index) : Array.from({ length: 12 }, (_, index) => index * 5);

  return (
    <View style={todayStyles.timeDropdown}>
      <View style={todayStyles.timeDropdownHeader}>
        <Text style={todayStyles.timeDropdownTitle}>{isHour ? '시 선택' : '분 선택'}</Text>
        <Pressable accessibilityLabel="시간 선택 닫기" onPress={onClose} style={todayStyles.timeDropdownClose}>
          <MaterialCommunityIcons color={AppColors.inkMuted} name="close" size={16} />
        </Pressable>
      </View>
      <View style={todayStyles.timeDropdownGrid}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              accessibilityLabel={isHour ? `${option}시 선택` : `${option}분 선택`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option}
              onPress={() => onSelect(option)}
              style={[todayStyles.timeDropdownOption, selected && todayStyles.timeDropdownOptionSelected]}>
              <Text style={[todayStyles.timeDropdownOptionText, selected && todayStyles.timeDropdownOptionTextSelected]}>
                {String(option).padStart(2, '0')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CalendarDayCell({
  date,
  isCurrentDate,
  items,
  mode,
  onSelectDate,
  selected = false,
  compact = false,
}: {
  date: string;
  isCurrentDate: boolean;
  items: CalendarItem[];
  mode: CalendarMode;
  onSelectDate?: (date: string) => void;
  selected?: boolean;
  compact?: boolean;
}) {
  const dateObject = parseIsoDate(date) ?? new Date();
  const visibleItems = items.slice(0, mode === 'week' ? 3 : 2);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);
  const cellStyle = [
    styles.calendarDayCell,
    mode === 'week' && styles.calendarWeekCell,
    compact && calendarStyles.calendarDayCellCompact,
    compact && mode === 'week' && calendarStyles.calendarWeekCellCompact,
    isCurrentDate && calendarStyles.calendarDayCellToday,
    selected && calendarStyles.calendarDayCellSelected,
  ];
  const dayNumberStyle = [
    styles.calendarDayNumber,
    compact && calendarStyles.calendarDayNumberCompact,
    isCurrentDate && calendarStyles.calendarDayNumberToday,
    selected && calendarStyles.calendarDayNumberSelected,
  ];
  const itemStackStyle = [styles.calendarItemStack, compact && calendarStyles.calendarItemStackCompact];
  const badgeStyle = [styles.calendarBadge, compact && calendarStyles.calendarBadgeCompact];
  const badgeTextStyle = [styles.calendarBadgeText, compact && calendarStyles.calendarBadgeTextCompact];
  const content = (
    <>
      <View style={calendarStyles.calendarDayNumberRow}>
        <Text style={dayNumberStyle}>{dateObject.getUTCDate()}</Text>
        {isCurrentDate ? <View style={calendarStyles.calendarTodayMarker} /> : null}
      </View>
      <View style={itemStackStyle}>
        {visibleItems.map((item) => (
          <View
            key={item.id}
            style={[
              badgeStyle,
              item.kind === 'birthday' ? calendarStyles.calendarBirthdayBadge : calendarStyles.calendarEventBadge,
            ]}>
            <Text
              numberOfLines={1}
              style={[
                badgeTextStyle,
                item.kind === 'birthday' ? calendarStyles.calendarBirthdayText : calendarStyles.calendarEventText,
              ]}>
              {item.kind === 'birthday' ? `생일 ${item.label.replace(' 생일', '')}` : item.label}
            </Text>
          </View>
        ))}
        {hiddenCount > 0 ? (
          <Text numberOfLines={1} style={[styles.calendarMoreText, compact && calendarStyles.calendarMoreTextCompact]}>+{hiddenCount}</Text>
        ) : null}
      </View>
    </>
  );

  const commonProps = {
    accessibilityLabel: `${formatDate(date)} ${items.length ? items.map((item) => item.label).join(', ') : '기록된 일정 없음'}`,
    style: cellStyle,
  };

  return onSelectDate ? (
    <Pressable {...commonProps} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => onSelectDate(date)}>
      {content}
    </Pressable>
  ) : (
    <View {...commonProps}>
      {content}
    </View>
  );
}

function CalendarWeekRow({
  date,
  isCurrentDate,
  items,
  onSelectDate,
  selected = false,
}: {
  date: string;
  isCurrentDate: boolean;
  items: CalendarItem[];
  onSelectDate?: (date: string) => void;
  selected?: boolean;
}) {
  const dateObject = parseIsoDate(date) ?? new Date();
  const visibleItems = items.slice(0, 2);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);
  const rowStyle = [
    calendarStyles.calendarWeekRow,
    isCurrentDate && calendarStyles.calendarWeekRowToday,
    selected && calendarStyles.calendarWeekRowSelected,
  ];
  const content = (
    <>
      <View style={calendarStyles.calendarWeekDateColumn}>
        <Text style={calendarStyles.calendarWeekdayLabel}>{DAY_LABELS[dateObject.getUTCDay()]}</Text>
        <Text style={[
          calendarStyles.calendarWeekDateText,
          isCurrentDate && calendarStyles.calendarWeekDateTextToday,
          selected && calendarStyles.calendarWeekDateTextSelected,
        ]}>{dateObject.getUTCMonth() + 1}/{dateObject.getUTCDate()}</Text>
      </View>
      <View style={calendarStyles.calendarWeekItemStack}>
        {visibleItems.map((item) => (
          <View
            key={item.id}
            style={[
              calendarStyles.calendarWeekItemBadge,
              item.kind === 'birthday' ? { backgroundColor: AppColors.calendarBirthday } : { backgroundColor: AppColors.calendarEvent },
            ]}>
            <Text numberOfLines={1} style={[
              calendarStyles.calendarWeekItemText,
              item.kind === 'birthday' ? { color: AppColors.calendarBirthdayText } : { color: AppColors.calendarEventText },
            ]}>
              {item.kind === 'birthday' ? `생일 ${item.label.replace(' 생일', '')}` : item.label}
            </Text>
          </View>
        ))}
        {!items.length ? <Text style={calendarStyles.calendarWeekEmptyText}>일정 없음</Text> : null}
        {hiddenCount > 0 ? <Text style={calendarStyles.calendarWeekEmptyText}>+{hiddenCount}</Text> : null}
      </View>
      {onSelectDate ? <MaterialCommunityIcons color={AppColors.inkMuted} name="chevron-right" size={16} style={calendarStyles.calendarWeekArrow} /> : null}
    </>
  );

  const accessibilityLabel = `${formatDate(date)} ${items.length ? items.map((item) => item.label).join(', ') : '기록된 일정 없음'}`;
  return onSelectDate ? (
    <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => onSelectDate(date)} style={rowStyle}>
      {content}
    </Pressable>
  ) : (
    <View style={rowStyle}>{content}</View>
  );
}

function DateTimeModal({
  date,
  hemisphere,
  todayDate,
  visible,
  onApply,
  onClose,
}: {
  date: string;
  hemisphere: Island['hemisphere'];
  todayDate: string;
  visible: boolean;
  onApply: (date: string) => void;
  onClose: () => void;
}) {
  const [draftDate, setDraftDate] = useState(date);
  const [visibleMonth, setVisibleMonth] = useState(date.slice(0, 7));
  const [visibleWeekDate, setVisibleWeekDate] = useState(date);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('month');
  const [openPicker, setOpenPicker] = useState<CalendarPickerKind | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDraftDate(date);
    setVisibleMonth(date.slice(0, 7));
    setVisibleWeekDate(date);
    setOpenPicker(null);
  }, [date, visible]);

  const calendarDates = calendarMode === 'week'
    ? getWeekDates(visibleWeekDate)
    : getMonthDates(`${visibleMonth}-01`);
  const calendarCells = getCalendarGridCells(calendarMode, calendarDates);
  const calendarItemsByDate = Object.fromEntries(calendarDates.map((calendarDate) => [
    calendarDate,
    getCalendarItemsForDate(calendarDate, hemisphere),
  ]));
  const selectedDateItems = getCalendarItemsForDate(draftDate, hemisphere);
  const visibleMonthDate = parseIsoDate(`${visibleMonth}-01`) ?? parseIsoDate(draftDate) ?? new Date();
  const calendarHeaderDate = calendarMode === 'week' ? parseIsoDate(draftDate) ?? visibleMonthDate : visibleMonthDate;
  const calendarHeaderYear = calendarHeaderDate.getUTCFullYear();
  const calendarHeaderMonth = calendarHeaderDate.getUTCMonth() + 1;
  const yearOptions = getCalendarYearOptions(calendarHeaderYear);

  const changeCalendarPeriod = (amount: number) => {
    setOpenPicker(null);
    if (calendarMode === 'week') {
      const nextDate = shiftIsoDate(visibleWeekDate, amount * 7);
      if (nextDate) {
        setDraftDate(nextDate);
        setVisibleWeekDate(nextDate);
        setVisibleMonth(nextDate.slice(0, 7));
      }
      return;
    }

    const monthStart = parseIsoDate(`${visibleMonth}-01`) ?? parseIsoDate(draftDate) ?? new Date();
    const next = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + amount, 1));
    const nextMonth = next.getUTCMonth() + 1;
    const currentDate = parseIsoDate(draftDate) ?? monthStart;
    const day = Math.min(currentDate.getUTCDate(), new Date(Date.UTC(next.getUTCFullYear(), nextMonth, 0)).getUTCDate());
    const nextDate = toIsoDate(next.getUTCFullYear(), nextMonth, day);
    if (!nextDate) return;
    setDraftDate(nextDate);
    setVisibleWeekDate(nextDate);
    setVisibleMonth(nextDate.slice(0, 7));
  };

  const selectCalendarDate = (nextDate: string) => {
    setDraftDate(nextDate);
    setVisibleWeekDate(nextDate);
    setVisibleMonth(nextDate.slice(0, 7));
    setOpenPicker(null);
  };

  const selectCalendarYear = (year: number) => {
    const currentDate = parseIsoDate(draftDate) ?? visibleMonthDate;
    const month = calendarMode === 'week' ? currentDate.getUTCMonth() + 1 : calendarHeaderMonth;
    const day = Math.min(currentDate.getUTCDate(), new Date(Date.UTC(year, month, 0)).getUTCDate());
    const nextDate = toIsoDate(year, month, day);
    if (!nextDate) return;
    setDraftDate(nextDate);
    setVisibleWeekDate(nextDate);
    setVisibleMonth(nextDate.slice(0, 7));
    setOpenPicker(null);
  };

  const selectCalendarMonth = (monthNumber: number) => {
    const currentDate = parseIsoDate(draftDate) ?? visibleMonthDate;
    const year = calendarMode === 'week' ? currentDate.getUTCFullYear() : calendarHeaderYear;
    const day = Math.min(currentDate.getUTCDate(), new Date(Date.UTC(year, monthNumber, 0)).getUTCDate());
    const nextDate = toIsoDate(year, monthNumber, day);
    if (!nextDate) return;
    setDraftDate(nextDate);
    setVisibleWeekDate(nextDate);
    setVisibleMonth(nextDate.slice(0, 7));
    setOpenPicker(null);
  };

  const selectToday = () => {
    setDraftDate(todayDate);
    setVisibleWeekDate(todayDate);
    setVisibleMonth(todayDate.slice(0, 7));
    setOpenPicker(null);
  };

  const periodHeader = (
    <CalendarDateHeader
      month={calendarHeaderMonth}
      onTogglePicker={(kind) => setOpenPicker((current) => current === kind ? null : kind)}
      openPicker={openPicker}
      year={calendarHeaderYear}
    />
  );
  const periodPicker = openPicker ? (
    <CalendarPickerPanel
      kind={openPicker}
      onSelectMonth={selectCalendarMonth}
      onSelectYear={selectCalendarYear}
      selectedMonth={calendarHeaderMonth}
      selectedYear={calendarHeaderYear}
      yearOptions={yearOptions}
    />
  ) : undefined;
  const closeAndApply = () => onApply(draftDate);

  return (
    <Modal animationType="slide" onRequestClose={closeAndApply} transparent visible={visible}>
      <View style={styles.modalBackdrop}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={[styles.bottomSheet, calendarStyles.calendarSheet]}>
          <View style={calendarStyles.sheetHeader}>
            <Text style={[styles.sheetTitle, calendarStyles.sheetTitleCompact]}>캘린더</Text>
            <Pressable accessibilityLabel="오늘 날짜로 이동" onPress={selectToday} style={calendarStyles.todayPickerButton}>
              <MaterialCommunityIcons color={AppColors.leaf} name="calendar-today" size={16} />
              <Text style={calendarStyles.todayPickerButtonText}>오늘</Text>
            </Pressable>
            <Pressable accessibilityLabel="캘린더 닫기" onPress={closeAndApply} style={calendarStyles.calendarCloseButton}>
              <MaterialCommunityIcons color={AppColors.inkMuted} name="close" size={17} />
            </Pressable>
          </View>
          <CalendarLegend />
          <CalendarSection
            cells={calendarCells}
            compact
            currentDate={todayDate}
            itemsByDate={calendarItemsByDate}
            mode={calendarMode}
            onChangeMode={(nextMode) => { setCalendarMode(nextMode); setOpenPicker(null); }}
            onSelectDate={selectCalendarDate}
            periodHeader={periodHeader}
            periodNavigation={{ onNext: () => changeCalendarPeriod(1), onPrevious: () => changeCalendarPeriod(-1) }}
            periodPicker={periodPicker}
            selectedDate={draftDate}
          />
          <SelectedCalendarDateSummary date={draftDate} items={selectedDateItems} />
        </View>
      </View>
    </Modal>
  );
}

function SelectedCalendarDateSummary({ date, items }: { date: string; items: CalendarItem[] }) {
  const birthdays = items.filter((item) => item.kind === 'birthday').map((item) => item.label.replace(' 생일', ''));
  const events = items.filter((item) => item.kind === 'event').map((item) => item.label);
  const details = [
    birthdays.length ? { kind: 'birthday' as const, text: `생일 · ${summarizeNames(birthdays, '')}` } : null,
    events.length ? { kind: 'event' as const, text: `이벤트 · ${summarizeNames(events, '')}` } : null,
  ].filter((detail): detail is { kind: CalendarItemKind; text: string } => Boolean(detail));

  return (
    <View style={calendarStyles.calendarSelectedDateCard}>
      <View style={calendarStyles.calendarSelectedDateHeader}>
        <MaterialCommunityIcons color={AppColors.calendarSelectedText} name="calendar-check" size={15} style={calendarStyles.calendarSelectedDateIcon} />
        <Text style={calendarStyles.calendarSelectedDateTitle}>{formatMonthDayShort(date)} ({formatWeekdayInitial(date)}) 상세</Text>
      </View>
      {details.length ? details.map((detail) => (
        <View key={detail.kind} style={calendarStyles.calendarDetailRow}>
          <View style={[calendarStyles.calendarDetailDot, detail.kind === 'birthday' ? calendarStyles.calendarDetailBirthdayDot : calendarStyles.calendarDetailEventDot]} />
          <Text numberOfLines={1} style={calendarStyles.calendarDetailText}>{detail.text}</Text>
        </View>
      )) : <Text style={calendarStyles.calendarNoDetail}>등록된 생일이나 이벤트가 없어요.</Text>}
    </View>
  );
}

function CalendarLegend() {
  const items = [
    { label: '오늘', style: calendarStyles.calendarLegendTodayDot },
    { label: '선택', style: calendarStyles.calendarLegendSelectedDot },
    { label: '생일', style: calendarStyles.calendarLegendBirthdayDot },
    { label: '이벤트', style: calendarStyles.calendarLegendEventDot },
  ];

  return (
    <View accessibilityLabel="캘린더 범례" style={calendarStyles.calendarLegend}>
      {items.map((item) => (
        <View key={item.label} style={calendarStyles.calendarLegendItem}>
          <View style={item.style} />
          <Text style={calendarStyles.calendarLegendText}>{item.label}</Text>
        </View>
      ))}
    </View>
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
            style={[todayStyles.critterStatusButton, todayStyles.statusIconOnly]}>
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
            style={[styles.critterStatusButton, { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0 }]}>
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

  const routineRows = Array.from(
    { length: Math.ceil(DEFAULT_ROUTINE_OPTIONS.length / 6) },
    (_, index) => DEFAULT_ROUTINE_OPTIONS.slice(index * 6, index * 6 + 6),
  );

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
                  {routineRows.map((row, rowIndex) => (
                    <View key={`routine-edit-row-${rowIndex}`} style={todayStyles.routineEditRow}>
                      {row.map((routine) => {
                        const selected = draftTitles.includes(routine.title);
                        return (
                          <Pressable
                            accessibilityLabel={`${routine.title} ${routine.goalLabel ?? `${routine.goalCount}회`} ${selected ? '선택됨' : '선택 안 됨'}`}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: selected }}
                            key={routine.title}
                            onPress={() => toggleTitle(routine.title)}
                            style={[todayStyles.routineEditTile, selected && todayStyles.routineEditTileSelected]}>
                            <RoutineIcon selected={selected} title={routine.title} variant="edit" />
                            <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72} style={[todayStyles.routineEditLabel, selected && todayStyles.routineEditLabelSelected]}>
                              {routine.title}
                            </Text>
                          </Pressable>
                        );
                      })}
                      {row.length < 6 ? Array.from({ length: 6 - row.length }, (_, spacerIndex) => (
                        <View key={`routine-edit-spacer-${rowIndex}-${spacerIndex}`} style={todayStyles.routineEditTileSpacer} />
                      )) : null}
                    </View>
                  ))}
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
  content: { gap: 14, padding: 14, paddingBottom: 112 },
  dateTimeCard: { backgroundColor: AppColors.card, borderRadius: 19, padding: 8, ...AppShadows.card },
  dateTimeRow: { flexDirection: 'row', gap: 8 },
  dateControl: { alignItems: 'center', backgroundColor: '#EEF6F2', borderRadius: 13, flex: 1.8, flexDirection: 'row', gap: 5, justifyContent: 'center', minHeight: 40, minWidth: 0, paddingHorizontal: 9 },
  timeControl: { backgroundColor: '#FFF2D8', borderRadius: 13, flex: 0.85, justifyContent: 'center', minHeight: 40, minWidth: 0, paddingHorizontal: 7 },
  dateTimeValueRow: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 5, minWidth: 0 },
  dateTimeValue: { color: '#24483F', flex: 1, fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '900' },
  timeControlRow: { alignItems: 'center', flexDirection: 'row', gap: 2 },
  timePickerButton: { alignItems: 'center', backgroundColor: 'transparent', borderColor: 'transparent', borderRadius: 7, borderWidth: 0, flex: 1, height: 32, justifyContent: 'center', minWidth: 0, paddingHorizontal: 0 },
  timePickerButtonSelected: { backgroundColor: AppColors.leafSoft, borderColor: AppColors.primaryBorder },
  timePickerValue: { color: '#6E542B', fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '900' },
  timePickerDivider: { color: '#6E542B', fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '900' },
  dashboardCard: { borderRadius: 24, overflow: 'hidden', ...AppShadows.card },
  dashboardCardContent: { padding: 14 },
  dashboardTwoColumn: { flexDirection: 'row', gap: 10 },
  dashboardHalfCard: { flex: 1, minWidth: 0 },
  recipeCard: { borderWidth: 1 },
  bushCard: { minHeight: 190 },
  zodiacCard: { minHeight: 190 },
  eventCard: { minHeight: 126 },
  dashboardCardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dashboardCardTitleRow: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 6, minWidth: 0 },
  dashboardCardTitle: { color: AppColors.ink, flexShrink: 1, fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '900' },
  dashboardCardCountChip: { backgroundColor: 'rgba(255,255,255,0.62)', borderRadius: AppRadii.pill, color: AppColors.ink, fontFamily: Fonts.rounded, fontSize: 9, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 4 },
  recipeDashboardHeader: { alignItems: 'center', flexDirection: 'row', height: 52, justifyContent: 'space-between', marginBottom: 2 },
  recipeDashboardHeaderCopy: { flex: 1, minWidth: 0 },
  recipeDashboardTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 8, minWidth: 0 },
  recipeDashboardTitleCopy: { flex: 1, minWidth: 0 },
  recipeDashboardTitle: { flexShrink: 1, fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '900' },
  recipeDashboardSubtitle: { fontFamily: Fonts.rounded, fontSize: 10, fontWeight: '800', marginTop: 3 },
  recipeDashboardPeriod: { alignItems: 'flex-end', marginLeft: 8, width: 78 },
  recipeDashboardPeriodLabel: { fontFamily: Fonts.rounded, fontSize: 8, fontWeight: '800' },
  recipeDashboardPeriodValue: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '900', marginTop: 5 },
  seasonChip: { borderRadius: AppRadii.pill, color: '#FFFFFF', fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 11, paddingVertical: 6 },
  recipeHeaderBand: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, height: 74, left: 0, position: 'absolute', right: 0, top: 0 },
  recipeDecorLayer: { height: 90, left: 0, overflow: 'hidden', position: 'absolute', right: 0, top: 0 },
  recipeDecorCircle: { borderRadius: 100, position: 'absolute' },
  recipeDecorSpringLarge: { backgroundColor: '#FFD3DF', height: 88, opacity: 0.62, right: 20, top: -35, width: 88 },
  recipeDecorSpringSmall: { backgroundColor: '#F7B7CA', height: 48, opacity: 0.45, right: 2, top: 8, width: 48 },
  recipeDecorWave: { backgroundColor: '#A9DFF2', borderRadius: 40, height: 22, opacity: 0.55, position: 'absolute', right: 18, top: 18, transform: [{ rotate: '-4deg' }], width: 132 },
  recipeDecorWaveSmall: { backgroundColor: '#BEE9F7', borderRadius: 30, height: 18, opacity: 0.7, position: 'absolute', right: 42, top: 38, transform: [{ rotate: '4deg' }], width: 98 },
  recipeDecorLeaf: { borderRadius: 15, height: 38, position: 'absolute', top: 6, transform: [{ rotate: '35deg' }], width: 18 },
  recipeDecorAutumnGold: { backgroundColor: '#EFA95A', opacity: 0.62, right: 74 },
  recipeDecorAutumnRust: { backgroundColor: '#C97842', opacity: 0.48, right: 32, top: 12, transform: [{ rotate: '55deg' }] },
  recipeDecorSnow: { backgroundColor: '#FFFFFF', borderRadius: AppRadii.pill, height: 6, position: 'absolute', width: 6 },
  recipeGroupRow: { borderRadius: 18, borderWidth: 1, height: 144, marginTop: 8, padding: 12 },
  recipeGroupTop: { flexDirection: 'row', gap: 8, justifyContent: 'space-between', minHeight: 0 },
  recipeMaterialIcons: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', width: 64 },
  recipeMaterialImage: { height: 54, resizeMode: 'contain', width: 54 },
  recipeMaterialImageOverlap: { marginLeft: -14 },
  recipeGroupCopy: { flex: 1, minWidth: 0, paddingTop: 2 },
  recipeGroupName: { fontFamily: Fonts.rounded, fontSize: 16, fontWeight: '900' },
  recipeGroupInfoRow: { alignItems: 'flex-start', flexDirection: 'row', marginTop: 9, minWidth: 0 },
  recipeGroupInfoLabel: { fontFamily: Fonts.rounded, fontSize: 10, fontWeight: '900', width: 31 },
  recipeGroupInfoValue: { flex: 1, fontFamily: Fonts.rounded, fontSize: 10, fontWeight: '800', lineHeight: 15 },
  recipeGroupAside: { alignItems: 'flex-end', marginLeft: 3, width: 76 },
  recipeViewAllButton: { alignItems: 'center', flexDirection: 'row', gap: 1, justifyContent: 'flex-end' },
  recipeViewAllText: { fontFamily: Fonts.rounded, fontSize: 10, fontWeight: '900' },
  recipeProgressHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7, marginTop: 8 },
  recipeProgressLabel: { fontFamily: Fonts.rounded, fontSize: 10, fontWeight: '800' },
  recipeGroupCount: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '900', lineHeight: 18 },
  recipeProgressRail: { borderRadius: AppRadii.pill, height: 7, overflow: 'hidden' },
  recipeProgressFill: { borderRadius: AppRadii.pill, height: '100%' },
  dashboardEmptyText: { color: AppColors.inkMuted, fontFamily: Fonts.rounded, fontSize: 10, fontWeight: '800', lineHeight: 15 },
  bushList: { alignItems: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center' },
  bushItem: { alignItems: 'center', backgroundColor: '#F3FFF6', borderRadius: 15, flexBasis: '47%', flexGrow: 1, minHeight: 108, paddingHorizontal: 5, paddingVertical: 7 },
  bushItemSingle: { flexBasis: '62%', flexGrow: 0 },
  bushImageFrame: { alignItems: 'center', backgroundColor: '#E6F8EA', borderRadius: 12, height: 50, justifyContent: 'center', width: '100%' },
  bushImage: { height: 46, width: 46 },
  bushCopy: { alignItems: 'center', minWidth: 0, width: '100%' },
  bushName: { color: AppColors.ink, fontFamily: Fonts.rounded, fontSize: 9, fontWeight: '900', marginTop: 4 },
  bushPeriod: { color: AppColors.inkMuted, fontFamily: Fonts.rounded, fontSize: 7, fontWeight: '800', lineHeight: 10, marginTop: 2 },
  zodiacBody: { alignItems: 'center', flexDirection: 'row', gap: 7, minHeight: 61 },
  zodiacImage: { height: 59, resizeMode: 'contain', width: 59 },
  zodiacCopy: { flex: 1, minWidth: 0 },
  zodiacName: { color: AppColors.ink, fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '900' },
  zodiacPeriod: { color: AppColors.inkMuted, fontFamily: Fonts.rounded, fontSize: 8, fontWeight: '800', lineHeight: 12, marginTop: 3 },
  fragmentRow: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 12, flexDirection: 'row', gap: 6, marginTop: 9, paddingHorizontal: 8, paddingVertical: 7 },
  fragmentImage: { height: 24, resizeMode: 'contain', width: 24 },
  fragmentText: { color: '#725B9F', flex: 1, fontFamily: Fonts.rounded, fontSize: 9, fontWeight: '900' },
  zodiacFooter: { color: '#725B9F', fontFamily: Fonts.rounded, fontSize: 8, fontWeight: '800', marginTop: 8, textAlign: 'right' },
  eventRow: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 14, flexDirection: 'row', gap: 9, minHeight: 55, paddingHorizontal: 9, paddingVertical: 6 },
  eventImage: { height: 50, resizeMode: 'contain', width: 50 },
  eventCopy: { flex: 1, minWidth: 0 },
  eventName: { color: '#7A3F20', fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '900' },
  eventMeta: { color: '#9B6040', fontFamily: Fonts.rounded, fontSize: 8, fontWeight: '800', marginTop: 3 },
  eventHost: { backgroundColor: 'rgba(255,255,255,0.82)', borderRadius: AppRadii.pill, color: '#9B6040', fontFamily: Fonts.rounded, fontSize: 8, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  timeDropdown: { backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: AppRadii.control, borderWidth: 1, marginTop: 8, padding: 10 },
  timeDropdownHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  timeDropdownTitle: { color: AppColors.ink, fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '900' },
  timeDropdownClose: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.pill, height: 28, justifyContent: 'center', width: 28 },
  timeDropdownGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  timeDropdownOption: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderColor: AppColors.line, borderRadius: 8, borderWidth: 1, height: 30, justifyContent: 'center', width: '23%' },
  timeDropdownOptionSelected: { backgroundColor: AppColors.leafSoft, borderColor: AppColors.primaryBorder },
  timeDropdownOptionText: { color: AppColors.inkMuted, fontFamily: Fonts.rounded, fontSize: 10, fontWeight: '800' },
  timeDropdownOptionTextSelected: { color: AppColors.leaf, fontWeight: '900' },
  sectionBlock: { gap: 8 },
  sectionCard: { backgroundColor: AppColors.card, borderRadius: AppRadii.card, gap: 10, padding: 12, ...AppShadows.card },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  sectionActions: { alignItems: 'center', flexDirection: 'row', gap: 2 },
  sectionTitleWrap: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 9, minWidth: 0 },
  sectionTitle: { color: AppColors.ink, flex: 1, fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '900', lineHeight: 19 },
  sectionGlyph: { alignItems: 'center', height: 30, justifyContent: 'center', width: 30 },
  sectionGlyphImage: { height: 23, resizeMode: 'contain', width: 23 },
  sectionActionButton: { alignItems: 'center', borderRadius: AppRadii.pill, flexDirection: 'row', gap: 2, minHeight: 34, paddingHorizontal: 4, paddingVertical: 6 },
  sectionIconActionButton: { alignItems: 'center', backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: AppRadii.pill, borderWidth: 1, height: AppControlSizes.navMin, justifyContent: 'center', width: AppControlSizes.navMin },
  sectionAction: { color: AppColors.leaf, fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '900' },
  museumAction: { color: AppColors.museum },
  actionGlyph: { alignItems: 'center', height: 20, justifyContent: 'center', width: 20 },
  routineCard: { gap: 8 },
  routineRowGrid: { flexDirection: 'row' },
  routineTile: { alignItems: 'center', flex: 1, justifyContent: 'center', marginHorizontal: 3, minHeight: 58, position: 'relative' },
  routineTileSpacer: { flex: 1, marginHorizontal: 3, minHeight: 58 },
  routineIcon: { alignItems: 'center', height: 58, justifyContent: 'center', width: '100%' },
  routineIconImage: { height: 48, width: 48 },
  routineIconImageCompact: { height: 32, width: 32 },
  routineCheckBadge: { alignItems: 'center', backgroundColor: AppColors.leaf, borderRadius: AppRadii.pill, height: 14, justifyContent: 'center', position: 'absolute', right: 3, top: 3, width: 14 },
  routineEditGrid: { marginTop: 8, rowGap: 8 },
  routineEditRow: { flexDirection: 'row' },
  routineEditTile: { alignItems: 'center', backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: 10, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 64, paddingHorizontal: 1, paddingVertical: 6 },
  routineEditTileSpacer: { flex: 1, minHeight: 64 },
  routineEditTileSelected: { backgroundColor: AppColors.leafSoft, borderColor: AppColors.leaf },
  routineEditIcon: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.pill, height: 36, justifyContent: 'center', marginBottom: 3, position: 'relative', width: 38 },
  routineEditIconImage: { height: 28, width: 28 },
  routineEditIconImageCompact: { height: 21, width: 21 },
  routineEditCheckBadge: { alignItems: 'center', backgroundColor: AppColors.leaf, borderRadius: AppRadii.pill, height: 14, justifyContent: 'center', position: 'absolute', right: -2, top: -2, width: 14 },
  routineEditLabel: { color: AppColors.inkMuted, fontFamily: Fonts.rounded, fontSize: 7, fontWeight: '900', lineHeight: 9, textAlign: 'center' },
  routineEditLabelSelected: { color: AppColors.ink },
  npcCard: { flexDirection: 'row', overflow: 'hidden', paddingTop: 2 },
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
  critterSection: {},
  critterCard: { paddingTop: 2 },
  critterStatRail: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 10 },
  critterMainStat: { alignItems: 'center', backgroundColor: AppColors.museumSoft, borderRadius: AppRadii.control, minWidth: 82, paddingHorizontal: 10, paddingVertical: 8 },
  critterStatLabel: { color: AppColors.museum, fontSize: 10, fontWeight: '900' },
  critterStatValue: { color: AppColors.museum, fontSize: 28, fontWeight: '900', lineHeight: 31 },
  critterCategoryRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  critterCategoryChip: { backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.pill, paddingHorizontal: 8, paddingVertical: 5 },
  critterCategoryChipSelected: { backgroundColor: AppColors.museumSoft, borderColor: AppColors.museum, borderWidth: 1 },
  critterCategoryText: { color: AppColors.ink, fontSize: 10, fontWeight: '900' },
  critterCategoryTextSelected: { color: AppColors.museum },
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
  statusIconOnly: { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0 },
  noData: { color: AppColors.inkMuted, padding: 18, textAlign: 'center' },
  critterBrowserBackdrop: { backgroundColor: 'rgba(63, 42, 20, 0.28)', flex: 1, justifyContent: 'flex-end' },
  critterBrowserSheet: { backgroundColor: AppColors.background, borderTopLeftRadius: 26, borderTopRightRadius: 26, height: '91%', overflow: 'hidden' },
  critterBrowserSafeArea: { flex: 1, paddingHorizontal: 14 },
  critterBrowserHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10, paddingTop: 9 },
  critterBrowserTitleWrap: { flex: 1, minWidth: 0 },
  critterBrowserTitle: { color: AppColors.ink, fontFamily: Fonts.rounded, fontSize: 20, fontWeight: '900' },
  critterBrowserSubtitle: { color: AppColors.inkMuted, fontFamily: Fonts.rounded, fontSize: 10, fontWeight: '800', marginTop: 3 },
  critterBrowserClose: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.pill, height: 36, justifyContent: 'center', marginLeft: 10, width: 36 },
  critterBrowserCountRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  critterBrowserCount: { color: AppColors.ink, fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '900' },
  critterBrowserFilterButton: { alignItems: 'center', borderColor: AppColors.line, borderRadius: AppRadii.pill, borderWidth: 1, flexDirection: 'row', gap: 3, paddingHorizontal: 8, paddingVertical: 5 },
  critterBrowserFilterButtonActive: { backgroundColor: AppColors.leafSoft, borderColor: AppColors.leaf },
  critterBrowserFilterText: { color: AppColors.inkMuted, fontFamily: Fonts.rounded, fontSize: 9, fontWeight: '800' },
  critterBrowserFilterTextActive: { color: AppColors.leaf, fontWeight: '900' },
  critterBrowserHint: { color: AppColors.inkMuted, flexShrink: 1, fontFamily: Fonts.rounded, fontSize: 9, fontWeight: '700', marginLeft: 6, textAlign: 'right' },
  critterBrowserList: { gap: 9, paddingBottom: 28, paddingTop: 2 },
  critterBrowserCard: { alignItems: 'center', backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: AppRadii.card, borderWidth: 1, flexDirection: 'row', gap: 10, minHeight: 104, padding: 10, ...AppShadows.card },
  critterBrowserImageFrame: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.control, height: 78, justifyContent: 'center', width: 78 },
  critterBrowserImage: { height: 70, width: 70 },
  critterBrowserImageUncaught: { opacity: 0.4 },
  critterBrowserCopy: { flex: 1, minWidth: 0 },
  critterBrowserNameRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', minWidth: 0 },
  critterBrowserNameWrap: { flex: 1, minWidth: 0 },
  critterBrowserNumber: { color: AppColors.museum, fontFamily: Fonts.rounded, fontSize: 9, fontWeight: '900' },
  critterBrowserName: { color: AppColors.ink, fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '900', marginTop: 2 },
  critterBrowserNameEn: { color: AppColors.inkMuted, fontFamily: Fonts.rounded, fontSize: 10, fontWeight: '700', marginTop: 1 },
  critterBrowserStatus: { flexDirection: 'row', gap: 2, marginLeft: 4 },
  critterBrowserStatusButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  critterBrowserMeta: { color: AppColors.inkMuted, fontFamily: Fonts.rounded, fontSize: 9, fontWeight: '800', marginTop: 4 },
  critterBrowserPrice: { color: AppColors.catalog, fontFamily: Fonts.rounded, fontSize: 9, fontWeight: '900', marginTop: 4 },
  critterBrowserEmpty: { alignItems: 'center', backgroundColor: AppColors.card, borderRadius: AppRadii.card, paddingHorizontal: 22, paddingVertical: 34 },
  critterBrowserEmptyTitle: { color: AppColors.ink, fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '900' },
  critterBrowserEmptyText: { color: AppColors.inkMuted, fontFamily: Fonts.rounded, fontSize: 10, fontWeight: '700', marginTop: 7, textAlign: 'center' },
});

const styles = StyleSheet.create({
  screenRoot: { flex: 1 }, safeArea: { backgroundColor: AppColors.background, flex: 1 }, content: { padding: 20, paddingBottom: 112 }, headerRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }, kicker: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0 }, title: { color: AppColors.ink, fontSize: 36, fontWeight: '800', marginTop: 4 }, date: { color: AppColors.inkMuted, fontSize: 13, marginTop: 4 }, menuButton: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderColor: AppColors.line, borderRadius: AppRadii.pill, borderWidth: 1, height: AppControlSizes.navMin, justifyContent: 'center', width: AppControlSizes.navMin }, menuText: { color: AppColors.ink, fontSize: 22 }, islandCard: { backgroundColor: AppColors.leafSoft, borderRadius: AppRadii.panel, padding: 20, ...AppShadows.card }, cardEyebrow: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0 }, islandName: { color: AppColors.ink, fontSize: 27, fontWeight: '800', marginTop: 5 }, islandRule: { backgroundColor: AppColors.primaryBorder, height: 1, marginVertical: 16 }, profileText: { color: AppColors.ink, fontSize: 12, fontWeight: '700' }, summaryCard: { backgroundColor: AppColors.card, borderRadius: AppRadii.card, padding: 14, ...AppShadows.card }, summaryHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' }, summaryCopy: { borderRadius: 12, flex: 1, minWidth: 0, padding: 2 }, summaryDatePressed: { backgroundColor: AppColors.paperRaised }, summaryLabel: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '800' }, summaryTitle: { color: AppColors.ink, fontSize: 20, fontWeight: '800', marginTop: 3 }, summaryMeta: { color: AppColors.inkMuted, fontSize: 10, marginTop: 4 }, summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 }, summaryItem: { backgroundColor: AppColors.paperRaised, borderColor: AppColors.line, borderRadius: AppRadii.control, borderWidth: 1, minHeight: 74, padding: 10, width: '48%' }, summaryItemLabel: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '800', marginBottom: 5 }, summaryItemValue: { color: AppColors.ink, fontSize: 12, fontWeight: '800', lineHeight: 17 }, eventStrip: { alignItems: 'center', backgroundColor: AppColors.leafSoft, borderRadius: AppRadii.control, flexDirection: 'row', gap: 10, marginTop: 10, padding: 10 }, eventLabel: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '800' }, eventText: { color: AppColors.ink, flex: 1, fontSize: 12, fontWeight: '800' }, dateCard: { alignItems: 'center', backgroundColor: AppColors.card, borderRadius: AppRadii.card, flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, padding: 14, ...AppShadows.card }, dateCopy: { flex: 1 }, dateHint: { color: AppColors.inkMuted, fontSize: 10, marginTop: 4 }, dateActions: { alignItems: 'center', flexDirection: 'row', gap: 5 }, dateButton: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderColor: AppColors.line, borderRadius: AppRadii.control, borderWidth: 1, height: 32, justifyContent: 'center', width: 32 }, dateButtonText: { color: AppColors.ink, fontSize: 22, lineHeight: 25 }, todayButton: { backgroundColor: AppColors.leaf, borderRadius: AppRadii.control, paddingHorizontal: 9, paddingVertical: 8 }, todayButtonText: { color: AppColors.card, fontSize: 10, fontWeight: '800' }, sectionHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, marginTop: 24 }, sectionHeaderCopy: { flex: 1 }, sectionTitle: { color: AppColors.ink, fontSize: 19, fontWeight: '800' }, sectionDescription: { color: AppColors.inkMuted, fontSize: 11, marginTop: 3 }, sectionAction: { color: AppColors.leaf, fontSize: 11, fontWeight: '800', paddingBottom: 2 }, infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, infoTile: { alignItems: 'center', backgroundColor: AppColors.card, borderRadius: AppRadii.card, flexDirection: 'row', minHeight: 70, padding: 12, width: '48%', ...AppShadows.card }, infoIcon: { color: AppColors.leaf, fontSize: 22, marginRight: 9 }, infoLabel: { color: AppColors.inkMuted, fontSize: 10 }, infoValue: { color: AppColors.ink, fontSize: 13, fontWeight: '800', marginTop: 4 }, noticeCard: { backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.card, marginTop: 10, padding: 14 }, noticeTitle: { color: AppColors.ink, fontSize: 12, fontWeight: '800' }, noticeText: { color: AppColors.inkMuted, fontSize: 11, lineHeight: 17, marginTop: 4 }, tabRow: { gap: 8, paddingBottom: 10 }, tabChip: { backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: AppRadii.pill, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 }, tabChipActive: { backgroundColor: AppColors.leafSoft, borderColor: AppColors.leaf }, tabChipText: { color: AppColors.inkMuted, fontSize: 12, fontWeight: '800' }, tabChipTextActive: { color: AppColors.ink }, critterList: { backgroundColor: AppColors.card, borderRadius: AppRadii.card, overflow: 'hidden', ...AppShadows.card }, critterRow: { alignItems: 'center', borderBottomColor: AppColors.line, borderBottomWidth: 1, flexDirection: 'row', minHeight: 78, padding: 9 }, critterImageFrame: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.control, height: 58, justifyContent: 'center', width: 58 }, critterImage: { height: 52, width: 52 }, critterImageUncaught: { opacity: 0.35 }, critterCopy: { flex: 1, marginLeft: 10, minWidth: 0 }, critterName: { color: AppColors.ink, fontSize: 13, fontWeight: '800' }, critterMeta: { color: AppColors.inkMuted, fontSize: 10, marginTop: 5 }, critterStatus: { flexDirection: 'row', gap: 4 }, critterStatusButton: { alignItems: 'center', backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: AppRadii.pill, borderWidth: 1, height: AppControlSizes.compactStatus, justifyContent: 'center', width: AppControlSizes.compactStatus }, noData: { color: AppColors.inkMuted, padding: 22, textAlign: 'center' }, routineCard: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, routineTile: { alignItems: 'center', backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: AppRadii.control, borderWidth: 1, justifyContent: 'center', minHeight: 58, overflow: 'hidden', paddingHorizontal: 5, paddingVertical: 8, position: 'relative', width: '23%' }, routineTileDimmed: { backgroundColor: AppColors.paperRaised, borderColor: AppColors.line, opacity: 0.55 }, routineTileComplete: { backgroundColor: AppColors.leafSoft, borderColor: AppColors.leaf, opacity: 1 }, routineTileText: { color: AppColors.ink, fontSize: 10, fontWeight: '900', lineHeight: 13, textAlign: 'center' }, routineTileTextDimmed: { color: AppColors.inkMuted }, routineTileTextComplete: { color: AppColors.ink }, routineCheckBadge: { alignItems: 'center', backgroundColor: AppColors.leaf, borderRadius: 8, height: 16, justifyContent: 'center', position: 'absolute', right: 3, top: 3, width: 16 }, routineCheckText: { color: AppColors.card, fontSize: 10, fontWeight: '900', lineHeight: 13 }, routineRow: { alignItems: 'center', flexDirection: 'row', minHeight: 66 }, routineDivider: { borderTopColor: AppColors.line, borderTopWidth: 1 }, routineIcon: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.pill, height: 35, justifyContent: 'center', marginRight: 11, width: 35 }, routineIconDone: { backgroundColor: AppColors.leafSoft }, routineIconText: { color: AppColors.ink, fontSize: 20, fontWeight: '800' }, routineIconTextDone: { color: AppColors.leaf }, routineCopy: { flex: 1 }, routineTitle: { color: AppColors.ink, fontSize: 13, fontWeight: '800' }, routineTitleDone: { color: AppColors.leaf }, routineGoal: { color: AppColors.inkMuted, fontSize: 10, marginTop: 4 }, smallAction: { color: AppColors.leaf, fontSize: 10, fontWeight: '800', padding: 6 }, npcCard: { backgroundColor: AppColors.card, borderRadius: AppRadii.card, flexDirection: 'row', padding: 7, ...AppShadows.card }, npcDayCell: { alignItems: 'center', borderRadius: AppRadii.control, flex: 1, minHeight: 126, minWidth: 0, paddingHorizontal: 2, paddingVertical: 8 }, npcDayCellToday: { backgroundColor: AppColors.leafSoft }, npcWeekday: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '800' }, npcDateNumber: { color: AppColors.ink, fontSize: 11, fontWeight: '800', marginTop: 3 }, npcAvatarStack: { alignContent: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 3, justifyContent: 'center', marginTop: 7, minHeight: 51 }, npcAvatar: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.pill, height: 32, justifyContent: 'center', width: 32 }, npcWeekAvatar: { borderRadius: 12, height: 24, width: 24 }, npcAvatarEmpty: { backgroundColor: '#F5F1E8', borderColor: AppColors.line, borderWidth: 1 }, npcAvatarSelected: { backgroundColor: AppColors.leafSoft, borderColor: AppColors.leaf, borderWidth: 1 }, npcAvatarText: { color: AppColors.ink, fontSize: 13, fontWeight: '800' }, npcName: { color: AppColors.ink, fontSize: 10, fontWeight: '800', lineHeight: 13, marginTop: 5, maxWidth: '100%', textAlign: 'center' }, npcNameEmpty: { color: AppColors.inkMuted }, rowArrow: { color: AppColors.inkMuted, fontSize: 21 }, calendarCard: { backgroundColor: AppColors.card, borderRadius: AppRadii.card, paddingHorizontal: 10, paddingBottom: 12, ...AppShadows.card }, calendarToggle: { backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.control, flexDirection: 'row', marginVertical: 12, padding: 3 }, calendarToggleButton: { alignItems: 'center', borderRadius: 8, flex: 1, paddingVertical: 7 }, calendarToggleActive: { backgroundColor: AppColors.leafSoft }, calendarToggleText: { color: AppColors.inkMuted, fontSize: 11, fontWeight: '800' }, calendarToggleTextActive: { color: AppColors.ink }, calendarPeriodTitle: { color: AppColors.ink, fontSize: 14, fontWeight: '900', marginBottom: 10, textAlign: 'center' }, calendarWeekdayRow: { borderBottomColor: AppColors.line, borderBottomWidth: 1, flexDirection: 'row', paddingBottom: 7 }, calendarWeekdayText: { color: AppColors.inkMuted, flex: 1, fontSize: 10, fontWeight: '800', textAlign: 'center' }, calendarBoard: { flexDirection: 'row', flexWrap: 'wrap' }, calendarDayCell: { borderBottomColor: AppColors.line, borderBottomWidth: 1, borderRightColor: AppColors.line, borderRightWidth: 1, minHeight: 78, padding: 4, width: '14.2857%' }, calendarWeekCell: { minHeight: 104 }, calendarDayCellEmpty: { backgroundColor: '#FAFBF8' }, calendarDayCellToday: { backgroundColor: AppColors.leafSoft }, calendarDayNumber: { color: AppColors.ink, fontSize: 11, fontWeight: '800', marginBottom: 4, textAlign: 'center' }, calendarDayNumberToday: { color: AppColors.leaf, fontWeight: '900' }, calendarItemStack: { gap: 3, minHeight: 40 }, calendarBadge: { borderRadius: 5, minHeight: 16, paddingHorizontal: 3, paddingVertical: 2 }, calendarBirthdayBadge: { backgroundColor: AppColors.catalogSoft }, calendarEventBadge: { backgroundColor: AppColors.museumSoft }, calendarBadgeText: { fontSize: 8, fontWeight: '800', lineHeight: 11 }, calendarBirthdayText: { color: '#A26A2D' }, calendarEventText: { color: AppColors.museum }, calendarMoreText: { color: AppColors.inkMuted, fontSize: 8, fontWeight: '800', textAlign: 'center' }, calendarHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, monthButton: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderColor: AppColors.line, borderRadius: AppRadii.control, borderWidth: 1, height: 34, justifyContent: 'center', width: 34 }, monthButtonText: { color: AppColors.ink, fontSize: 24, lineHeight: 28 }, monthTitle: { color: AppColors.ink, fontSize: 16, fontWeight: '800' }, weekdayRow: { flexDirection: 'row', marginTop: 14 }, weekdayText: { color: AppColors.inkMuted, flex: 1, fontSize: 10, fontWeight: '800', textAlign: 'center' }, calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }, dayCell: { alignItems: 'center', aspectRatio: 1, borderRadius: 10, justifyContent: 'center', width: '14.2857%' }, dayCellSelected: { backgroundColor: AppColors.leafSoft }, dayCellText: { color: AppColors.ink, fontSize: 12, fontWeight: '700' }, dayCellTextSelected: { color: AppColors.leaf, fontWeight: '900' }, timePicker: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 16 }, timeColumn: { alignItems: 'center', width: 76 }, timeLabel: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '800', marginBottom: 5 }, timeAdjustButton: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderColor: AppColors.line, borderRadius: AppRadii.control, borderWidth: 1, height: 32, justifyContent: 'center', width: 48 }, timeAdjustText: { color: AppColors.ink, fontSize: 16, fontWeight: '900' }, timeValue: { color: AppColors.ink, fontSize: 26, fontWeight: '900', marginVertical: 5 }, timeDivider: { color: AppColors.ink, fontSize: 24, fontWeight: '900', marginTop: 18 }, resetButton: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.control, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 12 }, resetButtonText: { color: AppColors.ink, fontSize: 12, fontWeight: '800' }, floatingTop: { alignItems: 'center', backgroundColor: AppColors.leaf, borderRadius: 22, bottom: 23, paddingHorizontal: 14, paddingVertical: 11, position: 'absolute', right: 18, ...AppShadows.floating }, floatingTopText: { color: AppColors.card, fontSize: 11, fontWeight: '800' }, modalBackdrop: { backgroundColor: 'rgba(63, 42, 20, 0.26)', flex: 1, justifyContent: 'flex-end' }, drawer: { backgroundColor: AppColors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, minHeight: '78%', padding: 21 }, drawerHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, drawerKicker: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0 }, closeText: { color: AppColors.ink, fontSize: 28 }, drawerTitle: { color: AppColors.ink, fontSize: 27, fontWeight: '800', marginTop: 9 }, passportCard: { backgroundColor: AppColors.leafSoft, borderRadius: AppRadii.card, marginTop: 17, padding: 17 }, passportLabel: { color: AppColors.inkMuted, fontSize: 10, marginTop: 7 }, passportValue: { color: AppColors.ink, fontSize: 14, fontWeight: '800', marginTop: 3 }, drawerAction: { alignItems: 'center', backgroundColor: AppColors.card, borderBottomColor: AppColors.line, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 57, paddingHorizontal: 14 }, drawerActionText: { color: AppColors.ink, fontSize: 12, fontWeight: '800' }, drawerMuted: { color: AppColors.inkMuted, fontSize: 12, fontWeight: '700' }, drawerBadge: { backgroundColor: AppColors.paperRaised, borderRadius: 9, color: AppColors.inkMuted, fontSize: 9, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 5 }, bottomSheet: { backgroundColor: AppColors.background, borderTopLeftRadius: 25, borderTopRightRadius: 25, maxHeight: '82%', padding: 21 }, sheetTitle: { color: AppColors.ink, fontSize: 20, fontWeight: '800', marginBottom: 8 }, npcModalHint: { color: AppColors.inkMuted, fontSize: 11, lineHeight: 17, marginBottom: 8 }, optionGroupTitle: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '900', marginTop: 12 }, optionRow: { alignItems: 'center', borderBottomColor: AppColors.line, borderBottomWidth: 1, flexDirection: 'row', minHeight: 48 }, optionRowSelected: { backgroundColor: AppColors.leafSoft }, optionText: { color: AppColors.ink, flex: 1, fontSize: 13, fontWeight: '700', marginLeft: 10 }, optionCheck: { color: AppColors.leaf, fontSize: 16, fontWeight: '900', width: 22 }, cancelButton: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.control, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 12 }, cancelButtonText: { color: AppColors.ink, fontSize: 12, fontWeight: '800' }, modalLabel: { color: AppColors.inkMuted, fontSize: 11, fontWeight: '800', marginBottom: 5, marginTop: 10 }, modalInput: { backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: AppRadii.control, borderWidth: 1, color: AppColors.ink, fontSize: 14, paddingHorizontal: 12, paddingVertical: 11 }, modalActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 18 }, deleteButton: { alignItems: 'center', backgroundColor: AppColors.residentSoft, borderRadius: AppRadii.control, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 12 }, deleteButtonText: { color: AppColors.danger, fontSize: 12, fontWeight: '800' }, saveButton: { alignItems: 'center', backgroundColor: AppColors.leaf, borderRadius: AppRadii.control, justifyContent: 'center', paddingHorizontal: 19, paddingVertical: 12 }, saveButtonText: { color: AppColors.card, fontSize: 12, fontWeight: '800' }, emptyContainer: { alignItems: 'center', backgroundColor: AppColors.background, flex: 1, justifyContent: 'center', padding: 24 }, emptyTitle: { color: AppColors.ink, fontSize: 22, fontWeight: '800' }, emptyDescription: { color: AppColors.inkMuted, fontSize: 14, marginTop: 8 },
});
