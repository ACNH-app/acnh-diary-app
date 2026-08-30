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
import { getEncyclopediaAsset } from '@/data/encyclopedia-assets';
import { getEncyclopediaDetailAsset } from '@/data/encyclopedia-detail-assets';
import { getEncyclopediaItem, getEncyclopediaLabel } from '@/data/encyclopedia';
import {
  localizeArtAvailability,
  localizeArtName,
  localizeArtStyle,
  localizeArtType,
  localizeArtYear,
  localizeAuthor,
  localizeAvailabilityLabel,
  localizeAvailabilityTime,
  localizeCondition,
  localizeFossilGroup,
  localizeLocation,
  localizeMovementSpeed,
  localizeRarity,
  localizeShadow,
} from '@/data/encyclopedia-labels';
import {
  getActiveIsland,
  getCollectionStatesForIsland,
  initializeDatabase,
  setCollectionStatus,
} from '@/db/database';
import type {
  EncyclopediaCategory,
  EncyclopediaItem,
  EncyclopediaState,
  EncyclopediaStatus,
} from '@/types/encyclopedia';

const EMPTY_STATE: EncyclopediaState = {
  caught: false,
  owned: false,
  donated: false,
  genuineOwned: false,
  fakeOwned: false,
};

const categoryAccent: Record<EncyclopediaCategory, string> = {
  bugs: '#C47543',
  fish: '#3A7C9B',
  sea: '#397E83',
  fossils: '#8A6849',
  art: '#9A6073',
};

function isCreature(category: EncyclopediaCategory) {
  return category === 'bugs' || category === 'fish' || category === 'sea';
}

function formatPrice(value: number | null) {
  return value == null ? null : `${value.toLocaleString('ko-KR')}벨`;
}

function formatDimension(value: number | null) {
  return value == null ? null : `${value}칸`;
}

function statusLabel(status: EncyclopediaStatus) {
  if (status === 'caught') return '채집';
  if (status === 'owned') return '보유';
  if (status === 'donated') return '기증';
  return status === 'genuineOwned' ? '진품 보유' : '가품 보유';
}

function getAvailability(item: EncyclopediaItem, hemisphere: 'north' | 'south') {
  return item.availability[hemisphere];
}

