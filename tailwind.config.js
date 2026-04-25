/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        rounded: [
          'Nunito',
          'ui-rounded',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
      colors: {
        child: {
          cream: '#FFF9EF',
          mint: '#EAF9E6',
          'mint-deep': '#C8EDBC',
          leaf: '#3EA02D',
          'leaf-dark': '#1E6B13',
          sky: '#EAF4FF',
          'sky-mid': '#C2E0FF',
          ocean: '#1457AE',
          blue: '#2E8CF0',
          'blue-soft': '#7BBBFF',
          'cream-warm': '#FFF7E1',
          sun: '#FFECB0',
          gold: '#FFB200',
          'gold-soft': '#FFD257',
          'amber-ink': '#7A5100',
          peach: '#FFD9C2',
          coral: '#F77444',
          'coral-soft': '#FFA47A',
          'coral-ink': '#8F3514',
          'rose-mist': '#F7CFEF',
          ink: '#183024',
          moss: '#556B5A',
        },
      },
      keyframes: {
        floaty: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) rotate(-4deg)' },
          '50%': { transform: 'translate3d(0, -18px, 0) rotate(5deg)' },
        },
      },
      animation: {
        floaty: 'floaty 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
