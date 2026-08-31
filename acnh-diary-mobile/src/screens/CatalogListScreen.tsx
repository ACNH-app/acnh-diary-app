import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppChrome, useScrollNavigationVisibility, useTabBarVisibility } from '@/components/AppChrome';
import { AppColors } from '@/constants/theme';
import { FloatingTopButton } from '@/components/FloatingTopButton';
import {
  ListFilterChip,
  ListFilterGroup,
  ListFilterPanel,
  ListFilterToggle,
  ListResultToolbar,
  ListSearchRow,
} from '@/components/ListControls';
import { SearchBar } from '@/components/SearchBar';
import { UnderlineTabs } from '@/components/UnderlineTabs';
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
  setCatalogOwnedStatusForItems,
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

function getLinkedVillagerForCatalogItem(item: CatalogItem) {
  if (item.catalogType !== 'photos') return undefined;
  const villager = villagers.find((candidate) =>
    candidate.collectibles.framed_photo.item_id === item.id || candidate.collectibles.poster.item_id === item.id,
  );
  if (!villager) return undefined;
  return {
    id: villager.id,
    status: villager.collectibles.framed_photo.item_id === item.id ? 'photoReceived' : 'posterOwned',
  } as const;
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
      const linkedVillager = getLinkedVillagerForCatalogItem(item);
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

  const applyBulkOwned = (value: boolean) => {
    if (!islandId) {
      Alert.alert('섬 정보가 필요해요', '먼저 섬 정보를 등록해 주세요.');
      return;
    }
    try {
      const itemsByType = new Map<CatalogCategory, Array<{ id: string; linkedVillager?: ReturnType<typeof getLinkedVillagerForCatalogItem> }>>();
      for (const item of visibleItems) {
        const group = itemsByType.get(item.catalogType) ?? [];
        group.push({ id: item.id, linkedVillager: getLinkedVillagerForCatalogItem(item) });
        itemsByType.set(item.catalogType, group);
      }
      for (const [itemType, itemGroup] of itemsByType) {
        setCatalogOwnedStatusForItems(islandId, itemType, itemGroup, value);
      }
      setStates((current) => {
        const next = { ...current };
        for (const item of visibleItems) {
          next[`${item.catalogType}/${item.id}`] = {
            ...getState(current, item),
            owned: value,
          };
        }
        return next;
      });
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
              <UnderlineTabs
                accessibilityLabel={(tab) => `${tab.label} 소분류 선택`}
                onChange={selectSubcategory}
                tabs={subcategories.map(({ key, label }) => ({ key, label }))}
                value={activeSubcategory}
              />
            ) : null}

            <ListSearchRow>
              <SearchBar
                accessibilityLabel={`${catalogCategoryLabels[activeCategory]} 검색`}
                onChangeText={setSearch}
                onClear={() => setSearch('')}
                placeholder="이름, 분류, 획득 방법으로 검색"
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
                <ListFilterGroup title="보유 상태">
                  {([
                    ['owned', '보유'],
                    ['unowned', '미보유'],
                  ] as Array<[OwnershipFilter, string]>).map(([filter, label]) => (
                    <ListFilterChip
                      key={filter}
                      label={label}
                      onPress={() => setOwnershipFilter((current) => (current === filter ? null : filter))}
                      selected={ownershipFilter === filter}
                    />
                  ))}
                </ListFilterGroup>

                {(activeCategory === 'furniture' || activeCategory === 'interior' || activeCategory === 'clothing') ? (
                  <ListFilterGroup title="판매 여부">
                    {([
                      ['forSale', '판매 가능'],
                      ['notForSale', '비매품'],
                    ] as Array<[AvailabilityFilter, string]>).map(([filter, label]) => (
                      <ListFilterChip
                        key={filter}
                        label={label}
                        onPress={() => setAvailabilityFilter((current) => (current === filter ? null : filter))}
                        selected={availabilityFilter === filter}
                      />
                    ))}
                  </ListFilterGroup>
                ) : null}

                {catalogFilterFacets.map((facet) => {
                  const options = filterOptions[facet];
                  if (options.length === 0) return null;
                  return (
                    <ListFilterGroup key={facet} title={catalogFilterFacetLabels[facet]}>
                      {options.map((option) => {
                        const selected = facetFilters[facet].includes(option.key);
                        return (
                          <ListFilterChip
                            accessibilityLabel={`${option.label} ${catalogFilterFacetLabels[facet]} 필터`}
                            key={option.key}
                            label={`${option.label} ${option.itemCount}`}
                            onPress={() => toggleFacetFilter(facet, option.key)}
                            selected={selected}
                          />
                        );
                      })}
                    </ListFilterGroup>
                  );
                })}
              </ListFilterPanel>
            ) : null}

            <ListResultToolbar
              actions={(() => {
                const ownedActive = visibleItems.length > 0 && visibleItems.every((item) => getState(states, item).owned);
                return [
                  {
                    key: 'owned',
                    label: ownedActive ? '보유 해제' : '전체 보유',
                    disabled: visibleItems.length === 0,
                    onPress: () => applyBulkOwned(!ownedActive),
                  },
                ];
              })()}
              descending={sortDescending}
              isFiltered={isFiltered}
              onReset={clearFilters}
              onSortChange={setSortMode}
              onToggleDirection={() => setSortDescending((value) => !value)}
              resultCount={visibleItems.length}
              sortOptions={(Object.entries(sortLabels) as Array<[SortMode, string]>).map(([key, label]) => ({ key, label }))}
              sortValue={sortMode}
              totalCount={subcategoryItems.length}
            />
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
  safeArea: { backgroundColor: AppColors.background, flex: 1 },
  listContent: { paddingBottom: 8, paddingHorizontal: 18 },
  columnWrapper: { gap: 10 },
  searchBar: { flex: 1, minWidth: 0 },
  itemCard: { alignItems: 'flex-start', backgroundColor: '#FFF', borderColor: '#E7ECE5', borderRadius: 22, borderWidth: 1, flex: 1, flexDirection: 'row', marginBottom: 14, minHeight: 178, minWidth: 0, overflow: 'hidden', padding: 14 },
  cardMain: { alignItems: 'flex-start', flex: 1, flexDirection: 'row', minWidth: 0 },
  imageFrame: { alignItems: 'center', backgroundColor: '#F5F8F2', borderRadius: 18, height: 126, justifyContent: 'center', marginRight: 14, width: 126 },
  cardImage: { height: 116, width: 116 },
  imageFallback: { color: '#A0AAA0', fontSize: 22, fontWeight: '800' },
  cardCopy: { flex: 1, minWidth: 0, paddingTop: 1 },
  itemName: { color: AppColors.primaryText, fontSize: 18, fontWeight: '800', lineHeight: 23, marginTop: 4 },
  itemClassification: { color: AppColors.primaryText, fontSize: 11, fontWeight: '800' },
  acquisitionRow: { alignItems: 'flex-start', flexDirection: 'row', marginTop: 11, minWidth: 0 },
  tagRow: { alignItems: 'flex-start', flexDirection: 'row', marginTop: 5, minWidth: 0 },
  detailLabel: { color: '#7D8B82', flexShrink: 0, fontSize: 11, fontWeight: '700', lineHeight: 16, marginRight: 8, width: 52 },
  tagText: { color: '#75877B', flex: 1, fontSize: 10, fontWeight: '700', lineHeight: 15 },
  acquisitionDetails: { flex: 1, minWidth: 0 },
  acquisitionText: { color: AppColors.primaryText, fontSize: 11, fontWeight: '700', lineHeight: 16 },
  itemMaterials: { color: '#9B8060', fontSize: 10, lineHeight: 14, marginTop: 4 },
  nonSaleChip: { alignSelf: 'flex-start', backgroundColor: '#FCE9E2', borderRadius: 14, marginTop: 6, paddingHorizontal: 10, paddingVertical: 7 },
  nonSaleText: { color: '#E47E69', fontSize: 11, fontWeight: '800' },
  statusButton: { alignItems: 'center', justifyContent: 'flex-start', marginLeft: 7, paddingTop: 2, width: 36 },
  statusText: { color: '#89958D', fontSize: 9, fontWeight: '800', marginBottom: 4 },
  statusTextActive: { color: AppColors.primaryText },
  statusCircle: { alignItems: 'center', borderColor: '#B8C7BE', borderRadius: 16, borderWidth: 2, height: 32, justifyContent: 'center', width: 32 },
  statusCircleActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
  statusCheck: { color: AppColors.primaryText, fontSize: 21, fontWeight: '800', lineHeight: 24 },
  emptyState: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 80 },
  emptyIcon: { color: '#8EA18E', fontSize: 38 },
  emptyTitle: { color: AppColors.primaryText, fontSize: 17, fontWeight: '800', marginTop: 14 },
  emptyDescription: { color: '#89948B', fontSize: 13, marginTop: 7, textAlign: 'center' },
});
