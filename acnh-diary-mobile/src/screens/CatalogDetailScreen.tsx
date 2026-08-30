import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { AppChrome, useScrollNavigationVisibility, useTabBarVisibility } from '@/components/AppChrome';
import { AppColors } from '@/constants/theme';
import { CollectionStatusIcon } from '@/components/CollectionStatusIcon';
import { FloatingTopButton } from '@/components/FloatingTopButton';
import {
  catalogCategories,
  getCatalogAssetForItem,
  getCatalogAssetForVariant,
  getCatalogFilterOptionLabel,
  getCatalogItem,
  getCatalogVariants,
} from '@/data/catalog';
import { villagers } from '@/data/villagers';
import {
  getActiveIsland,
  getCollectionQuantitiesForIsland,
  getCollectionStatesForIsland,
  initializeDatabase,
  setCollectionQuantity,
  setCatalogOwnedStatus,
  setCollectionStatus,
} from '@/db/database';
import type { CatalogCategory, CatalogCurrency, CatalogDetailValue, CatalogItem } from '@/types/catalog';
import type { EncyclopediaState } from '@/types/encyclopedia';

const EMPTY_STATE: EncyclopediaState = {
  caught: false,
  owned: false,
  donated: false,
  genuineOwned: false,
  fakeOwned: false,
};

type VariantCollectionState = { owned: boolean; quantity: number };

const detailLabels: Record<string, string> = {
  styles: '스타일',
  themes: '테마',
  colors: '색상',
  seasonality: '판매 시즌',
  series: '시리즈',
  tag: '분류 태그',
  size: '크기',
  stackSize: '묶음 수량',
  recipeCategory: '제작 분류',
  materials: '재료',
  diy: 'DIY 제작',
  interactable: '상호작용',
  outdoor: '야외 배치',
  orderable: '주문 가능',
  customizable: '리폼 가능',
  functions: '기능',
  lucky: '행운 아이템',
  version: '추가 버전',
  seasonEvent: '시즌·이벤트',
  eventExclusive: '이벤트 한정',
  recipeUnlocks: '해금 조건',
  recipeFilters: '레시피 분류',
};

function getCategoryLabel(category: CatalogCategory) {
  return catalogCategories.find((item) => item.key === category)?.label ?? category;
}

function formatPrice(value: number | null) {
  return value == null ? null : `${value.toLocaleString('ko-KR')}벨`;
}

