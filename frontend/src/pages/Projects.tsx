import React, { useState, useEffect } from 'react';
import ProjectCard from '@/components/ProjectCard';
import { Project } from '@/types/project';
import { projectService } from '@/services/projectService';
import ReturnHome from '@/components/ReturnHome';

/*
 * Loading and error states report, they do not perform. One line each: what
 * happened, and what to do about it. The request usually resolves in under a
 * second, so anything more elaborate is theatre - and a failure is the moment a
 * visitor least wants an apology in place of the reason.
 */
const Projects: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Bumped by "Try again" to re-run the fetch effect.
    const [reloadToken, setReloadToken] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const fetchProjects = async () => {
            try {
                setLoading(true);
                setError(null);
                const fetched = await projectService.getAllProjects();

                // Featured first, otherwise the order the backend returned.
                // Nothing is pinned by slug here, so the running order stays
                // editable in the markdown rather than needing a deploy.
                const sorted = [...fetched].sort((a, b) => {
                    if (a.featured === b.featured) return 0;
                    return a.featured ? -1 : 1;
                });

                if (!cancelled) setProjects(sorted);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'The request failed.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchProjects();

        return () => {
            cancelled = true;
        };
    }, [reloadToken]);

    return (
        <div className="px-4 pt-8 pb-16 sm:pt-12 mx-auto max-w-6xl">
            <header className="max-w-2xl">
                <p className="label">Work</p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl text-content">
                    Things I built, and what was hard about them.
                </h1>
                <p className="mt-3 leading-relaxed text-muted">
                    Each write-up is also part of what the assistant on the home page answers from,
                    so you can read it here or ask about it there.
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
                        The project list could not load.
                    </h2>
                    <p className="mt-2 leading-relaxed text-muted">
                        The backend did not respond. Reload, or ask the assistant on the home page:
                        it answers from the same write-ups.
                    </p>
                    <p className="mt-2 font-mono text-xs break-words text-muted/70">{error}</p>
                    <button
                        type="button"
                        onClick={() => setReloadToken((token) => token + 1)}
                        className="px-3 py-1.5 mt-4 font-mono text-xs tracking-wider uppercase rounded border transition-colors duration-200 text-content border-border hover:border-border-hover"
                    >
                        Try again
                    </button>
                </div>
            )}

            {!loading && !error && projects.length === 0 && (
                <p className="mt-10 leading-relaxed text-muted">No write-ups published yet.</p>
            )}

            {!loading && !error && projects.length > 0 && (
                <div className="grid grid-cols-1 gap-5 mt-10 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => (
                        <ProjectCard
                            key={project.slug}
                            project={project}
                            className="animate-fadeIn"
                        />
                    ))}
                </div>
            )}

            <ReturnHome />
        </div>
    );
};

export default Projects;
