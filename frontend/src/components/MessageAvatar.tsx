import React from 'react';
import { ChatMessage } from '@/types/chat';
import { MESSAGE_STYLES, MESSAGE_AVATARS } from '@/constants/chat';

interface MessageAvatarProps {
    type: ChatMessage['type'];
}

export const MessageAvatar: React.FC<MessageAvatarProps> = ({ type }) => (
    <div className={`
        flex flex-shrink-0 justify-center items-center 
        w-9 h-9 rounded-xl 
        ${MESSAGE_STYLES[type]}
        transform hover:scale-105 
        transition-all duration-300 ease-out
        before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br 
        before:from-white/5 before:to-transparent before:opacity-0 
        before:hover:opacity-100 before:transition-opacity before:duration-300
        relative
    `}>
        <span className="text-lg relative z-10">{MESSAGE_AVATARS[type]}</span>
    </div>
); 