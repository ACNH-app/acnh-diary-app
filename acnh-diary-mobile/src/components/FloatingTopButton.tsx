import { Pressable, StyleSheet, Text } from 'react-native';

import { AppColors } from '@/constants/theme';

type FloatingTopButtonProps = {
  accessibilityLabel: string;
  onPress: () => void;
};

export function FloatingTopButton({ accessibilityLabel, onPress }: FloatingTopButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.icon}>↑</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: AppColors.primarySoft,
    borderRadius: 23,
    bottom: 18,
    elevation: 4,
    height: 46,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    shadowColor: AppColors.primaryBorder,
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    width: 46,
    zIndex: 10,
  },
  icon: {
    color: AppColors.primaryText,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 25,
  },
  pressed: {
    opacity: 0.78,
  },
});
