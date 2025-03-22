import React, { useState, useEffect } from 'react';
import HamburgerMenu from '@/components/HamburgerMenu';
import SocialLinks from '@/components/SocialLinks';
import NavLinks from '@/components/NavLinks';

const NavBar: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Handle navbar background on scroll
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
        // Toggle a class on the body to prevent scrolling when menu is open
        document.body.classList.toggle('menu-open');
    };

    return (
        <>
            {/* Spacer div - different height for mobile */}
            <div className={`h-16 lg:h-20 transition-all duration-300 ${isMenuOpen ? 'mb-[280px]' : ''}`}></div>

            <nav className={`
                fixed top-0 left-0 right-0 z-50 font-sans
                transition-all duration-300 ease-in-out
                ${scrolled
                    ? 'bg-gray-900/80 backdrop-blur-md shadow-lg border-b border-purple-500/10'
                    : 'bg-transparent backdrop-blur-sm'}
            `}>
                <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16 lg:h-20">

                        <div className="flex items-center">
                            <a
                                href="/"
                                className="group flex items-center space-x-2 transition-all duration-300 hover:scale-105"
                                aria-label="Home"
                            >
                                <span className="relative font-mono text-xl lg:text-2xl font-bold">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 group-hover:from-cyan-500 group-hover:to-blue-500 transition-all duration-300">
                                        Yanir.dev
                                    </span>
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-600 group-hover:w-full transition-all duration-300"></span>
                                </span>
                                <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 text-lg lg:text-xl transform group-hover:rotate-12 group-hover:translate-x-1">
                                    ⚡
                                </span>
                            </a>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden lg:flex items-center">
                            <div className="flex items-center space-x-8">
                                <NavLinks />
                                <div className="h-6 w-px bg-gradient-to-b from-transparent via-purple-500/20 to-transparent"></div>
                                <SocialLinks className="flex items-center space-x-6" />
                            </div>
                        </div>

                        {/* Mobile menu button */}
                        <HamburgerMenu isOpen={isMenuOpen} onClick={toggleMenu} />
                    </div>
                </div>

                <div
                    className={`
                        lg:hidden absolute top-16 left-0 right-0 
                        transform transition-all duration-300 ease-in-out bg-gray-900/95 backdrop-blur-md
                        ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                    `}
                >
                    <div className="px-2 pt-2 pb-3 space-y-1 border-t border-purple-500/10 shadow-lg">
                        <div className="p-3 mx-2 mb-4 rounded-xl bg-gray-800/50 border border-purple-500/10 shadow-lg backdrop-blur-sm hover:bg-gray-800/60 transition-all duration-300">
                            <div className="flex items-center space-x-2 mb-3">
                                <div className="flex space-x-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-status-error/90 shadow-lg shadow-red-500/20"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-status-warning/90 shadow-lg shadow-yellow-500/20"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-status-online/90 shadow-lg shadow-green-500/20"></div>
                                </div>
                                <span className="ml-2 text-xs text-gray-400 font-mono">~/navigation</span>
                            </div>
                            <div className="transform transition-all duration-300 hover:scale-[1.01]">
                                <NavLinks isMobile />
                            </div>
                        </div>

                        <div className="px-4 py-3 bg-gray-800/30 rounded-lg backdrop-blur-sm mx-2 mb-2">
                            <SocialLinks className="flex justify-center space-x-4" />
                        </div>
                    </div>
                </div>
            </nav>
        </>
    );
};

export default NavBar; 