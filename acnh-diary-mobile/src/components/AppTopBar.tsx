import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors, AppControlSizes, AppRadii, AppShadows } from '@/constants/theme';

const passportIslandIcon = require('../data/assets/icons/passport-island.png');

export type AppIslandPicker = {
  onChange: (islandId: string) => void;
  onToggle: () => void;
  open: boolean;
  options: readonly { id: string; label: string; selected: boolean }[];
  value: string;
};

export type AppTopBarSectionTab = {
  key: string;
  label: string;
};

export type AppTopBarSearch = {
  accessibilityLabel: string;
  onChangeText: (value: string) => void;
  onClear?: () => void;
  placeholder: string;
  value: string;
};

type AppTopBarProps = {
  title: string;
  breadcrumbs?: string[];
  eyebrow?: string;
  contextLabel?: string;
  islandPicker?: AppIslandPicker;
  sectionTabValue?: string;
  sectionTabs?: readonly AppTopBarSectionTab[];
  search?: AppTopBarSearch;
  showBack?: boolean;
  showMenu?: boolean;
  onBack?: () => void;
  onMenuPress?: () => void;
  onSectionTabChange?: (key: string) => void;
};

export function AppTopBar({
  title,
  breadcrumbs = [],
  eyebrow,
  contextLabel,
  islandPicker,
  sectionTabValue,
  sectionTabs,
  search,
  showBack = false,
  showMenu = true,
  onBack,
  onMenuPress,
  onSectionTabChange,
}: AppTopBarProps) {
  const insets = useSafeAreaInsets();
  const searchInputRef = useRef<TextInput>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!searchOpen) return;
    const focusFrame = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(focusFrame);
  }, [searchOpen]);

  return (
    <View
      style={[
        styles.topBar,
        {
          elevation: islandPicker?.open ? 8 : 0,
          paddingTop: insets.top,
          zIndex: islandPicker?.open ? 20 : 1,
        },
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

        <View style={[styles.titleBlock, searchOpen && styles.titleBlockSearchOpen]}>
          {searchOpen ? null : (
            <>
              {breadcrumbs.length > 0 ? (
                <Text numberOfLines={1} style={styles.breadcrumb}>
                  {breadcrumbs.join(' / ')}
                </Text>
              ) : eyebrow ? (
                <Text style={styles.eyebrow}>{eyebrow}</Text>
              ) : null}
              {sectionTabs ? (
                <View style={styles.sectionTabRow}>
                  {sectionTabs.map((tab) => {
                    const selected = sectionTabValue === tab.key;
                    return (
                      <Pressable
                        accessibilityLabel={`${tab.label} 분류 보기`}
                        accessibilityRole="tab"
                        accessibilityState={{ selected }}
                        key={tab.key}
                        onPress={() => onSectionTabChange?.(tab.key)}
                        style={[styles.sectionTab, selected && styles.sectionTabSelected]}>
                        <Text style={[styles.sectionTabText, selected && styles.sectionTabTextSelected]}>{tab.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : islandPicker ? (
                <View style={styles.titleRow}>
                  <Pressable
                    accessibilityLabel={`${islandPicker.value}의 ${title} 섬 선택`}
                    accessibilityRole="button"
                    onPress={islandPicker.onToggle}
                    style={({ pressed }) => [styles.titlePicker, pressed && styles.pressed]}>
                    <Image resizeMode="contain" source={passportIslandIcon} style={styles.islandPickerIcon} />
                    <Text numberOfLines={1} style={styles.islandPickerText}>{islandPicker.value}</Text>
                    <MaterialCommunityIcons color={AppColors.leaf} name={islandPicker.open ? 'chevron-up' : 'chevron-down'} size={16} />
                  </Pressable>
                  <Text numberOfLines={1} style={styles.titleSuffix}>{`의 ${title}`}</Text>
                </View>
              ) : (
                <Text numberOfLines={1} style={styles.title}>
                  {title}
                </Text>
              )}
              {islandPicker?.open ? (
                <View style={styles.islandPickerMenu}>
                  {islandPicker.options.map((option) => (
                    <Pressable
                      accessibilityLabel={`${option.label} 섬으로 변경`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: option.selected }}
                      key={option.id}
                      onPress={() => islandPicker.onChange(option.id)}
                      style={[styles.islandPickerOption, option.selected && styles.islandPickerOptionSelected]}>
                      <Text style={[styles.islandPickerOptionText, option.selected && styles.islandPickerOptionTextSelected]}>{option.label}</Text>
                      {option.selected ? <MaterialCommunityIcons color={AppColors.leaf} name="check" size={17} /> : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </View>

        {contextLabel ? (
          <Text numberOfLines={1} style={styles.contextLabel}>
            {contextLabel}
          </Text>
        ) : null}

        {search ? (
          <View style={styles.searchActions}>
            {searchOpen ? (
              <View style={styles.searchField}>
                <MaterialCommunityIcons color={AppColors.inkMuted} name="magnify" size={17} />
                <TextInput
                  accessibilityLabel={search.accessibilityLabel}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={search.onChangeText}
                  placeholder={search.placeholder}
                  placeholderTextColor={AppColors.inkMuted}
                  ref={searchInputRef}
                  returnKeyType="search"
                  style={styles.searchInput}
                  value={search.value}
                />
                {search.value && search.onClear ? (
                  <Pressable accessibilityLabel="검색어 지우기" accessibilityRole="button" hitSlop={8} onPress={search.onClear} style={styles.searchClearButton}>
                    <MaterialCommunityIcons color={AppColors.inkMuted} name="close" size={16} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            <Pressable
              accessibilityLabel={searchOpen ? '검색창 닫기' : '검색창 열기'}
              accessibilityRole="button"
              accessibilityState={{ expanded: searchOpen }}
              onPress={() => setSearchOpen((value) => !value)}
              style={({ pressed }) => [styles.utilityButton, pressed && styles.pressed]}>
              <MaterialCommunityIcons color={AppColors.ink} name="magnify" size={22} />
            </Pressable>
          </View>
        ) : null}

        {showMenu ? (
          <Pressable
            accessibilityLabel="사이드바 메뉴 열기"
            accessibilityRole="button"
            onPress={onMenuPress}
            style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}>
            <MaterialCommunityIcons color={AppColors.ink} name="menu" size={23} />
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
    minHeight: 62,
    paddingHorizontal: 18,
  },
  titleBlock: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 12,
    position: 'relative',
    zIndex: 10,
  },
  titleBlockSearchOpen: { paddingHorizontal: 0 },
  eyebrow: { color: AppColors.inkMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0, marginBottom: 2 },
  breadcrumb: {
    color: AppColors.inkMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  title: {
    color: AppColors.ink,
    flexShrink: 1,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0,
  },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 5, minWidth: 0 },
  sectionTabRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  sectionTab: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingHorizontal: 2 },
  sectionTabSelected: {},
  sectionTabText: { color: AppColors.tabBarInactive, fontSize: 20, fontWeight: '800' },
  sectionTabTextSelected: { color: AppColors.ink, fontWeight: '900' },
  titlePicker: {
    alignItems: 'center',
    backgroundColor: AppColors.leafSoft,
    borderColor: AppColors.primaryBorder,
    borderRadius: AppRadii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    flexShrink: 1,
    gap: 2,
    maxWidth: '68%',
    minHeight: 34,
    paddingHorizontal: 9,
  },
  islandPickerIcon: { height: 16, width: 16 },
  islandPickerText: { color: AppColors.leaf, flexShrink: 1, fontSize: 16, fontWeight: '900' },
  titleSuffix: { color: AppColors.ink, flexShrink: 1, fontSize: 20, fontWeight: '800' },
  islandPickerMenu: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.line,
    borderRadius: AppRadii.control,
    borderWidth: 1,
    elevation: 8,
    left: 8,
    maxWidth: 240,
    minWidth: 190,
    overflow: 'hidden',
    position: 'absolute',
    shadowColor: AppColors.ink,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    top: 54,
    zIndex: 20,
  },
  islandPickerOption: { alignItems: 'center', borderBottomColor: AppColors.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: 13 },
  islandPickerOptionSelected: { backgroundColor: AppColors.leafSoft },
  islandPickerOptionText: { color: AppColors.inkMuted, flex: 1, fontSize: 13, fontWeight: '700' },
  islandPickerOptionTextSelected: { color: AppColors.leaf, fontWeight: '900' },
  contextLabel: {
    backgroundColor: AppColors.paperRaised,
    borderColor: AppColors.line,
    borderRadius: AppRadii.pill,
    borderWidth: 1,
    color: AppColors.ink,
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
    backgroundColor: AppColors.paperRaised,
    borderColor: AppColors.line,
    borderRadius: AppRadii.pill,
    borderWidth: 1,
    height: AppControlSizes.navMin,
    justifyContent: 'center',
    width: AppControlSizes.navMin,
  },
  backText: {
    color: AppColors.ink,
    fontSize: 30,
    lineHeight: 32,
    marginTop: -3,
  },
  menuButton: {
    alignItems: 'center',
    backgroundColor: AppColors.paperRaised,
    borderColor: AppColors.line,
    borderRadius: AppRadii.pill,
    borderWidth: 1,
    height: AppControlSizes.navMin,
    justifyContent: 'center',
    width: AppControlSizes.navMin,
    ...AppShadows.card,
  },
  utilityButton: {
    alignItems: 'center',
    backgroundColor: AppColors.paperRaised,
    borderColor: AppColors.line,
    borderRadius: AppRadii.pill,
    borderWidth: 1,
    height: AppControlSizes.navMin,
    justifyContent: 'center',
    width: AppControlSizes.navMin,
  },
  searchActions: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  searchField: { alignItems: 'center', backgroundColor: AppColors.card, borderColor: AppColors.line, borderRadius: AppRadii.control, borderWidth: 1, flexDirection: 'row', height: 38, paddingHorizontal: 8, width: 152 },
  searchInput: { color: AppColors.ink, flex: 1, fontSize: 12, height: 36, marginLeft: 5, minWidth: 0, paddingVertical: 0 },
  searchClearButton: { alignItems: 'center', height: 24, justifyContent: 'center', width: 24 },
  pressed: { opacity: 0.72 },
});
