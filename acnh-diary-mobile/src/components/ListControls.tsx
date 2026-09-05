import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppColors, AppRadii, AppShadows } from '@/constants/theme';

export type ListSortOption<T extends string> = {
  key: T;
  label: string;
};

export type ListToolbarAction = {
  accessibilityLabel?: string;
  disabled?: boolean;
  icon?: ReactNode;
  key: string;
  label: string;
  onPress: () => void;
};

export function ListSearchRow({ children }: { children: ReactNode }) {
  return <View style={styles.searchRow}>{children}</View>;
}

export function ListFilterToggle({
  activeCount,
  expanded,
  onPress,
}: {
  activeCount: number;
  expanded: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`상세 필터 ${expanded ? '접기' : '열기'}`}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={onPress}
      style={({ pressed }) => [styles.filterToggle, pressed && styles.pressed]}>
      <Text style={styles.filterToggleIcon}>☷</Text>
      <Text style={styles.filterToggleText}>{expanded ? '필터 닫기' : '필터'}</Text>
      {activeCount > 0 ? (
        <View style={styles.filterBadge}>
          <Text style={styles.filterBadgeText}>{activeCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function ListFilterPanel({ children }: { children: ReactNode }) {
  return <View style={styles.filterPanel}>{children}</View>;
}

export function ListFilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterGroupTitle}>{title}</Text>
      <ScrollView contentContainerStyle={styles.filterOptions} horizontal showsHorizontalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

export function ListFilterChip({
  accessibilityLabel,
  label,
  onPress,
  role = 'checkbox',
  selected,
}: {
  accessibilityLabel?: string;
  label: string;
  onPress: () => void;
  role?: 'checkbox' | 'radio' | 'tab';
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={role}
      accessibilityState={{ checked: role !== 'tab' ? selected : undefined, selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.filterChip, selected && styles.filterChipActive, pressed && styles.pressed]}>
      <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function ListResultToolbar<T extends string>({
  actions = [],
  descending,
  filterControl,
  isFiltered,
  onReset,
  onSortChange,
  onToggleDirection,
  resultCount,
  showReset = true,
  sortOptions,
  sortValue,
  totalCount,
}: {
  actions?: readonly ListToolbarAction[];
  descending: boolean;
  filterControl?: ReactNode;
  isFiltered: boolean;
  onReset: () => void;
  onSortChange: (value: T) => void;
  onToggleDirection: () => void;
  resultCount: number;
  showReset?: boolean;
  sortOptions: readonly ListSortOption<T>[];
  sortValue: T;
  totalCount: number;
}) {
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const selectedSort = sortOptions.find((option) => option.key === sortValue) ?? sortOptions[0];

  return (
    <>
      <View style={styles.resultToolbar}>
        <View style={styles.resultCountGroup}>
          <Text style={styles.resultCount}>
            {resultCount.toLocaleString('ko-KR')} / {totalCount.toLocaleString('ko-KR')}
          </Text>
          {isFiltered && showReset ? <Text style={styles.resultCountHint}>필터 결과</Text> : null}
          {isFiltered && showReset ? (
            <Pressable accessibilityRole="button" onPress={onReset}>
              <Text style={styles.resetText}>초기화</Text>
            </Pressable>
          ) : null}
          {actions.length > 0 ? (
            <View style={styles.toolbarActions}>
              {actions.map((action) => (
                <Pressable
                  accessibilityLabel={action.accessibilityLabel ?? action.label}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: action.disabled }}
                  disabled={action.disabled}
                  key={action.key}
                  onPress={action.onPress}
                  style={({ pressed }) => [
                    styles.toolbarAction,
                    action.disabled && styles.toolbarActionDisabled,
                    pressed && styles.pressed,
                  ]}>
                  {action.icon ?? (
                    <Text style={[styles.toolbarActionText, action.disabled && styles.toolbarActionTextDisabled]}>
                      {action.label}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
        <View style={styles.sortControls}>
          {filterControl ? <View style={styles.filterControl}>{filterControl}</View> : null}
          <Pressable
            accessibilityLabel={`정렬 조건 ${selectedSort?.label ?? ''}`}
            accessibilityRole="button"
            onPress={() => setSortMenuOpen((value) => !value)}
            style={styles.sortSelect}>
            <Text style={styles.sortSelectLabel}>정렬</Text>
            <Text style={styles.sortSelectValue}>{selectedSort?.label}</Text>
            <Text style={styles.sortSelectChevron}>{sortMenuOpen ? '⌃' : '⌄'}</Text>
          </Pressable>
          <View style={styles.sortDivider} />
          <Pressable
            accessibilityLabel={descending ? '내림차순으로 정렬 중, 오름차순으로 변경' : '오름차순으로 정렬 중, 내림차순으로 변경'}
            accessibilityRole="button"
            onPress={onToggleDirection}
            style={styles.directionButton}>
            <Text style={styles.directionText}>{descending ? '↓' : '↑'}</Text>
          </Pressable>
        </View>
      </View>

      {sortMenuOpen ? (
        <View style={styles.sortDropdown}>
          {sortOptions.map((option) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: sortValue === option.key }}
              key={option.key}
              onPress={() => {
                onSortChange(option.key);
                setSortMenuOpen(false);
              }}
              style={[styles.sortOption, sortValue === option.key && styles.sortOptionActive]}>
              <Text style={[styles.sortOptionText, sortValue === option.key && styles.sortOptionTextActive]}>
                {option.label}
              </Text>
              {sortValue === option.key ? <Text style={styles.sortOptionCheck}>✓</Text> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  pressed: {
    opacity: 0.75,
  },
  filterToggle: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    flexDirection: 'row',
    height: 28,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 0,
  },
  filterToggleIcon: {
    color: AppColors.ink,
    fontSize: 18,
    marginRight: 3,
  },
  filterToggleText: {
    color: AppColors.ink,
    fontSize: 11,
    fontWeight: '800',
  },
  filterBadge: {
    alignItems: 'center',
    backgroundColor: AppColors.leaf,
    borderRadius: 8,
    height: 16,
    justifyContent: 'center',
    marginLeft: 5,
    minWidth: 16,
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    color: AppColors.card,
    fontSize: 9,
    fontWeight: '800',
  },
  filterPanel: {
    backgroundColor: AppColors.paperRaised,
    borderColor: AppColors.line,
    borderRadius: AppRadii.panel,
    borderWidth: 1,
    marginTop: 8,
    padding: 12,
    ...AppShadows.card,
  },
  filterGroup: {
    marginTop: 10,
  },
  filterGroupTitle: {
    color: AppColors.ink,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
  },
  filterOptions: {
    gap: 7,
  },
  filterChip: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.line,
    borderRadius: AppRadii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  filterChipActive: {
    backgroundColor: AppColors.leafSoft,
    borderColor: AppColors.leaf,
  },
  filterChipText: {
    color: AppColors.inkMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: AppColors.ink,
    fontWeight: '900',
  },
  resultToolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 5,
  },
  resultCountGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  resultCount: {
    color: AppColors.inkMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  resultCountHint: {
    color: '#9A8D78',
    fontSize: 10,
    marginLeft: 7,
  },
  resetText: {
    color: AppColors.leaf,
    fontSize: 12,
    fontWeight: '800',
  },
  toolbarActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  toolbarAction: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    height: 24,
    justifyContent: 'center',
    minHeight: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  toolbarActionDisabled: {
    opacity: 0.45,
  },
  toolbarActionText: {
    color: AppColors.ink,
    fontSize: 11,
    fontWeight: '800',
  },
  toolbarActionTextDisabled: {
    color: '#A99C86',
  },
  sortControls: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  filterControl: {
    marginRight: 10,
  },
  sortSelect: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 6,
  },
  sortSelectLabel: {
    color: AppColors.inkMuted,
    fontSize: 11,
    fontWeight: '700',
    marginRight: 10,
  },
  sortSelectValue: {
    color: AppColors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  sortSelectChevron: {
    color: AppColors.inkMuted,
    fontSize: 16,
    lineHeight: 18,
    marginLeft: 7,
    marginTop: -2,
  },
  sortDivider: {
    backgroundColor: AppColors.line,
    height: 28,
    marginHorizontal: 10,
    width: 1,
  },
  sortDropdown: {
    alignSelf: 'flex-end',
    backgroundColor: AppColors.card,
    borderColor: AppColors.line,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    marginTop: -4,
    overflow: 'hidden',
    ...AppShadows.card,
    width: 144,
  },
  sortOption: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  sortOptionActive: {
    backgroundColor: AppColors.leafSoft,
  },
  sortOptionText: {
    color: AppColors.inkMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  sortOptionTextActive: {
    color: AppColors.ink,
  },
  sortOptionCheck: {
    color: AppColors.leaf,
    fontSize: 14,
    fontWeight: '800',
  },
  directionButton: {
    alignItems: 'center',
    backgroundColor: AppColors.paperRaised,
    borderColor: AppColors.line,
    borderRadius: AppRadii.control,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  directionText: {
    color: AppColors.ink,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 17,
  },
});
