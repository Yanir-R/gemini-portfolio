/** @type {import('tailwindcss').Config} */

/*
 * An instrument palette, not a brand palette.
 *
 * The previous one was built around a purple->pink gradient, which is the most
 * common signature on AI developer portfolios and read as templated before a
 * word was. More importantly it spent colour on decoration, leaving nothing to
 * spend on meaning.
 *
 * Here colour carries state and nothing else:
 *   signal  - the assistant answered from the corpus
 *   caution - the assistant declined; no source supported the question
 *   danger  - something actually failed
 * Everything else is a neutral on the ink scale. There are no gradients.
 */
module.exports = {
    content: ['./src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        extend: {
            colors: {
                // Ground -> foreground. Blue-green cast rather than a pure grey,
                // so the neutrals read as chosen against the signal green.
                ink: {
                    900: '#0B0F12', // page background
                    800: '#111920', // panel, raised surface
                    700: '#16202A', // input, message bubble
                    600: '#1F2B34', // hairline
                    500: '#2A3945', // hairline, emphasised
                },
                content: '#D9E1E6', // body text
                muted: '#75868F', // secondary text, instrument labels

                // State. Used on text and 1px rules only - never as a fill
                // behind body copy, where none of them pass contrast.
                signal: '#5FD3A0',
                caution: '#E0A253',
                danger: '#E4726A',

                // Aliases kept so existing utility names resolve to the new
                // palette instead of silently falling back to Tailwind defaults.
                dark: {
                    primary: '#0B0F12',
                    secondary: '#111920',
                    tertiary: '#16202A',
                    terminal: '#0B0F12',
                },
                border: {
                    DEFAULT: '#1F2B34',
                    hover: '#2A3945',
                },
                status: {
                    online: '#5FD3A0',
                    error: '#E4726A',
                    warning: '#E0A253',
                },
            },
            fontFamily: {
                // Serif for prose, mono for instrumentation. The split is
                // semantic: serif is Yanir speaking, mono is the machine
                // reporting on itself, so a reader can always tell which is which.
                sans: ['Charter', 'Iowan Old Style', 'Georgia', 'serif'],
                mono: ['SF Mono', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
            },
            keyframes: {
                // The only motion left. `disco`, `float` and `bounce-gentle`
                // animated decorative emoji that no longer exist.
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(4px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                // Shown while the model is generating. This one reports
                // something true - a request is in flight - so it stays.
                blink: {
                    '0%, 80%, 100%': { opacity: '0.25' },
                    '40%': { opacity: '1' },
                },
            },
            animation: {
                fadeIn: 'fadeIn 0.25s ease-out forwards',
                blink: 'blink 1.4s ease-in-out infinite',
            },
        },
    },
    plugins: [],
};
