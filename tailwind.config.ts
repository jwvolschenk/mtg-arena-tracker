import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark "game night" base
        base: '#181c22',
        panel: '#212529',
        card: '#2C3342',
        'card-hover': '#353d50',
        // Electric cyan accent (Credo-inspired)
        accent: {
          DEFAULT: '#00C0F3',
          strong: '#00AEEF',
          deep: '#0079b3',
        },
        // Secondary accents
        navy: '#00568C',
        plum: '#504157',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 16px rgba(0, 192, 243, 0.45)',
        'glow-lg': '0 0 32px rgba(0, 192, 243, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
