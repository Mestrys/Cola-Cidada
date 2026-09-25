import type { Config } from 'tailwindcss'

/**
 * Tailwind CSS v4 usa configuração majoritariamente via CSS (@theme).
 * Este arquivo mantém a superfície pedida pelo monorepo e documenta
 * content paths / dark mode para ferramentas e shadcn/ui.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
