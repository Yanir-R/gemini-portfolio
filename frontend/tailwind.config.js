/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Dark theme colors
                dark: {
                    primary: '#0A0A0A',    // Main background
                    secondary: '#1E1E1E',  // Container background
                    tertiary: '#2A2A2A',   // Message bubbles, hover states
                    terminal: '#11111b',   // Terminal background
                },
                // Brand colors
                brand: {
                    purple: {
                        light: '#b65eff',
                        DEFAULT: '#9d4edd',
                        dark: '#7b2cbf',
                    },
                    pink: {
                        DEFAULT: '#ff7eee',
                    }
                },
                // Status colors
                status: {
                    online: '#22C55E',     // Green status
                    error: '#EF4444',      // Red status
                    warning: '#F59E0B',    // Yellow status
                },
                // Border colors
                border: {
                    DEFAULT: '#2a2b36',
                    hover: '#374151',      // gray-700
                },
                // Gradient colors for consistent usage
                gradient: {
                    start: '#9d4edd',      // Purple start
                    middle: '#b65eff',     // Purple middle
                    end: '#ff7eee',        // Pink end
                },
                // Background gradients
                bg: {
                    dark: {
                        start: '#13141f',
                        end: '#1a1b26',
                    },
                    card: {
                        start: '#1c1d29',
                        end: '#1c1d29',    // With 80% opacity when needed
                    }
                },
                blue: {
                    400: '#60A5FA',
                    500: '#3B82F6',
                    600: '#2563EB',
                },
                pink: {
                    400: '#F472B6',
                    500: '#EC4899',
                    600: '#DB2777',
                },
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['Fira Code', 'monospace'],
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                disco: {
                    '0%': {
                        filter: 'hue-rotate(0deg) brightness(100%) saturate(100%)',
                        transform: 'scale(1.1) rotate(12deg)',
                        boxShadow: '0 0 20px rgba(157, 78, 221, 0.3)'
                    },
                    '25%': {
                        filter: 'hue-rotate(90deg) brightness(130%) saturate(150%)',
                        transform: 'scale(1.15) rotate(-8deg)',
                        boxShadow: '0 0 35px rgba(182, 94, 255, 0.4)'
                    },
                    '50%': {
                        filter: 'hue-rotate(180deg) brightness(150%) saturate(200%)',
                        transform: 'scale(1.1) rotate(-12deg)',
                        boxShadow: '0 0 50px rgba(157, 78, 221, 0.5)'
                    },
                    '75%': {
                        filter: 'hue-rotate(270deg) brightness(130%) saturate(150%)',
                        transform: 'scale(1.15) rotate(8deg)',
                        boxShadow: '0 0 35px rgba(182, 94, 255, 0.4)'
                    },
                    '100%': {
                        filter: 'hue-rotate(360deg) brightness(100%) saturate(100%)',
                        transform: 'scale(1.1) rotate(12deg)',
                        boxShadow: '0 0 20px rgba(157, 78, 221, 0.3)'
                    }
                },
                float: {
                    '0%, 100%': {
                        transform: 'translateY(0)'
                    },
                    '50%': {
                        transform: 'translateY(-5px)'
                    }
                },
                pulse: {
                    '0%, 100%': {
                        opacity: 1,
                        transform: 'scale(1)'
                    },
                    '50%': {
                        opacity: 0.8,
                        transform: 'scale(0.9)'
                    }
                }
            },
            animation: {
                fadeIn: 'fadeIn 0.3s ease-out forwards',
                disco: 'disco 3s ease-in-out infinite',
                float: 'float 3s ease-in-out infinite',
                pulse: 'pulse 2s ease-in-out infinite'
            },
        },
    },
    plugins: [],
} 