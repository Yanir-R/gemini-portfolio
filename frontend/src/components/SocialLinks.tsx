import React from 'react';

interface SocialLink {
    href: string;
    label: string;
    hoverColor: string;
    icon: JSX.Element;
}

const SocialLinks: React.FC<{ className?: string }> = ({ className = "" }) => {
    const socialLinks: SocialLink[] = [
        {
            href: "https://github.com/Yanir-R",
            label: "GitHub Profile",
            hoverColor: "#2ea44f",
            icon: (
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" clipRule="evenodd" />
            )
        },
        {
            href: "https://www.linkedin.com/in/yanirrot/",
            label: "LinkedIn Profile",
            hoverColor: "#0a66c2",
            icon: (
                <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
            )
        },
        {
            href: "mailto:rotyanir@gmail.com",
            label: "Email Contact",
            hoverColor: "#9d4edd",
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            )
        }
    ];

    return (
        <div className={`flex items-center space-x-4 ${className}`}>
            {socialLinks.map((link, index) => (
                <a
                    key={index}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 transition-all duration-200 transform hover:scale-110 active:scale-95"
                    aria-label={link.label}
                    style={{ '--hover-color': link.hoverColor } as React.CSSProperties}
                    onMouseEnter={e => {
                        e.currentTarget.style.color = link.hoverColor;
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.color = '';
                    }}
                >
                    <svg
                        className="w-5 h-5 transition-transform duration-200"
                        fill={link.label === "Email Contact" ? "none" : "currentColor"}
                        stroke={link.label === "Email Contact" ? "currentColor" : undefined}
                        viewBox="0 0 24 24"
                    >
                        {link.icon}
                    </svg>
                </a>
            ))}
        </div>
    );
};

export default SocialLinks; 