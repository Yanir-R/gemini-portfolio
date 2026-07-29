import React from 'react';
import { Link } from 'react-router';
import { Project, STATUS_STYLES, DEFAULT_STATUS_STYLE } from '@/types/project';
import { projectService } from '@/services/projectService';

interface ProjectCardProps {
    project: Project;
    className?: string;
}

/*
 * The title is a real `Link` whose ::before covers the card, so the whole
 * surface is clickable while the destination stays keyboard-reachable,
 * middle-clickable and announced as a link - none of which a `div` with an
 * `onClick` would be.
 *
 * The chips are the write-up's own stack in the write-up's own order. Ranking
 * them here would freeze an editorial judgement in a component, where it goes
 * stale the moment a project's emphasis changes and is invisible to whoever
 * edits the markdown.
 */
const MAX_TECH_SHOWN = 5;

const ProjectCard: React.FC<ProjectCardProps> = ({ project, className = '' }) => {
    const mediaUrl = projectService.getProjectMediaUrl(project);
    const techStack = projectService.getProjectTechStack(project);
    const isVideo = mediaUrl && projectService.isVideoFile(mediaUrl);
    const shown = techStack.slice(0, MAX_TECH_SHOWN);
    const overflow = techStack.length - shown.length;

    return (
        <article
            className={`group relative flex h-full flex-col overflow-hidden rounded border border-border bg-ink-800 transition-colors duration-200 focus-within:border-border-hover hover:border-border-hover ${className}`}
        >
            <div className="overflow-hidden relative h-44 border-b bg-ink-900 border-border">
                {mediaUrl ? (
                    isVideo ? (
                        <video
                            className="object-cover w-full h-full"
                            muted
                            loop
                            playsInline
                            onMouseEnter={(e) => e.currentTarget.play()}
                            onMouseLeave={(e) => e.currentTarget.pause()}
                        >
                            <source src={mediaUrl} type="video/mp4" />
                        </video>
                    ) : (
                        <img
                            src={mediaUrl}
                            alt=""
                            loading="lazy"
                            className="object-cover w-full h-full"
                        />
                    )
                ) : (
                    <div className="flex justify-center items-center h-full font-mono text-xs text-muted">
                        no preview
                    </div>
                )}
            </div>

            <div className="flex flex-col flex-grow gap-3 p-5">
                <h3 className="text-lg font-semibold tracking-tight leading-snug text-content">
                    <Link
                        to={`/projects/${project.slug}`}
                        className="transition-colors duration-200 hover:text-signal before:absolute before:inset-0 before:content-['']"
                    >
                        {project.title}
                    </Link>
                </h3>

                <div className="flex flex-wrap gap-2 items-center">
                    {project.status && (
                        <span
                            className={`rounded border px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-wider ${
                                STATUS_STYLES[project.status] ?? DEFAULT_STATUS_STYLE
                            }`}
                        >
                            {project.status.replace('-', ' ')}
                        </span>
                    )}
                    {project.category && (
                        <span className="font-mono text-[0.68rem] text-muted">
                            {project.category}
                        </span>
                    )}
                </div>

                {project.overview && (
                    <p className="text-sm leading-relaxed line-clamp-3 text-muted">
                        {project.overview}
                    </p>
                )}

                {shown.length > 0 && (
                    <ul className="flex flex-wrap gap-x-2 gap-y-1 mt-auto font-mono text-[0.68rem] text-muted">
                        {shown.map((tech) => (
                            <li key={tech} className="px-1.5 py-0.5 rounded border border-border">
                                {tech}
                            </li>
                        ))}
                        {overflow > 0 && <li className="px-1.5 py-0.5">+{overflow}</li>}
                    </ul>
                )}

                {(project.demo_url ||
                    (project.repository && project.repository !== 'Private Repository')) && (
                    // Above the title link's overlay, so these stay independently
                    // clickable rather than being swallowed by the card.
                    <div className="flex relative z-10 gap-4 pt-3 mt-3 font-mono text-xs border-t border-border">
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
                )}
            </div>
        </article>
    );
};

export default ProjectCard;
