import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/theme';

type AppTopBarProps = {
  title: string;
  breadcrumbs?: string[];
  eyebrow?: string;
  contextLabel?: string;
  showBack?: boolean;
  showMenu?: boolean;
  onBack?: () => void;
  onMenuPress?: () => void;
};

export function AppTopBar({
  title,
  breadcrumbs = [],
  eyebrow,
  contextLabel,
  showBack = false,
  showMenu = true,
  onBack,
  onMenuPress,
}: AppTopBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.topBar,
        { paddingTop: insets.top },
      ]}>
      <View style={styles.content}>
        {showBack ? (
          <Pressable
            accessibilityLabel="뒤로 가기"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
        ) : null}

        <View style={styles.titleBlock}>
          {breadcrumbs.length > 0 ? (
            <Text numberOfLines={1} style={styles.breadcrumb}>
              {breadcrumbs.join(' / ')}
            </Text>
          ) : eyebrow ? (
            <Text style={styles.eyebrow}>{eyebrow}</Text>
          ) : null}
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        </View>

        {contextLabel ? (
          <Text numberOfLines={1} style={styles.contextLabel}>
            {contextLabel}
          </Text>
        ) : null}

        {showMenu ? (
          <Pressable
            accessibilityLabel="사이드바 메뉴 열기"
            accessibilityRole="button"
            onPress={onMenuPress}
            style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}>
            <Text style={styles.menuText}>☰</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    backgroundColor: AppColors.topBar,
    borderBottomColor: AppColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 64,
    paddingHorizontal: 18,
  },
  titleBlock: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 12,
  },
  eyebrow: { color: AppColors.primaryText, fontSize: 10, fontWeight: '800', letterSpacing: 1.6, marginBottom: 2 },
  breadcrumb: {
    color: AppColors.primaryText,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  title: {
    color: AppColors.primaryText,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  contextLabel: {
    backgroundColor: AppColors.primarySurface,
    borderRadius: 999,
    color: AppColors.primaryText,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '800',
    maxWidth: 116,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: AppColors.primarySurface,
    borderRadius: 20,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  backText: {
    color: AppColors.primaryText,
    fontSize: 30,
    lineHeight: 32,
    marginTop: -3,
  },
  menuButton: {
    alignItems: 'center',
    backgroundColor: AppColors.primarySurface,
    borderRadius: 20,
    elevation: 3,
    height: 42,
    justifyContent: 'center',
    shadowColor: AppColors.primaryBorder,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    width: 42,
  },
  menuText: { color: AppColors.primaryText, fontSize: 21 },
  pressed: { opacity: 0.72 },
});
