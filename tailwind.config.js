/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        paper: '#F8F5F0',
        ink: '#1A1A1A',
        muted: '#666666',
        faint: '#999999',
        accent: '#8B5A2B',
        hairline: '#E5E0D8',
      },
      fontFamily: {
        serif: ['Gilda Display', 'Georgia', 'Songti SC', 'serif'],
        sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
