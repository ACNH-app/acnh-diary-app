import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, NativeScrollEvent, NativeSyntheticEvent, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppTopBar } from '@/components/AppTopBar';
import { getActiveIsland } from '@/db/database';
import type { Island } from '@/types/island';

function getTopBarEyebrow(title: string) {
  if (title === '오늘') return 'TODAY ON';
  if (title === '주민') return 'ISLAND RESIDENTS';
  if (title === '도감') return 'MUSEUM NOTES';
  if (title === '카탈로그') return 'ISLAND CATALOG';
  if (title === '공략') return 'GUIDES';
  if (title === '섬 관리') return 'ISLAND MANAGEMENT';
  return undefined;
}

export function useScrollNavigationVisibility() {
  const [navigationVisible, setNavigationVisible] = useState(true);
  const lastScrollOffset = useRef(0);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = Math.max(0, event.nativeEvent.contentOffset.y);
    const delta = offset - lastScrollOffset.current;
    lastScrollOffset.current = offset;

    if (offset <= 8) {
      setNavigationVisible(true);
    } else if (delta > 8) {
      setNavigationVisible(false);
    } else if (delta < -8) {
      setNavigationVisible(true);
    }
  }, []);

  return { handleScroll, navigationVisible };
}

export function useTabBarVisibility(navigationVisible: boolean) {
  const navigation = useNavigation();

  useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return;

    parent.setOptions({
      // Remove the tab bar from layout while hidden so list content can fill the viewport.
      tabBarStyle: navigationVisible ? undefined : { display: 'none' },
    });

    return () => {
      parent.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation, navigationVisible]);
}

type AppChromeProps = {
  title: string;
  breadcrumbs?: string[];
  showBack?: boolean;
  showMenu?: boolean;
  onBack?: () => void;
};

export function AppChrome({ title, breadcrumbs, showBack, showMenu = true, onBack }: AppChromeProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.84, 360);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [island, setIsland] = useState<Island | null>(null);
  const drawerTranslateX = useRef(new Animated.Value(drawerWidth)).current;

  const openDrawer = () => {
    setIsland(getActiveIsland());
    drawerTranslateX.stopAnimation();
    drawerTranslateX.setValue(drawerWidth);
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    drawerTranslateX.stopAnimation();
    drawerTranslateX.setValue(drawerWidth);
    setDrawerVisible(false);
  };

  useEffect(() => {
    if (!drawerVisible) return;

    const animationFrame = requestAnimationFrame(() => {
      Animated.timing(drawerTranslateX, {
        duration: 220,
        toValue: 0,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      cancelAnimationFrame(animationFrame);
      drawerTranslateX.stopAnimation();
    };
  }, [drawerTranslateX, drawerVisible]);

  return (
    <>
      <AppTopBar
        breadcrumbs={breadcrumbs}
        eyebrow={getTopBarEyebrow(title)}
        onBack={onBack ?? (() => router.back())}
        onMenuPress={openDrawer}
        showBack={showBack}
        showMenu={showMenu}
        title={title}
      />

      <Modal animationType="none" onRequestClose={closeDrawer} presentationStyle="overFullScreen" transparent visible={drawerVisible}>
        <View style={styles.modalBackdrop}>
          <Pressable onPress={closeDrawer} style={styles.backdropPressable} />
          <Animated.View
            style={[
              styles.drawer,
              {
                paddingBottom: insets.bottom + 21,
                paddingTop: insets.top + 21,
                transform: [{ translateX: drawerTranslateX }],
                width: drawerWidth,
              },
            ]}>
            <View style={styles.drawerContent}>
                <View style={styles.drawerHeader}>
                  <Text style={styles.drawerKicker}>ISLAND PASSPORT</Text>
                  <Pressable
                    accessibilityLabel="메뉴 닫기"
                    accessibilityRole="button"
                    hitSlop={12}
                    onPress={closeDrawer}
                    style={styles.closeButton}>
                    <Text style={styles.closeText}>×</Text>
                  </Pressable>
                </View>
                <Text style={styles.drawerTitle}>{island?.name ?? '섬 정보 없음'}</Text>
                <View style={styles.passportCard}>
                  <Text style={styles.passportLabel}>주민대표</Text>
                  <Text style={styles.passportValue}>{island?.playerName ?? '미입력'}</Text>
                  <Text style={styles.passportLabel}>섬 정보</Text>
                  <Text style={styles.passportValue}>
                    {island ? `${island.hemisphere === 'south' ? '남반구' : '북반구'} · ${island.fruit ?? '과일 미입력'} · ${island.flower ?? '꽃 미입력'}` : '등록된 섬이 없습니다.'}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="섬 정보 관리"
                  onPress={() => {
                    closeDrawer();
                    router.push('/islands');
                  }}
                  style={styles.drawerAction}>
                  <Text style={styles.drawerActionText}>섬 추가·변경·수정·삭제</Text>
                  <Text style={styles.rowArrow}>›</Text>
                </Pressable>
                <View style={styles.drawerAction}>
                  <Text style={styles.drawerMuted}>날씨 데이터 추가</Text>
                  <Text style={styles.drawerBadge}>MVP 제외</Text>
                </View>
                <View style={styles.drawerAction}>
                  <Text style={styles.drawerMuted}>데이터 출처 및 라이선스</Text>
                  <Text style={styles.rowArrow}>›</Text>
                </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1 },
  backdropPressable: { backgroundColor: 'rgba(20, 38, 25, 0.35)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, zIndex: 0 },
  drawer: { backgroundColor: '#F7F8F2', borderBottomLeftRadius: 28, borderTopLeftRadius: 28, bottom: 0, elevation: 12, overflow: 'hidden', position: 'absolute', right: 0, shadowColor: '#1D3826', shadowOffset: { height: 0, width: -4 }, shadowOpacity: 0.18, shadowRadius: 12, top: 0, zIndex: 1 },
  drawerContent: { flex: 1, paddingHorizontal: 21 },
  drawerHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  drawerKicker: { color: '#799078', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  closeButton: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  closeText: { color: '#526554', fontSize: 28 },
  drawerTitle: { color: '#2F4433', fontSize: 27, fontWeight: '800', marginTop: 9 },
  passportCard: { backgroundColor: '#31573D', borderRadius: 19, marginTop: 17, padding: 17 },
  passportLabel: { color: '#B8D2AF', fontSize: 10, marginTop: 7 },
  passportValue: { color: '#FFF', fontSize: 14, fontWeight: '800', marginTop: 3 },
  drawerAction: { alignItems: 'center', backgroundColor: '#FFF', borderBottomColor: '#EDF1EB', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 57, paddingHorizontal: 14 },
  drawerActionText: { color: '#47684C', fontSize: 12, fontWeight: '800' },
  drawerMuted: { color: '#728174', fontSize: 12, fontWeight: '700' },
  drawerBadge: { backgroundColor: '#F0E9D9', borderRadius: 9, color: '#9B795B', fontSize: 9, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 5 },
  rowArrow: { color: '#8BA08D', fontSize: 21 },
});
