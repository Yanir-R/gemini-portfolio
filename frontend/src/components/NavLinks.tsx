import React from 'react';
import { NavLink, useLocation } from 'react-router';

/*
 * Words only - an icon beside each would encode nothing the word does not
 * already say. The active state does the only job an indicator has here,
 * showing where you are, with a 1px rule in the state colour.
 */
interface NavLinkItem {
    href: string;
    label: string;
}

interface NavLinksProps {
    isMobile?: boolean;
    className?: string;
    onNavigate?: () => void;
}

const LINKS: NavLinkItem[] = [
    { href: '/about', label: 'About' },
    { href: '/projects', label: 'Work' },
    { href: '/blog', label: 'Writing' },
];

const NavLinks: React.FC<NavLinksProps> = ({ isMobile = false, className = '', onNavigate }) => {
    const location = useLocation();
    const isHomePage = location.pathname === '/';

    const handleNavClick = () => {
        if (isMobile && onNavigate) {
            onNavigate();
        }
    };

    const baseStyles = isMobile
        ? 'block w-full px-4 py-3 font-mono text-sm tracking-wide text-muted transition-colors duration-200 border-b border-border last:border-b-0 hover:text-content'
        : 'relative font-mono text-xs uppercase tracking-[0.13em] text-muted transition-colors duration-200 hover:text-content';

    const underline = !isMobile
        ? "after:content-[''] after:absolute after:left-0 after:-bottom-1.5 after:h-px after:w-0 after:bg-signal after:transition-all after:duration-200 hover:after:w-full"
        : '';

    return (
        <nav
            className={`${isMobile ? 'flex flex-col' : 'flex items-center gap-7'} ${className}`}
            aria-label="Primary"
        >
            {isMobile && !isHomePage && (
                <NavLink to="/" onClick={handleNavClick} className={baseStyles}>
                    <span aria-hidden="true" className="mr-2">
                        ←
                    </span>
                    Home
                </NavLink>
            )}

            {LINKS.map((link) => (
                <NavLink
                    key={link.href}
                    to={link.href}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                        [
                            baseStyles,
                            underline,
                            isActive && !isMobile ? 'text-signal after:w-full' : '',
                            isActive && isMobile ? 'text-content' : '',
                        ]
                            .filter(Boolean)
                            .join(' ')
                    }
                >
                    {link.label}
                </NavLink>
            ))}
        </nav>
    );
};

export default NavLinks;
