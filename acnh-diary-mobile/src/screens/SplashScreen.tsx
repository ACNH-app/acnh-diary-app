import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';

type SplashScreenProps = {
  onReady?: () => void;
};

export function SplashScreen({ onReady }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onReady?.();
    }, 1200);

    return () => clearTimeout(timer);
  }, [onReady]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>모동숲 다이어리</Text>
      <ActivityIndicator size="large" color="#4F7D56" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.background,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  loader: {
    marginTop: 20,
  },
});
