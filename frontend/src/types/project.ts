export interface Project {
    slug: string;
    title: string;
    overview?: string;
    project_type: 'web-app' | 'native-app';
    // `paused` is what a private project that is no longer running and may not
    // be picked up again gets to say. A status set with no way to say "stopped"
    // forces every project to overstate itself.
    status: 'completed' | 'in-development' | 'production' | 'planning' | 'paused';
    demo_url?: string;
    repository?: string;
    media?: string;
    media_url?: string;
    has_media?: boolean;
    featured: boolean;
    category: string;
    content?: string;

    /*
     * Technical details, parsed from the write-up's `- **Label**: value` lines.
     *
     * The backend derives the key from the label, so the set is open: a new
     * bullet in the markdown becomes a new field with no code change at either
     * end. Enumerating them here would mean a list that has to be kept in step
     * with prose, and any label missing from it would silently never render.
     *
     * The named ones below are those the card orders deliberately; the index
     * signature carries everything else a write-up declares.
     */
    tech_frontend?: string;
    tech_backend?: string;
    tech_ai_ml?: string;
    tech_cloud_platform?: string;
    tech_database?: string;
    tech_framework?: string;
    tech_deployment?: string;
    [techField: `tech_${string}`]: string | undefined;
}

export interface ProjectsResponse {
    projects: Project[];
}

export interface ProjectResponse {
    project: Project;
}

/**
 * Shared so the card and the detail page cannot disagree about what a status
 * looks like: one project's chip means the same thing wherever it appears.
 */
export const STATUS_STYLES: Record<string, string> = {
    production: 'text-signal border-signal/40',
    completed: 'text-signal border-signal/40',
    'in-development': 'text-caution border-caution/40',
    paused: 'text-caution border-caution/40',
    planning: 'text-muted border-border',
};

export const DEFAULT_STATUS_STYLE = 'text-muted border-border';
