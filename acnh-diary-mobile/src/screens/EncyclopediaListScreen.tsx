import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppChrome, useScrollNavigationVisibility, useTabBarVisibility } from '@/components/AppChrome';
import { AppColors, AppControlSizes, AppRadii, AppShadows, AppStatusColors } from '@/constants/theme';
import { CollectionStatusIcon } from '@/components/CollectionStatusIcon';
import { FloatingTopButton } from '@/components/FloatingTopButton';
import {
  ListFilterChip,
  ListFilterGroup,
  ListFilterPanel,
  ListFilterToggle,
  ListResultToolbar,
  ListSearchRow,
  type ListSortOption,
} from '@/components/ListControls';
import { SearchBar } from '@/components/SearchBar';
import { UnderlineTabs } from '@/components/UnderlineTabs';
import { encyclopediaCategories, getEncyclopediaItems, getEncyclopediaLabel } from '@/data/encyclopedia';
import { getEncyclopediaAsset } from '@/data/encyclopedia-assets';
import {
  localizeAvailabilityTime,
  localizeLocation,
  localizeLocationTag,
  localizeRarity,
  localizeShadow,
} from '@/data/encyclopedia-labels';
import {
  getActiveIsland,
  getCollectionStatesForIsland,
  initializeDatabase,
  setCollectionStatus,
  setCollectionStatusForItems,
} from '@/db/database';
import type {
  EncyclopediaCategory,
  EncyclopediaItem,
  EncyclopediaState,
  EncyclopediaStatus,
} from '@/types/encyclopedia';

type FilterKey =
  | 'caught'
  | 'uncaught'
  | 'owned'
  | 'unowned'
  | 'donated'
  | 'undonated'
  | 'genuineOwned'
  | 'fakeOwned';

type SortMode = 'number' | 'name' | 'group';
type ArtTypeTab = 'all' | 'painting' | 'statue';
type ArtAuthenticityTab = 'all' | 'genuineOnly' | 'hasFake';
type Hemisphere = 'north' | 'south';
type FishFilterFacet = 'location' | 'month' | 'time' | 'rarity' | 'shadow';
type FishFacetFilters = Record<FishFilterFacet, string[]>;
type LocationChipColors = {
  backgroundColor: string;
  borderColor: string;
  color: string;
};

const EMPTY_STATE: EncyclopediaState = {
  caught: false,
  owned: false,
  donated: false,
  genuineOwned: false,
  fakeOwned: false,
};

const filterLabels: Record<FilterKey, string> = {
  caught: '채집 완료',
  uncaught: '미채집',
  owned: '보유',
  unowned: '미보유',
  donated: '기증 완료',
  undonated: '미기증',
  genuineOwned: '진품 보유',
  fakeOwned: '가품 보유',
};

const filterOptions: Record<EncyclopediaCategory, FilterKey[]> = {
  bugs: ['caught', 'uncaught', 'donated', 'undonated'],
  fish: ['caught', 'uncaught', 'donated', 'undonated'],
  sea: ['caught', 'uncaught', 'donated', 'undonated'],
  fossils: ['owned', 'unowned', 'donated', 'undonated'],
  art: ['donated', 'undonated', 'genuineOwned', 'fakeOwned'],
};

const EMPTY_FISH_FACET_FILTERS: FishFacetFilters = {
  location: [],
  month: [],
  time: [],
  rarity: [],
  shadow: [],
};

const fishFilterFacets: FishFilterFacet[] = ['location', 'month', 'time', 'rarity', 'shadow'];

const fishFilterFacetLabels: Record<FishFilterFacet, string> = {
  location: '출현 장소',
  month: '출현 월',
  time: '출현 시간',
  rarity: '출현 빈도',
  shadow: '그림자 크기',
};

const fishLocationTabLabels: Record<string, string> = {
  Pier: '부두',
  Pond: '연못',
  River: '강',
  'River (clifftop)': '절벽 위 강',
  Sea: '바다',
};

const artAuthenticityTabs = [
  { key: 'all', label: '전체' },
  { key: 'genuineOnly', label: '진품만 있는 작품' },
  { key: 'hasFake', label: '가품도 있는 작품' },
] as const satisfies ReadonlyArray<{ key: ArtAuthenticityTab; label: string }>;

