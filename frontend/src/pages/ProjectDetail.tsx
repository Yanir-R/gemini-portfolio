import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Project } from '@/types/project'
import { projectService } from '@/services/projectService'
import { getProjectTerminalContent } from '@/utils/projectContent'

const ProjectDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllTech, setShowAllTech] = useState(false)

  useEffect(() => {
    if (slug) {
      fetchProject(slug)
    }
  }, [slug])

  const fetchProject = async (projectSlug: string) => {
    try {
      setLoading(true)
      const fetchedProject = await projectService.getProjectBySlug(projectSlug)
      setProject(fetchedProject)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project')
    } finally {
      setLoading(false)
    }
  }



  if (loading) {
    return (
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="w-3/4 h-12 bg-dark-tertiary rounded mb-6"></div>
            <div className="w-full h-64 bg-dark-tertiary rounded mb-8"></div>
            <div className="space-y-4">
              <div className="w-full h-4 bg-dark-tertiary rounded"></div>
              <div className="w-5/6 h-4 bg-dark-tertiary rounded"></div>
              <div className="w-4/6 h-4 bg-dark-tertiary rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-5xl mx-auto text-center py-20">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-4">Project not found</h1>
          <p className="text-gray-400 mb-8">
            {error || 'The project you\'re looking for doesn\'t exist.'}
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/projects')}
              className="px-6 py-2 bg-brand-purple hover:bg-brand-purple-dark rounded-lg transition-colors"
            >
              View All Projects
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 border border-border hover:border-brand-purple-light rounded-lg transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  const mediaUrl = projectService.getProjectMediaUrl(project)
  const techStack = projectService.getProjectTechStack(project)
  const isVideo = project.media && projectService.isVideoFile(project.media)

  return (
    <div className="min-h-screen pt-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <Link 
          to="/projects"
          className="inline-flex items-center gap-2 text-brand-purple-light hover:text-brand-pink transition-colors mb-8 group font-medium"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          Back to Projects
        </Link>

        {/* Header Section */}
        <div className="mb-12">
          <div className="flex items-start gap-4 mb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
                {project.title}
              </h1>
              <p className="text-xl text-gray-400 leading-relaxed max-w-3xl">
                {project.overview || 'An innovative project showcasing modern development practices'}
              </p>
            </div>
          </div>

          {/* Project Status & Links */}
          <div className="flex flex-wrap gap-3 mb-8">
            {project.status && (
              <span className="px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium">
                {project.status}
              </span>
            )}
            {project.category && (
              <span className="px-3 py-1.5 bg-brand-purple/20 text-brand-purple-light border border-brand-purple/30 rounded-lg text-sm font-medium">
                {project.category}
              </span>
            )}
            {project.demo_url && (
              <a 
                href={project.demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors"
              >
                🌐 Go to Project Website
              </a>
            )}
          </div>

          {/* Media Section */}
          {mediaUrl && (
            <div className="mb-8 rounded-xl overflow-hidden bg-dark-tertiary border border-border">
              {isVideo ? (
                <video 
                  className="w-full h-auto max-h-[500px] object-cover"
                  controls
                  poster={mediaUrl.replace(/\.[^/.]+$/, '.jpg')}
                >
                  <source src={mediaUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img 
                  src={mediaUrl} 
                  alt={project.title}
                  className="w-full h-auto object-cover"
                />
              )}
            </div>
          )}
        </div>

        {/* Tech Stack */}
        {techStack.length > 0 && (
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              Technology Stack
            </h3>
            <div className="flex flex-wrap gap-3">
              {(() => {
                const shouldShowButton = techStack.length > 6
                const displayedTech = shouldShowButton && !showAllTech 
                  ? techStack.slice(0, 6) 
                  : techStack

                return (
                  <>
                    {displayedTech.map((tech, index) => (
                      <span 
                        key={index}
                        className="px-4 py-2 bg-purple-900/40 text-purple-300 rounded-lg border border-purple-700/50 text-sm font-medium hover:bg-purple-800/40 transition-colors backdrop-blur-sm"
                      >
                        {tech}
                      </span>
                    ))}
                    
                    {shouldShowButton && (
                      <button
                        onClick={() => setShowAllTech(!showAllTech)}
                        className="px-4 py-2 bg-gradient-to-r from-brand-purple to-brand-pink text-white rounded-lg border border-brand-purple/50 text-sm font-medium hover:from-brand-purple-dark hover:to-brand-pink-dark transition-all duration-300 transform hover:scale-105 flex items-center gap-2 shadow-lg hover:shadow-brand-purple/25"
                      >
                        {showAllTech ? (
                          <>
                            <span>Show Less</span>
                            <span className="transform transition-transform duration-200 rotate-180">↓</span>
                          </>
                        ) : (
                          <>
                            <span>+{techStack.length - 6} More</span>
                            <span className="transform transition-transform duration-200">↓</span>
                          </>
                        )}
                      </button>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* Content - Terminal Style */}
        <div className="mb-16">
          <div className="p-6 rounded-lg border border-gray-700 shadow-lg bg-dark-terminal">
            <div className="flex gap-2 items-center mb-4">
              <div className="w-3 h-3 rounded-full bg-status-error"></div>
              <div className="w-3 h-3 rounded-full bg-status-warning"></div>
              <div className="w-3 h-3 rounded-full bg-status-online"></div>
              <span className="ml-2 text-sm text-gray-400">~/projects/{project.slug}</span>
            </div>

            <div className="font-mono">
              <span className="text-green-400">➜</span>
              <span className="text-purple-400"> ~/projects/{project.slug}</span>
              <span className="text-white"> cat project-details.md</span>
            </div>

            <div className="mt-6 font-mono text-sm leading-relaxed text-gray-300">
              {(() => {
                const content = getProjectTerminalContent(project.slug)
                return content ? (
                  <div className="whitespace-pre-wrap">{content}</div>
                ) : (
                  <div className="text-gray-400">
                    Project details not available in terminal format.
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="border-t border-border pt-8 pb-12">
          <div className="flex justify-between items-center">
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 text-brand-purple-light hover:text-brand-pink transition-colors group font-medium"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span>
              All Projects
            </Link>
            
            <Link
              to="/about"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors group font-medium"
            >
              About Me
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectDetail