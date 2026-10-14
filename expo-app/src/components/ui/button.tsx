import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'danger';

interface Props extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
}

/** Botão com área de toque de pelo menos 44 pontos. */
export function Button({ label, variant = 'primary', disabled, style, ...rest }: Props) {
  const theme = useTheme();
  const bg = variant === 'primary' ? theme.primary : theme.backgroundElement;
  const fg = variant === 'primary' ? theme.onPrimary : variant === 'danger' ? theme.danger : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={(state) => [
        styles.base,
        { backgroundColor: bg, borderColor: variant === 'primary' ? bg : theme.border },
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      <ThemedText type="smallBold" style={{ color: fg }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: Spacing.four,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.5 },
});
