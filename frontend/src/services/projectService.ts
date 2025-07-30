import { apiClient } from '@/api/client'
import { Project, ProjectsResponse, ProjectResponse } from '@/types/project'

export class ProjectService {
  private static instance: ProjectService
  
  private constructor() {}
  
  public static getInstance(): ProjectService {
    if (!ProjectService.instance) {
      ProjectService.instance = new ProjectService()
    }
    return ProjectService.instance
  }

  async getAllProjects(): Promise<Project[]> {
    try {
      const response = await apiClient.get<ProjectsResponse>('/api/projects')
      return response.data.projects || []
    } catch (error: any) {
      console.error('Error fetching projects:', error)
      
      if (error.response) {
        // Backend returned an error response
        const status = error.response.status
        const message = error.response.data?.detail || error.response.statusText
        throw new Error(`Server error (${status}): ${message}`)
      } else if (error.request) {
        // Network error - backend not responding
        throw new Error('Cannot connect to backend service. Please check if the server is running.')
      } else {
        // Other error
        throw new Error(`Request failed: ${error.message}`)
      }
    }
  }

  async getFeaturedProjects(): Promise<Project[]> {
    try {
      const response = await apiClient.get<ProjectsResponse>('/api/projects?featured_only=true')
      return response.data.projects || []
    } catch (error: any) {
      console.error('Error fetching featured projects:', error)
      
      if (error.response) {
        const status = error.response.status
        const message = error.response.data?.detail || error.response.statusText
        throw new Error(`Server error (${status}): ${message}`)
      } else if (error.request) {
        throw new Error('Cannot connect to backend service. Please check if the server is running.')
      } else {
        throw new Error(`Request failed: ${error.message}`)
      }
    }
  }

  async getProjectBySlug(slug: string): Promise<Project> {
    try {
      const response = await apiClient.get<ProjectResponse>(`/api/projects/${slug}`)
      return response.data.project
    } catch (error: any) {
      console.error(`Error fetching project ${slug}:`, error)
      
      if (error.response) {
        const status = error.response.status
        if (status === 404) {
          throw new Error(`Project "${slug}" not found`)
        }
        const message = error.response.data?.detail || error.response.statusText
        throw new Error(`Server error (${status}): ${message}`)
      } else if (error.request) {
        throw new Error('Cannot connect to backend service. Please check if the server is running.')
      } else {
        throw new Error(`Request failed: ${error.message}`)
      }
    }
  }

  async chatWithProjects(message: string, conversationHistory?: any[]): Promise<string> {
    try {
      // Use the unified chat-with-files endpoint that includes project data
      const response = await apiClient.post('/chat-with-files', {
        message,
        conversation_history: conversationHistory || []
      })
      return response.data.response
    } catch (error) {
      console.error('Error chatting with projects:', error)
      throw new Error('Failed to send message')
    }
  }

  // Utility methods
  filterProjectsByCategory(projects: Project[], category: string): Project[] {
    if (!category || category === 'all') return projects
    return projects.filter(project => 
      project.category?.toLowerCase() === category.toLowerCase()
    )
  }

  filterProjectsByStatus(projects: Project[], status: string): Project[] {
    if (!status || status === 'all') return projects
    return projects.filter(project => 
      project.status?.toLowerCase() === status.toLowerCase()
    )
  }

  filterProjectsByType(projects: Project[], type: string): Project[] {
    if (!type || type === 'all') return projects
    return projects.filter(project => 
      project.project_type?.toLowerCase() === type.toLowerCase()
    )
  }

  sortProjectsByFeatured(projects: Project[]): Project[] {
    return [...projects].sort((a, b) => {
      if (a.featured && !b.featured) return -1
      if (!a.featured && b.featured) return 1
      return 0
    })
  }

  getProjectTechStack(project: Project): string[] {
    const techFields = [
      'tech_frontend',
      'tech_backend', 
      'tech_ai_ml',
      'tech_cloud_platform',
      'tech_database',
      'tech_framework',
      'tech_deployment'
    ]
    
    const techStack: string[] = []
    
    techFields.forEach(field => {
      const value = project[field as keyof Project] as string
      if (value) {
        // Handle comma-separated values and clean them up
        if (value.includes(',')) {
          const parts = value.split(',').map(part => part.trim())
          techStack.push(...parts)
        } else {
          techStack.push(value)
        }
      }
    })
    
    // Process and clean the tech stack
    const processedTechStack = this.processTechStack(techStack)
    return this.prioritizeTechStack(processedTechStack)
  }

  private processTechStack(techStack: string[]): string[] {
    const processed: string[] = []
    
    techStack.forEach(tech => {
      const cleanTech = tech.trim()
      if (cleanTech.length === 0) return
      
      // Handle Firebase/Firestore splitting
      if (cleanTech.toLowerCase().includes('firebase/firestore')) {
        processed.push('Firebase', 'Firestore')
      } else if (cleanTech.toLowerCase().includes('firebase') && cleanTech.toLowerCase().includes('firestore')) {
        processed.push('Firebase', 'Firestore')
      } else {
        processed.push(cleanTech)
      }
    })
    
    // Remove duplicates while preserving order
    const unique: string[] = []
    const seen = new Set<string>()
    
    processed.forEach(tech => {
      const normalizedTech = tech.toLowerCase()
      if (!seen.has(normalizedTech)) {
        seen.add(normalizedTech)
        unique.push(tech)
      }
    })
    
    return unique
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
      'Firebase': 70,
      'Firestore': 68,
      'Docker': 60,
      
      // Modern Frontend
      'Next.js': 55,
      'React': 50,
      'TypeScript': 45,
      'Tailwind CSS': 40,
      
      // Backend
      'FastAPI': 35,
      'Python': 30,
      
      // Basic
      'JavaScript': 10,
      'HTML': 5,
      'CSS': 5
    }

    return techStack.sort((a, b) => {
      const priorityA = techPriorities[a] || 0
      const priorityB = techPriorities[b] || 0
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA // Higher priority first
      }
      
      return a.localeCompare(b) // Alphabetical for same priority
    })
  }

  getProjectMediaUrl(project: Project): string | null {
    if (!project.media_url) return null
    
    // Handle relative URLs
    if (project.media_url.startsWith('/')) {
      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
      return `${baseUrl}${project.media_url}`
    }
    
    return project.media_url
  }

  isVideoFile(filename: string): boolean {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi']
    return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext))
  }

  isImageFile(filename: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext))
  }
}

// Export singleton instance
export const projectService = ProjectService.getInstance()
export default projectService