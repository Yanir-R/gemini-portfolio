import React, { useState } from 'react';
import axios from 'axios';

const Chat: React.FC = () => {
    const [message, setMessage] = useState('');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSendMessage = async () => {
        if (!message.trim()) return;

        setIsLoading(true);
        try {
            console.log('Sending payload:', { message: message });

            const res = await axios.post('http://localhost:8000/generate-text', {
                message: message
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            setResponse(res.data.response);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error details:', {
                    status: error.response?.status,
                    data: error.response?.data,
                    headers: error.response?.headers
                });
                setResponse(`Error: ${error.response?.data?.detail || 'Failed to get response from server'}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleSendMessage();
                    }
                }}
                disabled={isLoading}
            />
            <button
                onClick={handleSendMessage}
                disabled={isLoading}
            >
                {isLoading ? 'Sending...' : 'Send'}
            </button>
            {response && (
                <div>
                    <h3>Response:</h3>
                    <p>{response}</p>
                </div>
            )}
        </div>
    );
};

export default Chat;