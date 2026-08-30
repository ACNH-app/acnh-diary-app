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
import { encyclopediaCategories, getEncyclopediaItems, getEncyclopediaLabel } from '@/data/encyclopedia';
import { getEncyclopediaAsset } from '@/data/encyclopedia-assets';
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

function statusForBulk(category: EncyclopediaCategory): EncyclopediaStatus[] {
  if (category === 'art') return ['donated', 'genuineOwned', 'fakeOwned'];
  if (category === 'fossils') return ['owned', 'donated'];
  return ['caught', 'donated'];
}

function statusLabel(status: EncyclopediaStatus) {
  if (status === 'caught') return '채집';
  if (status === 'owned') return '보유';
  if (status === 'donated') return '기증';
  if (status === 'genuineOwned') return '진품';
  return '가품';
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
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [showBulkControls, setShowBulkControls] = useState(false);
  const [states, setStates] = useState<Record<string, EncyclopediaState>>({});
  const [islandId, setIslandId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    try {
      initializeDatabase();
      const island = getActiveIsland();
      setIslandId(island?.id ?? null);
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
  }, [activeFilters, artAuthenticityTab, artTypeTab, category, items, normalizedSearch, sortDescending, sortMode, states]);

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

  const clearFilters = () => {
    setActiveFilters([]);
    setSearch('');
    setSortMode('number');
    setSortDescending(false);
    setArtTypeTab('all');
    setArtAuthenticityTab('all');
  };

  const columns = isCreature(category) ? 5 : 2;
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
    (artAuthenticityTab !== 'all' ? 1 : 0);
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
                    <ListFilterGroup title="진품 여부">
                      {([
                        ['genuineOnly', '진품만 있는 작품'],
                        ['hasFake', '가품도 있는 작품'],
                      ] as Array<[ArtAuthenticityTab, string]>).map(([value, label]) => (
                        <ListFilterChip
                          key={value}
                          label={label}
                          onPress={() => setArtAuthenticityTab((current) => current === value ? 'all' : value)}
                          role="radio"
                          selected={artAuthenticityTab === value}
                        />
                      ))}
                    </ListFilterGroup>
                  </>
                ) : null}

                <Pressable
                  accessibilityLabel="도감 일괄 변경 열기"
                  accessibilityRole="button"
                  onPress={() => setShowBulkControls((value) => !value)}
                  style={styles.bulkButton}>
                  <Text style={styles.bulkButtonText}>{showBulkControls ? '일괄 변경 닫기' : '일괄 변경'}</Text>
                </Pressable>
              </ListFilterPanel>
            ) : null}

            <ListResultToolbar
              descending={sortDescending}
              isFiltered={isFiltered}
              onReset={clearFilters}
              onSortChange={setSortMode}
              onToggleDirection={() => setSortDescending((value) => !value)}
              resultCount={visibleItems.length}
              sortOptions={sortOptions}
              sortValue={sortMode}
              totalCount={items.length}
            />

            {showBulkControls ? (
              <View style={styles.bulkPanel}>
                <Text style={styles.bulkTitle}>{visibleItems.length}개 결과에 적용</Text>
                {statusForBulk(category).map((status) => (
                  <View key={status} style={styles.bulkRow}>
                    <Text style={styles.bulkLabel}>{statusLabel(status)}</Text>
                    <Pressable onPress={() => applyBulkStatus(status, true)} style={styles.bulkAction}>
                      <Text style={styles.bulkActionText}>전체 체크</Text>
                    </Pressable>
                    <Pressable onPress={() => applyBulkStatus(status, false)} style={styles.bulkActionMuted}>
                      <Text style={styles.bulkActionMutedText}>해제</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

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

  return (
    <View style={[styles.itemCard, creature ? styles.creatureCard : styles.artCard]}>
      <Pressable accessibilityLabel={`${item.nameKo} 상세 보기`} onPress={onOpen} style={styles.cardOpenArea}>
        <View style={[styles.imageFrame, creature && styles.creatureImageFrame]}>
          {image ? (
            <Image
              resizeMode="contain"
              source={image}
              style={[styles.cardImage, creature && styles.creatureImage]}
            />
          ) : (
            <Text style={styles.imageFallback}>?</Text>
          )}
        </View>
        <Text numberOfLines={1} style={styles.itemName}>{item.nameKo}</Text>
        <Text numberOfLines={1} style={styles.itemMeta}>
          {item.number == null ? getEncyclopediaLabel(item.category) : `#${item.number} · ${getEncyclopediaLabel(item.category)}`}
        </Text>
      </Pressable>
      <View style={styles.cardStatusRow}>
        {statuses.map((status) => {
          const active = status === 'owned' ? state.owned : state[status];
          return (
            <Pressable
              accessibilityLabel={`${item.nameKo} ${statusLabel(status)} ${active ? '해제' : '설정'}`}
              accessibilityRole="button"
              key={status}
              onPress={() => onToggle(status)}
              style={[styles.statusButton, active && styles.statusButtonActive]}>
              <CollectionStatusIcon active={active} status={status} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  safeArea: { backgroundColor: '#F6F8F2', flex: 1 },
  listContent: { padding: 18, paddingBottom: 32 },
  columnWrapper: { gap: 8 },
  headerRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 20 },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#E5EEE0',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  backButtonText: { color: '#456B4D', fontSize: 30, lineHeight: 32, marginTop: -3 },
  headerCopy: { flex: 1 },
  kicker: { color: '#799078', fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: '#29382C', fontSize: 30, fontWeight: '800', marginTop: 3 },
  subtitle: { color: '#7A857B', fontSize: 13, marginTop: 4 },
  countBadge: { alignItems: 'center', backgroundColor: '#2F503B', borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
  countBadgeText: { color: '#E4F2DB', fontSize: 17, fontWeight: '800' },
  searchBar: { flex: 1, minWidth: 0 },
  bulkButton: { backgroundColor: '#2F503B', borderRadius: 14, paddingHorizontal: 11, paddingVertical: 8 },
  bulkButtonText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  bulkPanel: { backgroundColor: '#E8F0E3', borderRadius: 16, marginTop: 10, padding: 12 },
  bulkTitle: { color: '#47684C', fontSize: 12, fontWeight: '800', marginBottom: 8 },
  bulkRow: { alignItems: 'center', flexDirection: 'row', marginTop: 5 },
  bulkLabel: { color: '#53675A', flex: 1, fontSize: 12, fontWeight: '700' },
  bulkAction: { backgroundColor: '#4C8255', borderRadius: 9, marginLeft: 5, paddingHorizontal: 8, paddingVertical: 6 },
  bulkActionText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  bulkActionMuted: { backgroundColor: '#D5E1D1', borderRadius: 9, marginLeft: 5, paddingHorizontal: 8, paddingVertical: 6 },
  bulkActionMutedText: { color: '#5F7664', fontSize: 10, fontWeight: '800' },
  itemCard: { backgroundColor: '#FFF', borderColor: '#E2E8DF', borderRadius: 14, borderWidth: 1, marginBottom: 8, minWidth: 0, overflow: 'hidden' },
  creatureCard: { flex: 1, padding: 6 },
  artCard: { flex: 1, padding: 9 },
  cardOpenArea: { alignItems: 'center' },
  imageFrame: { alignItems: 'center', backgroundColor: '#F5F8F2', borderRadius: 10, height: 116, justifyContent: 'center', width: '100%' },
  creatureImageFrame: { height: 74 },
  cardImage: { height: 106, width: '92%' },
  creatureImage: { height: 70, width: '94%' },
  imageFallback: { color: '#A0AAA0', fontSize: 22, fontWeight: '800' },
  itemName: { color: '#304034', fontSize: 13, fontWeight: '800', marginTop: 8, maxWidth: '100%' },
  itemMeta: { color: '#8A958C', fontSize: 9, marginTop: 3, maxWidth: '100%' },
  cardStatusRow: { alignItems: 'center', flexDirection: 'row', gap: 4, justifyContent: 'center', marginTop: 7 },
  statusButton: { alignItems: 'center', backgroundColor: '#F0F4EE', borderRadius: 10, height: 24, justifyContent: 'center', width: 24 },
  statusButtonActive: { backgroundColor: '#DCEED8' },
  emptyState: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 80 },
  emptyIcon: { color: '#8EA18E', fontSize: 38 },
  emptyTitle: { color: '#405044', fontSize: 17, fontWeight: '800', marginTop: 14 },
  emptyDescription: { color: '#89948B', fontSize: 13, marginTop: 7, textAlign: 'center' },
});
