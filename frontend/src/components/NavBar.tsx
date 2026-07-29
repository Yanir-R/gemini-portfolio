import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router';
import HamburgerMenu from '@/components/HamburgerMenu';
import SocialLinks from '@/components/SocialLinks';
import NavLinks from '@/components/NavLinks';

/*
 * The wordmark was a gradient that swapped hue on hover, next to a lightning
 * bolt that faded in and rotated. Two animations and four colours on the one
 * element whose job is to sit still and say whose site this is.
 *
 * It now has exactly one animation, and it carries information: on a narrow
 * screen the name flies into the hamburger as you scroll down and comes back
 * out when you scroll up, so the header quietly explains where the name went
 * rather than just deleting it. The distance is measured from the two elements
 * rather than guessed, so the name genuinely lands in the hamburger's mouth at
 * any viewport width.
 *
 * Desktop keeps the name put: there is no hamburger above `lg`, so there would
 * be nothing for it to fly into. The CSS neutralises the transform at that
 * breakpoint, which is why the eaten state is a class rather than an inline
 * style that would win over any media query.
 */

// Ignore sub-pixel scroll jitter, which would otherwise flip the state
// continuously on a trackpad and leave the name flickering.
const SCROLL_EPSILON = 4;

// Below this the name is always out, so the top of a page never opens on a
// half-eaten header.
const SCROLL_REVEAL_ABOVE = 24;

// Matches the chomp keyframes in index.css.
const CHOMP_MS = 420;

const NavBar: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEaten, setIsEaten] = useState(false);
    const [isChomping, setIsChomping] = useState(false);

    const wordmarkRef = useRef<HTMLAnchorElement>(null);
    const burgerRef = useRef<HTMLDivElement>(null);
    const lastScrollY = useRef(0);
    const chompTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Mirrors `isEaten` so the scroll handler can see the previous value and
    // fire the bite only on the change. Deriving it from an effect on `isEaten`
    // instead would be a setState during render commit, which is both a lint
    // error and an extra render for something the handler already knows.
    const eatenRef = useRef(false);

    // Distance from the wordmark's right edge to the centre of the hamburger.
    const [eatX, setEatX] = useState(0);

    const measure = useCallback(() => {
        const word = wordmarkRef.current?.getBoundingClientRect();
        const burger = burgerRef.current?.getBoundingClientRect();
        if (!word || !burger) return;
        setEatX(burger.left + burger.width / 2 - word.right);
    }, []);

    useEffect(() => {
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [measure]);

    // The bite fires on the transition into `eaten`, not for as long as the name
    // is gone, so the hamburger snaps shut once rather than chewing forever.
    const setEaten = useCallback((next: boolean) => {
        if (eatenRef.current === next) return;
        eatenRef.current = next;
        setIsEaten(next);

        if (!next) return;
        if (chompTimer.current) clearTimeout(chompTimer.current);
        setIsChomping(true);
        chompTimer.current = setTimeout(() => setIsChomping(false), CHOMP_MS);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const y = window.scrollY;

            if (y <= SCROLL_REVEAL_ABOVE) {
                setEaten(false);
            } else if (y > lastScrollY.current + SCROLL_EPSILON) {
                setEaten(true);
            } else if (y < lastScrollY.current - SCROLL_EPSILON) {
                setEaten(false);
            }

            lastScrollY.current = y;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [setEaten]);

    useEffect(
        () => () => {
            if (chompTimer.current) clearTimeout(chompTimer.current);
        },
        []
    );

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

    // Swallowing the name while the menu is open would hide the way back home
    // behind the very control the visitor is already using.
    const hideWordmark = isEaten && !isMenuOpen;

    return (
        <>
            {/* Spacer matching the fixed bar's height. */}
            <div className="h-16 lg:h-20" />

            {/* The page background, not a surface of its own.
                A scrolled state used to add `bg-ink-900/85`, a bottom border and
                a backdrop blur, which drew a lighter band with a hairline under
                it across the top of every page.

                Taking the exact page colour removed the band, but a bar that
                stays put is still a bar. Hiding the whole header on scroll was
                worse again - it took the only way into the menu with it, and
                scrolling with no navigation anywhere reads as broken rather than
                as clean.

                So below `lg` there is no bar at all: the header is transparent
                and its two controls carry their own small backgrounds, floating
                over the page. Nothing spans the width, so there is no row to
                feel sticky, and the hamburger never leaves. Above `lg` the bar
                stays opaque, because the nav links and social icons do span the
                width and would otherwise sit on top of the text. */}
            <header className="fixed top-0 right-0 left-0 z-50 lg:bg-ink-900">
                <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16 lg:h-20">
                        <Link
                            ref={wordmarkRef}
                            to="/"
                            // The chip is what lets the bar behind it disappear:
                            // without a background of its own the name would sit
                            // directly on whatever text is scrolling past.
                            className={`wordmark rounded bg-ink-900/90 px-2 py-1 font-mono text-base tracking-tight backdrop-blur-sm text-content hover:text-signal lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none ${
                                hideWordmark ? 'is-eaten' : ''
                            }`}
                            style={{ '--eat-x': `${eatX}px` } as React.CSSProperties}
                            aria-label="Home"
                            // Hidden from assistive tech and from tab order only
                            // while it is off screen; the nav below still links home.
                            aria-hidden={hideWordmark}
                            tabIndex={hideWordmark ? -1 : undefined}
                        >
                            Yanir Rot
                        </Link>

                        <div className="hidden gap-8 items-center lg:flex">
                            <NavLinks />
                            <div className="w-px h-4 bg-border" aria-hidden="true" />
                            <SocialLinks className="flex gap-5 items-center" />
                        </div>

                        <div ref={burgerRef} className="lg:hidden">
                            <HamburgerMenu
                                isOpen={isMenuOpen}
                                onClick={toggleMenu}
                                isChomping={isChomping && !isMenuOpen}
                            />
                        </div>
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
