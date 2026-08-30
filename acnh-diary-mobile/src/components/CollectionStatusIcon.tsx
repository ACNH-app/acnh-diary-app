import { StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';
import type { EncyclopediaStatus } from '@/types/encyclopedia';

export function CollectionStatusIcon({
  active,
  status,
}: {
  active: boolean;
  status: EncyclopediaStatus;
}) {
  const color = active ? AppColors.primaryText : '#9BA69D';

  if (status === 'caught') {
    return (
      <View style={[styles.caughtIcon, { borderColor: color }, active && styles.caughtIconActive]}>
        {active ? <View style={[styles.checkMark, { borderColor: color }]} /> : null}
      </View>
    );
  }

  if (status === 'donated') {
    return (
      <View style={styles.museumIcon}>
        <View style={[styles.museumRoof, { backgroundColor: color }]} />
        <View style={[styles.museumBody, { borderColor: color }]}>
          <View style={[styles.museumColumn, { backgroundColor: color }]} />
          <View style={[styles.museumColumn, { backgroundColor: color }]} />
          <View style={[styles.museumColumn, { backgroundColor: color }]} />
        </View>
      </View>
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
    borderRadius: 8,
    borderWidth: 1.8,
    height: 15,
    justifyContent: 'center',
    width: 15,
  },
  caughtIconActive: { backgroundColor: AppColors.primarySurface },
  checkMark: {
    borderBottomWidth: 1.8,
    borderLeftWidth: 1.8,
    height: 5,
    transform: [{ rotate: '-45deg' }],
    width: 8,
  },
  museumIcon: { height: 16, justifyContent: 'flex-end', width: 17 },
  museumRoof: { alignSelf: 'center', height: 4, transform: [{ rotate: '45deg' }], width: 12 },
  museumBody: {
    alignItems: 'center',
    borderBottomWidth: 1.8,
    borderLeftWidth: 1.8,
    borderRightWidth: 1.8,
    flexDirection: 'row',
    gap: 2,
    height: 8,
    justifyContent: 'center',
    marginTop: -2,
    paddingHorizontal: 2,
  },
  museumColumn: { height: 5, width: 2 },
  ownedIcon: { borderWidth: 1.8, height: 11, transform: [{ rotate: '45deg' }], width: 11 },
  artIcon: { fontSize: 11, fontWeight: '900' },
});
