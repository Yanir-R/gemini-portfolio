import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import NavBar from '@/components/NavBar'
import Home from '@/pages/Home'
import About from '@/pages/About'
import Blog from '@/pages/Blog'
import Projects from '@/pages/Projects'
import ProjectDetail from '@/pages/ProjectDetail'
import ParticleBackground from '@/components/ParticleBackground'

const App: React.FC = () => {
    return (
        <Router>
            <div className="min-h-screen text-white">
                <ParticleBackground />
                <div className="relative z-10">
                    <NavBar />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/projects" element={<Projects />} />
                        <Route path="/projects/:slug" element={<ProjectDetail />} />
                        <Route path="/blog" element={<Blog />} />
                    </Routes>
                </div>
            </div>
        </Router>
    )
}

export default App 