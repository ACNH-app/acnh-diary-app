import React, { useState } from 'react';
import {
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type OnboardingScreenProps = {
  onComplete?: (island: {
    name: string;
    fruit: string;
    flower: string;
    hemisphere: string;
    timezone: string;
  }) => void;
};

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [name, setName] = useState('달빛섬');
  const [fruit, setFruit] = useState('사과');
  const [flower, setFlower] = useState('라일락');
  const [hemisphere, setHemisphere] = useState('북반구');
  const [timezone, setTimezone] = useState('KST');

  const handleSubmit = () => {
    onComplete?.({
      name,
      fruit,
      flower,
      hemisphere,
      timezone,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>첫 섬을 만들어볼까요?</Text>
      <Text style={styles.subtitle}>기본 섬 정보를 입력해 주세요.</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>섬 이름</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="달빛섬"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>대표 과일</Text>
        <TextInput
          style={styles.input}
          value={fruit}
          onChangeText={setFruit}
          placeholder="사과"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>자생 꽃</Text>
        <TextInput
          style={styles.input}
          value={flower}
          onChangeText={setFlower}
          placeholder="라일락"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>반구</Text>
        <TextInput
          style={styles.input}
          value={hemisphere}
          onChangeText={setHemisphere}
          placeholder="북반구"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>시간대</Text>
        <TextInput
          style={styles.input}
          value={timezone}
          onChangeText={setTimezone}
          placeholder="KST"
        />
      </View>

      <Button title="시작하기" onPress={handleSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
});
