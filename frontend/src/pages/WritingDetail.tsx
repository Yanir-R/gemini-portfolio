import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import Markdown from '@/components/Markdown';
import ReturnHome from '@/components/ReturnHome';
import { writingService, stripWritingMetadata } from '@/services/writingService';
import { WritingEntry, WRITING_KIND_LABEL, WRITING_KIND_STYLE } from '@/types/writing';

/*
 * One piece, read as a document.
 *
 * Images sit between the prose and the source link rather than inline, because
 * the markdown these were written in has no idea where its images belong - a
 * LinkedIn post is text plus attachments, not an illustrated article. Grouping
 * them keeps the reading uninterrupted and still shows what was published
 * alongside it.
 *
 * The attribution at the end is the point of republishing rather than
 * summarising: the full text is here so it can be read and cited, and the
 * canonical link says where it actually lives.
 */
const formatDate = (iso: string): string => {
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return iso;
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    });
};

const WritingDetail: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [entry, setEntry] = useState<WritingEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // The state resets live inside the async function rather than the effect
    // body, which is what keeps `react-hooks/set-state-in-effect` satisfied:
    // a synchronous setState during the effect is an extra render pass for a
    // value the fetch is about to overwrite anyway.
    useEffect(() => {
        if (!slug) return;
        let cancelled = false;

        const fetchEntry = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await writingService.getBySlug(slug);
                if (!cancelled) setEntry(data);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'The request failed.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchEntry();

        return () => {
            cancelled = true;
        };
    }, [slug]);

    if (loading) {
        return (
            <div className="px-4 pt-8 pb-16 mx-auto max-w-2xl sm:pt-12">
                <p className="font-mono text-sm text-muted" role="status">
                    Loading<span className="animate-blink">…</span>
                </p>
            </div>
        );
    }

    if (error || !entry) {
        return (
            <div className="px-4 pt-8 pb-16 mx-auto max-w-2xl sm:pt-12">
                <p className="label">Not found</p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-content">
                    Nothing published at this address.
                </h1>
                <p className="mt-3 leading-relaxed text-muted">
                    {error ?? 'That piece does not exist, or its slug has changed.'}
                </p>
                <Link
                    to="/blog"
                    className="inline-block px-3 py-1.5 mt-5 font-mono text-xs tracking-wider uppercase rounded border transition-colors duration-200 text-content border-border hover:border-border-hover"
                >
                    All writing
                </Link>
            </div>
        );
    }

    const body = stripWritingMetadata(entry.content);
    const allMedia = entry.media ?? [];

    /*
     * An article's first image is its hero and belongs above the text, the way
     * it does on the site it came from. A post's images are attachments: they
     * restate the argument rather than opening it, and they were published
     * below the words, so that is where they stay.
     *
     * The same field drives both. The difference is the form, not the data.
     */
    const isArticle = entry.kind === 'article';
    const hero = isArticle ? allMedia[0] : undefined;
    const trailingMedia = isArticle ? allMedia.slice(1) : allMedia;

    return (
        <article className="px-4 pt-8 pb-16 mx-auto max-w-2xl sm:pt-12">
            <Link
                to="/blog"
                className="font-mono text-xs tracking-wider uppercase transition-colors duration-200 text-muted hover:text-content"
            >
                <span aria-hidden="true">←</span> All writing
            </Link>

            <header className="mt-6">
                <h1 className="text-3xl font-semibold tracking-tight leading-tight text-content sm:text-4xl">
                    {entry.title}
                </h1>

                <div className="flex flex-wrap gap-3 items-center mt-4 font-mono text-xs">
                    <span
                        className={`rounded border px-2 py-0.5 uppercase tracking-wider text-[0.62rem] ${
                            WRITING_KIND_STYLE[entry.kind] ?? 'text-muted border-border'
                        }`}
                    >
                        {WRITING_KIND_LABEL[entry.kind] ?? entry.kind}
                    </span>
                    <time dateTime={entry.date} className="text-muted">
                        {formatDate(entry.date)}
                    </time>
                    <span className="text-muted">{entry.source}</span>
                </div>
            </header>

            {hero && (
                <img
                    src={hero}
                    alt=""
                    className="mt-7 w-full h-auto rounded border border-border"
                />
            )}

            <div className="mt-8">
                <Markdown>{body}</Markdown>
            </div>

            {trailingMedia.length > 0 && (
                <section className="flex flex-col gap-4 mt-10">
                    {trailingMedia.map((src) => (
                        <img
                            key={src}
                            src={src}
                            // Decorative in the accessibility sense: each one
                            // restates the argument the prose above already
                            // makes, so describing them would repeat it.
                            alt=""
                            loading="lazy"
                            className="w-full h-auto rounded border border-border"
                        />
                    ))}
                </section>
            )}

            <footer className="pt-6 mt-12 border-t border-border">
                <p className="text-sm leading-relaxed text-muted">
                    {/* "LinkedIn" and "Medium" are proper nouns and read
                        correctly straight after "on". A descriptive label like
                        "Engineering blog" needs an article in front of it to
                        scan as English. */}
                    Originally published on{' '}
                    {/blog/i.test(entry.source)
                        ? `the ${entry.source.toLowerCase()}`
                        : entry.source}
                    .{' '}
                    <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline transition-colors text-content hover:text-signal underline-offset-4 decoration-border"
                    >
                        Read it there
                    </a>{' '}
                    <span aria-hidden="true">↗</span>
                </p>

                {entry.related && entry.related.length > 0 && (
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                        Related:{' '}
                        {entry.related.map((related, index) => (
                            <React.Fragment key={related}>
                                {index > 0 && ', '}
                                <Link
                                    to={`/blog/${related}`}
                                    className="underline transition-colors text-content hover:text-signal underline-offset-4 decoration-border"
                                >
                                    {related.replace(/-/g, ' ')}
                                </Link>
                            </React.Fragment>
                        ))}
                    </p>
                )}
            </footer>

            <ReturnHome />
        </article>
    );
};

export default WritingDetail;
