import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export type ListSortOption<T extends string> = {
  key: T;
  label: string;
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
  descending,
  isFiltered,
  onReset,
  onSortChange,
  onToggleDirection,
  resultCount,
  sortOptions,
  sortValue,
  totalCount,
}: {
  descending: boolean;
  isFiltered: boolean;
  onReset: () => void;
  onSortChange: (value: T) => void;
  onToggleDirection: () => void;
  resultCount: number;
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
          {isFiltered ? <Text style={styles.resultCountHint}>필터 결과</Text> : null}
          {isFiltered ? (
            <Pressable accessibilityRole="button" onPress={onReset}>
              <Text style={styles.resetText}>초기화</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.sortControls}>
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
    backgroundColor: '#E1ECE0',
    borderRadius: 12,
    flexDirection: 'row',
    height: 48,
    justifyContent: 'center',
    minWidth: 58,
    paddingHorizontal: 9,
  },
  filterToggleIcon: {
    color: '#3E744A',
    fontSize: 18,
    marginRight: 5,
  },
  filterToggleText: {
    color: '#3E744A',
    fontSize: 11,
    fontWeight: '800',
  },
  filterBadge: {
    alignItems: 'center',
    backgroundColor: '#3E744A',
    borderRadius: 8,
    height: 16,
    justifyContent: 'center',
    marginLeft: 5,
    minWidth: 16,
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  filterPanel: {
    backgroundColor: '#EDF3EA',
    borderRadius: 16,
    marginTop: 8,
    padding: 12,
  },
  filterGroup: {
    marginTop: 10,
  },
  filterGroupTitle: {
    color: '#5F735F',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
  },
  filterOptions: {
    gap: 7,
  },
  filterChip: {
    backgroundColor: '#E9EEE7',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  filterChipActive: {
    backgroundColor: '#355D42',
  },
  filterChipText: {
    color: '#657468',
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  resultToolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 18,
  },
  resultCountGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    minWidth: 0,
  },
  resultCount: {
    color: '#6F7F74',
    fontSize: 12,
    fontWeight: '800',
  },
  resultCountHint: {
    color: '#98A39A',
    fontSize: 10,
    marginLeft: 7,
  },
  resetText: {
    color: '#3D7549',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 8,
  },
  sortControls: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  sortSelect: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 6,
  },
  sortSelectLabel: {
    color: '#7B887F',
    fontSize: 11,
    fontWeight: '700',
    marginRight: 10,
  },
  sortSelectValue: {
    color: '#3E5145',
    fontSize: 13,
    fontWeight: '800',
  },
  sortSelectChevron: {
    color: '#6C7D71',
    fontSize: 16,
    lineHeight: 18,
    marginLeft: 7,
    marginTop: -2,
  },
  sortDivider: {
    backgroundColor: '#DDE5DE',
    height: 28,
    marginHorizontal: 10,
    width: 1,
  },
  sortDropdown: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFF',
    borderColor: '#DFE8DF',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 4,
    marginBottom: 8,
    marginTop: -4,
    overflow: 'hidden',
    shadowColor: '#294334',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 7,
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
    backgroundColor: '#F0F7ED',
  },
  sortOptionText: {
    color: '#66766B',
    fontSize: 12,
    fontWeight: '700',
  },
  sortOptionTextActive: {
    color: '#397B4D',
  },
  sortOptionCheck: {
    color: '#4D956C',
    fontSize: 14,
    fontWeight: '800',
  },
  directionButton: {
    alignItems: 'center',
    backgroundColor: '#E4F1EB',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  directionText: {
    color: '#3D8B6B',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 17,
  },
});
