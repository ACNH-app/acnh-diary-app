import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { db, initializeDatabase } from './src/db/database';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { SplashScreen } from './src/screens/SplashScreen';
import { TodayScreen } from './src/screens/TodayScreen';

function createId() {
  return `island-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [hasIsland, setHasIsland] = useState(false);

  useEffect(() => {
    initializeDatabase();

    const result = db.getAllSync('SELECT COUNT(*) as count FROM islands;') as Array<{ count: number }>;
    setHasIsland((result[0]?.count ?? 0) > 0);
    setTimeout(() => setIsReady(true), 1200);
  }, []);

  const handleOnboardingComplete = (island: {
    name: string;
    fruit: string;
    flower: string;
    hemisphere: string;
    timezone: string;
  }) => {
    db.runSync(
      'INSERT INTO islands (id, name, fruit, flower, hemisphere, timezone) VALUES (?, ?, ?, ?, ?, ?);',
      [createId(), island.name, island.fruit, island.flower, island.hemisphere, island.timezone]
    );
    setHasIsland(true);
  };

  if (!isReady) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {hasIsland ? <TodayScreen /> : <OnboardingScreen onComplete={handleOnboardingComplete} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
});
