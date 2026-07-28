import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import HamburgerMenu from '@/components/HamburgerMenu';
import SocialLinks from '@/components/SocialLinks';
import NavLinks from '@/components/NavLinks';

/*
 * The wordmark was a gradient that swapped hue on hover, next to a lightning
 * bolt that faded in and rotated. Two animations and four colours on the one
 * element whose job is to sit still and say whose site this is.
 */
const NavBar: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // The menu locks body scroll while open, so the class has to come off on
    // unmount too - otherwise navigating away mid-transition leaves the page
    // unscrollable.
    useEffect(() => () => document.body.classList.remove('menu-open'), []);

    const toggleMenu = () => {
        setIsMenuOpen((open) => {
            document.body.classList.toggle('menu-open', !open);
            return !open;
        });
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
        document.body.classList.remove('menu-open');
    };

    return (
        <>
            {/* Spacer matching the fixed bar's height. */}
            <div className="h-16 lg:h-20" />

            <header
                className={`fixed top-0 right-0 left-0 z-50 transition-colors duration-200 ${
                    scrolled ? 'border-b bg-ink-900/85 border-border backdrop-blur-md' : ''
                }`}
            >
                <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16 lg:h-20">
                        {/* The wordmark was "yanir.dev", a domain this site does
                            not use - it is served from a pages.dev address. A
                            wordmark asserting an address that resolves nowhere is
                            the one piece of chrome that must not be aspirational,
                            so it is simply the name. */}
                        <Link
                            to="/"
                            className="font-mono text-base tracking-tight transition-colors duration-200 text-content hover:text-signal"
                            aria-label="Home"
                        >
                            Yanir Rot
                        </Link>

                        <div className="hidden gap-8 items-center lg:flex">
                            <NavLinks />
                            <div className="w-px h-4 bg-border" aria-hidden="true" />
                            <SocialLinks className="flex gap-5 items-center" />
                        </div>

                        <HamburgerMenu isOpen={isMenuOpen} onClick={toggleMenu} />
                    </div>
                </div>

                <div
                    id="mobile-menu"
                    className={`lg:hidden absolute inset-x-0 top-16 border-y bg-ink-900/97 border-border backdrop-blur-md transition-opacity duration-200 ${
                        isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                    hidden={!isMenuOpen}
                >
                    <NavLinks isMobile onNavigate={closeMenu} />
                    <div className="px-4 py-4 border-t border-border">
                        <SocialLinks className="flex gap-5 items-center" />
                    </div>
                </div>
            </header>
        </>
    );
};

export default NavBar;
