import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, AppTabBarStyle } from '@/constants/theme';

function getRouteLabel(routeName: string, options: BottomTabBarProps['descriptors'][string]['options']) {
  return typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? routeName;
}

export function AppBottomNav({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const focusedRoute = state.routes[state.index];
  const focusedOptions = focusedRoute ? descriptors[focusedRoute.key]?.options : undefined;
  const flattenedTabBarStyle = StyleSheet.flatten(focusedOptions?.tabBarStyle) as { display?: string } | undefined;

  if (flattenedTabBarStyle?.display === 'none') {
    return null;
  }

  return (
    <View style={[styles.bar, AppTabBarStyle, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const options = descriptors[route.key]?.options;
        const isFocused = state.index === index;
        const label = getRouteLabel(route.name, options);

        const onPress = () => {
          const event = navigation.emit({
            canPreventDefault: true,
            target: route.key,
            type: 'tabPress',
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({ target: route.key, type: 'tabLongPress' });
        };

        return (
          <Pressable
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            accessibilityRole="tab"
            accessibilityState={isFocused ? { selected: true } : {}}
            key={route.key}
            onLongPress={onLongPress}
            onPress={onPress}
            style={({ pressed }) => [
              styles.tab,
              isFocused && { backgroundColor: AppColors.tabBarActiveSurface },
              pressed && styles.pressed,
            ]}
            testID={options.tabBarButtonTestID}>
            <View style={[styles.indicator, { backgroundColor: isFocused ? AppColors.tabBarActive : 'transparent' }]} />
            <Text numberOfLines={1} style={[styles.label, { color: isFocused ? AppColors.tabBarActive : AppColors.tabBarInactive }, isFocused && styles.labelActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    minHeight: 66,
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 15,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 2,
    minHeight: 48,
    paddingHorizontal: 3,
  },
  indicator: {
    borderRadius: 2,
    height: 3,
    marginBottom: 5,
    width: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  labelActive: {
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
  },
});
