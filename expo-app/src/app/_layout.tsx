import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { SnackbarProvider } from '@/components/ui/snackbar';
import { Colors } from '@/constants/theme';
import { StoreProvider } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

// Abre sempre no grupo de abas, mesmo ao entrar por um link direto para uma tela empilhada.
export const unstable_settings = {
  anchor: '(tabs)',
};

// Raiz do app: uma pilha. As abas ficam no grupo (tabs); telas fora da barra (ficha, cadastro) são irmãs dele.
export default function RootLayout() {
  const dark = useColorScheme() === 'dark';
  const c = Colors[dark ? 'dark' : 'light'];
  const base = dark ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, primary: c.primary, background: c.background, card: c.background, text: c.text, border: c.border } };

  return (
    <ThemeProvider value={theme}>
      <StoreProvider>
        <SnackbarProvider>
          <AnimatedSplashOverlay />
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="adicionar" options={{ presentation: 'modal', title: 'Seguir político' }} />
            <Stack.Screen name="politico/[id]" options={{ title: 'Ficha' }} />
          </Stack>
        </SnackbarProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}
