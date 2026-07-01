import type { Config } from 'tailwindcss'
import daisyui from 'daisyui'

export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        'primary-soft': '#eff6ff',
        surface: '#fff',
        'surface-2': '#f8fafc',
        text: '#0f172a',
        muted: '#64748b',
        border: '#e6e9f2',
        bg: '#f4f6fb',
      },
      fontFamily: {
        sans: ['IBM Plex Sans Thai', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: '11px',
        sm: '12px',
        md: '13px',
        base: '13.5px',
        lg: '15px',
        xl: '17px',
        '2xl': '19px',
        '3xl': '21px',
        '4xl': '25px',
        '5xl': '30px',
      },
      boxShadow: {
        default: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        md: '0 4px 12px rgba(37, 99, 235, 0.15)',
        lg: '0 24px 60px rgba(0, 0, 0, 0.28)',
      },
      animation: {
        fade: 'tmsfade 0.2s ease both',
        slide: 'tmsslide 0.28s cubic-bezier(0.2, 0.9, 0.3, 1) both',
      },
      keyframes: {
        tmsfade: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        tmsslide: {
          from: { opacity: '0', transform: 'translateY(14px) scale(0.98)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        light: {
          primary: '#2563EB',
          'primary-focus': '#1d4ed8',
          'primary-content': '#ffffff',
          secondary: '#f97316',
          accent: '#10b981',
          neutral: '#2a2e37',
          'base-100': '#ffffff',
          'base-200': '#f8fafc',
          'base-300': '#e6e9f2',
          info: '#3b82f6',
          success: '#10b981',
          warning: '#f97316',
          error: '#ef4444',
        },
      },
      {
        dark: {
          primary: '#2563EB',
          'primary-focus': '#1d4ed8',
          'primary-content': '#ffffff',
          secondary: '#f97316',
          accent: '#10b981',
          neutral: '#2a2e37',
          'base-100': '#0b1220',
          'base-200': '#111827',
          'base-300': '#1f2937',
          info: '#3b82f6',
          success: '#10b981',
          warning: '#f97316',
          error: '#ef4444',
        },
      },
    ],
  },
} satisfies Config
