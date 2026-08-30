import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { CollectionStatusIcon } from '@/components/CollectionStatusIcon';
import {
  getCatalogAssetForItem,
  catalogFilterFacets,
  catalogFilterFacetLabels,
  getCatalogFilterOptions,
  getCatalogItems,
  getCatalogSubcategories,
  matchesCatalogFilter,
} from '@/data/catalog';
import {
  getActiveIsland,
  getCollectionStatesForIsland,
  initializeDatabase,
  setCatalogOwnedStatus,
  setCollectionStatus,
} from '@/db/database';
import { villagers } from '@/data/villagers';
import type { CatalogCategory, CatalogCurrency, CatalogFilterFacet, CatalogItem } from '@/types/catalog';
import type { EncyclopediaState } from '@/types/encyclopedia';

type SortMode = 'number' | 'name' | 'source';
type OwnershipFilter = 'owned' | 'unowned';
type AvailabilityFilter = 'forSale' | 'notForSale';
type CatalogFacetFilters = Record<CatalogFilterFacet, string[]>;

const EMPTY_FACET_FILTERS: CatalogFacetFilters = {
  styles: [],
  themes: [],
  colors: [],
  seasonality: [],
  series: [],
  source: [],
  recipeSeason: [],
  recipeEvent: [],
  recipeMaterial: [],
};

const EMPTY_STATE: EncyclopediaState = {
  caught: false,
  owned: false,
  donated: false,
  genuineOwned: false,
  fakeOwned: false,
};

const catalogCategoryLabels: Record<CatalogCategory, string> = {
  furniture: '가구',
  interior: '인테리어',
  clothing: '옷',
  music: '음악',
  items: '잡화',
  tools: '도구',
  special_items: '특수 아이템',
  gyroids: '토용',
  photos: '사진·포스터',
  recipes: '레시피',
  reactions: '리액션',
};

function getState(states: Record<string, EncyclopediaState>, item: CatalogItem) {
  return states[`${item.catalogType}/${item.id}`] ?? EMPTY_STATE;
}

function compareItems(left: CatalogItem, right: CatalogItem, sortMode: SortMode) {
  if (sortMode === 'number') {
    return (
      (left.number ?? Number.MAX_SAFE_INTEGER) - (right.number ?? Number.MAX_SAFE_INTEGER) ||
      left.nameKo.localeCompare(right.nameKo, 'ko')
    );
  }
  if (sortMode === 'source') {
    return (
      (left.source ?? '정보 없음').localeCompare(right.source ?? '정보 없음', 'ko') ||
      left.nameKo.localeCompare(right.nameKo, 'ko')
    );
  }
  return left.nameKo.localeCompare(right.nameKo, 'ko');
}

function formatPrice(item: CatalogItem) {
  if (item.notForSale) return '비매품';
  if (item.buyPrice == null) return '구매가 정보 없음';
  return `${item.buyPrice.toLocaleString('ko-KR')}${formatCurrency(item.buyCurrency)}`;
}

function formatCurrency(currency: CatalogCurrency | null) {
  const labels: Record<CatalogCurrency, string> = {
    bells: '벨',
    nook_miles: '마일',
    poki: '포키',
    heart_crystals: '하트 크리스털',
    hotel_tickets: '호텔 티켓',
    nook_points: '너굴 포인트',
  };
  return labels[currency ?? 'bells'];
}

function formatAcquisition(item: CatalogItem) {
  return item.source || '획득 방법 정보 없음';
}

function formatRecipeMaterials(item: CatalogItem) {
  const materials = item.details.materials;
  return Array.isArray(materials) ? materials.join(' · ') : null;
}

