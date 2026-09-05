import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useRouter, type Href } from 'expo-router';
import { useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { AppColors, AppControlSizes, AppRadii, AppTabBarStyle } from '@/constants/theme';

const NAV_ICON_ASSETS: Record<string, ImageSourcePropType> = {
  catalog: require('../data/assets/icons/catalog.png'),
  encyclopedia: require('../data/assets/icons/critterpedia.png'),
  guides: require('../data/assets/icons/island-life.png'),
  guide: require('../data/assets/icons/island-life.png'),
  today: require('../data/assets/icons/map.png'),
  villagers: require('../data/assets/icons/villagers.png'),
};

const NAV_HOME_PATHS: Record<string, Href> = {
  catalog: '/catalog',
  encyclopedia: '/encyclopedia',
  guides: '/guides',
  today: '/today',
  villagers: '/villagers',
};
const DOUBLE_PRESS_WINDOW_MS = 350;

function getRouteLabel(routeName: string, options: BottomTabBarProps['descriptors'][string]['options']) {
  return typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? routeName;
}

function getRouteIcon(routeName: string) {
  return NAV_ICON_ASSETS[routeName] ?? NAV_ICON_ASSETS.guides;
}

export function AppBottomNav({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const router = useRouter();
  const lastPress = useRef<{ routeKey: string; timestamp: number } | null>(null);
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
          const now = Date.now();
          const isDoublePress = lastPress.current?.routeKey === route.key && now - lastPress.current.timestamp <= DOUBLE_PRESS_WINDOW_MS;
          lastPress.current = isDoublePress ? null : { routeKey: route.key, timestamp: now };

          const event = navigation.emit({
            canPreventDefault: true,
            target: route.key,
            type: 'tabPress',
          });

          if (isDoublePress && !event.defaultPrevented) {
            const homePath = NAV_HOME_PATHS[route.name];
            if (homePath) router.replace(homePath);
            return;
          }

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
              <Image
                accessibilityLabel={`${label} 아이콘`}
                source={getRouteIcon(route.name)}
                style={[styles.icon, { opacity: isFocused ? 1 : 0.58 }]}
              />
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
    borderRadius: 17,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    marginBottom: 2,
    width: 34,
  },
  iconDiscActive: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.primaryBorder,
  },
  icon: {
    height: 27,
    resizeMode: 'contain',
    width: 27,
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
