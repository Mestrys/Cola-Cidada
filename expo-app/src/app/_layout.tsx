import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

// Abre sempre no grupo de abas, mesmo ao entrar por um link direto para uma tela empilhada.
export const unstable_settings = {
  anchor: '(tabs)',
};

// Raiz do app: uma pilha. As abas ficam no grupo (tabs); telas fora da barra (detalhes, modais)
// entram aqui como irmãs de "(tabs)", por exemplo src/app/modal.tsx com presentation: 'modal'.
export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}
