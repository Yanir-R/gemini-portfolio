export interface Project {
  slug: string
  title: string
  overview?: string
  project_type: 'web-app' | 'native-app'
  status: 'completed' | 'in-development' | 'production' | 'planning'
  demo_url?: string
  repository?: string
  media?: string
  media_url?: string
  has_media?: boolean
  featured: boolean
  category: string
  content?: string
  
  // Technical details (parsed from markdown)
  tech_frontend?: string
  tech_backend?: string
  tech_ai_ml?: string
  tech_cloud_platform?: string
  tech_container_orchestration?: string
  tech_task_queue?: string
  tech_database?: string
  tech_deployment?: string
  tech_framework?: string
  tech_authentication?: string
  tech_payment?: string
  tech_storage?: string
  tech_analytics?: string
  tech_push_notifications?: string
  tech_cdn?: string
}

export interface ProjectsResponse {
  projects: Project[]
}

export interface ProjectResponse {
  project: Project
}

export interface ProjectFilters {
  category?: string
  status?: string
  type?: string
  featured?: boolean
}

export interface ProjectCardProps {
  project: Project
  className?: string
  onClick?: () => void
}

export interface ProjectGridProps {
  projects: Project[]
  loading?: boolean
  error?: string
  className?: string
}

export interface ProjectDetailProps {
  slug: string
}

export interface ProjectMediaProps {
  project: Project
  className?: string
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
  'Data Analytics'
] as const

export const PROJECT_STATUSES = [
  'completed',
  'in-development', 
  'production',
  'planning'
] as const

export const PROJECT_TYPES = [
  'web-app',
  'native-app'
] as const