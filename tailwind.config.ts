import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14213d',
        calm: '#eff6ff',
        teal: '#2563eb',
        steel: '#475569',
      },
      boxShadow: {
        board: '0 24px 60px rgba(15, 23, 42, 0.12)',
      },
      backgroundImage: {
        'board-grid':
          'linear-gradient(rgba(15, 23, 42, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.06) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}

export default config
