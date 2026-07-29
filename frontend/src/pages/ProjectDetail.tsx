import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { Project, STATUS_STYLES, DEFAULT_STATUS_STYLE } from '@/types/project';
import { projectService } from '@/services/projectService';
import Markdown from '@/components/Markdown';

/*
 * The write-up, set as a document.
 *
 * The body was previously wrapped in terminal chrome - three window dots, a
 * fake prompt reading `cat project-details.md` - and set in monospace at 14px.
 * It is prose about how something was built, and dressing prose as shell output
 * made a long read harder for the sake of a costume. Mono is reserved for the
 * things the machine reports about itself.
 *
 * More consequentially, that body came from `utils/projectContent.ts`: a
 * hand-maintained second copy of each write-up, hardcoded in the frontend, 144
 * lines long, and already visibly diverged from the markdown the backend serves.
 * The API returns the real document as `project.content` - the same text
 * context.py assembles into the chat's corpus - so the page now renders that.
 *
 * This is what makes "the site keeps one corpus" true rather than aspirational:
 * what you read here and what the assistant answers from are now the same
 * bytes, and editing the markdown updates both.
 *
 * The overview also had a fallback of "An innovative project showcasing modern
 * development practices", which is what a page says when it has nothing to say.
 * A missing overview now renders nothing.
 */
const TECH_SHOWN_COLLAPSED = 6;

/*
 * Sections the backend parses into metadata, which must not also be rendered as
 * body copy. `## Status` / `paused` already appears as a chip, `## Overview` as
 * the lede, and `## Media` is a bare image URL - printing them again at the foot
 * of the write-up read as a form someone forgot to delete.
 */
const METADATA_HEADINGS = [
    'Overview',
    'Project Type',
    'Status',
    'Demo URL',
    'Repository',
    'Media',
    'Featured',
    'Category',
    'License',
];

const stripMetadataSections = (markdown: string): string =>
    markdown
        // Split on level-2 headings, keeping the heading with its section.
        .split(/\n(?=## )/)
        .filter((section) => {
            const heading = section.match(/^## (.+)$/m)?.[1]?.trim();
            return !heading || !METADATA_HEADINGS.includes(heading);
        })
        .join('\n')
        .trim();

const ProjectDetail: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAllTech, setShowAllTech] = useState(false);

    useEffect(() => {
        if (!slug) return;

        let cancelled = false;

        const fetchProject = async (projectSlug: string) => {
            try {
                setLoading(true);
                setError(null);
                const fetched = await projectService.getProjectBySlug(projectSlug);
                if (!cancelled) setProject(fetched);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'The request failed.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchProject(slug);

        return () => {
            cancelled = true;
        };
    }, [slug]);

    if (loading) {
        return (
            <div className="px-4 pt-8 pb-16 sm:pt-12 mx-auto max-w-3xl">
                <p className="font-mono text-sm text-muted" role="status">
                    Loading<span className="animate-blink">…</span>
                </p>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="px-4 pt-8 pb-16 sm:pt-12 mx-auto max-w-3xl">
                <p className="label">Not found</p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-content">
                    No write-up at this address.
                </h1>
                <p className="mt-3 leading-relaxed text-muted">
                    {error
                        ? 'The backend did not return this project.'
                        : 'That project does not exist, or its slug has changed.'}
                </p>
                <Link
                    to="/projects"
                    className="inline-block px-3 py-1.5 mt-5 font-mono text-xs tracking-wider uppercase rounded border transition-colors duration-200 text-content border-border hover:border-border-hover"
                >
                    All work
                </Link>
            </div>
        );
    }

    const mediaUrl = projectService.getProjectMediaUrl(project);
    const techStack = projectService.getProjectTechStack(project);
    const isVideo = project.media && projectService.isVideoFile(project.media);
    const content = project.content ? stripMetadataSections(project.content) : '';
    const canCollapse = techStack.length > TECH_SHOWN_COLLAPSED;
    const shownTech =
        canCollapse && !showAllTech ? techStack.slice(0, TECH_SHOWN_COLLAPSED) : techStack;

    return (
        <div className="px-4 pt-8 pb-16 sm:pt-12 mx-auto max-w-3xl">
            <Link
                to="/projects"
                className="font-mono text-xs tracking-wider uppercase transition-colors duration-200 text-muted hover:text-content"
            >
                <span aria-hidden="true">←</span> All work
            </Link>

            <header className="mt-6">
                <h1 className="text-3xl font-semibold tracking-tight leading-tight text-content sm:text-4xl">
                    {project.title}
                </h1>

                {project.overview && (
                    <p className="mt-4 text-lg leading-relaxed text-muted">{project.overview}</p>
                )}

                <div className="flex flex-wrap gap-3 items-center mt-5 font-mono text-xs">
                    {project.status && (
                        <span
                            className={`rounded border px-2 py-0.5 uppercase tracking-wider text-[0.62rem] ${
                                STATUS_STYLES[project.status] ?? DEFAULT_STATUS_STYLE
                            }`}
                        >
                            {project.status.replace('-', ' ')}
                        </span>
                    )}
                    {project.category && <span className="text-muted">{project.category}</span>}
                    {project.demo_url && (
                        <a
                            href={project.demo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="transition-colors duration-200 text-muted hover:text-signal"
                        >
                            Live site ↗
                        </a>
                    )}
                    {project.repository && project.repository !== 'Private Repository' && (
                        <a
                            href={project.repository}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="transition-colors duration-200 text-muted hover:text-signal"
                        >
                            Source ↗
                        </a>
                    )}
                </div>
            </header>

            {mediaUrl && (
                <div className="overflow-hidden mt-8 rounded border bg-ink-800 border-border">
                    {isVideo ? (
                        <video className="w-full h-auto" controls preload="metadata">
                            <source src={mediaUrl} type="video/mp4" />
                        </video>
                    ) : (
                        <img src={mediaUrl} alt="" loading="lazy" className="w-full h-auto" />
                    )}
                </div>
            )}

            {techStack.length > 0 && (
                <section className="mt-10">
                    <h2 className="label">Built with</h2>
                    <ul className="flex flex-wrap gap-2 mt-3 font-mono text-xs">
                        {shownTech.map((tech) => (
                            <li
                                key={tech}
                                className="px-2 py-1 rounded border text-muted border-border"
                            >
                                {tech}
                            </li>
                        ))}
                        {canCollapse && (
                            <li>
                                <button
                                    type="button"
                                    onClick={() => setShowAllTech((open) => !open)}
                                    className="px-2 py-1 rounded border transition-colors duration-200 text-content border-border hover:border-border-hover"
                                >
                                    {showAllTech
                                        ? 'Show fewer'
                                        : `+${techStack.length - TECH_SHOWN_COLLAPSED} more`}
                                </button>
                            </li>
                        )}
                    </ul>
                </section>
            )}

            {content && (
                <section className="mt-10">
                    <Markdown>{content}</Markdown>
                </section>
            )}

            <nav className="flex justify-between items-center pt-8 mt-16 font-mono text-xs tracking-wider uppercase border-t border-border">
                <Link
                    to="/projects"
                    className="transition-colors duration-200 text-muted hover:text-content"
                >
                    <span aria-hidden="true">←</span> All work
                </Link>
                <Link
                    to="/about"
                    className="transition-colors duration-200 text-muted hover:text-content"
                >
                    About <span aria-hidden="true">→</span>
                </Link>
            </nav>
        </div>
    );
};

export default ProjectDetail;
