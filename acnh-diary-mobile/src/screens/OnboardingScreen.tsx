import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/theme';

import type { Hemisphere, IslandInput } from '../types/island';

type OnboardingScreenProps = {
  onComplete?: (island: IslandInput) => void | Promise<void>;
};

const hemisphereOptions: Array<{ value: Hemisphere; label: string; description: string }> = [
  { value: 'north', label: '북반구', description: '한국과 같은 계절' },
  { value: 'south', label: '남반구', description: '북반구와 반대 계절' },
];

function getDeviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul';
  } catch {
    return 'Asia/Seoul';
  }
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [islandName, setIslandName] = useState('수원삼섬');
  const [playerName, setPlayerName] = useState('그랑');
  const [birthdayMonth, setBirthdayMonth] = useState('');
  const [birthdayDay, setBirthdayDay] = useState('');
  const [fruit, setFruit] = useState('사과');
  const [flower, setFlower] = useState('장미');
  const [hemisphere, setHemisphere] = useState<Hemisphere>('north');
  const [timezone, setTimezone] = useState(getDeviceTimezone);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedIslandName = islandName.trim();
    const trimmedPlayerName = playerName.trim();
    const parsedBirthdayMonth = Number(birthdayMonth);
    const parsedBirthdayDay = Number(birthdayDay);
    const trimmedFruit = fruit.trim();
    const trimmedFlower = flower.trim();
    const trimmedTimezone = timezone.trim();

    if (!trimmedIslandName || trimmedIslandName.length > 10) {
      setErrorMessage('섬 이름은 1~10자로 입력해 주세요.');
      return;
    }

    if (!trimmedPlayerName || trimmedPlayerName.length > 10) {
      setErrorMessage('주민대표 이름은 1~10자로 입력해 주세요.');
      return;
    }

    if (!trimmedFruit || !trimmedFlower || !trimmedTimezone) {
      setErrorMessage('모든 항목을 입력해 주세요.');
      return;
    }

    const birthday = new Date(Date.UTC(2024, parsedBirthdayMonth - 1, parsedBirthdayDay));
    if (
      !birthdayMonth ||
      !birthdayDay ||
      !Number.isInteger(parsedBirthdayMonth) ||
      !Number.isInteger(parsedBirthdayDay) ||
      birthday.getUTCMonth() !== parsedBirthdayMonth - 1 ||
      birthday.getUTCDate() !== parsedBirthdayDay
    ) {
      setErrorMessage('주민대표 생일을 올바르게 입력해 주세요.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await onComplete?.({
        name: trimmedIslandName,
        fruit: trimmedFruit,
        flower: trimmedFlower,
        hemisphere,
        timezone: trimmedTimezone,
        playerName: trimmedPlayerName,
        birthdayMonth: parsedBirthdayMonth,
        birthdayDay: parsedBirthdayDay,
      });
    } catch {
      setErrorMessage('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrow}>첫 번째 기록</Text>
          </View>

          <Text style={styles.title}>나의 섬을
            <Text style={styles.titleAccent}> 기록해 볼까요?</Text>
          </Text>
          <Text style={styles.subtitle}>
            섬 정보를 저장하면 매일의 기록을
            {'\n'}한곳에서 이어갈 수 있어요.
          </Text>

          <View style={styles.heroCard}>
            <View style={styles.heroSun} />
            <View style={styles.heroIsland}>
              <View style={styles.heroTreeTop} />
              <View style={styles.heroTreeTrunk} />
              <View style={styles.heroGround} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroLabel}>WELCOME TO YOUR ISLAND</Text>
              <Text style={styles.heroName}>{islandName.trim() || '새로운 섬'}</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>섬 정보</Text>
            <Text style={styles.sectionHint}>필수</Text>
          </View>

          <View style={styles.formCard}>
            <FormField
              label="섬 이름"
              value={islandName}
              onChangeText={setIslandName}
              placeholder="수원삼섬"
              maxLength={10}
              autoCapitalize="none"
            />
            <View style={styles.fieldDivider} />
            <FormField
              label="주민대표"
              value={playerName}
              onChangeText={setPlayerName}
              placeholder="그랑"
              maxLength={10}
              autoCapitalize="none"
            />
            <View style={styles.fieldDivider} />
            <View style={styles.birthdayRow}>
              <View style={styles.birthdayCopy}>
                <Text style={styles.fieldLabel}>주민대표 생일</Text>
                <Text style={styles.birthdayHint}>캘린더와 여권 요약에 사용해요</Text>
              </View>
              <TextInput
                accessibilityLabel="주민대표 생일 월"
                keyboardType="number-pad"
                maxLength={2}
                onChangeText={setBirthdayMonth}
                placeholder="월"
                placeholderTextColor="#A6A9A2"
                style={styles.birthdayInput}
                value={birthdayMonth}
              />
              <Text style={styles.birthdaySeparator}>월</Text>
              <TextInput
                accessibilityLabel="주민대표 생일 일"
                keyboardType="number-pad"
                maxLength={2}
                onChangeText={setBirthdayDay}
                placeholder="일"
                placeholderTextColor="#A6A9A2"
                style={styles.birthdayInput}
                value={birthdayDay}
              />
              <Text style={styles.birthdaySeparator}>일</Text>
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.inlineFields}>
              <FormField
                containerStyle={styles.inlineField}
                label="대표 과일"
                value={fruit}
                onChangeText={setFruit}
                placeholder="사과"
                autoCapitalize="none"
              />
              <FormField
                containerStyle={styles.inlineField}
                label="자생 꽃"
                value={flower}
                onChangeText={setFlower}
                placeholder="장미"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>섬의 계절</Text>
            <Text style={styles.sectionHint}>출현 정보에 사용</Text>
          </View>

          <View style={styles.hemisphereRow}>
            {hemisphereOptions.map((option) => {
              const selected = hemisphere === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={option.label}
                  onPress={() => setHemisphere(option.value)}
                  style={[styles.hemisphereCard, selected && styles.hemisphereCardSelected]}>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                  <Text style={[styles.hemisphereLabel, selected && styles.selectedText]}>
                    {option.label}
                  </Text>
                  <Text style={styles.hemisphereDescription}>{option.description}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.timezoneCard}>
            <View style={styles.timezoneCopy}>
              <Text style={styles.fieldLabel}>시간대</Text>
              <Text style={styles.timezoneHint}>오전 5시 기준 게임 날짜에 사용해요</Text>
            </View>
            <TextInput
              accessibilityLabel="시간대"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setTimezone}
              placeholder="Asia/Seoul"
              style={styles.timezoneInput}
              value={timezone}
            />
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          {errorMessage ? (
            <Text accessibilityRole="alert" style={styles.errorMessage}>
              {errorMessage}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isSubmitting }}
            disabled={isSubmitting}
            onPress={handleSubmit}
            style={({ pressed }) => [styles.submitButton, pressed && styles.submitButtonPressed]}>
            <Text style={styles.submitLabel}>
              {isSubmitting ? '저장 중...' : '섬 정보 저장하고 시작하기'}
            </Text>
            {!isSubmitting ? <Text style={styles.submitArrow}>→</Text> : null}
          </Pressable>
          <Text style={styles.footerNote}>저장된 정보는 이 기기에만 보관됩니다.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  containerStyle?: object;
};

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  autoCapitalize = 'sentences',
  containerStyle,
}: FormFieldProps) {
  return (
    <View style={containerStyle}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A6A9A2"
        maxLength={maxLength}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 24,
  },
  eyebrowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  eyebrowDot: {
    backgroundColor: '#E28563',
    borderRadius: 99,
    height: 8,
    width: 8,
  },
  eyebrow: {
    color: '#687266',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: {
    color: '#29352C',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.4,
    lineHeight: 42,
  },
  titleAccent: {
    color: '#D87555',
  },
  subtitle: {
    color: '#788077',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
  },
  heroCard: {
    backgroundColor: '#DCEBDD',
    borderRadius: 28,
    height: 158,
    marginTop: 26,
    overflow: 'hidden',
    position: 'relative',
  },
  heroSun: {
    backgroundColor: '#F8D89C',
    borderRadius: 80,
    height: 104,
    position: 'absolute',
    right: -18,
    top: -30,
    width: 104,
  },
  heroIsland: {
    bottom: 0,
    height: 120,
    left: 14,
    position: 'absolute',
    width: 156,
  },
  heroTreeTop: {
    backgroundColor: '#78A878',
    borderRadius: 28,
    height: 64,
    left: 48,
    position: 'absolute',
    top: 9,
    width: 64,
  },
  heroTreeTrunk: {
    backgroundColor: '#A46F4C',
    bottom: 30,
    height: 52,
    left: 75,
    position: 'absolute',
    width: 12,
  },
  heroGround: {
    backgroundColor: '#9CC38D',
    borderRadius: 70,
    bottom: -48,
    height: 112,
    left: -16,
    position: 'absolute',
    width: 182,
  },
  heroCopy: {
    bottom: 20,
    left: 20,
  },
  heroLabel: {
    color: '#52725D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  heroName: {
    color: '#29352C',
    fontSize: 23,
    fontWeight: '800',
    marginTop: 4,
  },
  sectionHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 28,
  },
  sectionTitle: {
    color: '#334036',
    fontSize: 17,
    fontWeight: '800',
  },
  sectionHint: {
    color: '#9A9F97',
    fontSize: 11,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E9E0',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 17,
    paddingVertical: 4,
  },
  fieldDivider: {
    backgroundColor: '#EFF0EB',
    height: 1,
  },
  fieldLabel: {
    color: '#687266',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
  },
  input: {
    color: '#29352C',
    fontSize: 16,
    fontWeight: '600',
    paddingBottom: 13,
    paddingTop: 0,
  },
  inlineFields: {
    flexDirection: 'row',
    gap: 14,
    paddingTop: 14,
  },
  inlineField: {
    flex: 1,
  },
  hemisphereRow: {
    flexDirection: 'row',
    gap: 10,
  },
  hemisphereCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E9E0',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 92,
    padding: 14,
  },
  hemisphereCardSelected: {
    backgroundColor: '#EEF6EA',
    borderColor: '#86B47E',
  },
  radio: {
    alignItems: 'center',
    borderColor: '#BBC1B9',
    borderRadius: 99,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    marginBottom: 9,
    width: 18,
  },
  radioSelected: {
    borderColor: '#5D9361',
  },
  radioDot: {
    backgroundColor: '#5D9361',
    borderRadius: 99,
    height: 9,
    width: 9,
  },
  hemisphereLabel: {
    color: '#4B554C',
    fontSize: 14,
    fontWeight: '800',
  },
  selectedText: {
    color: '#3F7149',
  },
  hemisphereDescription: {
    color: '#929990',
    fontSize: 10,
    marginTop: 4,
  },
  timezoneCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E9E0',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  birthdayRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  birthdayCopy: {
    flex: 1,
  },
  birthdayHint: {
    color: '#9A9F97',
    fontSize: 10,
    marginTop: 3,
  },
  birthdayInput: {
    borderBottomColor: '#DCE1D8',
    borderBottomWidth: 1,
    color: '#3D493F',
    fontSize: 14,
    marginLeft: 5,
    paddingHorizontal: 6,
    paddingVertical: 5,
    textAlign: 'center',
    width: 34,
  },
  birthdaySeparator: {
    color: '#7B857B',
    fontSize: 12,
    marginLeft: 2,
  },
  timezoneCopy: {
    flex: 1,
  },
  timezoneHint: {
    color: '#A0A59D',
    fontSize: 10,
  },
  timezoneInput: {
    color: '#506B56',
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 116,
    padding: 0,
    textAlign: 'right',
  },
  errorMessage: {
    color: '#B04F43',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 9,
  },
  bottomBar: {
    backgroundColor: AppColors.background,
    borderTopColor: '#E5E8DE',
    borderTopWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#314D39',
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 20,
  },
  submitButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  submitLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  submitArrow: {
    color: '#C6E3B9',
    fontSize: 24,
    fontWeight: '400',
    marginLeft: 12,
  },
  footerNote: {
    color: '#9A9F97',
    fontSize: 11,
    marginBottom: 5,
    marginTop: 8,
    textAlign: 'center',
  },
});