const locationChipColors: Record<string, LocationChipColors> = {
  Pier: { backgroundColor: '#FFF0DA', borderColor: '#E2B475', color: '#7A4F15' },
  Pond: { backgroundColor: '#EAF4D5', borderColor: '#B7D975', color: '#486815' },
  River: { backgroundColor: '#DDF0FF', borderColor: '#85BFE1', color: '#1F6282' },
  'River (clifftop)': { backgroundColor: '#EAE6FF', borderColor: '#A89EE8', color: '#55499D' },
  'River (mouth)': { backgroundColor: '#DDF6E7', borderColor: '#80CCA0', color: '#236A43' },
  Sea: { backgroundColor: '#D8F4F1', borderColor: '#7CCBC3', color: '#1F6C67' },
  'Sea (raining)': { backgroundColor: '#E3EBFF', borderColor: '#91A9EC', color: '#3D579A' },
};

const locationChipPalette: LocationChipColors[] = [
  { backgroundColor: '#FFE6E1', borderColor: '#E59B90', color: '#8A3C32' },
  { backgroundColor: '#F4E8FF', borderColor: '#BE9AE8', color: '#684397' },
  { backgroundColor: '#FFF5C9', borderColor: '#DFC85F', color: '#735F10' },
  { backgroundColor: '#E7F6DD', borderColor: '#91CA75', color: '#426A29' },
  { backgroundColor: '#E1F0FF', borderColor: '#85B6E4', color: '#2D5E8E' },
  { backgroundColor: '#FFE9F1', borderColor: '#E69AB7', color: '#873B5B' },
];

const locationTagChipColors: Record<string, LocationChipColors> = {
  'River (mouth)': { backgroundColor: '#FFF1CC', borderColor: '#E0C46B', color: '#735711' },
  'River (clifftop)': { backgroundColor: '#EAE6FF', borderColor: '#A89EE8', color: '#55499D' },
};

function isCreature(category: EncyclopediaCategory) {
  return category === 'bugs' || category === 'fish' || category === 'sea';
}

function getState(states: Record<string, EncyclopediaState>, item: EncyclopediaItem) {
  return states[`${item.category}/${item.id}`] ?? EMPTY_STATE;
}

function matchesFilter(filter: FilterKey, item: EncyclopediaItem, state: EncyclopediaState) {
  const owned = item.category === 'art' ? state.genuineOwned || state.fakeOwned : state.owned;
  if (filter === 'caught') return state.caught;
  if (filter === 'uncaught') return !state.caught;
  if (filter === 'owned') return owned;
  if (filter === 'unowned') return !owned;
  if (filter === 'donated') return state.donated;
  if (filter === 'undonated') return !state.donated;
  if (filter === 'genuineOwned') return state.genuineOwned;
  if (filter === 'fakeOwned') return state.fakeOwned;
  return false;
}

function compareItems(left: EncyclopediaItem, right: EncyclopediaItem, sortMode: SortMode) {
  if (sortMode === 'number') {
    return (
      (left.number ?? Number.MAX_SAFE_INTEGER) - (right.number ?? Number.MAX_SAFE_INTEGER) ||
      left.nameKo.localeCompare(right.nameKo, 'ko')
    );
  }
  if (sortMode === 'group') {
    return (
      (left.fossilGroup ?? '단품').localeCompare(right.fossilGroup ?? '단품', 'ko') ||
      left.nameKo.localeCompare(right.nameKo, 'ko')
    );
  }
  return left.nameKo.localeCompare(right.nameKo, 'ko');
}

function formatPrice(value: number | null) {
  return value == null ? null : `${value.toLocaleString('ko-KR')}벨`;
}

function primaryBulkStatus(category: EncyclopediaCategory): EncyclopediaStatus {
  if (category === 'art') return 'genuineOwned';
  if (category === 'fossils') return 'owned';
  return 'caught';
}

function statusLabel(status: EncyclopediaStatus) {
  if (status === 'caught') return '채집';
  if (status === 'owned') return '보유';
  if (status === 'donated') return '기증';
  if (status === 'genuineOwned') return '진품';
  return '가품';
}

