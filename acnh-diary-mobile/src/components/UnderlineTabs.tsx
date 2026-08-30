import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export type UnderlineTab<T extends string> = {
  key: T;
  label: string;
};

type UnderlineTabsProps<T extends string> = {
  accessibilityLabel?: (tab: UnderlineTab<T>) => string;
  onChange: (key: T) => void;
  tabs: readonly UnderlineTab<T>[];
  value: T;
};

export function UnderlineTabs<T extends string>({
  accessibilityLabel,
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
              style={[styles.tab, selected && styles.tabActive]}>
              <Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderBottomColor: '#DEE7DE',
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
  tabActive: {
    borderBottomColor: '#55A487',
  },
  tabText: {
    color: '#728074',
    fontSize: 13,
    fontWeight: '800',
  },
  tabTextActive: {
    color: '#398A6D',
  },
});
