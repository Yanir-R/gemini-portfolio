import { useState, useEffect } from 'react';

interface ScreenSize {
    isMobile: boolean;
    isTablet: boolean;
    isKeyboardVisible: boolean;
    safeAreaBottom: number;
}

/*
 * Reports the viewport. It no longer reshapes it.
 *
 * This hook used to reach out and set, on mount and never undone:
 *
 *     document.body.style.position = 'fixed';
 *     document.body.style.height = '100dvh';
 *     document.documentElement.style.height = '100dvh';
 *
 * A `position: fixed` body is clamped to the viewport and cannot scroll, so the
 * home page could not scroll at all: its content measured 857px inside a 788px
 * body, and the last 20px - the bottom of the composer - were simply
 * unreachable. Overflow settings had nothing to do with it, which is why
 * changing them changed nothing.
 *
 * Worse, it was global and had no cleanup, and only Home mounts the chat. So the
 * lock leaked: visit Home once and every other page inherited an unscrollable
 * body until a full reload.
 *
 * It made sense when the chat was a locked full-screen surface. That layout is
 * gone. A hook named for reading the screen has no business rewriting it, so the
 * only things it still touches are two custom properties that exist to be read.
 *
 * The viewport meta rewrite went too. It set `maximum-scale=1.0,
 * user-scalable=0`, which disables pinch zoom - a real accessibility cost, and
 * one paid at runtime by mutating a tag that belongs in index.html.
 */
export const useScreenSize = () => {
    const [screenState, setScreenState] = useState<ScreenSize>({
        isMobile: false,
        isTablet: false,
        isKeyboardVisible: false,
        safeAreaBottom: 0,
    });

    useEffect(() => {
        const handleScreenUpdate = () => {
            const width = window.innerWidth;
            const isMobile = width < 640;
            const isTablet = width >= 640 && width < 1024;

            // A soft keyboard shrinks the visual viewport well below the window.
            const isKeyboardVisible = window.innerHeight < window.outerHeight * 0.75;
            const safeAreaBottom = window.innerHeight - document.documentElement.clientHeight;

            // Read by the chat panel, which still needs a viewport-relative
            // height for the one case where the visible area genuinely changes
            // under it: the keyboard opening.
            document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
            document.documentElement.style.setProperty('--sab', `${safeAreaBottom}px`);

            setScreenState({ isMobile, isTablet, isKeyboardVisible, safeAreaBottom });
        };

        handleScreenUpdate();

        window.addEventListener('resize', handleScreenUpdate);
        window.addEventListener('orientationchange', handleScreenUpdate);

        return () => {
            window.removeEventListener('resize', handleScreenUpdate);
            window.removeEventListener('orientationchange', handleScreenUpdate);
        };
    }, []);

    return screenState;
};
