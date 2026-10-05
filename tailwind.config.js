/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      /**
       * SEMANTIC TOKENS (light theme)
       * ---------------------------------------------------------------------
       * Colour names describe *role*, not hue, so the palette can be re-themed
       * by editing this block alone:
       *   ink-*      text            (primary / muted / faint)
       *   surface-*  backgrounds      (page / subtle / raised / hover)
       *   line-*     borders + dividers (default / strong)
       *   card       elevated surface (white + shadow)
       *   brand      the lime accent  (DEFAULT = fill, deep = readable text on white)
       *   violet / cyan / ember       supporting accents + chart series
       */
      colors: {
        ink: {
          DEFAULT: '#0B0F19', // 19.2:1 on white
          muted: '#4B5468',   //  7.3:1 — body copy on any surface
          faint: '#68707E',   //  4.6:1 — the 10px mono labels still pass AA
        },
        surface: {
          DEFAULT: '#FFFFFF',
          2: '#F8F9FC',
          3: '#F1F4F9',
          4: '#E7EBF3',
        },
        line: {
          DEFAULT: '#E7E9F2', // decorative dividers (WCAG-exempt)
          strong: '#7E8798',  // 3.3:1+ on white / surface-2 / surface-3 — every
                              // input, secondary button and strikethrough boundary
        },
        card: '#FFFFFF',
        /* INDIGO leads: every interactive surface, every tinted chip, every
           focus ring. 6.3:1 against white, and white on it is 6.3:1. */
        brand: {
          DEFAULT: '#4F46E5', // buttons, links, active states, focus ring
          deep: '#3730A3',    // 9.9:1 — indigo text/icons sitting on a tint
          edge: '#6366F1',    // 3.7:1 vs the progress track — the light end
          tint: '#EEF0FF',
        },
        /* LIME is a highlighter, and that is its whole job. It is the only
           colour in the system that reads as "highlight": ink on it is 16.4:1,
           our strongest pair. It never fills a button, never marks a dot on
           white (1.17:1), never carries text. Used in ~4 places on purpose. */
        lime: {
          DEFAULT: '#CCFF4D',
          ink: '#3F6400',     // 6.9:1 — when lime has to be read
          tint: '#F2FFD6',
        },
        violet: {
          DEFAULT: '#5B3DF5',
          soft: '#EDE9FF',
          deep: '#4A2FD6',
        },
        cyan: {
          DEFAULT: '#0A7186', // 5.2:1 on white, 4.8:1 on its own 12% tint
          soft: '#E1F6FB',
          deep: '#086478',
          bright: '#0E93B0',  // chart series only — never text, never a boundary
        },
        ember: {
          DEFAULT: '#B04A12', // 5.5:1 on white, 4.6:1 on its own tint — from #E2621A
          soft: '#FFF0E7',
          bright: '#E2621A',  // chart series only
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Inter',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.045em',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        // Light theme: shadows carry the elevation, borders stay hairline-thin.
        card: '0 1px 2px rgba(11,15,25,0.04), 0 10px 28px -14px rgba(11,15,25,0.12)',
        raised: '0 1px 2px rgba(11,15,25,0.05), 0 18px 40px -18px rgba(11,15,25,0.18)',
        pop: '0 28px 70px -18px rgba(11,15,25,0.22), 0 2px 6px rgba(11,15,25,0.06)',
        glow: '0 6px 20px -6px rgba(79,70,229,0.42)',
        highlight: '0 2px 10px -3px rgba(79,70,229,0.35)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(to right, rgba(11,15,25,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(11,15,25,0.045) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '56px 56px',
      },
      keyframes: {
        'gradient-pan': {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'gradient-pan': 'gradient-pan 7s ease infinite',
        marquee: 'marquee 32s linear infinite',
        'pulse-ring': 'pulse-ring 2.2s cubic-bezier(0.24,0.6,0.35,1) infinite',
        float: 'float 5s ease-in-out infinite',
        shimmer: 'shimmer 2s infinite',
      },
    },
  },
  plugins: [],
};
