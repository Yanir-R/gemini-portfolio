/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                dark: {
                    primary: '#0A0A0A',    // Main background
                    secondary: '#1E1E1E',  // Container background
                    tertiary: '#2A2A2A',   // Message bubbles
                },
                accent: {
                    purple: '#9333EA',     // Purple accent color
                    green: '#22C55E',      // Online status
                }
            },
        },
    },
    plugins: [],
} 