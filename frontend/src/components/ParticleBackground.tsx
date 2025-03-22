import React, { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    dx: number;
    dy: number;
    radius: number;
}

const ParticleBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const handleResize = () => {
            const scale = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * scale;
            canvas.height = window.innerHeight * scale;
            ctx.scale(scale, scale);
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        // Create particles
        const particles: Particle[] = [];
        const particleCount = 100;

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                dx: (Math.random() - 0.5) * 0.5,
                dy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 3 + 1,
            });
        }

        // Animation function
        const animate = () => {
            ctx.fillStyle = 'rgba(17, 24, 39, 1)';
            ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

            particles.forEach(particle => {
                // Draw particle
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(147, 51, 234, 0.7)';
                ctx.fill();

                // Move particle
                particle.x += particle.dx;
                particle.y += particle.dy;

                // Connect particles within 150px
                particles.forEach(otherParticle => {
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

            requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

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