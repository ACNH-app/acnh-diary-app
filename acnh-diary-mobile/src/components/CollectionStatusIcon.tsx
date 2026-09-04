import { Image, StyleSheet, Text, View } from 'react-native';

import { AppStatusColors } from '@/constants/theme';
import type { EncyclopediaStatus } from '@/types/encyclopedia';

const MUSEUM_ICON = require('../data/assets/icons/museum-map-icon-small.png');

function getStatusTone(status: EncyclopediaStatus) {
  if (status === 'donated') return AppStatusColors.museum;
  if (status === 'owned') return AppStatusColors.catalog;
  if (status === 'caught') return AppStatusColors.leaf;
  if (status === 'genuineOwned') return AppStatusColors.catalog;
  if (status === 'fakeOwned') return AppStatusColors.danger;
  return AppStatusColors.neutral;
}

export function CollectionStatusIcon({
  active,
  status,
}: {
  active: boolean;
  status: EncyclopediaStatus;
}) {
  const tone = getStatusTone(status);
  const color = active ? tone.foreground : '#9A8D78';

  if (status === 'caught') {
    return (
      <View style={[styles.caughtIcon, { borderColor: color }, active && { backgroundColor: tone.background }]}>
        {active ? <View style={[styles.checkMark, { borderColor: color }]} /> : null}
      </View>
    );
  }

  if (status === 'donated') {
    return (
      <Image
        source={MUSEUM_ICON}
        style={[
          styles.museumIcon,
          !active && styles.museumIconMuted,
        ]}
      />
    );
  }

  if (status === 'owned') {
    return <View style={[styles.ownedIcon, { borderColor: color }]} />;
  }

  return <Text style={[styles.artIcon, { color }]}>{status === 'genuineOwned' ? '真' : '偽'}</Text>;
}

const styles = StyleSheet.create({
  caughtIcon: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 2.4,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  checkMark: {
    borderBottomWidth: 2.4,
    borderLeftWidth: 2.4,
    height: 10,
    transform: [{ rotate: '-45deg' }],
    width: 16,
  },
  museumIcon: { height: 30, resizeMode: 'contain', width: 30 },
  museumIconMuted: { opacity: 0.35 },
  ownedIcon: { borderWidth: 1.8, height: 11, transform: [{ rotate: '45deg' }], width: 11 },
  artIcon: { fontSize: 11, fontWeight: '900' },
});
