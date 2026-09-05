import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

import { AppColors } from '@/constants/theme';

export type UnderlineTab<T extends string> = {
  icon?: string;
  iconSource?: ImageSourcePropType;
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
                {tab.iconSource ? (
                  <Image
                    resizeMode="contain"
                    source={tab.iconSource}
                    style={[styles.tabIconImage, selected && styles.tabIconImageSelected]}
                  />
                ) : tab.icon ? (
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
    borderBottomColor: AppColors.line,
    borderBottomWidth: 1,
    marginBottom: 0,
  },
  tabs: {
    alignItems: 'stretch',
    flexGrow: 1,
    gap: 0,
  },
  tab: {
    alignItems: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 3,
    borderRadius: 0,
    flexGrow: 1,
    justifyContent: 'center',
    minWidth: 62,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tabFitToWidth: {
    minWidth: 48,
    paddingHorizontal: 7,
  },
  tabActive: {
    borderBottomColor: AppColors.leaf,
  },
  tabText: {
    color: AppColors.tabBarInactive,
    fontSize: 13,
    fontWeight: '800',
  },
  tabTextCompact: {
    fontSize: 10,
  },
  tabLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  tabLabelRowCompact: {
    gap: 3,
  },
  tabIcon: {
    color: AppColors.tabBarInactive,
    fontSize: 15,
    fontWeight: '700',
  },
  tabIconCompact: {
    fontSize: 13,
  },
  tabIconImage: {
    height: 18,
    opacity: 0.48,
    width: 18,
  },
  tabIconImageSelected: {
    opacity: 1,
  },
  tabTextActive: {
    color: AppColors.leaf,
  },
});
