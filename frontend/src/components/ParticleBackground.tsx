import React, { useEffect, useRef } from 'react';
import { useScreenSize } from '@/hooks/useScreenSize';

interface Particle {
    x: number;
    y: number;
    dx: number;
    dy: number;
    radius: number;
}

const ParticleBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animationFrameRef = useRef<number>();
    const { isKeyboardVisible } = useScreenSize();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const initializeParticles = () => {
            const particles: Particle[] = [];
            const particleCount = 100;
            const width = window.innerWidth;
            const height = window.innerHeight;

            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    dx: (Math.random() - 0.5) * 0.5,
                    dy: (Math.random() - 0.5) * 0.5,
                    radius: Math.random() * 3 + 1,
                });
            }
            
            particlesRef.current = particles;
        };

        const handleResize = () => {
            // Cancel any pending animation frame
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }

            const scale = window.devicePixelRatio || 1;
            const width = window.innerWidth;
            const height = window.innerHeight;

            canvas.width = width * scale;
            canvas.height = height * scale;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.scale(scale, scale);

            initializeParticles();
            animate();
        };

        const animate = () => {
            ctx.fillStyle = 'rgba(17, 24, 39, 1)';
            ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

            particlesRef.current.forEach(particle => {
                // Draw particle
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(147, 51, 234, 0.7)';
                ctx.fill();

                // Move particle
                particle.x += particle.dx;
                particle.y += particle.dy;

                // Connect particles within 150px
                particlesRef.current.forEach(otherParticle => {
                    const distance = Math.sqrt(
                        Math.pow(particle.x - otherParticle.x, 2) +
                        Math.pow(particle.y - otherParticle.y, 2)
                    );

                    if (distance < 150) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(147, 51, 234, ${0.3 - distance / 500})`;
                        ctx.lineWidth = 1;
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(otherParticle.x, otherParticle.y);
                        ctx.stroke();
                    }
                });

                // Bounce off walls
                if (particle.x < 0 || particle.x > window.innerWidth) particle.dx *= -1;
                if (particle.y < 0 || particle.y > window.innerHeight) particle.dy *= -1;
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        // Initial setup
        handleResize();

        // Only listen for resize, orientation is handled in useScreenSize
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isKeyboardVisible]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full"
            style={{
                zIndex: 0,
                background: 'rgb(17, 24, 39)',
            }}
            aria-hidden="true"
        />
    );
};

export default ParticleBackground; 