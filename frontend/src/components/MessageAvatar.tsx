import React from 'react';
import { ChatMessage } from '@/types/chat';
import { MESSAGE_STYLES, MESSAGE_AVATARS } from '@/constants/chat';

interface MessageAvatarProps {
    type: ChatMessage['type'];
}

export const MessageAvatar: React.FC<MessageAvatarProps> = ({ type }) => (
    <div className={`flex flex-shrink-0 justify-center items-center w-8 h-8 rounded-lg ${MESSAGE_STYLES[type]}`}>
        <span>{MESSAGE_AVATARS[type]}</span>
    </div>
); 