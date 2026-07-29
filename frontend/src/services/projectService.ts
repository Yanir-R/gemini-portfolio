import axios from 'axios';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { ChatMessage } from '@/types/chat';
import { Project, ProjectsResponse, ProjectResponse } from '@/types/project';

const CONNECTION_ERROR =
    'Cannot connect to backend service. Please check if the server is running.';

/**
 * Normalises anything thrown by axios into a single user-facing Error so every
 * call site reports failures the same way.
 */
const toRequestError = (error: unknown, context: string): Error => {
    console.error(`${context}:`, error);

    if (axios.isAxiosError(error)) {
        if (error.response) {
            const { status, statusText, data } = error.response;
            return new Error(`Server error (${status}): ${data?.detail || statusText}`, {
                cause: error,
            });
        }
        if (error.request) {
            return new Error(CONNECTION_ERROR, { cause: error });
        }
    }

    return new Error(`Request failed: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
    });
};

export class ProjectService {
    private static instance: ProjectService;

    private constructor() {}

    public static getInstance(): ProjectService {
        if (!ProjectService.instance) {
            ProjectService.instance = new ProjectService();
        }
        return ProjectService.instance;
    }

    async getAllProjects(): Promise<Project[]> {
        try {
            const response = await apiClient.get<ProjectsResponse>(API_ENDPOINTS.PROJECTS);
            return response.data.projects || [];
        } catch (error) {
            throw toRequestError(error, 'Error fetching projects');
        }
    }

    async getFeaturedProjects(): Promise<Project[]> {
        try {
            const response = await apiClient.get<ProjectsResponse>(API_ENDPOINTS.PROJECTS, {
                params: { featured_only: true },
            });
            return response.data.projects || [];
        } catch (error) {
            throw toRequestError(error, 'Error fetching featured projects');
        }
    }

    async getProjectBySlug(slug: string): Promise<Project> {
        try {
            const response = await apiClient.get<ProjectResponse>(API_ENDPOINTS.PROJECT(slug));
            return response.data.project;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                console.error(`Error fetching project ${slug}:`, error);
                throw new Error(`Project "${slug}" not found`, { cause: error });
            }
            throw toRequestError(error, `Error fetching project ${slug}`);
        }
    }

    async chatWithProjects(message: string, conversationHistory?: ChatMessage[]): Promise<string> {
        try {
            // The unified chat endpoint already includes project data in its context.
            const response = await apiClient.post(API_ENDPOINTS.CHAT, {
                message,
                conversation_history: conversationHistory || [],
            });
            return response.data.response;
        } catch (error) {
            console.error('Error chatting with projects:', error);
            throw new Error('Failed to send message', { cause: error });
        }
    }

    // Utility methods
    filterProjectsByCategory(projects: Project[], category: string): Project[] {
        if (!category || category === 'all') return projects;
        return projects.filter(
            (project) => project.category?.toLowerCase() === category.toLowerCase()
        );
    }

    filterProjectsByStatus(projects: Project[], status: string): Project[] {
        if (!status || status === 'all') return projects;
        return projects.filter((project) => project.status?.toLowerCase() === status.toLowerCase());
    }

    filterProjectsByType(projects: Project[], type: string): Project[] {
        if (!type || type === 'all') return projects;
        return projects.filter(
            (project) => project.project_type?.toLowerCase() === type.toLowerCase()
        );
    }

    sortProjectsByFeatured(projects: Project[]): Project[] {
        return [...projects].sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return 0;
        });
    }

    getProjectTechStack(project: Project): string[] {
        const techFields = [
            'tech_frontend',
            'tech_backend',
            'tech_ai_ml',
            'tech_cloud_platform',
            'tech_database',
            'tech_framework',
            'tech_deployment',
        ];

        const techStack: string[] = [];

        techFields.forEach((field) => {
            const value = project[field as keyof Project] as string;
            if (value) {
                // Handle comma-separated values and clean them up
                if (value.includes(',')) {
                    const parts = value.split(',').map((part) => part.trim());
                    techStack.push(...parts);
                } else {
                    techStack.push(value);
                }
            }
        });

        // Process and clean the tech stack
        const processedTechStack = this.processTechStack(techStack);
        return this.prioritizeTechStack(processedTechStack);
    }

    private processTechStack(techStack: string[]): string[] {
        const processed: string[] = [];

        techStack.forEach((tech) => {
            const cleanTech = tech.trim();
            if (cleanTech.length === 0) return;

            // Handle Firebase/Firestore splitting
            if (cleanTech.toLowerCase().includes('firebase/firestore')) {
                processed.push('Firebase', 'Firestore');
            } else if (
                cleanTech.toLowerCase().includes('firebase') &&
                cleanTech.toLowerCase().includes('firestore')
            ) {
                processed.push('Firebase', 'Firestore');
            } else {
                processed.push(cleanTech);
            }
        });

        // Remove duplicates while preserving order
        const unique: string[] = [];
        const seen = new Set<string>();

        processed.forEach((tech) => {
            const normalizedTech = tech.toLowerCase();
            if (!seen.has(normalizedTech)) {
                seen.add(normalizedTech);
                unique.push(tech);
            }
        });

        return unique;
    }

    private prioritizeTechStack(techStack: string[]): string[] {
        // Simple priority system - only technologies actually used in your projects
        const techPriorities: Record<string, number> = {
            // AI & Advanced (Most impressive)
            'Google Gemini AI': 100,
            'Google Cloud Vertex AI': 95,

            // Cloud & Infrastructure
            'Google Cloud Platform (GCP)': 80,
            'Google Cloud Run': 75,
            Firebase: 70,
            Firestore: 68,
            Docker: 60,

            // Modern Frontend
            'Next.js': 55,
            React: 50,
            TypeScript: 45,
            'Tailwind CSS': 40,

            // Backend
            FastAPI: 35,
            Python: 30,

            // Basic
            JavaScript: 10,
            HTML: 5,
            CSS: 5,
        };

        return techStack.sort((a, b) => {
            const priorityA = techPriorities[a] || 0;
            const priorityB = techPriorities[b] || 0;

            if (priorityA !== priorityB) {
                return priorityB - priorityA; // Higher priority first
            }

            return a.localeCompare(b); // Alphabetical for same priority
        });
    }

    /**
     * The backend already returns a fetchable location: an absolute URL, or a
     * root-relative path served from `public/` by the CDN. Nothing to resolve.
     *
     * This used to prefix root-relative paths with the backend host, which
     * pointed screenshots at Cloud Run - the wrong destination, since moving
     * static assets off a single-region container was the point of the CDN
     * migration.
     */
    getProjectMediaUrl(project: Project): string | null {
        return project.media_url ?? null;
    }

    isVideoFile(filename: string): boolean {
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
        return videoExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
    }

    isImageFile(filename: string): boolean {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
    }
}

// Export singleton instance
export const projectService = ProjectService.getInstance();
export default projectService;
