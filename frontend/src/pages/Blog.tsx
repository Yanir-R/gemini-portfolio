import React from 'react';
import { Link } from 'react-router';
import ReturnHome from '@/components/ReturnHome';

/*
 * An empty state, not a "Coming Soon!".
 *
 * A dead nav item is worse than a missing one, and a centred "Coming Soon!"
 * tells a visitor only that they wasted a click. This page instead says
 * something true and specific: writing published here becomes part of the same
 * corpus the assistant answers from, because context.py builds that corpus out
 * of the project write-ups this site already serves.
 *
 * That is a real property of the system rather than a promise about the future,
 * and it gives the page a reason to exist before the first post lands.
 */
const Blog: React.FC = () => {
    return (
        <div className="px-4 pt-8 pb-16 sm:pt-12 mx-auto max-w-2xl">
            <p className="label">Writing</p>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl text-content">
                Nothing published yet.
            </h1>

            <p className="mt-4 leading-relaxed text-muted">
                When a post lands here it becomes two things at once: a page you can read, and a
                document the assistant on the home page can answer from. This site keeps one corpus
                rather than two, so what you read and what it knows cannot drift apart.
            </p>

            <p className="mt-4 leading-relaxed text-muted">
                Until then this page stays empty rather than pretending otherwise. The{' '}
                <Link
                    to="/projects"
                    className="underline transition-colors text-content hover:text-signal underline-offset-4 decoration-border"
                >
                    project write-ups
                </Link>{' '}
                are the closest thing to it in the meantime.
            </p>

            <ReturnHome />
        </div>
    );
};

export default Blog;