function formatBuyPrice(item: CatalogItem) {
  if (item.notForSale) return '비매품';
  if (item.buyPrice == null) return '정보 없음';
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

function formatDetailValue(value: CatalogDetailValue, key?: string) {
  if (key === 'recipeFilters' && Array.isArray(value)) {
    return value.map((filter) => {
      const [prefix, rawValue] = filter.split(':');
      const facet = prefix === 'season' ? 'recipeSeason' : prefix === 'event' ? 'recipeEvent' : 'recipeMaterial';
      return getCatalogFilterOptionLabel(facet, rawValue ?? filter);
    }).join(', ');
  }
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? '예' : '아니오';
  if (typeof value === 'number') return value.toLocaleString('ko-KR');
  return value;
}

function detailLabel(key: string) {
  return detailLabels[key] ?? key;
}

export function CatalogDetailScreen({
  category,
  itemId,
}: {
  category: CatalogCategory;
  itemId: string;
}) {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { handleScroll, navigationVisible } = useScrollNavigationVisibility();
  useTabBarVisibility(navigationVisible);
  const item = getCatalogItem(category, itemId);
  const [state, setState] = useState<EncyclopediaState>(EMPTY_STATE);
  const [variantStates, setVariantStates] = useState<Record<string, VariantCollectionState>>({});
  const [islandId, setIslandId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    try {
      initializeDatabase();
      const island = getActiveIsland();
      setIslandId(island?.id ?? null);
      setState(item && island ? getCollectionStatesForIsland(island.id)[`${item.catalogType}/${item.id}`] ?? EMPTY_STATE : EMPTY_STATE);
      setVariantStates(item && island && category === 'furniture'
        ? Object.fromEntries(
            getCatalogVariants(item).map((variant) => {
              const key = `${category}/${item.id}::${variant.id}`;
              const variantState = getCollectionStatesForIsland(island.id)[key];
              const quantity = getCollectionQuantitiesForIsland(island.id)[key] ?? 0;
              return [variant.id, { owned: variantState?.owned ?? false, quantity }];
            }),
          )
        : {});
    } catch {
      Alert.alert('카탈로그 정보를 불러오지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  }, [category, item]);

  useFocusEffect(refresh);

  if (!item) {
    return (
      <View style={styles.screenRoot}>
        <AppChrome breadcrumbs={['카탈로그']} showBack title="항목 없음" />
        <SafeAreaView edges={[]} style={styles.safeArea}>
          <View style={styles.notFound}>
            <Text style={styles.notFoundTitle}>항목을 찾을 수 없어요</Text>
            <Pressable onPress={() => router.back()} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>목록으로 돌아가기</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const image = getCatalogAssetForItem(item);
  const variants = getCatalogVariants(item);

  const toggleVariantOwned = (variantId: string) => {
    if (!islandId) {
      Alert.alert('섬 정보가 필요해요', '먼저 섬 정보를 등록해 주세요.');
      return;
    }
    const key = `${category}/${item.id}::${variantId}`;
    const current = variantStates[variantId] ?? { owned: false, quantity: 0 };
    try {
      setCollectionStatus(islandId, category, `${item.id}::${variantId}`, 'owned', !current.owned);
      setVariantStates((states) => ({ ...states, [variantId]: { ...current, owned: !current.owned } }));
    } catch {
      Alert.alert('변형 보유 상태를 저장하지 못했어요', '변경 내용을 저장하는 중 문제가 발생했습니다.');
    }
  };

  const updateVariantQuantity = (variantId: string, amount: number) => {
    if (!islandId) {
      Alert.alert('섬 정보가 필요해요', '먼저 섬 정보를 등록해 주세요.');
      return;
    }
    const current = variantStates[variantId] ?? { owned: false, quantity: 0 };
    const quantity = Math.max(0, Math.min(999, current.quantity + amount));
    try {
      setCollectionQuantity(islandId, category, `${item.id}::${variantId}`, quantity);
      setVariantStates((states) => ({ ...states, [variantId]: { ...current, quantity } }));
    } catch {
      Alert.alert('변형 수량을 저장하지 못했어요', '수량은 0~999 사이의 정수만 사용할 수 있어요.');
    }
  };

  const updateOwned = () => {
    if (!islandId) {
      Alert.alert('섬 정보가 필요해요', '먼저 섬 정보를 등록해 주세요.');
      return;
    }
    const value = !state.owned;
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
      setState((current) => ({ ...current, owned: value }));
    } catch {
      Alert.alert('보유 상태를 저장하지 못했어요', '변경 내용을 저장하는 중 문제가 발생했습니다.');
    }
  };

  return (
    <View style={styles.screenRoot}>
      <AppChrome breadcrumbs={['카탈로그', getCategoryLabel(category)]} showBack title={item.nameKo} />
      <SafeAreaView edges={[]} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          onScroll={handleScroll}
          ref={scrollRef}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroImageFrame}>
            {image ? <Image resizeMode="contain" source={image} style={styles.heroImage} /> : <Text style={styles.imageFallback}>?</Text>}
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.itemName}>{item.nameKo}</Text>
            <Text style={styles.itemEnglish}>{item.nameEn}</Text>
            <Text style={styles.itemCategory}>{item.classification || getCategoryLabel(category)}</Text>
          </View>
        </View>

        <Pressable
          accessibilityLabel={`${item.nameKo} ${item.catalogType === 'reactions' ? '습득' : '보유'} ${state.owned ? '해제' : '설정'}`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: state.owned }}
          onPress={updateOwned}
          style={[styles.ownedPanel, state.owned && styles.ownedPanelActive]}>
          <CollectionStatusIcon active={state.owned} status="owned" />
          <View style={styles.ownedCopy}>
            <Text style={styles.panelEyebrow}>나의 수집 기록</Text>
            <Text style={styles.panelTitle}>{state.owned ? (item.catalogType === 'reactions' ? '습득함' : '보유 중') : (item.catalogType === 'reactions' ? '미습득' : '미보유')}</Text>
          </View>
          <Text style={styles.panelAction}>{state.owned ? '해제' : item.catalogType === 'reactions' ? '습득 체크' : '보유 체크'}</Text>
        </Pressable>

        <Section title="기본 정보">
          <InfoRow label="분류" value={item.classification || getCategoryLabel(category)} />
          <InfoRow label="획득 방법" value={item.source} />
          <InfoRow label="상세 조건" value={item.sourceNotes} />
          <InfoRow label="구매가" value={formatBuyPrice(item)} />
          <InfoRow label="판매가" value={formatPrice(item.sellPrice)} />
          <InfoRow label="시즌·이벤트" value={item.eventType} />
          <InfoRow label="추가 버전" value={item.date} />
        </Section>

        {Object.keys(item.details).length > 0 ? (
          <Section title="상세 정보">
            {Object.entries(item.details).map(([key, value]) => (
              <InfoRow key={key} label={detailLabel(key)} value={formatDetailValue(value, key)} />
            ))}
          </Section>
        ) : null}

        {item.variationCount > 0 ? (
          <Section title="변형 정보">
            {variants.length > 0 ? (
              <ScrollView contentContainerStyle={styles.variantList} horizontal showsHorizontalScrollIndicator={false}>
                {variants.map((variant) => (
                  <View key={`${variant.itemId}/${variant.id}`} style={styles.variantCard}>
                    <View style={styles.variantImageFrame}>
                      {getCatalogAssetForVariant(variant) ? (
                        <Image resizeMode="contain" source={getCatalogAssetForVariant(variant)} style={styles.variantImage} />
                      ) : null}
                    </View>
                    <Text numberOfLines={1} style={styles.variantLabel}>{variant.label || `변형 ${variant.id}`}</Text>
                    {category === 'furniture' ? (
                      <>
                        <Pressable
                          accessibilityLabel={`${variant.label || '변형'} 보유 ${variantStates[variant.id]?.owned ? '해제' : '설정'}`}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: variantStates[variant.id]?.owned ?? false }}
                          onPress={() => toggleVariantOwned(variant.id)}
                          style={[styles.variantOwnedButton, variantStates[variant.id]?.owned && styles.variantOwnedButtonActive]}>
                          <CollectionStatusIcon active={variantStates[variant.id]?.owned ?? false} status="owned" />
                          <Text style={styles.variantOwnedText}>{variantStates[variant.id]?.owned ? '보유' : '미보유'}</Text>
                        </Pressable>
                        <View style={styles.quantityRow}>
                          <Pressable accessibilityLabel="변형 수량 줄이기" disabled={!variantStates[variant.id]?.quantity} onPress={() => updateVariantQuantity(variant.id, -1)} style={styles.quantityButton}><Text style={styles.quantityButtonText}>−</Text></Pressable>
                          <Text style={styles.quantityText}>{variantStates[variant.id]?.quantity ?? 0}</Text>
                          <Pressable accessibilityLabel="변형 수량 늘리기" onPress={() => updateVariantQuantity(variant.id, 1)} style={styles.quantityButton}><Text style={styles.quantityButtonText}>＋</Text></Pressable>
                        </View>
                      </>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </Section>
        ) : null}
        </ScrollView>
        <FloatingTopButton
          accessibilityLabel="카탈로그 상세 맨 위로 이동"
          onPress={() => scrollRef.current?.scrollTo({ animated: true, y: 0 })}
        />
      </SafeAreaView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  safeArea: { backgroundColor: AppColors.background, flex: 1 },
  content: { padding: 18, paddingBottom: 40 },
  headerRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 20 },
  backButton: { alignItems: 'center', backgroundColor: AppColors.primarySurface, borderRadius: 20, height: 40, justifyContent: 'center', marginRight: 12, width: 40 },
  backButtonText: { color: AppColors.primaryText, fontSize: 30, lineHeight: 32, marginTop: -3 },
  headerCopy: { flex: 1 },
  kicker: { color: AppColors.primaryText, fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  headerTitle: { color: AppColors.primaryText, fontSize: 28, fontWeight: '800', marginTop: 3 },
  number: { color: '#6E806F', fontSize: 14, fontWeight: '800' },
  heroCard: { alignItems: 'center', backgroundColor: '#FFF', borderColor: '#E2E8DF', borderRadius: 20, borderWidth: 1, flexDirection: 'row', padding: 14 },
  heroImageFrame: { alignItems: 'center', backgroundColor: '#F5F8F2', borderRadius: 14, height: 132, justifyContent: 'center', marginRight: 16, width: 132 },
  heroImage: { height: 118, width: 118 },
  imageFallback: { color: '#A0AAA0', fontSize: 28, fontWeight: '800' },
  heroCopy: { flex: 1 },
  itemName: { color: AppColors.primaryText, fontSize: 21, fontWeight: '800', lineHeight: 28 },
  itemEnglish: { color: '#8B978D', fontSize: 12, marginTop: 4 },
  itemCategory: { color: AppColors.primaryText, fontSize: 12, fontWeight: '800', marginTop: 12 },
  ownedPanel: { alignItems: 'center', backgroundColor: AppColors.primarySurface, borderColor: AppColors.primaryBorder, borderRadius: 16, borderWidth: 1, flexDirection: 'row', marginTop: 14, paddingHorizontal: 16, paddingVertical: 13 },
  ownedPanelActive: { backgroundColor: AppColors.primarySoft, borderColor: AppColors.primaryBorder },
  ownedCopy: { flex: 1, marginLeft: 12 },
  panelEyebrow: { color: '#718275', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  panelTitle: { color: AppColors.primaryText, fontSize: 16, fontWeight: '800', marginTop: 3 },
  panelAction: { color: AppColors.primaryText, fontSize: 11, fontWeight: '800' },
  section: { marginTop: 20 },
  sectionTitle: { color: AppColors.primaryText, fontSize: 15, fontWeight: '800', marginBottom: 8 },
  sectionCard: { backgroundColor: '#FFF', borderColor: '#E2E8DF', borderRadius: 16, borderWidth: 1, paddingHorizontal: 14 },
  infoRow: { alignItems: 'flex-start', borderBottomColor: '#EDF1EB', borderBottomWidth: 1, flexDirection: 'row', paddingVertical: 12 },
  infoLabel: { color: '#89958B', fontSize: 12, width: 92 },
  infoValue: { color: AppColors.primaryText, flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 18, textAlign: 'right' },
  variantList: { gap: 8, paddingBottom: 14, paddingTop: 12 },
  variantCard: { alignItems: 'center', backgroundColor: '#F5F8F2', borderRadius: 12, padding: 6, width: 118 },
  variantImageFrame: { alignItems: 'center', height: 58, justifyContent: 'center', width: 106 },
  variantImage: { height: 56, width: 64 },
  variantLabel: { color: '#637365', fontSize: 9, fontWeight: '700', marginTop: 4 },
  variantOwnedButton: { alignItems: 'center', backgroundColor: AppColors.primarySurface, borderRadius: 8, flexDirection: 'row', marginTop: 6, paddingHorizontal: 6, paddingVertical: 4 },
  variantOwnedButtonActive: { backgroundColor: AppColors.primarySoft },
  variantOwnedText: { color: AppColors.primaryText, fontSize: 9, fontWeight: '800', marginLeft: 4 },
  quantityRow: { alignItems: 'center', flexDirection: 'row', marginTop: 5 },
  quantityButton: { alignItems: 'center', backgroundColor: AppColors.primarySurface, borderRadius: 7, height: 22, justifyContent: 'center', width: 22 },
  quantityButtonText: { color: AppColors.primaryText, fontSize: 15, fontWeight: '800', lineHeight: 17 },
  quantityText: { color: AppColors.primaryText, fontSize: 10, fontWeight: '800', minWidth: 24, textAlign: 'center' },
  notFound: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  notFoundTitle: { color: AppColors.primaryText, fontSize: 18, fontWeight: '800', marginBottom: 14 },
  primaryButton: { backgroundColor: AppColors.primaryAction, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  primaryButtonText: { color: AppColors.primaryText, fontSize: 13, fontWeight: '800' },
});
