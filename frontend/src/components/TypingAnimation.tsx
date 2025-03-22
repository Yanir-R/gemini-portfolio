import React, { useState, useEffect, useCallback } from 'react';

interface TypingAnimationProps {
    content: string;
    speed?: number;
    onComplete?: () => void;
}

const TypingAnimation: React.FC<TypingAnimationProps> = ({
    content,
    speed = 30,
    onComplete
}) => {
    const [displayedContent, setDisplayedContent] = useState('');

    const animate = useCallback(() => {
        let currentIndex = 0;
        const intervalId = setInterval(() => {
            if (currentIndex <= content.length) {
                setDisplayedContent(content.slice(0, currentIndex));
                currentIndex++;
            } else {
                clearInterval(intervalId);
                onComplete?.();
            }
        }, speed);

        return intervalId;
    }, [content, speed, onComplete]);

    useEffect(() => {
        const intervalId = animate();
        return () => clearInterval(intervalId);
    }, [animate]);

    return (
        <div className="whitespace-pre-wrap">
            {displayedContent}
        </div>
    );
};

export default TypingAnimation; 