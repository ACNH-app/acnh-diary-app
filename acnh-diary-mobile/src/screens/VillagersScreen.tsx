import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AppChrome } from '@/components/AppChrome';
import { FloatingTopButton } from '@/components/FloatingTopButton';
import {
  addCampsiteVisit,
  getActiveIsland,
  getCampsiteVisitsForIsland,
  getVillagerStatesForIsland,
  initializeDatabase,
  removeCampsiteVisit,
  setVillagerStatus,
} from '@/db/database';
import { villagerImageAssets } from '@/data/villager-assets';
import { musicImageAssets } from '@/data/music-assets';
import { villagers } from '@/data/villagers';
import type { Villager, VillagerCollectible, VillagerImageType } from '@/data/villager-types';
import {
  EMPTY_VILLAGER_STATE,
  type VillagerState,
  type VillagerStatus,
} from '@/types/villager-state';

type Category =
  | 'all'
  | 'wishlist'
  | 'islandResident'
  | 'movedOut'
  | 'campsiteVisited'
  | 'outside'
  | 'photoReceived';
type SortMode = 'number' | 'name' | 'personality' | 'birthday' | 'species';
type SortDirection = 'asc' | 'desc';

const imageOptions: Array<{ type: VillagerImageType; label: string }> = [
  { type: 'icon', label: '아이콘' },
  { type: 'full', label: '전체' },
  { type: 'poster', label: '포스터' },
  { type: 'framed_photo', label: '액자' },
];

const speciesOptions = Array.from(new Set(villagers.map((villager) => villager.species_ko))).sort(
  (left, right) => left.localeCompare(right, 'ko'),
);
const personalityOptions = Array.from(
  new Set(villagers.map((villager) => villager.personality_ko)),
).sort((left, right) => left.localeCompare(right, 'ko'));
const hobbyOptions = Array.from(new Set(villagers.map((villager) => villager.hobby))).sort(
  (left, right) => left.localeCompare(right, 'ko'),
);

const subtypeOptions = Array.from(new Set(villagers.map((villager) => villager.subtype))).sort();

const categoryOptions: Array<{ category: Category; label: string }> = [
  { category: 'all', label: '전체' },
  { category: 'wishlist', label: '위시' },
  { category: 'islandResident', label: '우리 섬' },
  { category: 'movedOut', label: '이사 감' },
  { category: 'campsiteVisited', label: '캠핑장' },
  { category: 'outside', label: '섬 외' },
  { category: 'photoReceived', label: '액자' },
];

const statusOptions: Array<{ status: VillagerStatus; icon: string; label: string }> = [
  { status: 'wishlist', icon: '♡', label: '위시 주민' },
  { status: 'campsiteVisited', icon: '⛺', label: '캠핑장 방문' },
  { status: 'islandResident', icon: '⌂', label: '섬 주민' },
  { status: 'movedOut', icon: '↗', label: '이사 감' },
  { status: 'photoReceived', icon: '▣', label: '액자 선물' },
];

function getImageSource(villager: Villager, imageType: VillagerImageType) {
  const localAsset = villagerImageAssets[villager.id]?.[imageType];
  if (localAsset) return localAsset;

  return { uri: villager.images[imageType].url ?? '' };
}

function getMusicSource(villager: Villager): ImageSourcePropType | null {
  if (villager.house_music_id && musicImageAssets[villager.house_music_id]) {
    return musicImageAssets[villager.house_music_id];
  }
  return villager.house_music_image_url ? { uri: villager.house_music_image_url } : null;
}

const zodiacLabels: Record<string, string> = {
  Aquarius: '물병자리',
  Aries: '양자리',
  Cancer: '게자리',
  Capricorn: '염소자리',
  Gemini: '쌍둥이자리',
  Leo: '사자자리',
  Libra: '천칭자리',
  Pisces: '물고기자리',
  Sagittarius: '사수자리',
  Scorpio: '전갈자리',
  Taurus: '황소자리',
  Virgo: '처녀자리',
};

const hobbyLabels: Record<string, string> = {
  Education: '교육',
  Fashion: '패션',
  Fitness: '운동',
  Music: '음악',
  Nature: '자연',
  Play: '놀이',
};

const colorLabels: Record<string, string> = {
  Aqua: '청록',
  Beige: '베이지',
  Black: '검정',
  Blue: '파랑',
  Brown: '갈색',
  Colorful: '컬러풀',
  Gray: '회색',
  Green: '초록',
  Orange: '주황',
  Pink: '분홍',
  Purple: '보라',
  Red: '빨강',
  White: '하양',
  Yellow: '노랑',
};

const styleLabels: Record<string, string> = {
  Active: '활동적',
  Cool: '멋진',
  Cute: '귀여운',
  Elegant: '우아한',
  Gorgeous: '화려한',
  Simple: '심플',
};

const gameLabels: Record<string, string> = {
  AC: '동물의 숲',
  CF: '도시로 떠나요',
  DNM: '동물의 숲',
  E_PLUS: 'e+',
  FILM: '극장판',
  HHD: '해피 홈 디자이너',
  NH: '모여봐요',
  NL: '튀어나와요',
  PC: '포켓 캠프',
  WA: '놀러오세요',
  WW: '놀러오세요',
};

function labelOf(value: string | null | undefined, labels: Record<string, string>) {
  return value ? labels[value] ?? value : null;
}

function formatValues(values: string[], labels: Record<string, string>) {
  return values.map((value) => labels[value] ?? value).join(', ');
}

function formatNumber(value: number) {
  return `${value.toLocaleString('ko-KR')}벨`;
}

