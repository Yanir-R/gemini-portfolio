import React from 'react';

interface HamburgerMenuProps {
    isOpen: boolean;
    onClick: () => void;
    /** Runs the bite once, as the wordmark disappears into it. */
    isChomping?: boolean;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ isOpen, onClick, isChomping = false }) => {
    return (
        <button
            // Its own background, for the same reason the wordmark has one: the
            // header behind it is transparent, so this floats over the page and
            // has to stay legible against whatever scrolls underneath.
            className={`p-2.5 rounded border bg-ink-900/90 border-border backdrop-blur-sm lg:hidden ${
                isChomping && !isOpen ? 'is-chomping' : ''
            }`}
            onClick={onClick}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
        >
            <div className="space-y-1.5">
                {/* The bars are the jaw. While the menu is open they hold the
                    cross, so the bite is suppressed there rather than fighting
                    the rotation for control of the same transform. */}
                <span
                    className={`chomp-top block w-6 h-px bg-content transition-transform duration-200 ${isOpen ? 'rotate-45 translate-y-2' : ''}`}
                />
                <span
                    className={`chomp-mid block w-6 h-px bg-content transition-opacity duration-200 ${isOpen ? 'opacity-0' : ''}`}
                />
                <span
                    className={`chomp-bottom block w-6 h-px bg-content transition-transform duration-200 ${isOpen ? '-rotate-45 -translate-y-2' : ''}`}
                />
            </div>
        </button>
    );
};

export default HamburgerMenu;
