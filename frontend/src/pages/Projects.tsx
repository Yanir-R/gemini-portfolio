import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ProjectCard from '@/components/ProjectCard'
import { Project } from '@/types/project'
import { projectService } from '@/services/projectService'
import ReturnHome from '@/components/ReturnHome'

const Projects: React.FC = () => {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const fetchedProjects = await projectService.getAllProjects()
      
      // Sort projects to show ReelSensei first, then by featured status
      const sortedProjects = [...fetchedProjects].sort((a, b) => {
        // ReelSensei always comes first
        if (a.slug === 'reelsensei') return -1
        if (b.slug === 'reelsensei') return 1
        
        // Then sort by featured status
        if (a.featured && !b.featured) return -1
        if (!a.featured && b.featured) return 1
        
        // Keep original order for remaining projects
        return 0
      })
      
      setProjects(sortedProjects)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects')
    } finally {
      setLoading(false)
    }
  }

  const handleProjectClick = (project: Project) => {
    navigate(`/projects/${project.slug}`)
  }


  if (loading) {
    return (
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="text-6xl mb-6 animate-bounce">🚀</div>
            <h2 className="text-2xl font-bold text-white mb-4">Loading my projects...</h2>
            <p className="text-gray-400 mb-8">Fetching the latest from my portfolio</p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-brand-purple rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-brand-purple-light rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-3 h-3 bg-brand-pink rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-4xl mx-auto text-center py-20">
          <div className="text-6xl mb-6">🔧</div>
          <h1 className="text-2xl font-bold text-white mb-4">Projects temporarily unavailable</h1>
          <div className="bg-dark-secondary/50 backdrop-blur-sm rounded-xl p-6 border border-border mb-8">
            <p className="text-gray-300 mb-4">
              I'm currently updating my project portfolio. The backend service appears to be offline or experiencing issues.
            </p>
            <details className="text-left">
              <summary className="text-brand-purple-light cursor-pointer hover:text-brand-pink transition-colors mb-2">
                Technical details
              </summary>
              <code className="text-xs text-gray-400 bg-dark-tertiary p-3 rounded-lg block font-mono">
                {error}
              </code>
            </details>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            <button 
              onClick={fetchProjects}
              className="px-6 py-3 bg-brand-purple hover:bg-brand-purple-dark rounded-lg transition-colors font-semibold"
            >
              🔄 Try Again
            </button>
            <button
              onClick={() => window.location.href = '/about'}
              className="px-6 py-3 border border-border hover:border-brand-purple-light rounded-lg transition-colors font-semibold"
            >
              📋 View My Resume
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 border border-border hover:border-brand-purple-light rounded-lg transition-colors font-semibold"
            >
              🏠 Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-20 px-4 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-brand-purple via-brand-purple-light to-brand-pink bg-clip-text text-transparent">
              My Projects
            </span>
          </h1>
          <p className="text-gray-300 text-base max-w-2xl mx-auto">
          Take a look around! Here are some of the projects I've been working on. I'm always learning and trying new things. Hope you find it interesting!
          </p>
        </div>


        {/* Projects Grid */}
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.slug}
                project={project}
                onClick={() => handleProjectClick(project)}
                className="animate-fadeIn"
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📂</div>
            <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
            <p className="text-gray-400 mb-6">
              I'm still building amazing projects. Check back soon!
            </p>
          </div>
        )}
      </div>
      <ReturnHome />
    </div>
  )
}

export default Projects