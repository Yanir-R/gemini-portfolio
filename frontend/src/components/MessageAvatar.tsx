import React from 'react';
import { ChatMessage } from '@/types/chat';
import { MESSAGE_STYLES, MESSAGE_AVATARS } from '@/constants/chat';

interface MessageAvatarProps {
    type: ChatMessage['type'];
    avatar?: string;
}

/*
 * A speaker mark. Decorative only - the transcript already alternates, and the
 * bubble styling distinguishes the two sides - so it is hidden from assistive
 * technology rather than read out as a stray letter before every message.
 */
export const MessageAvatar: React.FC<MessageAvatarProps> = ({ type }) => (
    <div
        aria-hidden="true"
        className={`flex flex-shrink-0 justify-center items-center w-8 h-8 rounded font-mono text-[0.6rem] uppercase tracking-wider ${
            MESSAGE_STYLES[type as keyof typeof MESSAGE_STYLES]
        }`}
    >
        {MESSAGE_AVATARS[type as keyof typeof MESSAGE_AVATARS]}
    </div>
);
