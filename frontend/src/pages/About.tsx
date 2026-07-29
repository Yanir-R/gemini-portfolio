import React from 'react';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import ReturnHome from '@/components/ReturnHome';

/*
 * The bio, readable immediately: the whole document arrives at once, in the
 * page's own type. It is prose about a person, so it is set as prose - no
 * typing animation to opt out of, and no terminal chrome, which would be a
 * costume rather than a frame.
 */
const About: React.FC = () => {
    const [content, setContent] = React.useState<string>('');
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        let cancelled = false;

        const fetchContent = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const response = await apiClient.get(
                    API_ENDPOINTS.GET_MARKDOWN_CONTENT('about-me.md')
                );
                if (!cancelled) setContent(response.data.content);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'The request failed.');
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        fetchContent();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="px-4 pt-8 pb-16 sm:pt-12 mx-auto max-w-2xl">
            {/* The name and role live here rather than in about-me.md so the
                document stays pure prose - it is also sent to the model as
                context, where a heading is noise. */}
            <p className="label">About</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl text-content">
                Yanir Rot
            </h1>
            <p className="mt-1 font-mono text-xs tracking-wider uppercase text-muted">
                Full-stack AI engineer
            </p>

            {isLoading && (
                <p className="mt-3 font-mono text-sm text-muted" role="status">
                    Loading<span className="animate-blink">…</span>
                </p>
            )}

            {error && (
                <div className="mt-6">
                    <h2 className="text-xl font-semibold tracking-tight text-content">
                        This page could not load.
                    </h2>
                    <p className="mt-3 leading-relaxed text-muted">
                        The backend did not return the file. Reload to try again, or ask the{' '}
                        <a
                            href="/"
                            className="underline transition-colors text-content hover:text-signal underline-offset-4 decoration-border"
                        >
                            assistant on the home page
                        </a>{' '}
                        answers from the same document and may still be up.
                    </p>
                    <p className="mt-3 font-mono text-xs break-words text-muted/70">{error}</p>
                </div>
            )}

            {!isLoading && !error && (
                // Split on blank lines into real paragraphs. Rendering the whole
                // document with `whitespace-pre-wrap` would keep the line breaks
                // but give every paragraph the same gap as a wrapped line, so
                // the prose would read as one undifferentiated block.
                <div className="flex flex-col gap-5 mt-6 animate-fadeIn">
                    {content
                        .trim()
                        .split(/\n\s*\n/)
                        .map((paragraph, index) => (
                            <p
                                key={index}
                                className="text-lg leading-relaxed text-content first:text-xl first:leading-snug"
                            >
                                {paragraph.trim()}
                            </p>
                        ))}
                </div>
            )}

            <ReturnHome />
        </div>
    );
};

export default About;
