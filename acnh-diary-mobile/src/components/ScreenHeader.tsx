import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
};

export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <View style={styles.headerWrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#6b7280',
  },
});
