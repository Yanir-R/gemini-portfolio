import React from 'react';
import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import TypingAnimation from '../components/TypingAnimation';
import ReturnHome from '../components/ReturnHome';

const About: React.FC = () => {
    const [content, setContent] = React.useState<string>('');
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [isTypingComplete, setIsTypingComplete] = React.useState(false);

    React.useEffect(() => {
        const fetchContent = async () => {
            try {
                setIsLoading(true);
                const response = await apiClient.get(API_ENDPOINTS.GET_MARKDOWN_CONTENT('about-me.md'));
                setContent(response.data.content);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setIsLoading(false);
            }
        };

        fetchContent();
    }, []);

    if (isLoading) {
        return (
            <div className="pt-20 px-4 overflow-x-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-12">
                        <div className="text-6xl mb-6 animate-bounce">📄</div>
                        <h2 className="text-2xl font-bold text-white mb-4">Loading my story...</h2>
                        <p className="text-gray-400 mb-8">Fetching personal insights and experiences</p>
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-3 h-3 bg-brand-purple rounded-full animate-pulse"></div>
                            <div className="w-3 h-3 bg-brand-purple-light rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-3 h-3 bg-brand-pink rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="container px-4 py-8 mx-auto text-red-500">Error: {error}</div>;
    }

    return (
        <div className="p-8 text-gray-300 overflow-x-hidden">
            <div className="mx-auto max-w-3xl">
                <div className="p-4 rounded-lg border border-gray-700 shadow-lg bg-dark-terminal">
                    <div className="flex gap-2 items-center mb-4">
                        <div className="w-3 h-3 rounded-full bg-status-error"></div>
                        <div className="w-3 h-3 rounded-full bg-status-warning"></div>
                        <div className="w-3 h-3 rounded-full bg-status-online"></div>
                        <span className="ml-2 text-sm text-gray-400">~/about-me</span>
                    </div>

                    <div className="font-mono">
                        <span className="text-green-400">➜</span>
                        <span className="text-purple-400"> ~/about-me</span>
                        <span className="text-white"> cat about-me.md</span>
                    </div>

                    <div className="mt-4 font-mono">
                        {isTypingComplete ? (
                            <div className="whitespace-pre-wrap">{content}</div>
                        ) : (
                            <TypingAnimation
                                content={content}
                                speed={30}
                                onComplete={() => setIsTypingComplete(true)}
                            />
                        )}
                    </div>
                </div>

                {!isTypingComplete && (
                    <div className="flex justify-center mt-4">
                        <button
                            onClick={() => {
                                setIsTypingComplete(true);
                            }}
                            className="px-4 py-2 font-mono text-white bg-purple-600 rounded transition-colors hover:bg-purple-700"
                            aria-label="Skip typing animation"
                        >
                            Skip Typing
                        </button>
                    </div>
                )}
            </div>
            <ReturnHome />
        </div>
    );
};

export default About; 