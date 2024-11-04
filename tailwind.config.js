/** @type {import('tailwindcss').Config} */
import tokens from './tokens.json';
const colors = tokens.primitives.color;
const typography = tokens.primitives.font;

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      // divideColor: {
      //   current: colors.neutral[600],
      //   dark: colors.neutral[600],
      //   DEFAULT: colors.neutral[600],
      // },
      "primary": colors.primary[500],
      "on-primary": colors.neutral[0],
      "surface": {
        DEFAULT: colors.neutral[0],
        dark: colors.neutral[800]
      },
      "on-surface": {
        DEFAULT: colors.neutral[1000],
        dark: colors.neutral[0]
      },
      "on-surface-variant": {
        DEFAULT: colors.neutral[400],
        dark: colors.neutral[400]
      },
      "surface-container": {
        DEFAULT: colors.neutral[100],
        dark: colors.neutral[700]
      },
      "on-surface-container": {
        DEFAULT: colors.neutral[1000],
        dark: colors.neutral[0]
      },
      "on-surface-container-variant": {
        DEFAULT: colors.neutral[200],
        dark: colors.neutral[600]
      },
      "surface-container-high": {
        DEFAULT: colors.neutral[200],
        dark: colors.neutral[600]
      },
      "on-surface-container-high": {
        DEFAULT: colors.neutral[1000],
        dark: colors.neutral[0]
      },
      "on-surface-container-high-variant": {
        DEFAULT: colors.neutral[300],
        dark: colors.neutral[500]
      },
    },
    fontFamily: {
      sans: [typography.family.body, 'sans-serif'],
    },
    extend: {
      divideColor: {
        current: colors.divider.light,
        dark: colors.divider.dark,
      },
      fontSize: {
        'sm': typography.size[300],
        'base': typography.size[500]
      },
    },
  },
  plugins: [],
  darkMode: ['class', '.figma-dark']
}
