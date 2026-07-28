import React from 'react';

interface HamburgerMenuProps {
    isOpen: boolean;
    onClick: () => void;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ isOpen, onClick }) => {
    return (
        <button
            className="p-2 lg:hidden"
            onClick={onClick}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
        >
            <div className="space-y-1.5">
                <span
                    className={`block w-6 h-px bg-content transition-transform duration-200 ${isOpen ? 'rotate-45 translate-y-2' : ''}`}
                />
                <span
                    className={`block w-6 h-px bg-content transition-opacity duration-200 ${isOpen ? 'opacity-0' : ''}`}
                />
                <span
                    className={`block w-6 h-px bg-content transition-transform duration-200 ${isOpen ? '-rotate-45 -translate-y-2' : ''}`}
                />
            </div>
        </button>
    );
};

export default HamburgerMenu;
