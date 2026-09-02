import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, AppControlSizes, AppRadii, AppTabBarStyle } from '@/constants/theme';

function getRouteLabel(routeName: string, options: BottomTabBarProps['descriptors'][string]['options']) {
  return typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? routeName;
}

function getRouteIcon(routeName: string) {
  if (routeName === 'today') return '◎';
  if (routeName === 'villagers') return '⌂';
  if (routeName === 'encyclopedia') return '▣';
  if (routeName === 'catalog') return '◫';
  return '☰';
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
              isFocused && styles.tabActive,
              pressed && styles.pressed,
            ]}
            testID={options.tabBarButtonTestID}>
            <View style={[styles.iconDisc, isFocused && styles.iconDiscActive]}>
              <Text style={[styles.icon, { color: isFocused ? AppColors.leaf : AppColors.tabBarInactive }]}>
                {getRouteIcon(route.name)}
              </Text>
            </View>
            <Text numberOfLines={1} style={[styles.label, { color: isFocused ? AppColors.tabBarActiveText : AppColors.tabBarInactive }, isFocused && styles.labelActive]}>
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
    backgroundColor: AppColors.tabBar,
    flexDirection: 'row',
    minHeight: 72,
    paddingHorizontal: 7,
    paddingTop: 7,
  },
  tab: {
    alignItems: 'center',
    borderRadius: AppRadii.control,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 2,
    minHeight: AppControlSizes.navMin,
    paddingHorizontal: 3,
  },
  tabActive: {
    backgroundColor: AppColors.tabBarActiveSurface,
  },
  iconDisc: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 15,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    marginBottom: 2,
    width: 30,
  },
  iconDiscActive: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.primaryBorder,
  },
  icon: {
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 22,
  },
  label: {
    fontSize: 10,
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
