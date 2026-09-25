import type { Metadata } from 'next'

import '@/styles/fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cola Cidadã',
  description:
    'Sua cola eleitoral vira controle do mandato. Acompanhe atos públicos dos políticos eleitos com dados oficiais.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  )
}
