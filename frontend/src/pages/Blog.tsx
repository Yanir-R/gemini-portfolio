import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import ReturnHome from '@/components/ReturnHome';
import { writingService } from '@/services/writingService';
import { WritingEntry, WRITING_KIND_LABEL, WRITING_KIND_STYLE } from '@/types/writing';

/*
 * The writing index.
 *
 * A dated list rather than a grid of cards. These pieces were published in two
 * places and two lengths, and the thing a reader needs first is when it was
 * written and how long it is - not a thumbnail. Date, kind, title, one line.
 *
 * Articles and posts share the list on purpose. Separating them into sections
 * would ask the reader to care about where something was published before they
 * know whether it interests them, and the `kind` chip already answers that for
 * anyone who does.
 */
const formatDate = (iso: string): string => {
    // Parsed as UTC deliberately: `new Date('2025-11-25')` is midnight UTC, and
    // formatting that in a timezone behind UTC would show the 24th.
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return iso;
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    });
};

const Blog: React.FC = () => {
    const [entries, setEntries] = useState<WritingEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const fetchWriting = async () => {
            try {
                const data = await writingService.getAll();
                if (!cancelled) setEntries(data);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'The request failed.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchWriting();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="px-4 pt-8 pb-16 mx-auto max-w-3xl sm:pt-12">
            <header className="max-w-2xl">
                <p className="label">Writing</p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl text-content">
                    Things I worked out in public.
                </h1>
                <p className="mt-3 leading-relaxed text-muted">
                    Published on LinkedIn and the Dalton blog, reproduced here in full with a link
                    to the original. Each one is also part of what the assistant on the home page
                    answers from, so you can read it here or ask about it there.
                </p>
            </header>

            {loading && (
                <p className="mt-10 font-mono text-sm text-muted" role="status">
                    Loading<span className="animate-blink">…</span>
                </p>
            )}

            {error && (
                <div className="mt-10 max-w-xl">
                    <h2 className="text-lg font-semibold tracking-tight text-content">
                        The writing list could not load.
                    </h2>
                    <p className="mt-2 leading-relaxed text-muted">
                        The backend did not respond. Reload, or ask the assistant on the home page
                        about any of it.
                    </p>
                    <p className="mt-2 font-mono text-xs break-words text-muted/70">{error}</p>
                </div>
            )}

            {!loading && !error && entries.length === 0 && (
                <p className="mt-10 leading-relaxed text-muted">Nothing published yet.</p>
            )}

            {!loading && !error && entries.length > 0 && (
                <ul className="mt-10 border-t border-border">
                    {entries.map((entry) => (
                        <li key={entry.slug} className="border-b border-border">
                            <Link
                                to={`/blog/${entry.slug}`}
                                className="grid gap-1 items-baseline py-5 transition-colors duration-200 group sm:grid-cols-[7.5rem_1fr] sm:gap-x-5"
                            >
                                <div className="flex gap-2.5 items-center">
                                    <time
                                        dateTime={entry.date}
                                        className="font-mono text-xs whitespace-nowrap text-muted"
                                    >
                                        {formatDate(entry.date)}
                                    </time>
                                    <span
                                        className={`rounded border px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider sm:hidden ${
                                            WRITING_KIND_STYLE[entry.kind] ??
                                            'text-muted border-border'
                                        }`}
                                    >
                                        {WRITING_KIND_LABEL[entry.kind] ?? entry.kind}
                                    </span>
                                </div>

                                <div className="min-w-0">
                                    <div className="flex flex-wrap gap-2.5 items-baseline">
                                        <h2 className="text-lg font-semibold leading-snug transition-colors duration-200 text-content group-hover:text-signal">
                                            {entry.title}
                                        </h2>
                                        <span
                                            className={`hidden rounded border px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider sm:inline ${
                                                WRITING_KIND_STYLE[entry.kind] ??
                                                'text-muted border-border'
                                            }`}
                                        >
                                            {WRITING_KIND_LABEL[entry.kind] ?? entry.kind}
                                        </span>
                                    </div>

                                    {entry.summary && (
                                        <p className="mt-1.5 text-sm leading-relaxed text-muted">
                                            {entry.summary}
                                        </p>
                                    )}

                                    <p className="mt-2 font-mono text-[0.68rem] text-muted/70">
                                        {entry.source}
                                    </p>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            <ReturnHome />
        </div>
    );
};

export default Blog;
