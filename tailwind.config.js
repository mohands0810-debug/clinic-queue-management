/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0284c7',
          600: '#0369a1',
          700: '#0F4C81', // Clinical Deep Blue
          800: '#073259',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        senior: {
          amber: '#FFD700',
          emerald: '#059669',
        },
      },
      fontSize: {
        'senior-base': '1.25rem', // 20px
        'senior-lg': '1.5rem',    // 24px
        'senior-xl': '1.75rem',   // 28px
        'senior-2xl': '2.25rem',  // 36px
        'token-display': '4.5rem',// 72px
      },
      minHeight: {
        'touch-target': '56px',
        'button-tall': '64px',
      },
    },
  },
  plugins: [],
};
