export interface Project {
    slug: string;
    title: string;
    overview?: string;
    project_type: 'web-app' | 'native-app';
    // `paused` exists because "production" was being claimed for a project that
    // is private, not running, and may not be picked up again. A status set with
    // no way to say "stopped" forces every project to overstate itself.
    status: 'completed' | 'in-development' | 'production' | 'planning' | 'paused';
    demo_url?: string;
    repository?: string;
    media?: string;
    media_url?: string;
    has_media?: boolean;
    featured: boolean;
    category: string;
    content?: string;

    // Technical details (parsed from markdown)
    tech_frontend?: string;
    tech_backend?: string;
    tech_ai_ml?: string;
    tech_cloud_platform?: string;
    tech_container_orchestration?: string;
    tech_task_queue?: string;
    tech_database?: string;
    tech_deployment?: string;
    tech_framework?: string;
    tech_authentication?: string;
    tech_payment?: string;
    tech_storage?: string;
    tech_analytics?: string;
    tech_push_notifications?: string;
    tech_cdn?: string;
}

export interface ProjectsResponse {
    projects: Project[];
}

export interface ProjectResponse {
    project: Project;
}

export interface ProjectFilters {
    category?: string;
    status?: string;
    type?: string;
    featured?: boolean;
}

export interface ProjectCardProps {
    project: Project;
    className?: string;
    onClick?: () => void;
}

export interface ProjectGridProps {
    projects: Project[];
    loading?: boolean;
    error?: string;
    className?: string;
}

export interface ProjectDetailProps {
    slug: string;
}

export interface ProjectMediaProps {
    project: Project;
    className?: string;
}

export const PROJECT_CATEGORIES = [
    'Full-Stack Development',
    'Frontend Development',
    'Backend Development',
    'Mobile Development',
    'AI/ML & Gaming',
    'Productivity Tools',
    'E-commerce',
    'Social Platforms',
    'DevOps',
    'Data Analytics',
] as const;

export const PROJECT_STATUSES = [
    'completed',
    'in-development',
    'production',
    'planning',
    'paused',
] as const;

/**
 * Shared so the card and the detail page cannot disagree about what a status
 * looks like. The detail page previously hardcoded the "production" green for
 * every project regardless of its actual status, which is how a paused project
 * came to be shown as live in two places at once.
 */
export const STATUS_STYLES: Record<string, string> = {
    production: 'text-signal border-signal/40',
    completed: 'text-signal border-signal/40',
    'in-development': 'text-caution border-caution/40',
    paused: 'text-caution border-caution/40',
    planning: 'text-muted border-border',
};

export const DEFAULT_STATUS_STYLE = 'text-muted border-border';

export const PROJECT_TYPES = ['web-app', 'native-app'] as const;
