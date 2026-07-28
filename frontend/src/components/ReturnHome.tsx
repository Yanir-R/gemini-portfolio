import React from 'react';
import { Link } from 'react-router';

/*
 * A Link rather than a button calling navigate(), so it opens in a new tab on
 * middle-click or cmd-click like every other link on the site.
 */
const ReturnHome: React.FC = () => (
    <Link
        to="/"
        className="flex fixed right-6 bottom-6 gap-2 items-center px-3 py-2 font-mono text-xs tracking-wider uppercase rounded border transition-colors duration-200 text-muted bg-ink-800/90 border-border backdrop-blur-sm hover:text-content hover:border-border-hover"
    >
        <span aria-hidden="true">←</span>
        Home
    </Link>
);

export default ReturnHome;
