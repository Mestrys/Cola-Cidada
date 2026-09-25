import type { Config } from 'tailwindcss'

/**
 * Tailwind CSS v4 usa configuração majoritariamente via CSS (@theme).
 * Design system: Material Design 3 + Google Sans Flex (ver globals.css).
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Google Sans Flex Variable',
          'Google Sans Flex',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}

export default config
