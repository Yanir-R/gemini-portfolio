import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface NavLink {
    href: string;
    label: string;
    icon: string;
}

interface NavLinksProps {
    isMobile?: boolean;
    className?: string;
    onNavigate?: () => void;
}

const NavLinks: React.FC<NavLinksProps> = ({ isMobile = false, className = "", onNavigate }) => {
    const location = useLocation();
    const isHomePage = location.pathname === '/';

    const handleNavClick = () => {
        if (isMobile && onNavigate) {
            onNavigate();
        }
    };

    const links: NavLink[] = [
        { href: "/about", label: "About Me", icon: "🤵🏼" },
        { href: "/projects", label: "Projects", icon: "🚀" },
        { href: "/blog", label: "Blog", icon: "📝" }
    ];

    const baseStyles = isMobile
        ? "block w-full px-4 py-3 text-lg font-medium text-gray-300 transition-all duration-300 bg-dark-secondary hover:bg-[#2a2a2a] rounded-lg border border-transparent hover:border-border-hover"
        : "relative text-base text-gray-300 transition-all duration-300 hover:text-white";

    const underlineStyles = !isMobile
        ? "before:content-[''] before:absolute before:w-0 before:h-[2px] before:bottom-[-4px] before:left-0 before:transition-all before:duration-300 hover:before:w-full before:bg-gradient-to-r before:from-purple-400 before:to-pink-600 hover:before:bg-gradient-to-r hover:before:from-cyan-500 hover:before:to-blue-500"
        : "";

    return (
        <div className={`${isMobile ? 'p-4 space-y-3' : 'flex space-x-8 text-base font-medium'} ${className}`}>

            {isMobile && !isHomePage && (
                <NavLink
                    to="/"
                    onClick={handleNavClick}
                    className={`flex items-center bg-gradient-to-r ${baseStyles} border-purple-500/20 from-purple-500/10 to-pink-500/10`}
                >
                    <span className="mr-2 text-xl text-purple-400">←</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                        cd ~/home
                    </span>
                </NavLink>
            )}
            
            {links.map((link) => (
                <NavLink
                    key={link.href}
                    to={link.href}
                    onClick={handleNavClick}
                    className={({ isActive }) => `
                        ${baseStyles}
                        ${underlineStyles}
                        ${isActive && !isMobile ? 'text-white before:w-full before:bg-[#ff7eee]' : ''}
                        ${isActive && isMobile ? 'bg-[#2a2a2a] border-gray-700 text-white' : ''}
                        ${isMobile ? 'flex items-center' : ''}
                    `}
                >
                    {isMobile ? (
                        <span className="mr-2 text-xl text-purple-400">→</span>
                    ) : (
                        <span className="mr-2 text-lg">{link.icon}</span>
                    )}
                    {link.label}
                </NavLink>
            ))}
        </div>
    );
};

export default NavLinks; 