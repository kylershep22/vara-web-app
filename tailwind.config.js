/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // =============================================
      // VARA COLOR PALETTE
      // Source: mobile/src/constants/colors.ts
      // =============================================
      colors: {
        // Primary
        'evergreen-teal': '#1B5E57',
        'silver-sage': '#B8CDBA',

        // Secondary
        'sunrise-amber': '#F4C542',
        'golden-apricot': '#F5B971',

        // Neutral
        'mist-white': '#FAFAF6',
        'soft-charcoal': '#3E3E3E',

        // Accent
        'dew-sage': '#D5E3D1',
        'soft-coral': '#D97A6E',
        'muted-sage-gray': '#6F7F77',

        // Semantic aliases
        primary: '#1B5E57',
        surface: '#FFFFFF',
        error: '#D97A6E',
        success: '#1B5E57',
        warning: '#F5B971',
        info: '#1B5E57',

        // Alpha / derived (CSS vars used via custom properties)
        'teal-light': 'rgba(27,94,87,0.08)',
        'teal-medium': 'rgba(27,94,87,0.15)',
        'dew-sage-light': 'rgba(213,227,209,0.5)',
        divider: 'rgba(184,205,186,0.4)',

        // Brain pillars
        pillar: {
          growth: '#1B5E57',
          energy: '#F4C542',
          focus: '#B8CDBA',
          resilience: '#F5B971',
          connection: '#D5E3D1',
        },
      },

      // =============================================
      // VARA FONT FAMILY
      // =============================================
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },

      // =============================================
      // VARA FONT SIZES
      // Source: mobile/src/constants/typography.ts
      // =============================================
      fontSize: {
        'vara-xs': ['0.75rem', { lineHeight: '1.5' }],       // 12px - caption
        'vara-sm': ['0.875rem', { lineHeight: '1.5' }],      // 14px - body small
        'vara-base': ['1rem', { lineHeight: '1.5' }],        // 16px - body
        'vara-lg': ['1.125rem', { lineHeight: '1.3' }],      // 18px - h3
        'vara-xl': ['1.375rem', { lineHeight: '1.3' }],      // 22px - h2
        'vara-2xl': ['1.625rem', { lineHeight: '1.3' }],     // 26px - h1
        'vara-3xl': ['2rem', { lineHeight: '1.3' }],         // 32px - display
        'vara-timer': ['3rem', { lineHeight: '1' }],         // 48px - timer
      },

      // =============================================
      // VARA SPACING SCALE
      // Source: mobile/src/constants/spacing.ts
      // =============================================
      spacing: {
        'vara-2xs': '2px',
        'vara-xs': '4px',
        'vara-sm': '8px',
        'vara-md': '12px',
        'vara-base': '16px',
        'vara-lg': '24px',
        'vara-xl': '32px',
        'vara-2xl': '48px',
        'vara-3xl': '64px',
      },

      // =============================================
      // VARA BORDER RADIUS
      // =============================================
      borderRadius: {
        'vara-sm': '4px',
        'vara-md': '8px',
        'vara-lg': '12px',
        'vara-xl': '16px',
        'vara-pill': '9999px',
      },

      // =============================================
      // VARA SHADOWS (CSS box-shadow equivalents)
      // =============================================
      boxShadow: {
        'vara-sm': '0 1px 3px rgba(0, 0, 0, 0.04)',
        'vara-md': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'vara-lg': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'vara-teal': '0 2px 12px rgba(27, 94, 87, 0.19)',
      },

      // =============================================
      // VARA MIN/MAX HEIGHTS
      // =============================================
      minHeight: {
        'btn-sm': '48px',
        'btn-md': '48px',
        'btn-lg': '56px',
        'input': '48px',
      },

      height: {
        'header': '56px',
        'tab-bar': '56px',
      },

      // =============================================
      // VARA AVATAR SIZES
      // =============================================
      width: {
        'avatar-xs': '24px',
        'avatar-sm': '32px',
        'avatar-md': '40px',
        'avatar-lg': '64px',
        'avatar-xl': '100px',
      },

      // =============================================
      // VARA ANIMATIONS
      // =============================================
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        confetti: 'confetti 2s ease-out forwards',
      },
    },
  },
  plugins: [],
}