export function EncyclopediaDetailScreen({
  category,
  itemId,
}: {
  category: EncyclopediaCategory;
  itemId: string;
}) {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { handleScroll, navigationVisible } = useScrollNavigationVisibility();
  useTabBarVisibility(navigationVisible);
  const [state, setState] = useState<EncyclopediaState>(EMPTY_STATE);
  const [islandId, setIslandId] = useState<string | null>(null);
  const [hemisphere, setHemisphere] = useState<'north' | 'south'>('north');
  const item = getEncyclopediaItem(category, itemId);
  const month = new Date().getMonth() + 1;

  const refresh = useCallback(() => {
    try {
      initializeDatabase();
      const island = getActiveIsland();
      setIslandId(island?.id ?? null);
      setHemisphere(island?.hemisphere ?? 'north');
      const states = island ? getCollectionStatesForIsland(island.id) : {};
      setState(item ? states[`${category}/${item.id}`] ?? EMPTY_STATE : EMPTY_STATE);
    } catch {
      Alert.alert('도감 정보를 불러오지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  }, [category, item]);

  useFocusEffect(refresh);

  if (!item) {
    return (
      <View style={styles.screenRoot}>
        <AppChrome breadcrumbs={['도감']} showBack title="항목 없음" />
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

  const image = getEncyclopediaAsset(category, item.id);
  const accent = categoryAccent[category];
  const creature = isCreature(category);
  const availability = getAvailability(item, hemisphere);

  const updateStatus = (status: EncyclopediaStatus) => {
    if (!islandId) {
      Alert.alert('섬 정보가 필요해요', '먼저 섬 정보를 등록해 주세요.');
      return;
    }

    const value = !state[status];
    try {
      setCollectionStatus(islandId, category, item.id, status, value);
      setState((current) => ({ ...current, [status]: value }));
    } catch {
      Alert.alert('상태를 저장하지 못했어요', '변경 내용을 저장하는 중 문제가 발생했습니다.');
    }
  };

  const statuses: EncyclopediaStatus[] = creature
    ? ['caught', 'donated']
    : category === 'fossils'
      ? ['owned', 'donated']
      : ['genuineOwned', 'fakeOwned', 'donated'];

  return (
    <View style={styles.screenRoot}>
      <AppChrome breadcrumbs={['도감', getEncyclopediaLabel(category)]} showBack title={item.nameKo} />
      <SafeAreaView edges={[]} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          onScroll={handleScroll}
          ref={scrollRef}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { borderTopColor: accent }]}>
          <View style={styles.heroImageFrame}>
            {image ? <Image resizeMode="contain" source={image} style={styles.heroImage} /> : <Text style={styles.imageFallback}>?</Text>}
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.itemName}>{item.nameKo}</Text>
            <Text style={styles.itemCategory}>{getEncyclopediaLabel(category)}</Text>
          </View>
        </View>

        <View style={styles.statusPanel}>
          <Text style={styles.panelEyebrow}>나의 수집 기록</Text>
          <Text style={styles.panelTitle}>나의 기록</Text>
          <View style={styles.statusGrid}>
            {statuses.map((status) => {
              const active = state[status];
              return (
                <Pressable
                  accessibilityLabel={`${item.nameKo} ${statusLabel(status)} ${active ? '해제' : '설정'}`}
                  accessibilityRole="button"
                  key={status}
                  onPress={() => updateStatus(status)}
                  style={[styles.statusCard, active && { backgroundColor: `${accent}18`, borderColor: accent }]}>
                  <CollectionStatusIcon active={active} status={status} />
                  <Text style={styles.statusText}>{statusLabel(status)}</Text>
                  <Text style={[styles.statusValue, active && { color: accent }]}>{active ? '기록됨' : '미기록'}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {creature ? (
          <>
            <Section title="출현 정보">
              <InfoRow label="출현 월" value={localizeAvailabilityLabel(availability.label) ?? '정보 없음'} />
              <InfoRow label="이번 달 시간" value={localizeAvailabilityTime(availability.timesByMonth[String(month)]) ?? '정보 없음'} />
              <InfoRow label="출현 장소" value={localizeLocation(item.location) ?? '정보 없음'} />
              <InfoRow label="출현 조건" value={localizeCondition(item.condition) ?? '제한 없음'} />
              <InfoRow label="출현 빈도" value={localizeRarity(item.rarity) || '정보 없음'} />
            </Section>
            <Section title="거래·크기 정보">
              <InfoRow label={item.prices.primaryLabel ?? '판매가'} value={formatPrice(item.prices.primary) ?? '정보 없음'} />
              <InfoRow label={item.prices.specialLabel ?? '특수 가격'} value={formatPrice(item.prices.special) ?? '정보 없음'} />
              <InfoRow label="그림자 크기" value={localizeShadow(item.shadow) ?? '해당 없음'} />
              {item.movementSpeed ? <InfoRow label="이동 속도" value={localizeMovementSpeed(item.movementSpeed) ?? item.movementSpeed} /> : null}
              <InfoRow label="수조 크기" value={formatTank(item.tank.width, item.tank.length)} />
              <TankPreview image={getEncyclopediaDetailAsset(category, item.id, 'tank')} />
            </Section>
          </>
        ) : category === 'fossils' ? (
          <Section title="화석 정보">
            <InfoRow label="화석 그룹" value={localizeFossilGroup(item.fossilGroup) || '단품'} />
            <InfoRow label="판매가" value={formatPrice(item.prices.primary) ?? '정보 없음'} />
            <InfoRow label="크기" value={formatTank(item.size?.width ?? null, item.size?.length ?? null)} />
            <View style={styles.chipRow}>
              <Text style={styles.infoLabel}>상호작용</Text>
              <Text style={[styles.infoChip, item.interactable && styles.infoChipActive]}>
                {item.interactable ? '가능' : '불가능'}
              </Text>
            </View>
          </Section>
        ) : (
          <ArtDetail item={item} />
        )}

        {item.catchphrase ? (
          <Section title="캐치프레이즈">
            <Text style={styles.quote}>“{item.catchphrase}”</Text>
          </Section>
        ) : null}
        {item.museumPhrase ? (
          <Section title="박물관 설명">
            <Text style={styles.museumText}>{item.museumPhrase}</Text>
          </Section>
        ) : null}
        </ScrollView>
        <FloatingTopButton
          accessibilityLabel="도감 상세 맨 위로 이동"
          onPress={() => scrollRef.current?.scrollTo({ animated: true, y: 0 })}
        />
      </SafeAreaView>
    </View>
  );
}

function ArtDetail({ item }: { item: EncyclopediaItem }) {
  const artwork = item.artwork;
  if (!artwork) return null;
  const realImage = getEncyclopediaDetailAsset('art', item.id, 'real');
  const fakeImage = artwork.hasFake ? getEncyclopediaDetailAsset('art', item.id, 'fake') : undefined;

  return (
    <Section title="미술품 정보">
      <InfoRow label="종류" value={localizeArtType(artwork.type) ?? '정보 없음'} />
      <InfoRow label="작품명" value={localizeArtName(artwork.artName) ?? '정보 없음'} />
      <InfoRow label="화풍·재료" value={localizeArtStyle(artwork.style) ?? '정보 없음'} />
      <InfoRow label="작가" value={localizeAuthor(artwork.author) ?? '정보 없음'} />
      <InfoRow label="제작 연도" value={localizeArtYear(artwork.year) ?? '정보 없음'} />
      <InfoRow label="획득 방법" value={localizeArtAvailability(artwork.availability) ?? '정보 없음'} />
      <InfoRow label="구매가" value={formatPrice(item.prices.primary) ?? '정보 없음'} />
      <InfoRow label="판매가" value={formatPrice(item.prices.special) ?? '정보 없음'} />
      <InfoRow label="크기" value={formatTank(artwork.width, artwork.length)} />
      <InfoRow label="가품 존재" value={artwork.hasFake ? '있음' : '없음'} />
      <View style={styles.artImageRow}>
        {realImage ? (
          <View style={styles.artImageColumn}>
            <Text style={styles.descriptionLabel}>진품 이미지</Text>
            <Image resizeMode="contain" source={realImage} style={styles.artImage} />
          </View>
        ) : null}
        {fakeImage ? (
          <View style={styles.artImageColumn}>
            <Text style={styles.descriptionLabel}>가품 이미지</Text>
            <Image resizeMode="contain" source={fakeImage} style={styles.artImage} />
          </View>
        ) : null}
      </View>
      <View style={styles.artDescription}>
        <Text style={styles.descriptionLabel}>진품 설명</Text>
        <Text style={styles.descriptionText}>{artwork.realDescription ?? '설명 없음'}</Text>
      </View>
      {artwork.fakeDescription ? (
        <View style={styles.artDescription}>
          <Text style={styles.descriptionLabel}>가품 구별 정보</Text>
          <Text style={styles.descriptionText}>{artwork.fakeDescription}</Text>
        </View>
      ) : null}
    </Section>
  );
}

function TankPreview({ image }: { image: ReturnType<typeof getEncyclopediaDetailAsset> }) {
  if (!image) return null;
  return (
    <View style={styles.tankPreview}>
      <Text style={styles.descriptionLabel}>수조 전시 이미지</Text>
      <Image resizeMode="contain" source={image} style={styles.tankImage} />
    </View>
  );
}

function formatTank(width: number | null, length: number | null) {
  const formattedWidth = formatDimension(width);
  const formattedLength = formatDimension(length);
  if (!formattedWidth && !formattedLength) return '정보 없음';
  return `${formattedWidth ?? '-'} × ${formattedLength ?? '-'} (가로 × 세로)`;
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
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
  headerRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 18 },
  backButton: { alignItems: 'center', backgroundColor: AppColors.primarySurface, borderRadius: 20, height: 40, justifyContent: 'center', marginRight: 12, width: 40 },
  backButtonText: { color: AppColors.primaryText, fontSize: 30, lineHeight: 32, marginTop: -3 },
  headerCopy: { flex: 1 },
  kicker: { color: AppColors.primaryText, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  headerTitle: { color: AppColors.primaryText, fontSize: 25, fontWeight: '800', marginTop: 3 },
  number: { color: '#66816A', fontSize: 14, fontWeight: '800' },
  heroCard: { alignItems: 'center', backgroundColor: '#FFF', borderRadius: 24, borderTopWidth: 4, flexDirection: 'row', marginBottom: 14, padding: 18 },
  heroImageFrame: { alignItems: 'center', backgroundColor: '#F1F5EE', borderRadius: 20, height: 128, justifyContent: 'center', marginRight: 18, width: 128 },
  heroImage: { height: 112, width: 112 },
  imageFallback: { color: '#809080', fontSize: 36, fontWeight: '800' },
  heroCopy: { flex: 1 },
  itemName: { color: AppColors.primaryText, fontSize: 25, fontWeight: '800', lineHeight: 31 },
  itemCategory: { color: AppColors.primaryText, fontSize: 12, fontWeight: '700', marginTop: 18 },
  statusPanel: { backgroundColor: AppColors.primarySoft, borderRadius: 22, marginBottom: 14, padding: 18 },
  panelEyebrow: { color: AppColors.primaryText, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  panelTitle: { color: AppColors.primaryText, fontSize: 18, fontWeight: '800', marginTop: 4 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  statusCard: { alignItems: 'center', backgroundColor: AppColors.primarySurface, borderColor: AppColors.primaryBorder, borderRadius: 15, borderWidth: 1, minWidth: '30%', paddingHorizontal: 8, paddingVertical: 10 },
  statusText: { color: AppColors.primaryText, fontSize: 11, fontWeight: '700', marginTop: 3 },
  statusValue: { color: '#8B978C', fontSize: 10, marginTop: 3 },
  monthBanner: { alignItems: 'center', backgroundColor: AppColors.primarySoft, borderRadius: 22, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, padding: 18 },
  monthBannerCopy: { flex: 1 },
  monthStatus: { color: AppColors.primaryText, fontSize: 18, fontWeight: '800', marginTop: 5 },
  monthDetail: { color: AppColors.primaryText, fontSize: 12, marginTop: 5 },
  newBadge: { backgroundColor: '#DCEEF2', borderRadius: 14, color: AppColors.primaryText, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 7 },
  section: { backgroundColor: '#FFF', borderColor: '#E4E9E0', borderRadius: 20, borderWidth: 1, marginBottom: 14, padding: 18 },
  sectionTitle: { color: AppColors.primaryText, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  sectionBody: { gap: 0 },
  infoRow: { alignItems: 'flex-start', borderBottomColor: '#EDF1EB', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  infoLabel: { color: '#819087', fontSize: 12, paddingRight: 14 },
  infoValue: { color: AppColors.primaryText, flex: 1, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  chipRow: { alignItems: 'center', borderBottomColor: '#EDF1EB', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  infoChip: { backgroundColor: '#F0F2EF', borderRadius: 12, color: '#78847B', fontSize: 11, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  infoChipActive: { backgroundColor: AppColors.primarySurface, color: AppColors.primaryText },
  quote: { color: AppColors.primaryText, fontSize: 14, fontStyle: 'italic', lineHeight: 23 },
  museumText: { color: '#617066', fontSize: 13, lineHeight: 21 },
  artDescription: { borderTopColor: '#EDF1EB', borderTopWidth: 1, marginTop: 8, paddingTop: 12 },
  tankPreview: { borderBottomColor: '#EDF1EB', borderBottomWidth: 1, marginBottom: 4, paddingBottom: 12, paddingTop: 12 },
  tankImage: { alignSelf: 'center', backgroundColor: '#F5F7F3', borderRadius: 14, height: 150, marginTop: 8, width: '100%' },
  artImageRow: { borderBottomColor: '#EDF1EB', borderBottomWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 4, paddingBottom: 12, paddingTop: 12 },
  artImageColumn: { flex: 1 },
  artImage: { backgroundColor: '#F5F7F3', borderRadius: 12, height: 126, marginTop: 7, width: '100%' },
  descriptionLabel: { color: '#819087', fontSize: 12, fontWeight: '700' },
  descriptionText: { color: '#617066', fontSize: 13, lineHeight: 21, marginTop: 5 },
  notFound: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  notFoundTitle: { color: AppColors.primaryText, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  primaryButton: { backgroundColor: AppColors.primaryAction, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13 },
  primaryButtonText: { color: AppColors.primaryText, fontSize: 13, fontWeight: '800' },
});