function bulkActionLabel(status: EncyclopediaStatus, allActive: boolean) {
  if (status === 'caught') return allActive ? '채집 해제' : '전체 채집';
  if (status === 'donated') return allActive ? '기증 해제' : '전체 기증';
  if (status === 'genuineOwned') return allActive ? '진품 해제' : '전체 진품';
  return allActive ? '보유 해제' : '전체 보유';
}

function normalizeFacetValue(value: string | null | undefined) {
  return value?.replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim() || null;
}

function getFishLocationTabKey(location: string | null) {
  if (location === 'River (clifftop)') return 'River';
  if (location === 'River (mouth)') return 'River';
  if (location === 'Sea (raining)') return 'Sea';
  return location ?? 'unknown';
}

function getAvailability(item: EncyclopediaItem, hemisphere: Hemisphere) {
  return item.availability[hemisphere];
}

function getFishFacetValues(item: EncyclopediaItem, facet: FishFilterFacet, hemisphere: Hemisphere) {
  const availability = getAvailability(item, hemisphere);

  if (facet === 'location') return [normalizeFacetValue(item.location)].filter(Boolean) as string[];
  if (facet === 'month') return availability.months.map(String);
  if (facet === 'time') {
    const periodTimes = availability.periods
      .map((period) => normalizeFacetValue(period.time))
      .filter((time) => time && time !== 'NA') as string[];
    if (periodTimes.length > 0) return Array.from(new Set(periodTimes));
    return Array.from(
      new Set(
        Object.values(availability.timesByMonth)
          .map((time) => normalizeFacetValue(time))
          .filter((time) => time && time !== 'NA') as string[],
      ),
    );
  }
  if (facet === 'rarity') return [normalizeFacetValue(item.rarity)].filter(Boolean) as string[];
  if (facet === 'shadow') return [normalizeFacetValue(item.shadow)].filter(Boolean) as string[];
  return [];
}

function formatFishFacetLabel(facet: FishFilterFacet, value: string) {
  if (facet === 'location') return localizeLocation(value) ?? value;
  if (facet === 'month') return `${value}월`;
  if (facet === 'time') return localizeAvailabilityTime(value) ?? value;
  if (facet === 'rarity') return localizeRarity(value) ?? value;
  if (facet === 'shadow') return localizeShadow(value) ?? value;
  return value;
}

function getFishFacetOptions(items: EncyclopediaItem[], facet: FishFilterFacet, hemisphere: Hemisphere) {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const value of getFishFacetValues(item, facet, hemisphere)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([key, itemCount]) => ({ key, itemCount, label: formatFishFacetLabel(facet, key) }))
    .sort((left, right) => {
      if (facet === 'month') return Number(left.key) - Number(right.key);
      return left.label.localeCompare(right.label, 'ko');
    });
}

