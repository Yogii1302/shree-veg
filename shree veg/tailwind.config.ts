import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: '360px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      colors: {
        // Krishna Indigo and Marigold Required Design Tokens (CSS Variables)
        primary: {
          DEFAULT: 'var(--color-primary)',
          light: '#232E6E',
          dark: '#111738',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: '#D99600',
          light: '#FFBE2E',
          dark: '#B87B00',
        },
        'accent-ink': 'var(--color-accent-ink)',
        sand: {
          DEFAULT: 'var(--color-sand)',
          50: '#FDFBF7',
          100: 'var(--color-sand)',
          200: '#F3E8D3',
          300: '#E8D7B8',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          hover: 'var(--color-surface-hover)',
          dark: '#1A2048',
        },
        ink: 'var(--color-ink)',
        text: {
          DEFAULT: 'var(--color-text)',
          dark: '#F4EFE2',
        },
        muted: {
          DEFAULT: 'var(--color-muted)',
          light: '#7F86AD',
          dark: '#A8AFD4',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          hover: '#25664A',
          light: '#5CCB93',
          bg: '#EAF5F0',
        },
        alert: {
          DEFAULT: 'var(--color-alert)',
          hover: '#A82B22',
          light: '#F08A8A',
          bg: '#FDF0EE',
        },
        line: 'var(--color-line)',

        // Mandir Heritage Accents & Backward-Compatible Aliases
        marigold: {
          DEFAULT: 'var(--color-accent)',
          hover: '#D99600',
          light: '#FFBE2E',
          dark: '#B87B00',
        },
        tulsi: {
          DEFAULT: 'var(--color-success)',
          hover: '#25664A',
          light: '#5CCB93',
          bg: '#EAF5F0',
        },
        kumkum: {
          DEFAULT: 'var(--color-alert)',
          hover: '#A82B22',
          light: '#F08A8A',
          bg: '#FDF0EE',
        },
        brass: {
          DEFAULT: 'var(--color-brass)',
          light: '#E2BC50',
          dark: '#9E7A1B',
        },
        haldi: {
          DEFAULT: 'var(--color-haldi)',
          light: '#FEF3C7',
          dark: '#B45309',
        },
        darkbg: '#0F1330',
      },
      fontFamily: {
        heading: ['var(--font-yatra)', 'Yatra One', 'Georgia', 'serif'],
        body: ['var(--font-mukta)', 'Mukta', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['var(--font-mukta)', 'Mukta', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        arch: '0 8px 24px -4px rgba(27, 37, 89, 0.08), 0 2px 6px -1px rgba(197, 155, 39, 0.12)',
        brass: '0 0 16px -2px rgba(197, 155, 39, 0.25)',
        marigold: '0 4px 14px -2px rgba(242, 169, 0, 0.35)',
      },
      borderRadius: {
        'arch-sm': '1.5rem 1.5rem 0.75rem 0.75rem',
        'arch-md': '2.25rem 2.25rem 1rem 1rem',
        'arch-lg': '3.5rem 3.5rem 1.25rem 1.25rem',
      },
      keyframes: {
        mandirEntrance: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'entrance': 'mandirEntrance 0.35s ease-out forwards',
      },
    },
  },
  plugins: [],
};
export default config;

