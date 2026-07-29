import axios from 'axios';
import { apiClient, toRequestError } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { Project, ProjectsResponse, ProjectResponse } from '@/types/project';

class ProjectService {
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

    /**
     * The stack a write-up declares, most recognisable first.
     *
     * The ordered fields lead because they are what identifies a project at a
     * glance. Everything else the write-up declares follows in the order the
     * document lists it, so a `- **Video Processing**: ...` line reaches the
     * card without being added here first. A project that names nothing shows
     * no chips.
     */
    getProjectTechStack(project: Project): string[] {
        const orderedFields = [
            'tech_frontend',
            'tech_backend',
            'tech_ai_ml',
            'tech_cloud_platform',
            'tech_database',
            'tech_framework',
            'tech_deployment',
        ];

        const remainingFields = Object.keys(project)
            .filter((key) => key.startsWith('tech_') && !orderedFields.includes(key))
            .sort();

        const techStack: string[] = [];

        [...orderedFields, ...remainingFields].forEach((field) => {
            const value = project[field as keyof Project] as string;
            if (value) {
                // A single field often lists several technologies.
                if (value.includes(',')) {
                    const parts = value.split(',').map((part) => part.trim());
                    techStack.push(...parts);
                } else {
                    techStack.push(value);
                }
            }
        });

        return this.prioritizeTechStack(this.processTechStack(techStack));
    }

    private processTechStack(techStack: string[]): string[] {
        const processed: string[] = [];

        techStack.forEach((tech) => {
            const cleanTech = tech.trim();
            if (cleanTech.length === 0) return;

            // Firebase and Firestore are written as one entry in the markdown
            // but are two separate things to have used, so they get a chip each.
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

        // Deduplicated case-insensitively, keeping the first spelling and the
        // order the write-up used.
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

    /**
     * The cards show only the first few chips, so the load-bearing technologies
     * have to come first. Anything unranked sorts after the ranked entries,
     * alphabetically, rather than in whatever order it was parsed.
     */
    private prioritizeTechStack(techStack: string[]): string[] {
        const techPriorities: Record<string, number> = {
            // AI & Advanced
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
                return priorityB - priorityA;
            }

            return a.localeCompare(b);
        });
    }

    /**
     * The backend already returns a fetchable location: an absolute URL, or a
     * root-relative path served from `public/` by the CDN. Nothing to resolve,
     * and in particular nothing to prefix with the backend host, which would
     * point screenshots at the single-region container the CDN exists to avoid.
     */
    getProjectMediaUrl(project: Project): string | null {
        return project.media_url ?? null;
    }

    isVideoFile(filename: string): boolean {
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
        return videoExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
    }
}

export const projectService = ProjectService.getInstance();
