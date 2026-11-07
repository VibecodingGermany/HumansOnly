import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './content/**/*.{md,mdx}',
  ],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      nav: '861px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        display: ['var(--font-display)', '"Bebas Neue"', 'Impact', '"Arial Narrow"', 'sans-serif'],
        head: ['var(--font-head)', '"Arial Narrow"', 'sans-serif'],
        sans: ['var(--font-sans)', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        hand: ['var(--font-hand)', '"Comic Neue"', '"Bradley Hand"', 'cursive'],
        mono: ['var(--font-jetbrains-mono)', 'Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
      spacing: {
        'vcg-1': 'var(--space-1)',
        'vcg-2': 'var(--space-2)',
        'vcg-3': 'var(--space-3)',
        'vcg-4': 'var(--space-4)',
        'vcg-5': 'var(--space-5)',
        'vcg-6': 'var(--space-6)',
        'vcg-7': 'var(--space-7)',
        'vcg-8': 'var(--space-8)',
        'vcg-9': 'var(--space-9)',
        'vcg-10': 'var(--space-10)',
      },
      maxWidth: {
        vcg: '1280px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        'vcg-0': 'var(--radius-0)',
        'vcg-sm': 'var(--radius-sm)',
        'vcg-md': 'var(--radius-md)',
        'vcg-lg': 'var(--radius-lg)',
      },
      colors: {
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          muted: 'var(--ink-muted)',
          inverse: 'var(--ink-inverse)',
        },
        line: 'var(--line)',
        focus: 'var(--focus)',
        'vcg-blue': 'var(--blue)',
        'on-blue': 'var(--on-blue)',
        'vcg-mango': 'var(--mango)',
        'vcg-mango-deep': 'var(--mango-deep)',
        'on-mango': 'var(--on-mango)',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        pulseFast: 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      boxShadow: {
        sticker: 'var(--shadow-sticker)',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
};
export default config;
