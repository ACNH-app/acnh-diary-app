import { useEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { initializeDatabase, seedInitialIslandIfNeeded } from './src/db/database';
import { TodayScreen } from './src/screens/TodayScreen';

export default function App() {
  useEffect(() => {
    initializeDatabase();
    seedInitialIslandIfNeeded();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <TodayScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
});
