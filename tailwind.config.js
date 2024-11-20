/** @type {import('tailwindcss').Config} */
import tokens from './tokens.json';
const colorTokens = tokens.primitives.color;
const typographyTokens = tokens.primitives.font;
const tailwindColors = require('tailwindcss/colors')

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      "primary": colorTokens.primary[500],
      "on-primary": colorTokens.neutral[0],
      "surface": {
        DEFAULT: colorTokens.neutral[0],
        dark: colorTokens.neutral[800]
      },
      "on-surface": {
        DEFAULT: colorTokens.neutral[1000],
        dark: colorTokens.neutral[0]
      },
      "on-surface-variant": {
        DEFAULT: colorTokens.neutral[500],
        dark: colorTokens.neutral[400]
      },
      "surface-container": {
        DEFAULT: colorTokens.neutral[100],
        dark: colorTokens.neutral[700]
      },
      "on-surface-container": {
        DEFAULT: colorTokens.neutral[1000],
        dark: colorTokens.neutral[0]
      },
      "on-surface-container-variant": {
        DEFAULT: colorTokens.neutral[200],
        dark: colorTokens.neutral[600]
      },
      "surface-container-high": {
        DEFAULT: colorTokens.neutral[200],
        dark: colorTokens.neutral[600]
      },
      "on-surface-container-high": {
        DEFAULT: colorTokens.neutral[1000],
        dark: colorTokens.neutral[0]
      },
      "on-surface-container-high-variant": {
        DEFAULT: colorTokens.neutral[300],
        dark: colorTokens.neutral[500]
      },
      "error": {
        DEFAULT: tailwindColors.rose[500],
        dark: tailwindColors.rose[500]
      },
      "on-error": {
        DEFAULT: colorTokens.neutral[1000],
        dark: colorTokens.neutral[1000]
      }
    },
    fontFamily: {
      sans: [typographyTokens.family.body, 'sans-serif'],
    },
    extend: {
      // colors: {
      //   ...defaultTheme.colors,
      // },
      divideColor: {
        current: colorTokens.divider.light,
        dark: colorTokens.divider.dark,
      },
      fontSize: {
        'sm': typographyTokens.size[300],
        'base': typographyTokens.size[500]
      },
    },
  },
  plugins: [],
  darkMode: ['class', '.figma-dark']
}
