import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getIslandCount, initializeDatabase } from '../db/database';
import { SplashScreen } from '../screens/SplashScreen';

type BootstrapState = 'loading' | 'ready' | 'error';

export default function IndexRoute() {
  const [state, setState] = useState<BootstrapState>('loading');
  const [hasIsland, setHasIsland] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      initializeDatabase();
      setHasIsland(getIslandCount() > 0);
      timer = setTimeout(() => setState('ready'), 1200);
    } catch {
      setState('error');
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (state === 'loading') return <SplashScreen />;

  if (state === 'error') {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>앱을 시작할 수 없습니다.</Text>
        <Text style={styles.errorMessage}>저장소 초기화에 실패했습니다.</Text>
      </View>
    );
  }

  return <Redirect href={hasIsland ? '/today' : '/onboarding'} />;
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  errorTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorMessage: {
    color: '#6b7280',
    fontSize: 15,
  },
});
