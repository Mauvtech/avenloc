/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Palette exacte du prototype (ACCENT/INK/GRAY/BORDER/AMBER/AMBER_BG).
        brand: {
          DEFAULT: '#2454FF',
          hover: '#1d43cc',
          fg: '#2454FF',
          tint: '#EDF1FF',
        },
        ink: '#14171A',
        muted: '#6B7280',
        line: '#E7E7E7',
        canvas: '#F5F5F4',
        surface: '#FFFFFF',
        success: {
          DEFAULT: '#16A34A',
          tint: '#EAF7EF',
          fg: '#15803D',
        },
        warn: {
          DEFAULT: '#B45309',
          tint: '#FFF4E5',
          fg: '#B45309',
        },
        danger: {
          DEFAULT: '#DC2626',
          tint: '#FBEAEA',
          fg: '#B91C1C',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        display: ['var(--font-display)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '14px',
      },
      boxShadow: {
        // Le prototype est quasi plat : pas d'ombre sur boutons/cartes, juste
        // une ombre légère sur la barre de recherche et les menus déroulants.
        xs: 'none',
        card: 'none',
        raised: '0 1px 3px rgba(0,0,0,0.04)',
        header: '0 1px 0 #E7E7E7',
        modal: '0 4px 16px rgba(0,0,0,0.08)',
        focus: '0 0 0 3px rgba(36,84,255,0.18)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-up': 'slide-up 0.18s ease-out',
      },
    },
  },
  plugins: [],
};