function formatToday() {
  const today = new Date();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

function isOutside(state: VillagerState) {
  return !(
    state.wishlist ||
    state.campsiteVisited ||
    state.islandResident ||
    state.movedOut ||
    state.photoReceived
  );
}

function formatKoreanBirthday(villager: Villager) {
  return `${villager.birth_month}월 ${villager.birth_day}일`;
}

function compareVillagers(left: Villager, right: Villager, sortMode: SortMode) {
  if (sortMode === 'number') {
    if (left.number === null && right.number !== null) return 1;
    if (left.number !== null && right.number === null) return -1;
    return (
      (left.number ?? Number.MAX_SAFE_INTEGER) - (right.number ?? Number.MAX_SAFE_INTEGER) ||
      left.name_ko.localeCompare(right.name_ko, 'ko')
    );
  }

  if (sortMode === 'personality') {
    return (
      left.personality_ko.localeCompare(right.personality_ko, 'ko') ||
      left.name_ko.localeCompare(right.name_ko, 'ko')
    );
  }

  if (sortMode === 'species') {
    return (
      left.species_ko.localeCompare(right.species_ko, 'ko') ||
      left.name_ko.localeCompare(right.name_ko, 'ko')
    );
  }

  if (sortMode === 'birthday') {
    return (
      left.birth_month - right.birth_month ||
      left.birth_day - right.birth_day ||
      left.name_ko.localeCompare(right.name_ko, 'ko')
    );
  }

  return left.name_ko.localeCompare(right.name_ko, 'ko');
}

export function VillagersScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<Villager>>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [selectedPersonality, setSelectedPersonality] = useState<string | null>(null);
  const [selectedHobby, setSelectedHobby] = useState<string | null>(null);
  const [selectedSubtype, setSelectedSubtype] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [islandId, setIslandId] = useState<string | null>(null);
  const [villagerStates, setVillagerStates] = useState<Record<string, VillagerState>>({});
  const [campsiteVisits, setCampsiteVisits] = useState<Record<string, string[]>>({});

  useEffect(() => {
    try {
      initializeDatabase();
      const activeIsland = getActiveIsland();

      if (activeIsland) {
        setIslandId(activeIsland.id);
        setVillagerStates(getVillagerStatesForIsland(activeIsland.id));
        setCampsiteVisits(getCampsiteVisitsForIsland(activeIsland.id));
      }
    } catch {
      Alert.alert('주민 상태를 불러오지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  }, []);

  const getVillagerState = (villagerId: string) => villagerStates[villagerId] ?? EMPTY_VILLAGER_STATE;

  const handleStatusToggle = (villagerId: string, status: VillagerStatus) => {
    if (!islandId) {
      Alert.alert('섬 정보가 필요해요', '먼저 섬 정보를 등록해 주세요.');
      return;
    }

    const nextValue = !getVillagerState(villagerId)[status];

    try {
      if (status === 'campsiteVisited' && nextValue) {
        addCampsiteVisit(islandId, villagerId, formatToday());
        setCampsiteVisits(getCampsiteVisitsForIsland(islandId));
      } else {
        setVillagerStatus(islandId, villagerId, status, nextValue);
      }
      setVillagerStates((current) => ({
        ...current,
        [villagerId]: {
          ...(current[villagerId] ?? EMPTY_VILLAGER_STATE),
          [status]: nextValue,
        },
      }));
    } catch {
      Alert.alert('상태를 저장하지 못했어요', '변경 내용을 저장하는 중 문제가 발생했습니다.');
    }
  };

  const normalizedSearch = search.trim().toLocaleLowerCase('ko-KR');
  const filteredVillagers = villagers.filter((villager) => {
    const matchesSearch =
      !normalizedSearch ||
      villager.search_tokens.some((token) => token.toLocaleLowerCase('ko-KR').includes(normalizedSearch));
    const matchesSpecies = !selectedSpecies || villager.species_ko === selectedSpecies;
    const matchesPersonality =
      !selectedPersonality || villager.personality_ko === selectedPersonality;
    const matchesHobby = !selectedHobby || villager.hobby === selectedHobby;
    const matchesSubtype = !selectedSubtype || villager.subtype === selectedSubtype;
    const state = getVillagerState(villager.id);
    const matchesCategory =
      category === 'all' ? true : category === 'outside' ? isOutside(state) : state[category];

    return (
      matchesSearch &&
      matchesSpecies &&
      matchesPersonality &&
      matchesHobby &&
      matchesSubtype &&
      matchesCategory
    );
  });
  const visibleVillagers = [...filteredVillagers].sort((left, right) =>
    compareVillagers(left, right, sortMode) * (sortDirection === 'asc' ? 1 : -1),
  );
  const activeFilterCount = [selectedSpecies, selectedPersonality, selectedHobby, selectedSubtype].filter(
    Boolean,
  ).length;

  const clearFilters = () => {
    setSelectedSpecies(null);
    setSelectedPersonality(null);
    setSelectedHobby(null);
    setSelectedSubtype(null);
    setSortMode('name');
    setSortDirection('asc');
  };

  const openDetail = (villager: Villager) => {
    router.push({ pathname: '/villagers/[villagerId]', params: { villagerId: villager.id } });
  };

  return (
    <View style={styles.screenRoot}>
      <AppChrome title="주민" />
      <SafeAreaView edges={[]} style={styles.safeArea}>
      <FlatList
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        data={visibleVillagers}
        initialNumToRender={20}
        keyExtractor={(villager) => villager.id}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<EmptyState search={search} />}
        ListHeaderComponent={
          <View>
            <ScrollView
              contentContainerStyle={styles.categoryTabsContent}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryTabs}>
              {categoryOptions.map((option) => {
                const selected = category === option.category;
                return (
                  <Pressable
                    accessibilityLabel={`${option.label} 주민 보기`}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    key={option.category}
                    onPress={() => setCategory(option.category)}
                    style={[styles.categoryTab, selected && styles.categoryTabSelected]}>
                    <Text style={[styles.categoryTabText, selected && styles.categoryTabTextSelected]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                accessibilityLabel="주민 검색"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setSearch}
                placeholder="이름, 종족, 성격, 번호로 검색"
                placeholderTextColor="#9AA298"
                returnKeyType="search"
                style={styles.searchInput}
                value={search}
              />
              {search ? (
                <Pressable
                  accessibilityLabel="검색어 지우기"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setSearch('')}
                  style={styles.clearSearchButton}>
                  <Text style={styles.clearSearchText}>×</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.controlRow}>
              <Pressable
                accessibilityLabel="주민 필터 열기"
                accessibilityRole="button"
                onPress={() => setIsFilterOpen(true)}
                style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}>
                <Text style={styles.controlButtonIcon}>☷</Text>
                <Text style={styles.controlButtonText}>필터</Text>
                {activeFilterCount > 0 ? (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                ) : null}
              </Pressable>
              <View style={styles.sortSummary}>
                <Text style={styles.sortSummaryLabel}>정렬</Text>
                <Text style={styles.sortSummaryValue}>
                  {sortMode === 'number'
                    ? '번호순'
                    : sortMode === 'birthday'
                      ? '생일순'
                      : sortMode === 'personality'
                        ? '성격순'
                        : sortMode === 'species'
                          ? '종족순'
                          : '이름순'}{' '}
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </Text>
              </View>
            </View>

            {activeFilterCount > 0 ? (
              <View style={styles.activeFilters}>
                {[selectedSpecies, selectedPersonality, selectedHobby, selectedSubtype]
                  .filter(Boolean)
                  .map((filter) => (
                  <View key={filter} style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterText}>
                      {filter === selectedHobby ? labelOf(filter, hobbyLabels) : filter}
                    </Text>
                  </View>
                  ))}
                <Pressable accessibilityRole="button" onPress={clearFilters}>
                  <Text style={styles.clearFiltersText}>초기화</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.resultHeader}>
              <View>
                <Text style={styles.sectionTitle}>주민 목록</Text>
                <Text style={styles.sectionSubtitle}>카드를 눌러 상세 정보를 확인하세요.</Text>
              </View>
              <Text style={styles.resultCount}>{visibleVillagers.length}명</Text>
            </View>

            <ScrollView
              contentContainerStyle={styles.statusLegendContent}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.statusLegend}>
              <Text style={styles.statusLegendTitle}>상태 아이콘</Text>
              {statusOptions.map((option) => (
                <View key={option.status} style={styles.statusLegendItem}>
                  <Text style={styles.statusLegendIcon}>{option.icon}</Text>
                  <Text style={styles.statusLegendText}>{option.label}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        }
        numColumns={2}
        ref={listRef}
        renderItem={({ item }) => (
          <VillagerCard
            onPress={openDetail}
            onToggleStatus={handleStatusToggle}
            state={getVillagerState(item.id)}
            villager={item}
          />
        )}
        showsVerticalScrollIndicator={false}
        windowSize={7}
      />

      <FloatingTopButton
        accessibilityLabel="주민 목록 맨 위로 이동"
        onPress={() => listRef.current?.scrollToOffset({ animated: true, offset: 0 })}
      />

      <FilterModal
        hobby={selectedHobby}
        isVisible={isFilterOpen}
        onApply={() => setIsFilterOpen(false)}
        onChangeHobby={setSelectedHobby}
        onChangePersonality={setSelectedPersonality}
        onChangeSort={setSortMode}
        onChangeSortDirection={setSortDirection}
        onChangeSpecies={setSelectedSpecies}
        onChangeSubtype={setSelectedSubtype}
        onClear={clearFilters}
        onRequestClose={() => setIsFilterOpen(false)}
        personality={selectedPersonality}
        sortMode={sortMode}
        sortDirection={sortDirection}
        species={selectedSpecies}
        subtype={selectedSubtype}
      />

      </SafeAreaView>
    </View>
  );
}

export function VillagerDetailScreen({ villagerId }: { villagerId: string }) {
  const villager = villagers.find((item) => item.id === villagerId);
  const [imageType, setImageType] = useState<VillagerImageType>('full');
  const [islandId, setIslandId] = useState<string | null>(null);
  const [state, setState] = useState<VillagerState>(EMPTY_VILLAGER_STATE);
  const [campsiteVisits, setCampsiteVisits] = useState<string[]>([]);

  useEffect(() => {
    try {
      initializeDatabase();
      const activeIsland = getActiveIsland();

      if (activeIsland) {
        setIslandId(activeIsland.id);
        setState(getVillagerStatesForIsland(activeIsland.id)[villagerId] ?? EMPTY_VILLAGER_STATE);
        setCampsiteVisits(getCampsiteVisitsForIsland(activeIsland.id)[villagerId] ?? []);
      }
    } catch {
      Alert.alert('주민 상태를 불러오지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  }, [villagerId]);

  const handleStatusToggle = (status: VillagerStatus) => {
    if (!islandId) {
      Alert.alert('섬 정보가 필요해요', '먼저 섬 정보를 등록해 주세요.');
      return;
    }

    const nextValue = !state[status];

    try {
      if (status === 'campsiteVisited' && nextValue) {
        addCampsiteVisit(islandId, villagerId, formatToday());
        setCampsiteVisits(getCampsiteVisitsForIsland(islandId)[villagerId] ?? []);
      } else {
        setVillagerStatus(islandId, villagerId, status, nextValue);
      }
      setState((current) => ({ ...current, [status]: nextValue }));
    } catch {
      Alert.alert('상태를 저장하지 못했어요', '변경 내용을 저장하는 중 문제가 발생했습니다.');
    }
  };

  const handleAddCampsiteVisit = (visitDate: string) => {
    if (!islandId) {
      Alert.alert('섬 정보가 필요해요', '먼저 섬 정보를 등록해 주세요.');
      return;
    }

    try {
      addCampsiteVisit(islandId, villagerId, visitDate);
      setCampsiteVisits(getCampsiteVisitsForIsland(islandId)[villagerId] ?? []);
      setState((current) => ({ ...current, campsiteVisited: true }));
    } catch {
      Alert.alert('방문일을 저장하지 못했어요', '날짜는 YYYY-MM-DD 형식으로 입력해 주세요.');
    }
  };

  const handleRemoveCampsiteVisit = (visitDate: string) => {
    if (!islandId) return;

    try {
      removeCampsiteVisit(islandId, villagerId, visitDate);
      const nextVisits = getCampsiteVisitsForIsland(islandId)[villagerId] ?? [];
      setCampsiteVisits(nextVisits);
      setState((current) => ({ ...current, campsiteVisited: nextVisits.length > 0 }));
    } catch {
      Alert.alert('방문일을 삭제하지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  };

  if (!villager) {
    return (
      <View style={styles.screenRoot}>
        <AppChrome showBack title="주민" />
        <SafeAreaView edges={[]} style={styles.safeArea}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>주민을 찾을 수 없어요</Text>
            <Text style={styles.emptyDescription}>주민 목록으로 돌아가 다시 선택해 주세요.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screenRoot}>
      <AppChrome showBack title={villager.name_ko} />
      <SafeAreaView edges={[]} style={styles.safeArea}>
        <VillagerDetailContent
          campsiteVisits={campsiteVisits}
          imageType={imageType}
          onAddCampsiteVisit={handleAddCampsiteVisit}
          onChangeImageType={setImageType}
          onRemoveCampsiteVisit={handleRemoveCampsiteVisit}
          onToggleStatus={handleStatusToggle}
          state={state}
          villager={villager}
        />
      </SafeAreaView>
    </View>
  );
}

function VillagerCard({
  villager,
  state,
  onPress,
  onToggleStatus,
}: {
  villager: Villager;
  state: VillagerState;
  onPress: (villager: Villager) => void;
  onToggleStatus: (villagerId: string, status: VillagerStatus) => void;
}) {
  return (
    <View style={styles.villagerCard}>
      <Pressable
        accessibilityLabel={`${villager.name_ko}, ${villager.name_en} 상세 보기`}
        accessibilityRole="button"
        onPress={() => onPress(villager)}
        style={({ pressed }) => [styles.cardTapArea, pressed && styles.villagerCardPressed]}>
        <View style={styles.cardImageWrap}>
          <Image resizeMode="contain" source={getImageSource(villager, 'icon')} style={styles.cardImage} />
          <View style={styles.cardSpeciesPill}>
            <Text style={styles.cardSpeciesText}>{villager.species_ko}</Text>
          </View>
        </View>
        <Text numberOfLines={1} style={styles.cardNameKo}>
          {villager.name_ko}
        </Text>
        <Text numberOfLines={1} style={styles.cardNameEn}>
          {villager.name_en}
        </Text>
        <View style={styles.cardMetaRow}>
          <Text style={styles.cardMeta}>{villager.personality_ko}</Text>
          <Text style={styles.cardMetaDot}>·</Text>
          <Text style={styles.cardMeta}>{villager.subtype}타입</Text>
          <Text style={styles.cardMetaDot}>·</Text>
          <Text style={styles.cardMeta}>{formatKoreanBirthday(villager)}</Text>
        </View>
      </Pressable>
      <VillagerStateToggleGroup
        onToggle={(status) => onToggleStatus(villager.id, status)}
        state={state}
        villagerName={villager.name_ko}
      />
    </View>
  );
}

function VillagerStateToggleGroup({
  state,
  villagerName,
  onToggle,
  showLabels = false,
}: {
  state: VillagerState;
  villagerName: string;
  onToggle: (status: VillagerStatus) => void;
  showLabels?: boolean;
}) {
  return (
    <View style={styles.statusToggleGroup}>
      {statusOptions.map((option) => {
        const selected = state[option.status];
        return (
          <Pressable
            accessibilityLabel={`${villagerName} ${option.label} ${selected ? '해제' : '설정'}`}
            accessibilityRole="button"
            accessibilityState={{ checked: selected }}
            hitSlop={5}
            key={option.status}
            onPress={() => onToggle(option.status)}
            style={[styles.statusToggle, showLabels && styles.detailStatusToggle, selected && styles.statusToggleSelected]}>
            <Text style={[styles.statusToggleIcon, selected && styles.statusToggleIconSelected]}>
              {option.icon}
            </Text>
            {showLabels ? <Text style={styles.detailStatusLabel}>{option.label}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.detailSection}>
      <Text style={styles.detailSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function HouseImage({ label, source }: { label: string; source: ImageSourcePropType }) {
  return (
    <View style={styles.houseImageCard}>
      <Image resizeMode="cover" source={source} style={styles.houseImage} />
      <Text style={styles.houseImageLabel}>{label}</Text>
    </View>
  );
}

function CollectibleCard({
  villager,
  imageType,
  item,
  owned,
  onToggle,
}: {
  villager: Villager;
  imageType: 'poster' | 'framed_photo';
  item: VillagerCollectible;
  owned: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.collectibleCard}>
      <Image
        resizeMode="contain"
        source={getImageSource(villager, imageType)}
        style={styles.collectibleImage}
      />
      <Text numberOfLines={1} style={styles.collectibleName}>
        {imageType === 'poster' ? '포스터' : '액자 사진'}
      </Text>
      <Text style={styles.collectibleMeta}>
        구매 {item.buy > 0 ? formatNumber(item.buy) : '불가'}
      </Text>
      <Text style={styles.collectibleMeta}>판매 {formatNumber(item.sell)}</Text>
      <Text numberOfLines={2} style={styles.collectibleSource}>
        {item.source ?? '획득 정보 없음'}
        {item.source_notes ? ` · ${item.source_notes}` : ''}
      </Text>
      <Pressable
        accessibilityLabel={`${imageType === 'poster' ? '포스터' : '액자 사진'} 보유 여부`}
        accessibilityRole="button"
        accessibilityState={{ checked: owned }}
        onPress={onToggle}
        style={[styles.ownedButton, owned && styles.ownedButtonSelected]}>
        <Text style={[styles.ownedButtonText, owned && styles.ownedButtonTextSelected]}>
          {owned ? '보유함 ✓' : '미보유'}
        </Text>
      </Pressable>
    </View>
  );
}

function CampsiteVisitEditor({
  visits,
  onAdd,
  onRemove,
}: {
  visits: string[];
  onAdd: (visitDate: string) => void;
  onRemove: (visitDate: string) => void;
}) {
  const [visitDate, setVisitDate] = useState(formatToday());

  return (
    <View style={styles.visitEditor}>
      <View style={styles.visitInputRow}>
        <TextInput
          accessibilityLabel="캠핑장 방문일"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
          onChangeText={setVisitDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#A0AAA1"
          style={styles.visitInput}
          value={visitDate}
        />
        <Pressable
          accessibilityLabel="캠핑장 방문일 추가"
          accessibilityRole="button"
          onPress={() => onAdd(visitDate.trim())}
          style={styles.visitAddButton}>
          <Text style={styles.visitAddButtonText}>추가</Text>
        </Pressable>
      </View>
      {visits.length > 0 ? (
        <View style={styles.visitList}>
          {visits.map((visitDate) => (
            <View key={visitDate} style={styles.visitRow}>
              <Text style={styles.visitDate}>{visitDate}</Text>
              <Pressable
                accessibilityLabel={`${visitDate} 방문일 삭제`}
                accessibilityRole="button"
                hitSlop={6}
                onPress={() => onRemove(visitDate)}>
                <Text style={styles.visitRemove}>삭제</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.visitEmpty}>아직 기록된 방문일이 없습니다.</Text>
      )}
    </View>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyMark}>⌕</Text>
      <Text style={styles.emptyTitle}>주민을 찾지 못했어요</Text>
      <Text style={styles.emptyDescription}>
        {search ? '검색어를 바꾸거나 필터를 초기화해 보세요.' : '선택한 조건에 맞는 주민이 없습니다.'}
      </Text>
    </View>
  );
}

type FilterModalProps = {
  isVisible: boolean;
  species: string | null;
  personality: string | null;
  hobby: string | null;
  subtype: string | null;
  sortMode: SortMode;
  sortDirection: SortDirection;
  onChangeSpecies: (value: string | null) => void;
  onChangePersonality: (value: string | null) => void;
  onChangeHobby: (value: string | null) => void;
  onChangeSubtype: (value: string | null) => void;
  onChangeSort: (value: SortMode) => void;
  onChangeSortDirection: (value: SortDirection) => void;
  onClear: () => void;
  onApply: () => void;
  onRequestClose: () => void;
};

function FilterModal({
  isVisible,
  species,
  personality,
  hobby,
  subtype,
  sortMode,
  sortDirection,
  onChangeSpecies,
  onChangePersonality,
  onChangeHobby,
  onChangeSubtype,
  onChangeSort,
  onChangeSortDirection,
  onClear,
  onApply,
  onRequestClose,
}: FilterModalProps) {
  return (
    <Modal animationType="slide" onRequestClose={onRequestClose} transparent visible={isVisible}>
      <View style={styles.modalBackdrop}>
        <Pressable onPress={onRequestClose} style={StyleSheet.absoluteFill} />
        <View style={styles.filterSheet}>
          <SafeAreaView edges={['bottom']} style={styles.sheetSafeArea}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetKicker}>REFINE YOUR LIST</Text>
                <Text style={styles.sheetTitle}>주민 필터</Text>
              </View>
              <Pressable
                accessibilityLabel="필터 닫기"
                accessibilityRole="button"
                hitSlop={10}
                onPress={onRequestClose}
                style={styles.sheetCloseButton}>
                <Text style={styles.sheetCloseText}>×</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.filterContent} showsVerticalScrollIndicator={false}>
              <FilterOptionGroup
                options={speciesOptions}
                title="종족"
                value={species}
                onChange={onChangeSpecies}
              />
              <FilterOptionGroup
                options={personalityOptions}
                title="성격"
                value={personality}
                onChange={onChangePersonality}
              />
              <FilterOptionGroup
                options={hobbyOptions}
                renderOptionLabel={(option) => labelOf(option, hobbyLabels) ?? option}
                title="취미"
                value={hobby}
                onChange={onChangeHobby}
              />
              <FilterOptionGroup
                options={subtypeOptions}
                title="성격 서브타입"
                value={subtype}
                onChange={onChangeSubtype}
              />

              <Text style={styles.filterGroupTitle}>정렬</Text>
              <View style={styles.sortGrid}>
                <SortOption label="번호순" selected={sortMode === 'number'} onPress={() => onChangeSort('number')} />
                <SortOption label="이름순" selected={sortMode === 'name'} onPress={() => onChangeSort('name')} />
                <SortOption
                  label="성격순"
                  selected={sortMode === 'personality'}
                  onPress={() => onChangeSort('personality')}
                />
                <SortOption
                  label="종족순"
                  selected={sortMode === 'species'}
                  onPress={() => onChangeSort('species')}
                />
                <SortOption
                  label="생일순"
                  selected={sortMode === 'birthday'}
                  onPress={() => onChangeSort('birthday')}
                />
              </View>
              <Text style={styles.filterGroupTitle}>정렬 방향</Text>
              <View style={styles.directionGrid}>
                <SortOption
                  label="오름차순 ↑"
                  selected={sortDirection === 'asc'}
                  onPress={() => onChangeSortDirection('asc')}
                />
                <SortOption
                  label="내림차순 ↓"
                  selected={sortDirection === 'desc'}
                  onPress={() => onChangeSortDirection('desc')}
                />
              </View>
            </ScrollView>

            <View style={styles.sheetActions}>
              <Pressable accessibilityRole="button" onPress={onClear} style={styles.resetButton}>
                <Text style={styles.resetButtonText}>초기화</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onApply} style={styles.applyButton}>
                <Text style={styles.applyButtonText}>결과 보기</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

function FilterOptionGroup({
  title,
  options,
  value,
  onChange,
  renderOptionLabel,
}: {
  title: string;
  options: string[];
  value: string | null;
  onChange: (value: string | null) => void;
  renderOptionLabel?: (value: string) => string;
}) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterGroupTitle}>{title}</Text>
      <ScrollView contentContainerStyle={styles.optionRow} horizontal showsHorizontalScrollIndicator={false}>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: value === null }}
          onPress={() => onChange(null)}
          style={[styles.optionChip, value === null && styles.optionChipSelected]}>
          <Text style={[styles.optionChipText, value === null && styles.optionChipTextSelected]}>전체</Text>
        </Pressable>
        {options.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={option}
              onPress={() => onChange(selected ? null : option)}
              style={[styles.optionChip, selected && styles.optionChipSelected]}>
              <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>
                {renderOptionLabel?.(option) ?? option}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function SortOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.sortOption, selected && styles.sortOptionSelected]}>
      <Text style={[styles.sortOptionText, selected && styles.sortOptionTextSelected]}>{label}</Text>
      {selected ? <Text style={styles.sortCheck}>✓</Text> : null}
    </Pressable>
  );
}

function VillagerDetailContent({
  villager,
  imageType,
  state,
  campsiteVisits,
  onChangeImageType,
  onAddCampsiteVisit,
  onRemoveCampsiteVisit,
  onToggleStatus,
}: {
  villager: Villager;
  imageType: VillagerImageType;
  state: VillagerState;
  campsiteVisits: string[];
  onChangeImageType: (value: VillagerImageType) => void;
  onAddCampsiteVisit: (visitDate: string) => void;
  onRemoveCampsiteVisit: (visitDate: string) => void;
  onToggleStatus: (status: VillagerStatus) => void;
}) {
  const detailScrollRef = useRef<ScrollView>(null);

  return (
    <View style={styles.detailPage}>
      <ScrollView
        contentContainerStyle={styles.detailContent}
        ref={detailScrollRef}
        showsVerticalScrollIndicator={false}
        style={styles.detailScroll}>
        <View style={styles.detailImageStage}>
          <View style={styles.detailImageGlow} />
          <Image
            resizeMode="contain"
            source={getImageSource(villager, imageType)}
            style={[styles.detailImage, imageType === 'icon' && styles.detailIconImage]}
          />
        </View>

        <ScrollView contentContainerStyle={styles.detailImageTabs} horizontal showsHorizontalScrollIndicator={false}>
          {imageOptions.map((option) => {
            const selected = imageType === option.type;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                key={option.type}
                onPress={() => onChangeImageType(option.type)}
                style={[styles.detailImageTab, selected && styles.detailImageTabSelected]}>
                <Text style={[styles.detailImageTabText, selected && styles.detailImageTabTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.detailIdentity}>
          <Text style={styles.detailNameKo}>{villager.name_ko}</Text>
          <Text style={styles.detailNameEn}>{villager.name_en}</Text>
        </View>

        <View style={styles.detailTagRow}>
          <View style={styles.detailTag}><Text style={styles.detailTagText}>{villager.species_ko}</Text></View>
          <View style={styles.detailTag}><Text style={styles.detailTagText}>{villager.personality_ko}</Text></View>
          <View style={styles.detailTag}><Text style={styles.detailTagText}>{labelOf(villager.hobby, hobbyLabels)}</Text></View>
        </View>

        <DetailSection title="주민 상태">
          <VillagerStateToggleGroup
            onToggle={onToggleStatus}
            showLabels
            state={state}
            villagerName={villager.name_ko}
          />
        </DetailSection>

        <DetailSection title="기본 정보">
          <View style={styles.detailInfoCard}>
            <InfoRow label="종" value={villager.species_ko} />
            <InfoRow label="성격" value={`${villager.personality_ko} · 서브타입 ${villager.subtype}`} />
            <InfoRow label="성별" value={villager.gender === 'Female' ? '여성' : '남성'} />
            <InfoRow label="취미" value={labelOf(villager.hobby, hobbyLabels)} />
            <InfoRow label="활동 시간" value={villager.activity_time} />
            <InfoRow label="생일" value={formatKoreanBirthday(villager)} />
            <InfoRow label="별자리" value={labelOf(villager.sign, zodiacLabels)} />
            <InfoRow label="등장 작품" value={formatValues(villager.appearances, gameLabels)} />
            <InfoRow
              label="섬 주민 가능 여부"
              value={villager.islander === null ? null : villager.islander ? '가능' : '가능하지 않음'}
            />
            <InfoRow label="데뷔작" value={labelOf(villager.debut, gameLabels)} />
            <InfoRow label="말버릇" value={villager.catch_phrase_ko} />
            <InfoRow label="주민 한마디" value={villager.saying_ko} last />
          </View>
        </DetailSection>

        <DetailSection title="취향과 기본 아이템">
          <View style={styles.detailInfoCard}>
            <InfoRow label="좋아하는 색상" value={formatValues(villager.favorite_colors, colorLabels)} />
            <InfoRow label="좋아하는 스타일" value={formatValues(villager.favorite_styles, styleLabels)} />
            <InfoRow label="기본 옷" value={villager.default_clothing_ko ?? villager.default_clothing} />
            <InfoRow label="옷 색상" value={villager.default_clothing_variation} />
            <InfoRow label="기본 우산" value={villager.default_umbrella_ko ?? villager.default_umbrella} last />
          </View>
        </DetailSection>

        <DetailSection title="하우스">
          <View style={styles.houseImageRow}>
            <HouseImage label="외관" source={getImageSource(villager, 'house_exterior')} />
            <HouseImage label="내부" source={getImageSource(villager, 'house_interior')} />
          </View>
          <View style={styles.detailInfoCard}>
            <InfoRow label="벽지" value={villager.house_wallpaper_ko ?? villager.house_wallpaper} />
            <InfoRow label="바닥" value={villager.house_flooring_ko ?? villager.house_flooring} />
            <InfoRow label="가구" value={formatValues(villager.house_furniture, {})} />
            <InfoRow label="음악" value={villager.house_music_ko ?? villager.house_music} />
            <InfoRow label="음악 메모" value={villager.house_music_note} last />
          </View>
          {getMusicSource(villager) && villager.house_music ? (
            <View style={styles.musicCard}>
              <Image source={getMusicSource(villager) as ImageSourcePropType} style={styles.musicImage} />
              <Text style={styles.musicName}>{villager.house_music_ko ?? villager.house_music}</Text>
            </View>
          ) : null}
        </DetailSection>

        <DetailSection title="포스터와 액자 사진">
          <View style={styles.collectibleGrid}>
            <CollectibleCard
              imageType="poster"
              item={villager.collectibles.poster}
              onToggle={() => onToggleStatus('posterOwned')}
              owned={state.posterOwned}
              villager={villager}
            />
            <CollectibleCard
              imageType="framed_photo"
              item={villager.collectibles.framed_photo}
              onToggle={() => onToggleStatus('photoReceived')}
              owned={state.photoReceived}
              villager={villager}
            />
          </View>
        </DetailSection>

        <DetailSection title="캠핑장 방문 이력">
          <CampsiteVisitEditor
            onAdd={onAddCampsiteVisit}
            onRemove={onRemoveCampsiteVisit}
            visits={campsiteVisits}
          />
        </DetailSection>
      </ScrollView>
      <FloatingTopButton
        accessibilityLabel={`${villager.name_ko} 상세 정보 맨 위로 이동`}
        onPress={() => detailScrollRef.current?.scrollTo({ animated: true, y: 0 })}
      />
    </View>
  );
}

function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string | null | undefined;
  last?: boolean;
}) {
  if (!value) return null;

  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: '#F7F8F2',
    flex: 1,
  },
  listContent: {
    paddingBottom: 38,
    paddingHorizontal: 16,
  },
  categoryTabs: {
    marginTop: 17,
  },
  categoryTabsContent: {
    gap: 7,
    paddingRight: 8,
  },
  categoryTab: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E7DE',
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  categoryTabSelected: {
    backgroundColor: '#31563A',
    borderColor: '#31563A',
  },
  categoryTabText: {
    color: '#728074',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryTabTextSelected: {
    color: '#FFFFFF',
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  heroCard: {
    backgroundColor: '#314D39',
    borderRadius: 26,
    minHeight: 190,
    overflow: 'hidden',
    padding: 22,
    position: 'relative',
  },
  heroContent: {
    zIndex: 1,
  },
  heroGlow: {
    backgroundColor: '#527451',
    borderRadius: 100,
    height: 190,
    opacity: 0.55,
    position: 'absolute',
    right: -64,
    top: -82,
    width: 190,
  },
  kicker: {
    color: '#B8D2AF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: 5,
  },
  subtitle: {
    color: '#D4E2CE',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    maxWidth: 245,
  },
  heroCountRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    marginTop: 19,
  },
  heroCount: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
  },
  heroCountLabel: {
    color: '#B8D2AF',
    fontSize: 12,
    marginLeft: 6,
  },
  heroLeaf: {
    alignItems: 'center',
    backgroundColor: '#45664D',
    borderRadius: 22,
    bottom: 20,
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
    width: 48,
  },
  heroLeafText: {
    color: '#D7E9C8',
    fontSize: 24,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E8DF',
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    height: 56,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  searchIcon: {
    color: '#647368',
    fontSize: 27,
    lineHeight: 30,
    marginRight: 8,
    transform: [{ rotate: '-20deg' }],
  },
  searchInput: {
    color: '#29352C',
    flex: 1,
    fontSize: 15,
    height: 54,
  },
  clearSearchButton: {
    alignItems: 'center',
    backgroundColor: '#EEF1EA',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  clearSearchText: {
    color: '#647368',
    fontSize: 20,
    lineHeight: 22,
  },
  controlRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 13,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: '#E8F0E2',
    borderRadius: 14,
    flexDirection: 'row',
    minHeight: 42,
    paddingHorizontal: 13,
  },
  controlButtonPressed: {
    opacity: 0.75,
  },
  controlButtonIcon: {
    color: '#3B6944',
    fontSize: 20,
    marginRight: 6,
  },
  controlButtonText: {
    color: '#31563A',
    fontSize: 13,
    fontWeight: '700',
  },
  filterBadge: {
    alignItems: 'center',
    backgroundColor: '#31563A',
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    marginLeft: 7,
    width: 18,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  sortSummary: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  sortSummaryLabel: {
    color: '#8A948B',
    fontSize: 12,
    marginRight: 7,
  },
  sortSummaryValue: {
    color: '#3B493E',
    fontSize: 13,
    fontWeight: '700',
  },
  activeFilters: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  activeFilterChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D7E3D2',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  activeFilterText: {
    color: '#47704C',
    fontSize: 11,
    fontWeight: '700',
  },
  clearFiltersText: {
    color: '#718074',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  resultHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 25,
  },
  sectionTitle: {
    color: '#29352C',
    fontSize: 21,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#8A948B',
    fontSize: 12,
    marginTop: 4,
  },
  resultCount: {
    color: '#5A7A5E',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  statusLegend: {
    marginBottom: 13,
  },
  statusLegendContent: {
    alignItems: 'center',
    gap: 10,
    paddingRight: 8,
  },
  statusLegendTitle: {
    color: '#7C897E',
    fontSize: 10,
    fontWeight: '800',
    marginRight: 2,
  },
  statusLegendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  statusLegendIcon: {
    color: '#587A5D',
    fontSize: 15,
    fontWeight: '700',
  },
  statusLegendText: {
    color: '#8C978D',
    fontSize: 10,
  },
  villagerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flex: 1,
    marginBottom: 10,
    marginHorizontal: 4,
    maxWidth: '50%',
    overflow: 'hidden',
    padding: 10,
  },
  cardTapArea: {
    borderRadius: 13,
  },
  villagerCardPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
  cardImageWrap: {
    alignItems: 'center',
    backgroundColor: '#EFF4E9',
    borderRadius: 13,
    height: 142,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  cardImage: {
    height: 128,
    width: '94%',
  },
  cardSpeciesPill: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 8,
    bottom: 7,
    left: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
    position: 'absolute',
  },
  cardSpeciesText: {
    color: '#58705B',
    fontSize: 10,
    fontWeight: '700',
  },
  cardNameKo: {
    color: '#29352C',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },
  cardNameEn: {
    color: '#89948A',
    fontSize: 11,
    marginTop: 2,
  },
  cardMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },
  cardMeta: {
    color: '#718074',
    fontSize: 10,
  },
  cardMetaDot: {
    color: '#B0B9B0',
    fontSize: 10,
    marginHorizontal: 4,
  },
  statusToggleGroup: {
    alignItems: 'center',
    borderTopColor: '#EEF2EC',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
  },
  statusToggle: {
    alignItems: 'center',
    backgroundColor: '#F0F3ED',
    borderRadius: 9,
    height: 29,
    justifyContent: 'center',
    width: 29,
  },
  statusToggleSelected: {
    backgroundColor: '#DCEBD5',
  },
  statusToggleIcon: {
    color: '#A3ADA3',
    fontSize: 16,
    fontWeight: '700',
  },
  statusToggleIconSelected: {
    color: '#3D7548',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 64,
  },
  emptyMark: {
    color: '#9BA89B',
    fontSize: 38,
    transform: [{ rotate: '-20deg' }],
  },
  emptyTitle: {
    color: '#415145',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 14,
  },
  emptyDescription: {
    color: '#8B968C',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(25, 37, 27, 0.42)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: '#F7F8F2',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    minHeight: '62%',
    overflow: 'hidden',
  },
  sheetSafeArea: {
    flex: 1,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  sheetKicker: {
    color: '#829080',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  sheetTitle: {
    color: '#29352C',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
  },
  sheetCloseButton: {
    alignItems: 'center',
    backgroundColor: '#E6EBE1',
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  sheetCloseText: {
    color: '#617064',
    fontSize: 24,
    lineHeight: 25,
  },
  filterContent: {
    paddingBottom: 22,
    paddingHorizontal: 22,
  },
  filterGroup: {
    marginTop: 22,
  },
  filterGroupTitle: {
    color: '#3E5042',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  optionRow: {
    gap: 7,
  },
  optionChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E7DE',
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionChipSelected: {
    backgroundColor: '#DDECD8',
    borderColor: '#8EBD8E',
  },
  optionChipText: {
    color: '#728074',
    fontSize: 12,
  },
  optionChipTextSelected: {
    color: '#35613E',
    fontWeight: '800',
  },
  sortGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  directionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  sortOption: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E7DE',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 45,
    minWidth: 92,
  },
  sortOptionSelected: {
    backgroundColor: '#31563A',
    borderColor: '#31563A',
  },
  sortOptionText: {
    color: '#728074',
    fontSize: 12,
    fontWeight: '700',
  },
  sortOptionTextSelected: {
    color: '#FFFFFF',
  },
  sortCheck: {
    color: '#D7E9C8',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
  },
  sheetActions: {
    backgroundColor: '#F7F8F2',
    borderTopColor: '#E3E9E0',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  resetButton: {
    alignItems: 'center',
    borderColor: '#D6DFD3',
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 22,
  },
  resetButtonText: {
    color: '#617064',
    fontSize: 14,
    fontWeight: '700',
  },
  applyButton: {
    alignItems: 'center',
    backgroundColor: '#31563A',
    borderRadius: 15,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  detailContent: {
    paddingBottom: 34,
    paddingHorizontal: 22,
  },
  detailPage: {
    flex: 1,
  },
  detailScroll: {
    flex: 1,
  },
  detailImageStage: {
    alignItems: 'center',
    backgroundColor: '#E8F0E2',
    borderRadius: 24,
    height: 300,
    justifyContent: 'center',
    marginTop: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  detailImageGlow: {
    backgroundColor: '#CADFC5',
    borderRadius: 110,
    height: 220,
    opacity: 0.7,
    position: 'absolute',
    right: -45,
    top: -60,
    width: 220,
  },
  detailImage: {
    height: 280,
    width: '92%',
    zIndex: 1,
  },
  detailIconImage: {
    height: 180,
    width: 180,
  },
  detailImageTabs: {
    gap: 7,
    paddingVertical: 14,
  },
  detailImageTab: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E6DC',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  detailImageTabSelected: {
    backgroundColor: '#31563A',
    borderColor: '#31563A',
  },
  detailImageTabText: {
    color: '#728074',
    fontSize: 12,
    fontWeight: '700',
  },
  detailImageTabTextSelected: {
    color: '#FFFFFF',
  },
  detailIdentity: {
    alignItems: 'center',
    marginTop: 3,
  },
  detailNameKo: {
    color: '#29352C',
    fontSize: 29,
    fontWeight: '800',
  },
  detailNameEn: {
    color: '#89948A',
    fontSize: 14,
    marginTop: 3,
  },
  detailTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    justifyContent: 'center',
    marginTop: 15,
  },
  detailTag: {
    backgroundColor: '#E4F0DE',
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  detailTagText: {
    color: '#47704C',
    fontSize: 11,
    fontWeight: '700',
  },
  detailInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginTop: 18,
    paddingHorizontal: 16,
  },
  detailSection: {
    marginTop: 25,
  },
  detailSectionTitle: {
    color: '#3E5042',
    fontSize: 16,
    fontWeight: '800',
  },
  detailStatusToggle: {
    borderRadius: 12,
    flex: 1,
    height: 58,
    marginHorizontal: 2,
    width: undefined,
  },
  detailStatusLabel: {
    color: '#6D7D70',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 3,
  },
  houseImageRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  houseImageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flex: 1,
    overflow: 'hidden',
  },
  houseImage: {
    backgroundColor: '#E8F0E2',
    height: 125,
    width: '100%',
  },
  houseImageLabel: {
    color: '#3E5042',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  musicCard: {
    alignItems: 'center',
    backgroundColor: '#E8F0E2',
    borderRadius: 16,
    flexDirection: 'row',
    marginTop: 10,
    padding: 10,
  },
  musicImage: {
    borderRadius: 8,
    height: 44,
    marginRight: 10,
    width: 44,
  },
  musicName: {
    color: '#3E5042',
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  collectibleGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  collectibleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flex: 1,
    overflow: 'hidden',
    paddingBottom: 10,
  },
  collectibleImage: {
    backgroundColor: '#EFF4E9',
    height: 145,
    width: '100%',
  },
  collectibleName: {
    color: '#3E5042',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  collectibleMeta: {
    color: '#718074',
    fontSize: 10,
    marginTop: 4,
    paddingHorizontal: 10,
  },
  collectibleSource: {
    color: '#8B968C',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 7,
    minHeight: 28,
    paddingHorizontal: 10,
  },
  ownedButton: {
    alignItems: 'center',
    borderColor: '#D6DFD3',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    marginHorizontal: 10,
    marginTop: 10,
    minHeight: 34,
  },
  ownedButtonSelected: {
    backgroundColor: '#31563A',
    borderColor: '#31563A',
  },
  ownedButtonText: {
    color: '#718074',
    fontSize: 11,
    fontWeight: '800',
  },
  ownedButtonTextSelected: {
    color: '#FFFFFF',
  },
  visitEditor: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 18,
    padding: 14,
  },
  visitInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  visitInput: {
    backgroundColor: '#F3F6F0',
    borderColor: '#E0E7DC',
    borderRadius: 10,
    borderWidth: 1,
    color: '#3E5042',
    flex: 1,
    fontSize: 13,
    height: 40,
    paddingHorizontal: 11,
  },
  visitAddButton: {
    alignItems: 'center',
    backgroundColor: '#31563A',
    borderRadius: 10,
    justifyContent: 'center',
    minWidth: 55,
    paddingHorizontal: 12,
  },
  visitAddButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  visitList: {
    marginTop: 11,
  },
  visitRow: {
    alignItems: 'center',
    borderTopColor: '#EEF1EC',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  visitDate: {
    color: '#3E5042',
    fontSize: 12,
    fontWeight: '700',
  },
  visitRemove: {
    color: '#A05C55',
    fontSize: 11,
    fontWeight: '700',
  },
  visitEmpty: {
    color: '#8B968C',
    fontSize: 11,
    marginTop: 11,
  },
  infoRow: {
    minHeight: 48,
    paddingVertical: 12,
  },
  infoRowBorder: {
    borderBottomColor: '#EEF1EC',
    borderBottomWidth: 1,
  },
  infoLabel: {
    color: '#8B968C',
    fontSize: 11,
    marginBottom: 4,
  },
  infoValue: {
    color: '#3E5042',
    fontSize: 13,
    fontWeight: '700',
  },
});
