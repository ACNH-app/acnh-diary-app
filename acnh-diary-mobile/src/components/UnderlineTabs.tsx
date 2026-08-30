import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';

export type UnderlineTab<T extends string> = {
  icon?: string;
  key: T;
  label: string;
};

type UnderlineTabsProps<T extends string> = {
  accessibilityLabel?: (tab: UnderlineTab<T>) => string;
  fitToWidth?: boolean;
  onChange: (key: T) => void;
  tabs: readonly UnderlineTab<T>[];
  value: T;
};

export function UnderlineTabs<T extends string>({
  accessibilityLabel,
  fitToWidth = false,
  onChange,
  tabs,
  value,
}: UnderlineTabsProps<T>) {
  return (
    <View style={styles.tabBar}>
      <ScrollView contentContainerStyle={styles.tabs} horizontal showsHorizontalScrollIndicator={false}>
        {tabs.map((tab) => {
          const selected = value === tab.key;

          return (
            <Pressable
              accessibilityLabel={accessibilityLabel?.(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={tab.key}
              onPress={() => onChange(tab.key)}
              style={[styles.tab, fitToWidth && styles.tabFitToWidth, selected && styles.tabActive]}>
              <View style={[styles.tabLabelRow, fitToWidth && styles.tabLabelRowCompact]}>
                {tab.icon ? (
                  <Text style={[styles.tabIcon, fitToWidth && styles.tabIconCompact, selected && styles.tabTextActive]}>
                    {tab.icon}
                  </Text>
                ) : null}
                <Text style={[styles.tabText, fitToWidth && styles.tabTextCompact, selected && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderBottomColor: AppColors.primaryBorder,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  tabs: {
    alignItems: 'stretch',
    flexGrow: 1,
  },
  tab: {
    alignItems: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 4,
    flexGrow: 1,
    justifyContent: 'center',
    minWidth: 62,
    paddingHorizontal: 4,
    paddingVertical: 13,
  },
  tabFitToWidth: {
    minWidth: 44,
    paddingHorizontal: 2,
  },
  tabActive: {
    borderBottomColor: AppColors.primary,
  },
  tabText: {
    color: AppColors.tabBarInactive,
    fontSize: 13,
    fontWeight: '800',
  },
  tabTextCompact: {
    fontSize: 11,
  },
  tabLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  tabLabelRowCompact: {
    gap: 0,
  },
  tabIcon: {
    color: AppColors.tabBarInactive,
    fontSize: 14,
    fontWeight: '700',
  },
  tabIconCompact: {
    fontSize: 12,
  },
  tabTextActive: {
    color: AppColors.primaryText,
  },
});
