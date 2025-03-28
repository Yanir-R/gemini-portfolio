import React from 'react';
import { ChatMessage } from '@/types/chat';
import { MESSAGE_STYLES, MESSAGE_AVATARS } from '@/constants/chat';

interface MessageAvatarProps {
    type: ChatMessage['type'];
    avatar?: string;
}

export const MessageAvatar: React.FC<MessageAvatarProps> = ({ type }) => (
    <div className={`flex relative flex-shrink-0 justify-center items-center w-9 h-9 rounded-xl transition-all duration-300 ease-out transform ${MESSAGE_STYLES[type as keyof typeof MESSAGE_STYLES]} hover:scale-105 before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-white/5 before:to-transparent before:opacity-0 before:hover:opacity-100 before:transition-opacity before:duration-300`}>
        <span className="relative z-10 text-lg">{MESSAGE_AVATARS[type as keyof typeof MESSAGE_AVATARS]}</span>
    </div>
); 
