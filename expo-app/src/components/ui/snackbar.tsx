import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Message {
  id: number;
  text: string;
  action?: { label: string; onPress: () => void };
}

interface SnackbarApi {
  /** Mostra um aviso curto; com `action` (ex.: Desfazer) ele fica mais tempo na tela. */
  show: (text: string, action?: Message['action']) => void;
}

const Ctx = createContext<SnackbarApi>({ show: () => {} });
export const useSnackbar = () => useContext(Ctx);

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [msg, setMsg] = useState<Message | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const counter = useRef(0);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }).start(({ finished }) => finished && setMsg(null));
  }, [opacity]);

  const show = useCallback<SnackbarApi['show']>(
    (text, action) => {
      clearTimeout(timer.current);
      setMsg({ id: ++counter.current, text, action });
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(hide, action ? 6000 : 3200);
    },
    [hide, opacity]
  );

  useEffect(() => () => clearTimeout(timer.current), []);
  const api = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {msg ? (
        <Animated.View
          accessibilityLiveRegion="polite"
          style={[styles.wrap, { opacity, backgroundColor: theme.text, bottom: BottomTabInset + Spacing.three }]}>
          <View style={styles.row}>
            <ThemedText type="small" style={[styles.text, { color: theme.background }]}>
              {msg.text}
            </ThemedText>
            {msg.action ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  msg.action?.onPress();
                  hide();
                }}
                style={styles.action}>
                <ThemedText type="smallBold" style={{ color: theme.primaryContainer }}>
                  {msg.action.label}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    alignSelf: 'center',
    maxWidth: 560,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    zIndex: 50,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  text: { flex: 1 },
  action: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
});
