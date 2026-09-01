import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark "game night" base
        base: '#12151c',
        panel: '#1b202a',
        card: '#232b3a',
        'card-hover': '#2c3648',
        // Electric cyan accent (Credo brand primary)
        accent: {
          DEFAULT: '#00C0F3',
          strong: '#00AEEF',
          deep: '#0079b3',
        },
        // Credo support colors
        navy: '#00568C',
        plum: '#504157',
        // Champion gold (leaderboard crowns)
        gold: {
          DEFAULT: '#d9b45b',
          soft: '#f0d48a',
          deep: '#9a7b2d',
        },
        // MTG mana colors (decorative accents)
        mana: {
          w: '#f4f0e6',
          u: '#0aa1e8',
          b: '#4b4453',
          r: '#e54c2e',
          g: '#2fa06a',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Cinzel = Trajan-style engraved capitals, the MTG logo look
        display: ['var(--font-cinzel)', 'var(--font-inter)', 'serif'],
      },
      boxShadow: {
        glow: '0 0 16px rgba(0, 192, 243, 0.45)',
        'glow-lg': '0 0 32px rgba(0, 192, 243, 0.35)',
        'glow-gold': '0 0 18px rgba(217, 180, 91, 0.4)',
      },
    },
  },
  plugins: [],
};

export default config;
