/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'oklch(0.52 0.16 290 / <alpha-value>)',
          hover: 'oklch(0.45 0.16 290 / <alpha-value>)',
          fg: 'oklch(0.44 0.17 290 / <alpha-value>)',
          tint: 'oklch(0.96 0.028 290 / <alpha-value>)',
        },
        ink: 'oklch(0.21 0.012 265 / <alpha-value>)',
        muted: 'oklch(0.52 0.014 265 / <alpha-value>)',
        line: 'oklch(0.9 0.005 265 / <alpha-value>)',
        canvas: 'oklch(0.985 0.003 265 / <alpha-value>)',
        surface: 'oklch(1 0 0 / <alpha-value>)',
        success: {
          DEFAULT: 'oklch(0.62 0.14 155 / <alpha-value>)',
          tint: 'oklch(0.96 0.04 155 / <alpha-value>)',
          fg: 'oklch(0.42 0.11 155 / <alpha-value>)',
        },
        warn: {
          DEFAULT: 'oklch(0.75 0.15 75 / <alpha-value>)',
          tint: 'oklch(0.96 0.05 80 / <alpha-value>)',
          fg: 'oklch(0.48 0.11 65 / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'oklch(0.58 0.19 25 / <alpha-value>)',
          tint: 'oklch(0.96 0.03 25 / <alpha-value>)',
          fg: 'oklch(0.5 0.17 25 / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        md: '0.625rem',
        lg: '0.875rem',
        xl: '1.125rem',
      },
      boxShadow: {
        xs: '0 1px 2px oklch(0.2 0.02 265 / 0.05)',
        card: '0 1px 3px oklch(0.2 0.02 265 / 0.06), 0 1px 2px oklch(0.2 0.02 265 / 0.04)',
        raised: '0 4px 12px oklch(0.2 0.02 265 / 0.08), 0 2px 4px oklch(0.2 0.02 265 / 0.04)',
        header: '0 1px 0 oklch(0.9 0.005 265 / 1)',
        modal: '0 16px 48px oklch(0.15 0.02 265 / 0.24)',
        focus: '0 0 0 3px oklch(0.52 0.16 290 / 0.18)',
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
