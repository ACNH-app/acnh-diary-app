import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppChrome } from '@/components/AppChrome';
import { AppColors } from '@/constants/theme';

type PlaceholderScreenProps = {
  title: string;
  description: string;
};

export function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  const [search, setSearch] = useState('');

  return (
    <View style={styles.screenRoot}>
      <AppChrome
        search={{
          accessibilityLabel: `${title} 검색`,
          onChangeText: setSearch,
          onClear: () => setSearch(''),
          placeholder: `${title} 검색`,
          value: search,
        }}
        title={title}
      />
      <SafeAreaView edges={[]} style={styles.container}>
        <Text style={styles.description}>{description}</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: AppColors.background,
  },
  description: {
    color: '#6b7280',
    fontSize: 15,
    textAlign: 'center',
  },
});
