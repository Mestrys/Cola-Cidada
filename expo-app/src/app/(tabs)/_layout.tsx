import AppTabs from '@/components/app-tabs';

// Barra de abas. Cada arquivo irmão (index.tsx, explore.tsx…) vira uma aba; os rótulos e ícones ficam em
// src/components/app-tabs.tsx (nativo) e app-tabs.web.tsx (web). A URL não inclui "(tabs)".
export default function TabsLayout() {
  return <AppTabs />;
}