export function CatalogListScreen({ initialCategory }: { initialCategory: CatalogCategory }) {
  const router = useRouter();
  const listRef = useRef<FlatList<CatalogItem>>(null);
  const { width } = useWindowDimensions();
  const columns = width >= 768 ? 2 : 1;
  const activeCategory = initialCategory;
  const subcategories = getCatalogSubcategories(activeCategory);
  const [activeSubcategory, setActiveSubcategory] = useState('all');
  const [search, setSearch] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter | null>(null);
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter | null>(null);
  const [facetFilters, setFacetFilters] = useState<CatalogFacetFilters>(EMPTY_FACET_FILTERS);
  const [filterExpanded, setFilterExpanded] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('number');
  const [sortDescending, setSortDescending] = useState(false);
  const [states, setStates] = useState<Record<string, EncyclopediaState>>({});
  const [islandId, setIslandId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    try {
      initializeDatabase();
      const island = getActiveIsland();
      setIslandId(island?.id ?? null);
      setStates(island ? getCollectionStatesForIsland(island.id) : {});
    } catch {
      Alert.alert('카탈로그 상태를 불러오지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  }, []);

  useFocusEffect(refresh);

  const items = getCatalogItems(activeCategory);
  const subcategoryItems = activeSubcategory === 'all'
    ? items
    : items.filter((item) => subcategories.find((subcategory) => subcategory.key === activeSubcategory)?.values.includes(item.classification));
  const activeSubcategoryLabel = subcategories.find((subcategory) => subcategory.key === activeSubcategory)?.label ?? '전체';
  const filterOptions = getCatalogFilterOptions(subcategoryItems);
  const normalizedSearch = search.trim().toLocaleLowerCase('ko-KR');
  const visibleItems = useMemo(() => {
    const filtered = subcategoryItems.filter((item) => {
      const state = getState(states, item);
      const matchesSearch =
        !normalizedSearch ||
        item.nameKo.toLocaleLowerCase('ko-KR').includes(normalizedSearch) ||
        item.nameEn.toLocaleLowerCase('ko-KR').includes(normalizedSearch) ||
        item.classification.toLocaleLowerCase('ko-KR').includes(normalizedSearch) ||
        (item.source ?? '').toLocaleLowerCase('ko-KR').includes(normalizedSearch) ||
        String(item.number ?? '').includes(normalizedSearch);
      const matchesOwnership =
        ownershipFilter == null || (ownershipFilter === 'owned' ? state.owned : !state.owned);
      const matchesAvailability =
        availabilityFilter == null ||
        (availabilityFilter === 'notForSale' ? item.notForSale : !item.notForSale);
      const matchesFacets = catalogFilterFacets.every((facet) => matchesCatalogFilter(item, facet, facetFilters[facet]));
      return matchesSearch && matchesOwnership && matchesAvailability && matchesFacets;
    });

    return [...filtered].sort((left, right) => {
      const result = compareItems(left, right, sortMode);
      return sortDescending ? -result : result;
    });
  }, [availabilityFilter, facetFilters, normalizedSearch, ownershipFilter, sortDescending, sortMode, states, subcategoryItems]);

  const ownedCount = subcategoryItems.reduce((count, item) => count + (getState(states, item).owned ? 1 : 0), 0);

  const selectSubcategory = (subcategory: string) => {
    setActiveSubcategory(subcategory);
      setFacetFilters({ ...EMPTY_FACET_FILTERS });
    listRef.current?.scrollToOffset({ animated: false, offset: 0 });
  };

  const toggleFacetFilter = (facet: CatalogFilterFacet, value: string) => {
    setFacetFilters((current) => {
      const selectedValues = current[facet];
      return {
        ...current,
        [facet]: selectedValues.includes(value)
          ? selectedValues.filter((selectedValue) => selectedValue !== value)
          : [...selectedValues, value],
      };
    });
  };

  const updateOwned = (item: CatalogItem, value: boolean) => {
    if (!islandId) {
      Alert.alert('섬 정보가 필요해요', '먼저 섬 정보를 등록해 주세요.');
      return;
    }
    try {
      let linkedVillager: { id: string; status: 'photoReceived' | 'posterOwned' } | undefined;
      if (item.catalogType === 'photos') {
        const villager = villagers.find((candidate) =>
          candidate.collectibles.framed_photo.item_id === item.id || candidate.collectibles.poster.item_id === item.id,
        );
        if (villager) {
          linkedVillager = {
            id: villager.id,
            status: item.classification === '사진' ? 'photoReceived' : 'posterOwned',
          };
        }
      }
      setCatalogOwnedStatus(islandId, item.catalogType, item.id, value, linkedVillager);
      setStates((current) => ({
        ...current,
        [`${item.catalogType}/${item.id}`]: {
          ...getState(current, item),
          owned: value,
        },
      }));
    } catch {
      Alert.alert('보유 상태를 저장하지 못했어요', '변경 내용을 저장하는 중 문제가 발생했습니다.');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setOwnershipFilter(null);
    setAvailabilityFilter(null);
    setFacetFilters(EMPTY_FACET_FILTERS);
    setSortMode('number');
    setSortDescending(false);
  };

  const hasFacetFilters = catalogFilterFacets.some((facet) => facetFilters[facet].length > 0);
  const isFiltered = Boolean(search || ownershipFilter || availabilityFilter || hasFacetFilters || sortMode !== 'number' || sortDescending);
  const activeFilterCount = (ownershipFilter ? 1 : 0) + (availabilityFilter ? 1 : 0) + catalogFilterFacets.reduce((count, facet) => count + facetFilters[facet].length, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={columns === 2 ? styles.columnWrapper : undefined}
        data={visibleItems}
        keyExtractor={(item) => `${item.catalogType}/${item.id}`}
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
            <View style={styles.headerRow}>
              <Pressable accessibilityLabel="카탈로그 홈으로 돌아가기" onPress={() => router.back()} style={styles.backButton}>
                <Text style={styles.backButtonText}>‹</Text>
              </Pressable>
              <View style={styles.headerCopy}>
                <Text style={styles.kicker}>CATALOG</Text>
                <Text style={styles.title}>카탈로그</Text>
                <Text style={styles.subtitle}>
                  {catalogCategoryLabels[activeCategory]} · {activeSubcategoryLabel} {subcategoryItems.length.toLocaleString('ko-KR')}개 중 {ownedCount.toLocaleString('ko-KR')}개 보유
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{visibleItems.length}</Text>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.subcategoryTabs} horizontal showsHorizontalScrollIndicator={false}>
              {subcategories.map((subcategory) => (
                <Pressable
                  accessibilityLabel={`${subcategory.label} 소분류 선택`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeSubcategory === subcategory.key }}
                  key={subcategory.key}
                  onPress={() => selectSubcategory(subcategory.key)}
                  style={[styles.subcategoryChip, activeSubcategory === subcategory.key && styles.subcategoryChipActive]}>
                  <Text style={[styles.subcategoryChipText, activeSubcategory === subcategory.key && styles.subcategoryChipTextActive]}>
                    {subcategory.label}
                  </Text>
                  <Text style={[styles.subcategoryCount, activeSubcategory === subcategory.key && styles.subcategoryCountActive]}>
                    {subcategory.itemCount}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                accessibilityLabel={`${catalogCategoryLabels[activeCategory]} 검색`}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setSearch}
                placeholder="이름, 분류, 획득 방법으로 검색"
                placeholderTextColor="#99A49B"
                style={styles.searchInput}
                value={search}
              />
              {search ? (
                <Pressable accessibilityLabel="검색어 지우기" hitSlop={8} onPress={() => setSearch('')}>
                  <Text style={styles.clearSearch}>×</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.filterHeaderRow}>
              <View style={styles.filterHeaderCopy}>
                <Text style={styles.controlLabel}>필터</Text>
                <Text style={styles.filterSummary}>{activeFilterCount ? `${activeFilterCount}개 적용 중` : '보유 상태와 상세 정보'}</Text>
              </View>
              <Pressable
                accessibilityLabel={`상세 필터 ${filterExpanded ? '접기' : '열기'}`}
                accessibilityRole="button"
                onPress={() => setFilterExpanded((value) => !value)}
                style={styles.filterToggle}>
                <Text style={styles.filterToggleText}>{filterExpanded ? '접기' : '펼치기'}</Text>
              </Pressable>
            </View>

            {filterExpanded ? (
              <View style={styles.filterPanel}>
                <View style={styles.filterGroup}>
                  <Text style={styles.filterGroupTitle}>보유 상태</Text>
                  <ScrollView contentContainerStyle={styles.filterOptions} horizontal showsHorizontalScrollIndicator={false}>
                    {(
                      [
                        ['owned', '보유'],
                        ['unowned', '미보유'],
                      ] as Array<[OwnershipFilter, string]>
                    ).map(([filter, label]) => (
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: ownershipFilter === filter }}
                        key={filter}
                        onPress={() => setOwnershipFilter((current) => (current === filter ? null : filter))}
                        style={[styles.filterChip, ownershipFilter === filter && styles.filterChipActive]}>
                        <Text style={[styles.filterChipText, ownershipFilter === filter && styles.filterChipTextActive]}>{label}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {(activeCategory === 'furniture' || activeCategory === 'interior' || activeCategory === 'clothing') ? (
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterGroupTitle}>판매 여부</Text>
                    <ScrollView contentContainerStyle={styles.filterOptions} horizontal showsHorizontalScrollIndicator={false}>
                      {([
                        ['forSale', '판매 가능'],
                        ['notForSale', '비매품'],
                      ] as Array<[AvailabilityFilter, string]>).map(([filter, label]) => (
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: availabilityFilter === filter }}
                          key={filter}
                          onPress={() => setAvailabilityFilter((current) => (current === filter ? null : filter))}
                          style={[styles.filterChip, availabilityFilter === filter && styles.filterChipActive]}>
                          <Text style={[styles.filterChipText, availabilityFilter === filter && styles.filterChipTextActive]}>{label}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                {catalogFilterFacets.map((facet) => {
                  const options = filterOptions[facet];
                  if (options.length === 0) return null;
                  return (
                    <View key={facet} style={styles.filterGroup}>
                      <Text style={styles.filterGroupTitle}>{catalogFilterFacetLabels[facet]}</Text>
                      <ScrollView contentContainerStyle={styles.filterOptions} horizontal showsHorizontalScrollIndicator={false}>
                        {options.map((option) => {
                          const selected = facetFilters[facet].includes(option.key);
                          return (
                            <Pressable
                              accessibilityLabel={`${option.label} ${catalogFilterFacetLabels[facet]} 필터`}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: selected }}
                              key={option.key}
                              onPress={() => toggleFacetFilter(facet, option.key)}
                              style={[styles.filterChip, selected && styles.filterChipActive]}>
                              <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
                                {option.label} {option.itemCount}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.controlRow}>
              <View style={styles.sortOptions}>
                <Text style={styles.controlLabel}>정렬</Text>
                {(
                  [
                    ['number', '번호'],
                    ['name', '이름'],
                    ['source', '획득방법'],
                  ] as Array<[SortMode, string]>
                ).map(([mode, label]) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: sortMode === mode }}
                    key={mode}
                    onPress={() => setSortMode(mode)}
                    style={[styles.sortChip, sortMode === mode && styles.sortChipActive]}>
                    <Text style={[styles.sortChipText, sortMode === mode && styles.sortChipTextActive]}>{label}</Text>
                  </Pressable>
                ))}
                <Pressable accessibilityLabel="정렬 방향 변경" onPress={() => setSortDescending((value) => !value)} style={styles.directionButton}>
                  <Text style={styles.directionText}>{sortDescending ? '↓' : '↑'}</Text>
                </Pressable>
              </View>
            </View>

            {isFiltered ? (
              <View style={styles.resultSummary}>
                <Text style={styles.resultSummaryText}>{visibleItems.length.toLocaleString('ko-KR')}개 항목 표시 중</Text>
                <Pressable onPress={clearFilters}>
                  <Text style={styles.resetText}>초기화</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        onRefresh={refresh}
        refreshing={false}
        ref={listRef}
        numColumns={columns}
        renderItem={({ item }) => (
          <CatalogCard
            item={item}
            state={getState(states, item)}
            onOpen={() =>
              router.push({
                pathname: '/catalog/[category]/[itemId]' as never,
                params: { category: item.catalogType, itemId: item.id },
              })
            }
            onSourceFilter={() => {
              const source = item.source?.split(',')[0]?.trim();
              if (source) {
                setFacetFilters((current) => ({ ...current, source: current.source.includes(source) ? current.source : [...current.source, source] }));
              }
            }}
            onToggle={() => updateOwned(item, !getState(states, item).owned)}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
      <Pressable
        accessibilityLabel="카탈로그 목록 맨 위로 이동"
        accessibilityRole="button"
        onPress={() => listRef.current?.scrollToOffset({ animated: true, offset: 0 })}
        style={({ pressed }) => [styles.floatingTopButton, pressed && styles.floatingTopButtonPressed]}>
        <Text style={styles.floatingTopIcon}>↑</Text>
        <Text style={styles.floatingTopText}>맨 위로</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function CatalogCard({
  item,
  state,
  onOpen,
  onSourceFilter,
  onToggle,
}: {
  item: CatalogItem;
  state: EncyclopediaState;
  onOpen: () => void;
  onSourceFilter: () => void;
  onToggle: () => void;
}) {
  const image = getCatalogAssetForItem(item);

  return (
    <View style={styles.itemCard}>
      <Pressable accessibilityLabel={`${item.nameKo} 상세 보기`} onPress={onOpen} style={styles.cardMain}>
        <View style={styles.imageFrame}>
          {image ? <Image resizeMode="contain" source={image} style={styles.cardImage} /> : <Text style={styles.imageFallback}>?</Text>}
        </View>
        <View style={styles.cardCopy}>
          <Text numberOfLines={1} style={styles.itemName}>{item.nameKo}</Text>
          <Text numberOfLines={1} style={styles.itemClassification}>{item.classification === '사진' ? '액자 사진' : item.classification}</Text>
          <Pressable accessibilityLabel={`${item.nameKo} 획득방법으로 필터 적용`} onPress={onSourceFilter}>
            <Text numberOfLines={1} style={styles.itemSource}>{formatAcquisition(item)}</Text>
          </Pressable>
          {item.catalogType === 'recipes' && formatRecipeMaterials(item) ? (
            <Text numberOfLines={2} style={styles.itemMaterials}>재료 · {formatRecipeMaterials(item)}</Text>
          ) : null}
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{formatPrice(item)}</Text>
            {item.sellPrice != null ? <Text style={styles.sellText}>판매 {item.sellPrice.toLocaleString('ko-KR')}벨</Text> : null}
          </View>
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel={`${item.nameKo} ${item.catalogType === 'reactions' ? '습득' : '보유'} ${state.owned ? '해제' : '설정'}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: state.owned }}
        onPress={onToggle}
        style={[styles.statusButton, state.owned && styles.statusButtonActive]}>
        <CollectionStatusIcon active={state.owned} status="owned" />
        <Text style={[styles.statusText, state.owned && styles.statusTextActive]}>{item.catalogType === 'reactions' ? '습득' : '보유'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#F6F8F2', flex: 1 },
  listContent: { padding: 18, paddingBottom: 112 },
  columnWrapper: { gap: 10 },
  headerRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 16 },
  backButton: { alignItems: 'center', backgroundColor: '#E5EEE0', borderRadius: 20, height: 40, justifyContent: 'center', marginRight: 12, width: 40 },
  backButtonText: { color: '#456B4D', fontSize: 30, lineHeight: 32, marginTop: -3 },
  headerCopy: { flex: 1 },
  kicker: { color: '#799078', fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: '#29382C', fontSize: 30, fontWeight: '800', marginTop: 3 },
  subtitle: { color: '#7A857B', fontSize: 13, marginTop: 4 },
  countBadge: { alignItems: 'center', backgroundColor: '#2F503B', borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
  countBadgeText: { color: '#E4F2DB', fontSize: 16, fontWeight: '800' },
  subcategoryTabs: { gap: 8, paddingBottom: 14 },
  subcategoryChip: { alignItems: 'center', backgroundColor: '#E9EEE7', borderRadius: 16, flexDirection: 'row', gap: 5, paddingHorizontal: 12, paddingVertical: 9 },
  subcategoryChipActive: { backgroundColor: '#355D42' },
  subcategoryChipText: { color: '#657468', fontSize: 12, fontWeight: '800' },
  subcategoryChipTextActive: { color: '#FFF' },
  subcategoryCount: { color: '#8B978D', fontSize: 10, fontWeight: '700' },
  subcategoryCountActive: { color: '#CDE4C8' },
  searchBox: { alignItems: 'center', backgroundColor: '#FFF', borderColor: '#E2E8DF', borderRadius: 16, borderWidth: 1, flexDirection: 'row', height: 52, paddingHorizontal: 14 },
  searchIcon: { color: '#55795C', fontSize: 24, marginRight: 8 },
  searchInput: { color: '#2D3B30', flex: 1, fontSize: 14, paddingVertical: 0 },
  clearSearch: { color: '#718074', fontSize: 22, paddingLeft: 8 },
  filterHeaderRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  filterHeaderCopy: { flex: 1 },
  filterSummary: { color: '#9AA49B', fontSize: 11, marginTop: 3 },
  filterToggle: { backgroundColor: '#E1ECE0', borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7 },
  filterToggleText: { color: '#3E744A', fontSize: 11, fontWeight: '800' },
  filterPanel: { backgroundColor: '#EDF3EA', borderRadius: 16, marginTop: 8, padding: 12 },
  filterGroup: { marginTop: 10 },
  filterGroupFirst: { marginTop: 0 },
  filterGroupTitle: { color: '#5F735F', fontSize: 11, fontWeight: '800', marginBottom: 6 },
  filterOptions: { gap: 7 },
  filterChip: { backgroundColor: '#E9EEE7', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 },
  filterChipActive: { backgroundColor: '#355D42' },
  filterChipText: { color: '#657468', fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: '#FFF' },
  controlRow: { alignItems: 'center', flexDirection: 'row', marginTop: 12 },
  sortOptions: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  controlLabel: { color: '#758177', fontSize: 12, fontWeight: '700', marginRight: 2 },
  sortChip: { borderColor: '#DCE5DA', borderRadius: 12, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 6 },
  sortChipActive: { backgroundColor: '#DDECDD', borderColor: '#BFD8BE' },
  sortChipText: { color: '#758177', fontSize: 11, fontWeight: '700' },
  sortChipTextActive: { color: '#3F724B' },
  directionButton: { alignItems: 'center', backgroundColor: '#E1ECE0', borderRadius: 12, height: 28, justifyContent: 'center', width: 28 },
  directionText: { color: '#3E744A', fontSize: 16, fontWeight: '800' },
  resultSummary: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, marginTop: 14 },
  resultSummaryText: { color: '#79857B', fontSize: 12 },
  resetText: { color: '#3D7549', fontSize: 12, fontWeight: '800' },
  itemCard: { alignItems: 'center', backgroundColor: '#FFF', borderColor: '#E2E8DF', borderRadius: 16, borderWidth: 1, flex: 1, flexDirection: 'row', marginBottom: 8, minHeight: 108, minWidth: 0, overflow: 'hidden', padding: 10 },
  cardMain: { alignItems: 'center', flex: 1, flexDirection: 'row', minWidth: 0 },
  imageFrame: { alignItems: 'center', backgroundColor: '#F5F8F2', borderRadius: 12, height: 84, justifyContent: 'center', marginRight: 12, width: 84 },
  cardImage: { height: 76, width: 76 },
  imageFallback: { color: '#A0AAA0', fontSize: 22, fontWeight: '800' },
  cardCopy: { flex: 1, minWidth: 0 },
  itemName: { color: '#304034', fontSize: 15, fontWeight: '800' },
  itemClassification: { color: '#66806A', fontSize: 11, fontWeight: '700', marginTop: 4 },
  itemSource: { color: '#89948B', fontSize: 11, marginTop: 5 },
  itemMaterials: { color: '#9B8060', fontSize: 10, lineHeight: 14, marginTop: 4 },
  priceRow: { alignItems: 'center', flexDirection: 'row', marginTop: 7 },
  priceText: { color: '#48684D', fontSize: 11, fontWeight: '800' },
  sellText: { color: '#A0AAA0', fontSize: 10, marginLeft: 8 },
  statusButton: { alignItems: 'center', backgroundColor: '#F0F4EE', borderRadius: 12, justifyContent: 'center', marginLeft: 8, minHeight: 60, paddingHorizontal: 8, width: 54 },
  statusButtonActive: { backgroundColor: '#DCEED8' },
  statusText: { color: '#7D8A7F', fontSize: 9, fontWeight: '800', marginTop: 6 },
  statusTextActive: { color: '#3F7B4A' },
  emptyState: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 80 },
  emptyIcon: { color: '#8EA18E', fontSize: 38 },
  emptyTitle: { color: '#405044', fontSize: 17, fontWeight: '800', marginTop: 14 },
  emptyDescription: { color: '#89948B', fontSize: 13, marginTop: 7, textAlign: 'center' },
  floatingTopButton: { alignItems: 'center', backgroundColor: '#31573D', borderRadius: 25, bottom: 24, elevation: 4, flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 11, position: 'absolute', right: 18, shadowColor: '#1D3826', shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.2, shadowRadius: 6 },
  floatingTopButtonPressed: { opacity: 0.78 },
  floatingTopIcon: { color: '#E4F2DC', fontSize: 18, fontWeight: '800', marginRight: 5 },
  floatingTopText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
});
