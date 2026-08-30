import { Pressable, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';

import { AppColors } from '@/constants/theme';

type SearchBarProps = {
  accessibilityLabel: string;
  onChangeText: (value: string) => void;
  onClear?: () => void;
  placeholder: string;
  style?: StyleProp<ViewStyle>;
  value: string;
};

export function SearchBar({
  accessibilityLabel,
  onChangeText,
  onClear,
  placeholder,
  style,
  value,
}: SearchBarProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.searchIcon}>⌕</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#99A49B"
        returnKeyType="search"
        style={styles.input}
        value={value}
      />
      {value && onClear ? (
        <Pressable
          accessibilityLabel="검색어 지우기"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClear}
          style={styles.clearButton}>
          <Text style={styles.clearText}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8DF',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    height: 48,
    paddingHorizontal: 14,
  },
  searchIcon: {
    color: AppColors.primaryText,
    fontSize: 22,
    lineHeight: 25,
    marginRight: 8,
    transform: [{ rotate: '-20deg' }],
  },
  input: {
    color: AppColors.primaryText,
    flex: 1,
    fontSize: 14,
    height: 46,
    paddingVertical: 0,
  },
  clearButton: {
    alignItems: 'center',
    backgroundColor: AppColors.primarySurface,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  clearText: {
    color: AppColors.tabBarInactive,
    fontSize: 20,
    lineHeight: 22,
  },
});
