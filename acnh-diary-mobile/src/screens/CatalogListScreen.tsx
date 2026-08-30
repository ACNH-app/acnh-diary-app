import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppChrome, useScrollNavigationVisibility, useTabBarVisibility } from '@/components/AppChrome';
import { FloatingTopButton } from '@/components/FloatingTopButton';
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
} from '@/db/database';
import { villagers } from '@/data/villagers';
import type { CatalogCategory, CatalogFilterFacet, CatalogItem } from '@/types/catalog';
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
  tag: [],
  size: [],
  functions: [],
  customizable: [],
  lucky: [],
  orderable: [],
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
  items: '기타',
  tools: '도구',
  special_items: '특수 아이템',
  gyroids: '토용',
  photos: '사진·포스터',
  recipes: '레시피',
  seasonal_recipes: '시즌·이벤트',
  reactions: '리액션',
};

const sortLabels: Record<SortMode, string> = {
  number: '번호순',
  name: '이름순',
  source: '획득방법순',
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

function formatAcquisition(item: CatalogItem) {
  return (item.source || '획득 방법 정보 없음')
    .split(',')
    .map((source) => source.trim())
    .filter(Boolean);
}

function formatClassification(item: CatalogItem) {
  const classification = item.classification === '사진' ? '액자 사진' : item.classification || '분류 없음';
  return item.number == null ? classification : `${classification} · NO.${String(item.number).padStart(4, '0')}`;
}

function getClassificationTags(item: CatalogItem) {
  const value = item.details.tag;
  if (Array.isArray(value)) return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  return typeof value === 'string' && value.trim() ? [value.trim()] : [];
}

function formatClassificationTag(item: CatalogItem) {
  return getClassificationTags(item).join(', ');
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
  const { handleScroll, navigationVisible } = useScrollNavigationVisibility();
  useTabBarVisibility(navigationVisible);
  const activeCategory = initialCategory;
  const subcategories = getCatalogSubcategories(activeCategory);
  const hasSubcategories = subcategories.length > 1;
  const [activeSubcategory, setActiveSubcategory] = useState('all');
  const [search, setSearch] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter | null>(null);
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter | null>(null);
  const [facetFilters, setFacetFilters] = useState<CatalogFacetFilters>(EMPTY_FACET_FILTERS);
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
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
        getClassificationTags(item).some((tag) => tag.toLocaleLowerCase('ko-KR').includes(normalizedSearch)) ||
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

  const selectSubcategory = (subcategory: string) => {
    setActiveSubcategory(subcategory);
    setFacetFilters({ ...EMPTY_FACET_FILTERS });
    setSortMenuOpen(false);
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
    setSortMenuOpen(false);
  };

  const hasFacetFilters = catalogFilterFacets.some((facet) => facetFilters[facet].length > 0);
  const isFiltered = Boolean(search || ownershipFilter || availabilityFilter || hasFacetFilters || sortMode !== 'number' || sortDescending);
  const activeFilterCount = (ownershipFilter ? 1 : 0) + (availabilityFilter ? 1 : 0) + catalogFilterFacets.reduce((count, facet) => count + facetFilters[facet].length, 0);

  return (
    <View style={styles.screenRoot}>
      <AppChrome breadcrumbs={['카탈로그']} showBack title={catalogCategoryLabels[activeCategory]} />
      <SafeAreaView edges={[]} style={styles.safeArea}>
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
            {hasSubcategories ? (
              <View style={styles.subcategoryTabBar}>
                <ScrollView contentContainerStyle={styles.subcategoryTabs} horizontal showsHorizontalScrollIndicator={false}>
                  {subcategories.map((subcategory) => {
                    const selected = activeSubcategory === subcategory.key;
                    return (
                      <Pressable
                        accessibilityLabel={`${subcategory.label} 소분류 선택`}
                        accessibilityRole="tab"
                        accessibilityState={{ selected }}
                        key={subcategory.key}
                        onPress={() => selectSubcategory(subcategory.key)}
                        style={[styles.subcategoryTab, selected && styles.subcategoryTabActive]}>
                        <Text style={[styles.subcategoryTabText, selected && styles.subcategoryTabTextActive]}>
                          {subcategory.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.searchFilterRow}>
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
              <Pressable
                accessibilityLabel={`상세 필터 ${filterExpanded ? '접기' : '열기'}`}
                accessibilityRole="button"
                onPress={() => setFilterExpanded((value) => !value)}
                style={styles.filterToggle}>
                <Text style={styles.filterToggleText}>
                  {filterExpanded ? '필터 닫기' : activeFilterCount ? `필터 ${activeFilterCount}` : '필터'}
                </Text>
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

            <View style={styles.resultToolbar}>
              <View style={styles.resultCountGroup}>
                <Text style={styles.resultCount}>
                  {visibleItems.length.toLocaleString('ko-KR')} / {subcategoryItems.length.toLocaleString('ko-KR')}
                </Text>
                {isFiltered ? <Text style={styles.resultCountHint}>필터 결과</Text> : null}
                {isFiltered ? (
                  <Pressable onPress={clearFilters}>
                    <Text style={styles.resetText}>초기화</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.sortControls}>
                <Pressable
                  accessibilityLabel={`정렬 조건 ${sortLabels[sortMode]}`}
                  accessibilityRole="button"
                  onPress={() => setSortMenuOpen((value) => !value)}
                  style={styles.sortSelect}>
                  <Text style={styles.sortSelectLabel}>정렬</Text>
                  <Text style={styles.sortSelectValue}>{sortLabels[sortMode]}</Text>
                  <Text style={styles.sortSelectChevron}>{sortMenuOpen ? '⌃' : '⌄'}</Text>
                </Pressable>
                <View style={styles.sortDivider} />
                <Pressable
                  accessibilityLabel={sortDescending ? '내림차순으로 정렬 중, 오름차순으로 변경' : '오름차순으로 정렬 중, 내림차순으로 변경'}
                  accessibilityRole="button"
                  onPress={() => setSortDescending((value) => !value)}
                  style={styles.directionButton}>
                  <Text style={styles.directionText}>{sortDescending ? '↓' : '↑'}</Text>
                </Pressable>
              </View>
            </View>

            {sortMenuOpen ? (
              <View style={styles.sortDropdown}>
                {(
                  Object.entries(sortLabels) as Array<[SortMode, string]>
                ).map(([mode, label]) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: sortMode === mode }}
                    key={mode}
                    onPress={() => {
                      setSortMode(mode);
                      setSortMenuOpen(false);
                    }}
                    style={[styles.sortOption, sortMode === mode && styles.sortOptionActive]}>
                    <Text style={[styles.sortOptionText, sortMode === mode && styles.sortOptionTextActive]}>{label}</Text>
                    {sortMode === mode ? <Text style={styles.sortOptionCheck}>✓</Text> : null}
                  </Pressable>
                ))}
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
                params: { category: activeCategory, itemId: item.id },
              })
            }
            onSourceFilter={() => {
              const source = item.source?.split(',')[0]?.trim();
              if (source) {
                setFacetFilters((current) => ({ ...current, source: current.source.includes(source) ? current.source : [...current.source, source] }));
              }
            }}
            onTagFilter={() => {
              const tags = getClassificationTags(item);
              if (tags.length) {
                setFacetFilters((current) => ({
                  ...current,
                  tag: Array.from(new Set([...current.tag, ...tags])),
                }));
              }
            }}
            onToggle={() => updateOwned(item, !getState(states, item).owned)}
          />
        )}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        />
        <FloatingTopButton
          accessibilityLabel="카탈로그 목록 맨 위로 이동"
          onPress={() => listRef.current?.scrollToOffset({ animated: true, offset: 0 })}
        />
      </SafeAreaView>
    </View>
  );
}

function CatalogCard({
  item,
  state,
  onOpen,
  onSourceFilter,
  onTagFilter,
  onToggle,
}: {
  item: CatalogItem;
  state: EncyclopediaState;
  onOpen: () => void;
  onSourceFilter: () => void;
  onTagFilter: () => void;
  onToggle: () => void;
}) {
  const image = getCatalogAssetForItem(item);
  const ownedLabel = item.catalogType === 'reactions' ? '습득' : '보유';

  return (
    <View style={styles.itemCard}>
      <Pressable accessibilityLabel={`${item.nameKo} 상세 보기`} onPress={onOpen} style={styles.cardMain}>
        <View style={styles.imageFrame}>
          {image ? <Image resizeMode="contain" source={image} style={styles.cardImage} /> : <Text style={styles.imageFallback}>?</Text>}
        </View>
        <View style={styles.cardCopy}>
          <Text numberOfLines={1} style={styles.itemClassification}>{formatClassification(item)}</Text>
          <Text numberOfLines={2} style={styles.itemName}>{item.nameKo}</Text>
          {formatClassificationTag(item) ? (
            <Pressable accessibilityLabel={`${item.nameKo} 분류 태그로 필터 적용`} onPress={onTagFilter} style={styles.tagRow}>
              <Text style={styles.detailLabel}>분류 태그</Text>
              <Text numberOfLines={1} style={styles.tagText}>{formatClassificationTag(item)}</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityLabel={`${item.nameKo} 획득방법으로 필터 적용`} onPress={onSourceFilter} style={styles.acquisitionRow}>
            <Text style={styles.detailLabel}>획득방법</Text>
            <View style={styles.acquisitionDetails}>
              {formatAcquisition(item).map((source, index) => (
                <Text key={`${source}-${index}`} style={styles.acquisitionText}>{source}</Text>
              ))}
            </View>
          </Pressable>
          {item.catalogType === 'recipes' && formatRecipeMaterials(item) ? (
            <Text numberOfLines={2} style={styles.itemMaterials}>재료 · {formatRecipeMaterials(item)}</Text>
          ) : null}
          {item.notForSale ? (
            <View style={styles.nonSaleChip}>
              <Text style={styles.nonSaleText}>비매품</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel={`${item.nameKo} ${ownedLabel} ${state.owned ? '해제' : '설정'}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: state.owned }}
        onPress={onToggle}
        style={styles.statusButton}>
        <Text style={[styles.statusText, state.owned && styles.statusTextActive]}>{state.owned ? ownedLabel : `미${ownedLabel}`}</Text>
        <View style={[styles.statusCircle, state.owned && styles.statusCircleActive]}>
          {state.owned ? <Text style={styles.statusCheck}>✓</Text> : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  safeArea: { backgroundColor: '#F6F8F2', flex: 1 },
  listContent: { paddingBottom: 8, paddingHorizontal: 18 },
  columnWrapper: { gap: 10 },
  subcategoryTabBar: { borderBottomColor: '#DEE7DE', borderBottomWidth: 1, marginBottom: 14 },
  subcategoryTabs: { alignItems: 'stretch', flexGrow: 1 },
  subcategoryTab: { alignItems: 'center', borderBottomColor: 'transparent', borderBottomWidth: 4, flexGrow: 1, justifyContent: 'center', minWidth: 62, paddingHorizontal: 4, paddingVertical: 13 },
  subcategoryTabActive: { borderBottomColor: '#55A487' },
  subcategoryTabText: { color: '#7A877D', fontSize: 13, fontWeight: '800' },
  subcategoryTabTextActive: { color: '#398A6D' },
  searchFilterRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  searchBox: { alignItems: 'center', backgroundColor: '#FFF', borderColor: '#E2E8DF', borderRadius: 14, borderWidth: 1, flex: 1, flexDirection: 'row', height: 42, minWidth: 0, paddingHorizontal: 12 },
  searchIcon: { color: '#55795C', fontSize: 20, marginRight: 7 },
  searchInput: { color: '#2D3B30', flex: 1, fontSize: 14, paddingVertical: 0 },
  clearSearch: { color: '#718074', fontSize: 18, paddingLeft: 7 },
  filterToggle: { alignItems: 'center', backgroundColor: '#E1ECE0', borderRadius: 12, minWidth: 58, paddingHorizontal: 9, paddingVertical: 8 },
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
  resultToolbar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, marginTop: 18 },
  resultCountGroup: { alignItems: 'center', flexDirection: 'row', minWidth: 0 },
  resultCount: { color: '#6F7F74', fontSize: 12, fontWeight: '800' },
  resultCountHint: { color: '#98A39A', fontSize: 10, marginLeft: 7 },
  sortControls: { alignItems: 'center', flexDirection: 'row' },
  sortSelect: { alignItems: 'center', flexDirection: 'row', paddingVertical: 6 },
  sortSelectLabel: { color: '#7B887F', fontSize: 11, fontWeight: '700', marginRight: 10 },
  sortSelectValue: { color: '#3E5145', fontSize: 13, fontWeight: '800' },
  sortSelectChevron: { color: '#6C7D71', fontSize: 16, lineHeight: 18, marginLeft: 7, marginTop: -2 },
  sortDivider: { backgroundColor: '#DDE5DE', height: 28, marginHorizontal: 10, width: 1 },
  sortDropdown: { alignSelf: 'flex-end', backgroundColor: '#FFF', borderColor: '#DFE8DF', borderRadius: 14, borderWidth: 1, elevation: 4, marginBottom: 8, marginTop: -4, overflow: 'hidden', shadowColor: '#294334', shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.12, shadowRadius: 7, width: 144 },
  sortOption: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 13, paddingVertical: 11 },
  sortOptionActive: { backgroundColor: '#F0F7ED' },
  sortOptionText: { color: '#66766B', fontSize: 12, fontWeight: '700' },
  sortOptionTextActive: { color: '#397B4D' },
  sortOptionCheck: { color: '#4D956C', fontSize: 14, fontWeight: '800' },
  directionButton: { alignItems: 'center', backgroundColor: '#E4F1EB', borderRadius: 12, height: 24, justifyContent: 'center', width: 24 },
  directionText: { color: '#3D8B6B', fontSize: 15, fontWeight: '500', lineHeight: 17 },
  resetText: { color: '#3D7549', fontSize: 12, fontWeight: '800' },
  itemCard: { alignItems: 'flex-start', backgroundColor: '#FFF', borderColor: '#E7ECE5', borderRadius: 22, borderWidth: 1, flex: 1, flexDirection: 'row', marginBottom: 14, minHeight: 178, minWidth: 0, overflow: 'hidden', padding: 14 },
  cardMain: { alignItems: 'flex-start', flex: 1, flexDirection: 'row', minWidth: 0 },
  imageFrame: { alignItems: 'center', backgroundColor: '#F5F8F2', borderRadius: 18, height: 126, justifyContent: 'center', marginRight: 14, width: 126 },
  cardImage: { height: 116, width: 116 },
  imageFallback: { color: '#A0AAA0', fontSize: 22, fontWeight: '800' },
  cardCopy: { flex: 1, minWidth: 0, paddingTop: 1 },
  itemName: { color: '#304034', fontSize: 18, fontWeight: '800', lineHeight: 23, marginTop: 4 },
  itemClassification: { color: '#5E8C76', fontSize: 11, fontWeight: '800' },
  acquisitionRow: { alignItems: 'flex-start', flexDirection: 'row', marginTop: 11, minWidth: 0 },
  tagRow: { alignItems: 'flex-start', flexDirection: 'row', marginTop: 5, minWidth: 0 },
  detailLabel: { color: '#7D8B82', flexShrink: 0, fontSize: 11, fontWeight: '700', lineHeight: 16, marginRight: 8, width: 52 },
  tagText: { color: '#75877B', flex: 1, fontSize: 10, fontWeight: '700', lineHeight: 15 },
  acquisitionDetails: { flex: 1, minWidth: 0 },
  acquisitionText: { color: '#4E8068', fontSize: 11, fontWeight: '700', lineHeight: 16 },
  itemMaterials: { color: '#9B8060', fontSize: 10, lineHeight: 14, marginTop: 4 },
  nonSaleChip: { alignSelf: 'flex-start', backgroundColor: '#FCE9E2', borderRadius: 14, marginTop: 6, paddingHorizontal: 10, paddingVertical: 7 },
  nonSaleText: { color: '#E47E69', fontSize: 11, fontWeight: '800' },
  statusButton: { alignItems: 'center', justifyContent: 'flex-start', marginLeft: 7, paddingTop: 2, width: 36 },
  statusText: { color: '#89958D', fontSize: 9, fontWeight: '800', marginBottom: 4 },
  statusTextActive: { color: '#3F7B4A' },
  statusCircle: { alignItems: 'center', borderColor: '#B8C7BE', borderRadius: 16, borderWidth: 2, height: 32, justifyContent: 'center', width: 32 },
  statusCircleActive: { backgroundColor: '#58A07F', borderColor: '#58A07F' },
  statusCheck: { color: '#FFF', fontSize: 21, fontWeight: '800', lineHeight: 24 },
  emptyState: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 80 },
  emptyIcon: { color: '#8EA18E', fontSize: 38 },
  emptyTitle: { color: '#405044', fontSize: 17, fontWeight: '800', marginTop: 14 },
  emptyDescription: { color: '#89948B', fontSize: 13, marginTop: 7, textAlign: 'center' },
});
