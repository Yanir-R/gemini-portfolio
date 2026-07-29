import { useState, useEffect } from 'react';

/*
 * Reports the viewport. It does not reshape it: nothing here locks the body,
 * and nothing rewrites the viewport meta tag, so every page scrolls normally
 * and pinch zoom stays available.
 *
 * The one thing it writes to the document is `--vh`, which exists to be read.
 * The chat panel needs a viewport-relative height for the single case where the
 * visible area genuinely changes under it: the soft keyboard opening.
 */
export const useScreenSize = () => {
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    useEffect(() => {
        const handleScreenUpdate = () => {
            // A soft keyboard shrinks the visual viewport well below the window.
            setIsKeyboardVisible(window.innerHeight < window.outerHeight * 0.75);

            document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        };

        handleScreenUpdate();

        window.addEventListener('resize', handleScreenUpdate);
        window.addEventListener('orientationchange', handleScreenUpdate);

        return () => {
            window.removeEventListener('resize', handleScreenUpdate);
            window.removeEventListener('orientationchange', handleScreenUpdate);
        };
    }, []);

    return { isKeyboardVisible };
};
