import { useState, useEffect } from 'react';

interface ScreenSize {
    isMobile: boolean;
    isTablet: boolean;
    isKeyboardVisible: boolean;
    safeAreaBottom: number;
}

export const useScreenSize = () => {
    const [screenState, setScreenState] = useState<ScreenSize>({
        isMobile: false,
        isTablet: false,
        isKeyboardVisible: false,
        safeAreaBottom: 0
    });

    useEffect(() => {
        // Initialize viewport meta for mobile
        const metaViewport = document.querySelector('meta[name=viewport]');
        if (metaViewport) {
            metaViewport.setAttribute('content', 
                'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0, viewport-fit=cover'
            );
        }

        // Set initial body styles
        document.body.style.height = '100dvh';
        document.documentElement.style.height = '100dvh';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.overscrollBehavior = 'none';

        const handleScreenUpdate = () => {
            // Screen size breakpoints
            const width = window.innerWidth;
            const isMobile = width < 640;
            const isTablet = width >= 640 && width < 1024;

            // Keyboard detection
            const isKeyboardVisible = window.innerHeight < window.outerHeight * 0.75;

            // Safe area calculation
            const safeAreaBottom = window.innerHeight - document.documentElement.clientHeight;

            // Update viewport height variable
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            document.documentElement.style.setProperty('--sab', `${safeAreaBottom}px`);

            setScreenState({
                isMobile,
                isTablet,
                isKeyboardVisible,
                safeAreaBottom
            });
        };

        // Initial check
        handleScreenUpdate();

        // Event listeners
        window.addEventListener('resize', handleScreenUpdate);
        window.addEventListener('orientationchange', handleScreenUpdate);

        return () => {
            window.removeEventListener('resize', handleScreenUpdate);
            window.removeEventListener('orientationchange', handleScreenUpdate);
        };
    }, []);

    return screenState;
}; 