function getFishLocationTabs(items: EncyclopediaItem[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getFishLocationTabKey(item.location);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [
    { key: 'all', label: '전체' },
    ...[...counts.entries()]
      .map(([key]) => ({
        key,
        label: fishLocationTabLabels[key] ?? localizeLocation(key) ?? key,
      }))
      .sort((left, right) => left.label.localeCompare(right.label, 'ko')),
  ];
}

function matchesFishFacetFilters(item: EncyclopediaItem, filters: FishFacetFilters, hemisphere: Hemisphere) {
  return fishFilterFacets.every((facet) => {
    const selected = filters[facet];
    if (selected.length === 0) return true;
    const values = getFishFacetValues(item, facet, hemisphere);
    return selected.some((value) => values.includes(value));
  });
}

function getLocationChipColors(location: string | null) {
  if (!location) return locationChipPalette[0];
  const matched = locationChipColors[location];
  if (matched) return matched;

  const index = [...location].reduce((sum, char) => sum + char.charCodeAt(0), 0) % locationChipPalette.length;
  return locationChipPalette[index];
}

function getLocationTagChipColors(tag: string) {
  return locationTagChipColors[tag] ?? locationChipPalette[1];
}

export function EncyclopediaListScreen({ category }: { category: EncyclopediaCategory }) {
  const router = useRouter();
  const listRef = useRef<FlatList<EncyclopediaItem>>(null);
  const { handleScroll, navigationVisible } = useScrollNavigationVisibility();
  useTabBarVisibility(navigationVisible);
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<FilterKey[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('number');
  const [sortDescending, setSortDescending] = useState(false);
  const [artTypeTab, setArtTypeTab] = useState<ArtTypeTab>('all');
  const [artAuthenticityTab, setArtAuthenticityTab] = useState<ArtAuthenticityTab>('all');
  const [activeFishLocationTab, setActiveFishLocationTab] = useState('all');
  const [fishFacetFilters, setFishFacetFilters] = useState<FishFacetFilters>(EMPTY_FISH_FACET_FILTERS);
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [states, setStates] = useState<Record<string, EncyclopediaState>>({});
  const [islandId, setIslandId] = useState<string | null>(null);
  const [hemisphere, setHemisphere] = useState<Hemisphere>('north');

  const refresh = useCallback(() => {
    try {
      initializeDatabase();
      const island = getActiveIsland();
      setIslandId(island?.id ?? null);
      setHemisphere(island?.hemisphere === 'south' ? 'south' : 'north');
      setStates(island ? getCollectionStatesForIsland(island.id) : {});
    } catch {
      Alert.alert('도감 상태를 불러오지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  }, []);

  useFocusEffect(refresh);

  const items = getEncyclopediaItems(category);
  const normalizedSearch = search.trim().toLocaleLowerCase('ko-KR');
  const visibleItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const state = getState(states, item);
      const artwork = item.artwork;
      const matchesSearch =
        !normalizedSearch ||
        item.nameKo.toLocaleLowerCase('ko-KR').includes(normalizedSearch) ||
        item.nameEn.toLocaleLowerCase('ko-KR').includes(normalizedSearch) ||
        String(item.number ?? '').includes(normalizedSearch);
      return (
        matchesSearch &&
        (category !== 'fish' ||
          ((activeFishLocationTab === 'all' || getFishLocationTabKey(item.location) === activeFishLocationTab) &&
            matchesFishFacetFilters(item, fishFacetFilters, hemisphere))) &&
        (category !== 'art' ||
          ((artTypeTab === 'all' ||
            (artTypeTab === 'painting' && artwork?.type === 'Painting') ||
            (artTypeTab === 'statue' && artwork?.type === 'Statue')) &&
            (artAuthenticityTab === 'all' ||
              (artAuthenticityTab === 'genuineOnly' && !artwork?.hasFake) ||
              (artAuthenticityTab === 'hasFake' && artwork?.hasFake)))) &&
        activeFilters.every((filter) => matchesFilter(filter, item, state))
      );
    });
    return [...filtered].sort((left, right) => {
      const result = compareItems(left, right, sortMode);
      return sortDescending ? -result : result;
    });
  }, [
    activeFilters,
    activeFishLocationTab,
    artAuthenticityTab,
    artTypeTab,
    category,
    fishFacetFilters,
    hemisphere,
    items,
    normalizedSearch,
    sortDescending,
    sortMode,
    states,
  ]);

  const updateState = (item: EncyclopediaItem, status: EncyclopediaStatus, value: boolean) => {
    if (!islandId) {
      Alert.alert('섬 정보가 필요해요', '먼저 섬 정보를 등록해 주세요.');
      return;
    }
    try {
      setCollectionStatus(islandId, category, item.id, status, value);
      setStates((current) => {
        const previous = getState(current, item);
        const next = { ...previous, [status]: value };
        return { ...current, [`${category}/${item.id}`]: next };
      });
    } catch {
      Alert.alert('상태를 저장하지 못했어요', '변경 내용을 저장하는 중 문제가 발생했습니다.');
    }
  };

  const toggleStatus = (item: EncyclopediaItem, status: EncyclopediaStatus) => {
    updateState(item, status, !getState(states, item)[status]);
  };

  const applyBulkStatus = (status: EncyclopediaStatus, value: boolean) => {
    if (!islandId) {
      Alert.alert('섬 정보가 필요해요', '먼저 섬 정보를 등록해 주세요.');
      return;
    }
    try {
      const itemIds = visibleItems.map((item) => item.id);
      setCollectionStatusForItems(islandId, category, itemIds, status, value);
      setStates((current) => {
        const next = { ...current };
        for (const item of visibleItems) {
          next[`${category}/${item.id}`] = {
            ...getState(current, item),
            [status]: value,
          };
        }
        return next;
      });
    } catch {
      Alert.alert('일괄 상태를 저장하지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  };

  const toggleFilter = (filter: FilterKey) => {
    setActiveFilters((current) =>
      current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter],
    );
  };

  const toggleFishFacetFilter = (facet: FishFilterFacet, value: string) => {
    setFishFacetFilters((current) => {
      const selected = current[facet];
      return {
        ...current,
        [facet]: selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value],
      };
    });
  };

  const clearFilters = () => {
    setActiveFilters([]);
    setSearch('');
    setSortMode('number');
    setSortDescending(false);
    setArtTypeTab('all');
    setArtAuthenticityTab('all');
    setActiveFishLocationTab('all');
    setFishFacetFilters(EMPTY_FISH_FACET_FILTERS);
  };

  const columns = isCreature(category) ? 4 : 2;
  const fishFilterOptions = useMemo(
    () =>
      Object.fromEntries(
        fishFilterFacets.map((facet) => [facet, getFishFacetOptions(items, facet, hemisphere)]),
      ) as Record<FishFilterFacet, ReturnType<typeof getFishFacetOptions>>,
    [hemisphere, items],
  );
  const fishLocationTabs = useMemo(
    () => getFishLocationTabs(items),
    [items],
  );
  const sortOptions: Array<ListSortOption<SortMode>> = category === 'fossils'
    ? [
        { key: 'number', label: '번호순' },
        { key: 'name', label: '이름순' },
        { key: 'group', label: '그룹순' },
      ]
    : [
        { key: 'number', label: '번호순' },
        { key: 'name', label: '이름순' },
      ];
  const activeFilterCount =
    activeFilters.length +
    (artTypeTab !== 'all' ? 1 : 0) +
    (artAuthenticityTab !== 'all' ? 1 : 0) +
    (category === 'fish' ? (activeFishLocationTab !== 'all' ? 1 : 0) + fishFilterFacets.reduce((count, facet) => count + fishFacetFilters[facet].length, 0) : 0);
  const isFiltered = Boolean(search || activeFilterCount || sortMode !== 'number' || sortDescending);

  return (
    <View style={styles.screenRoot}>
      <AppChrome breadcrumbs={['도감']} showBack title={getEncyclopediaLabel(category)} />
      <SafeAreaView edges={[]} style={styles.safeArea}>
        <FlatList
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        data={visibleItems}
        key={`${category}-${columns}`}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⌕</Text>
            <Text style={styles.emptyTitle}>조건에 맞는 항목이 없어요</Text>
            <Text style={styles.emptyDescription}>검색어나 필터를 바꿔 다시 확인해 보세요.</Text>
          </View>
        }
        ListHeaderComponent={
          <View>
            {category === 'art' ? (
              <UnderlineTabs
                accessibilityLabel={(tab) => `${tab.label} 미술품 보기`}
                fitToWidth
                onChange={setArtAuthenticityTab}
                tabs={artAuthenticityTabs}
                value={artAuthenticityTab}
              />
            ) : null}

            {category === 'fish' ? (
              <UnderlineTabs
                accessibilityLabel={(tab) => `${tab.label} 출현 장소 물고기 보기`}
                onChange={setActiveFishLocationTab}
                tabs={fishLocationTabs}
                value={activeFishLocationTab}
              />
            ) : null}

            <ListSearchRow>
              <SearchBar
                accessibilityLabel={`${getEncyclopediaLabel(category)} 검색`}
                onChangeText={setSearch}
                onClear={() => setSearch('')}
                placeholder="이름 또는 번호로 검색"
                style={styles.searchBar}
                value={search}
              />
              <ListFilterToggle
                activeCount={activeFilterCount}
                expanded={filterExpanded}
                onPress={() => setFilterExpanded((value) => !value)}
              />
            </ListSearchRow>

            {filterExpanded ? (
              <ListFilterPanel>
                {isFiltered ? (
                  <View style={styles.filterPanelHeader}>
                    <Text style={styles.filterPanelHint}>현재 조건을 적용 중이에요</Text>
                    <Pressable accessibilityRole="button" onPress={clearFilters} style={styles.filterResetButton}>
                      <Text style={styles.filterResetText}>초기화</Text>
                    </Pressable>
                  </View>
                ) : null}

                <ListFilterGroup title="수집 상태">
                  {filterOptions[category].map((filter) => (
                    <ListFilterChip
                      key={filter}
                      label={filterLabels[filter]}
                      onPress={() => toggleFilter(filter)}
                      selected={activeFilters.includes(filter)}
                    />
                  ))}
                </ListFilterGroup>

                {category === 'fish' ? (
                  <>
                    {fishFilterFacets.map((facet) => {
                      const options = fishFilterOptions[facet];
                      if (options.length === 0) return null;
                      return (
                        <ListFilterGroup key={facet} title={fishFilterFacetLabels[facet]}>
                          {options.map((option) => {
                            const selected = fishFacetFilters[facet].includes(option.key);
                            return (
                              <ListFilterChip
                                accessibilityLabel={`${option.label} ${fishFilterFacetLabels[facet]} 필터`}
                                key={option.key}
                                label={`${option.label} ${option.itemCount}`}
                                onPress={() => toggleFishFacetFilter(facet, option.key)}
                                selected={selected}
                              />
                            );
                          })}
                        </ListFilterGroup>
                      );
                    })}
                  </>
                ) : null}

                {category === 'art' ? (
                  <>
                    <ListFilterGroup title="작품 분류">
                      {([
                        ['all', '전체'],
                        ['painting', '그림'],
                        ['statue', '조각'],
                      ] as Array<[ArtTypeTab, string]>).map(([value, label]) => (
                        <ListFilterChip
                          key={value}
                          label={label}
                          onPress={() => setArtTypeTab(value)}
                          role="radio"
                          selected={artTypeTab === value}
                        />
                      ))}
                    </ListFilterGroup>
                  </>
                ) : null}
              </ListFilterPanel>
            ) : null}

            <ListResultToolbar
              actions={(() => {
                const primaryStatus = primaryBulkStatus(category);
                const primaryActive = visibleItems.length > 0 && visibleItems.every((item) => getState(states, item)[primaryStatus]);
                const donatedActive = visibleItems.length > 0 && visibleItems.every((item) => getState(states, item).donated);
                return [
                  {
                    key: primaryStatus,
                    label: bulkActionLabel(primaryStatus, primaryActive),
                    disabled: visibleItems.length === 0,
                    onPress: () => applyBulkStatus(primaryStatus, !primaryActive),
                  },
                  {
                    key: 'donated',
                    label: bulkActionLabel('donated', donatedActive),
                    disabled: visibleItems.length === 0,
                    onPress: () => applyBulkStatus('donated', !donatedActive),
                  },
                ];
              })()}
              descending={sortDescending}
              isFiltered={isFiltered}
              onReset={clearFilters}
              onSortChange={setSortMode}
              onToggleDirection={() => setSortDescending((value) => !value)}
              resultCount={visibleItems.length}
              showReset={false}
              sortOptions={sortOptions}
              sortValue={sortMode}
              totalCount={items.length}
            />

          </View>
        }
        numColumns={columns}
        onRefresh={refresh}
        refreshing={false}
        ref={listRef}
        renderItem={({ item }) => (
          <EncyclopediaCard
            item={item}
            state={getState(states, item)}
            onOpen={() =>
              router.push({
                // Expo Router's generated route types are refreshed when the dev server starts.
                pathname: '/encyclopedia/[category]/[itemId]' as never,
                params: { category, itemId: item.id },
              })
            }
            onToggle={(status) => toggleStatus(item, status)}
          />
        )}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        />
        <FloatingTopButton
          accessibilityLabel="도감 목록 맨 위로 이동"
          onPress={() => listRef.current?.scrollToOffset({ animated: true, offset: 0 })}
        />
      </SafeAreaView>
    </View>
  );
}

function EncyclopediaCard({
  item,
  state,
  onOpen,
  onToggle,
}: {
  item: EncyclopediaItem;
  state: EncyclopediaState;
  onOpen: () => void;
  onToggle: (status: EncyclopediaStatus) => void;
}) {
  const creature = isCreature(item.category);
  const image = getEncyclopediaAsset(item.category, item.id);
  const statuses = item.category === 'art'
    ? (['genuineOwned', 'fakeOwned', 'donated'] as EncyclopediaStatus[])
    : item.category === 'fossils'
      ? (['owned', 'donated'] as EncyclopediaStatus[])
      : (['caught', 'donated'] as EncyclopediaStatus[]);
  const locationColors = getLocationChipColors(item.location);
  const renderStatusButton = (status: EncyclopediaStatus, placementStyle?: object) => {
    const active = status === 'owned' ? state.owned : state[status];
    const tone =
      status === 'donated'
        ? AppStatusColors.museum
        : status === 'owned' || status === 'genuineOwned'
          ? AppStatusColors.catalog
          : status === 'fakeOwned'
            ? AppStatusColors.danger
            : AppStatusColors.leaf;
    return (
      <Pressable
        accessibilityLabel={`${item.nameKo} ${statusLabel(status)} ${active ? '해제' : '설정'}`}
        accessibilityRole="button"
        key={status}
        onPress={() => onToggle(status)}
        style={[
          styles.statusButton,
          placementStyle,
          creature && styles.statusButtonOverlay,
          { borderColor: active ? tone.border : AppColors.line },
          active && { backgroundColor: tone.background },
        ]}>
        <CollectionStatusIcon active={active} status={status} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.itemCard, creature ? styles.creatureCard : styles.artCard]}>
      <View style={styles.cardOpenArea}>
        <View style={[styles.imageFrame, creature && styles.creatureImageFrame]}>
          <Pressable
            accessibilityLabel={`${item.nameKo} 상세 보기`}
            accessibilityRole="button"
            onPress={onOpen}
            style={styles.imageTapArea}>
            {image ? (
              <Image
                resizeMode="contain"
                source={image}
                style={[styles.cardImage, creature && styles.creatureImage]}
              />
            ) : (
              <Text style={styles.imageFallback}>?</Text>
            )}
          </Pressable>
          {creature ? (
            <>
              {renderStatusButton('donated', styles.statusOverlayLeft)}
              {renderStatusButton('caught', styles.statusOverlayRight)}
            </>
          ) : null}
        </View>
        <Pressable
          accessibilityLabel={`${item.nameKo} 상세 보기`}
          accessibilityRole="button"
          onPress={onOpen}
          style={styles.cardTextArea}>
          <Text numberOfLines={1} style={styles.itemName}>{item.nameKo}</Text>
          {creature ? (
            item.location || item.locationTags?.length ? (
              <View style={styles.locationChipRow}>
                {item.location ? (
                  <View
                    style={[
                      styles.locationChip,
                      { backgroundColor: locationColors.backgroundColor, borderColor: locationColors.borderColor },
                    ]}>
                    <Text numberOfLines={1} style={[styles.locationChipText, { color: locationColors.color }]}>
                      {localizeLocation(item.location) ?? item.location}
                    </Text>
                  </View>
                ) : null}
                {item.locationTags?.map((tag) => {
                  const tagColors = getLocationTagChipColors(tag);
                  return (
                    <View
                      key={tag}
                      style={[
                        styles.locationTagChip,
                        { backgroundColor: tagColors.backgroundColor, borderColor: tagColors.borderColor },
                      ]}>
                      <Text numberOfLines={1} style={[styles.locationTagChipText, { color: tagColors.color }]}>
                        {localizeLocationTag(tag) ?? tag}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null
          ) : (
            <Text numberOfLines={1} style={styles.itemMeta}>
              {item.number == null ? getEncyclopediaLabel(item.category) : `#${item.number} · ${getEncyclopediaLabel(item.category)}`}
            </Text>
          )}
        </Pressable>
      </View>
      {creature ? null : (
        <View style={styles.cardStatusRow}>
          {statuses.map((status) => renderStatusButton(status))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  safeArea: { backgroundColor: AppColors.background, flex: 1 },
  listContent: { paddingBottom: 32, paddingHorizontal: 18 },
  columnWrapper: { gap: 8 },
  headerRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 20 },
  backButton: {
    alignItems: 'center',
    backgroundColor: AppColors.primarySurface,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  backButtonText: { color: AppColors.primaryText, fontSize: 30, lineHeight: 32, marginTop: -3 },
  headerCopy: { flex: 1 },
  kicker: { color: AppColors.primaryText, fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: AppColors.primaryText, fontSize: 30, fontWeight: '800', marginTop: 3 },
  subtitle: { color: '#7A857B', fontSize: 13, marginTop: 4 },
  countBadge: { alignItems: 'center', backgroundColor: AppColors.primaryAction, borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
  countBadgeText: { color: AppColors.primaryText, fontSize: 17, fontWeight: '800' },
  searchBar: { flex: 1, minWidth: 0 },
  filterPanelHeader: { alignItems: 'center', borderBottomColor: '#DDE8D7', borderBottomWidth: 1, flexDirection: 'row', gap: 8, marginBottom: 2, paddingBottom: 10 },
  filterPanelHint: { color: AppColors.inkMuted, flex: 1, fontSize: 11, fontWeight: '700' },
  filterResetButton: { backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: AppRadii.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  filterResetText: { color: AppColors.leaf, fontSize: 11, fontWeight: '900' },
  itemCard: { backgroundColor: AppColors.card, borderRadius: AppRadii.card, marginBottom: 8, minWidth: 0, overflow: 'hidden', ...AppShadows.card },
  creatureCard: { flex: 1, padding: 6 },
  artCard: { flex: 1, padding: 9 },
  cardOpenArea: { alignItems: 'center' },
  cardTextArea: { alignItems: 'center', maxWidth: '100%' },
  imageFrame: { alignItems: 'center', backgroundColor: AppColors.paperRaised, borderRadius: AppRadii.control, height: 116, justifyContent: 'center', overflow: 'hidden', position: 'relative', width: '100%' },
  imageTapArea: { alignItems: 'center', height: '100%', justifyContent: 'center', width: '100%' },
  creatureImageFrame: { height: 74 },
  cardImage: { height: 106, width: '92%' },
  creatureImage: { height: 70, width: '94%' },
  imageFallback: { color: '#A0AAA0', fontSize: 22, fontWeight: '800' },
  itemName: { color: AppColors.ink, fontSize: 13, fontWeight: '800', marginTop: 8, maxWidth: '100%' },
  itemMeta: { color: AppColors.inkMuted, fontSize: 9, marginTop: 3, maxWidth: '100%' },
  locationChipRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'nowrap', gap: 4, justifyContent: 'center', marginTop: 5, maxWidth: '100%' },
  locationChip: { borderRadius: 999, borderWidth: 1, maxWidth: '100%', paddingHorizontal: 6, paddingVertical: 2 },
  locationChipText: { fontSize: 9, fontWeight: '900' },
  locationTagChip: { backgroundColor: '#F4E8FF', borderColor: '#BE9AE8', borderRadius: 999, borderWidth: 1, maxWidth: '100%', paddingHorizontal: 6, paddingVertical: 2 },
  locationTagChipText: { color: '#684397', fontSize: 9, fontWeight: '900' },
  cardStatusRow: { alignItems: 'center', flexDirection: 'row', gap: 4, justifyContent: 'center', marginTop: 7 },
  statusButton: { alignItems: 'center', backgroundColor: AppColors.card, borderRadius: AppRadii.pill, borderWidth: 1, height: AppControlSizes.compactStatus, justifyContent: 'center', width: AppControlSizes.compactStatus },
  statusButtonOverlay: { backgroundColor: 'rgba(255, 255, 255, 0.92)', borderColor: 'rgba(69, 83, 68, 0.12)', borderWidth: 1 },
  statusButtonActive: { backgroundColor: AppColors.primarySurface },
  statusOverlayLeft: { left: 4, position: 'absolute', top: 4 },
  statusOverlayRight: { position: 'absolute', right: 4, top: 4 },
  emptyState: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 80 },
  emptyIcon: { color: '#8EA18E', fontSize: 38 },
  emptyTitle: { color: AppColors.primaryText, fontSize: 17, fontWeight: '800', marginTop: 14 },
  emptyDescription: { color: '#89948B', fontSize: 13, marginTop: 7, textAlign: 'center' },
});
