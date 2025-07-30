import React from 'react'
import { Project } from '@/types/project'
import { projectService } from '@/services/projectService'

interface ProjectCardProps {
  project: Project
  onClick?: () => void
  className?: string
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, className = '' }) => {
  const mediaUrl = projectService.getProjectMediaUrl(project)
  const techStack = projectService.getProjectTechStack(project)
  const isVideo = mediaUrl && projectService.isVideoFile(mediaUrl)

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    switch (status) {
      case 'production':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'in-development':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'planning':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getTypeIcon = (type: string | undefined) => {
    switch (type) {
      case 'web-app':
        return '🌐'
      case 'native-app':
        return '📱'
      default:
        return '💻'
    }
  }

  return (
    <div 
      className={`
        group relative bg-dark-secondary/80 backdrop-blur-sm rounded-xl overflow-hidden
        border border-border hover:border-brand-purple-light/50 
        transition-all duration-300 cursor-pointer transform hover:scale-[1.02]
        hover:shadow-2xl hover:shadow-brand-purple/20 flex flex-col h-full
        ${className}
      `}
      onClick={onClick}
    >

      {/* Media Section */}
      <div className="relative h-48 overflow-hidden bg-dark-tertiary">
        {mediaUrl ? (
          isVideo ? (
            <video 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
              alt={project.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )
        ) : (
          <div className="flex items-center justify-center h-full bg-dark-tertiary text-gray-500">
            <span className="text-4xl opacity-50">🖼️</span>
          </div>
        )}
        
        {/* Gradient overlay */}
        {mediaUrl && (
          <div className="absolute inset-0 bg-gradient-to-t from-dark-secondary/60 to-transparent" />
        )}
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-grow">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getTypeIcon(project.project_type)}</span>
            <h3 className="text-xl font-bold text-white group-hover:text-brand-purple-light transition-colors">
              {project.title}
            </h3>
          </div>
        </div>

        {/* Status and Category */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`
            px-3 py-1 rounded-full text-xs font-medium border
            ${getStatusColor(project.status)}
          `}>
            {project.status?.replace('-', ' ') || 'Unknown'}
          </span>
          
          {project.category && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-dark-tertiary text-gray-300 border border-gray-600">
              {project.category}
            </span>
          )}
        </div>

        {/* Overview - Fixed height */}
        <div className="mb-4 h-[72px] flex items-start">
          {project.overview && (
            <p className="text-gray-300 text-sm line-clamp-3 leading-relaxed">
              {project.overview}
            </p>
          )}
        </div>

        {/* Tech Stack - Fixed height with consistent layout */}
        <div className="mb-6 h-[72px] flex items-start">
          {techStack.length > 0 && (
            <div className="flex flex-wrap gap-1 content-start">
              {(() => {
                // Prioritize most impressive technologies first
                const highlightTechs = [
                  'Vertex AI', 'Multimodal LLM', 'Gemini AI', 'Cloud Armor', 
                  'Load Balancers', 'CDN warming', 'Spot VMs', 'Egress optimization', 
                  'Regional data placement', 'GCP Batch', 'Cloud Tasks',
                  'Next.js 15.3.1', 'React 19', 'FastAPI'
                ]
                
                const prioritized: string[] = []
                const remaining = [...techStack]
                
                // First, add highlight techs that exist in the stack
                highlightTechs.forEach(priority => {
                  const found = remaining.find(tech => 
                    tech.toLowerCase().includes(priority.toLowerCase()) ||
                    priority.toLowerCase().includes(tech.toLowerCase())
                  )
                  if (found) {
                    prioritized.push(found)
                    remaining.splice(remaining.indexOf(found), 1)
                  }
                })
                
                // Fill remaining slots with other techs
                const finalTechs = [...prioritized, ...remaining].slice(0, 5)
                
                return finalTechs.map((tech, index) => {
                  const techLower = tech.toLowerCase()
                  
                  // Check if it's a highlight tech (most impressive)
                  const isHighlightTech = highlightTechs.some(highlight => 
                    techLower.includes(highlight.toLowerCase()) ||
                    highlight.toLowerCase().includes(techLower)
                  )
                  
                  return (
                    <span 
                      key={index}
                      className={`
                        px-2.5 py-1 text-xs rounded-md font-medium
                        ${isHighlightTech 
                          ? 'bg-white/10 text-white border border-white/20 shadow-sm' 
                          : 'bg-dark-tertiary/80 text-gray-400 border border-gray-600/30'
                        }
                        hover:bg-white/15 hover:text-white transition-all duration-200
                      `}
                    >
                      {tech}
                    </span>
                  )
                })
              })()}
              {techStack.length > 5 && (
                <span className="px-2.5 py-1 text-xs bg-dark-tertiary/50 text-gray-500 rounded-md border border-gray-600/20 font-medium">
                  +{techStack.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer - Always at bottom */}
        <div className="flex items-center justify-end pt-4 border-t border-dark-tertiary h-[48px] mt-auto">
          <div className="flex gap-2">
            {project.demo_url && (
              <a 
                href={project.demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-purple-light hover:text-brand-pink transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                🔗 Visit Site
              </a>
            )}
            
            {project.repository && project.repository !== 'Private Repository' && (
              <a 
                href={project.repository}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-400 hover:text-white transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                📂 Code
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-purple/0 via-brand-purple/5 to-brand-pink/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  )
}

export default ProjectCard