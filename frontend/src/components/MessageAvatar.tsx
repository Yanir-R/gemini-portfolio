import React from 'react';
import { ChatMessage } from '@/types/chat';
import { MESSAGE_STYLES, MESSAGE_AVATARS } from '@/constants/chat';

interface MessageAvatarProps {
    type: ChatMessage['type'];
    avatar?: string;
}

/*
 * Where Yanir's photograph comes from, in order:
 *
 *   1. VITE_AVATAR_URL  - production. Set in CI, pointing at the same external
 *                         host the project screenshots already use.
 *   2. /profile.jpeg    - local development. Present on Yanir's machine and
 *                         listed in .gitignore, so it never enters the public
 *                         repository or its permanent history.
 *   3. the letter mark  - the committed placeholder, and the reason a fresh
 *                         clone still renders correctly with no binary in the tree.
 *
 * Step 3 is not only a fallback for a missing file: `onError` also catches a
 * broken or blocked URL at runtime, so a dead image host degrades to a mark
 * rather than to the browser's grey broken-image icon.
 */
const AVATAR_SRC = (import.meta.env.VITE_AVATAR_URL as string | undefined) || '/profile.jpeg';

// Only the assistant speaks as Yanir, so only the assistant wears his face. A
// photograph on the visitor's own messages would be claiming to be them.
const PHOTO_TYPES = new Set(['ai', 'initial']);

export const MessageAvatar: React.FC<MessageAvatarProps> = ({ type }) => {
    const [photoFailed, setPhotoFailed] = React.useState(false);
    const showPhoto = PHOTO_TYPES.has(type) && !photoFailed;

    if (showPhoto) {
        return (
            <img
                src={AVATAR_SRC}
                // Decorative: the transcript already alternates and the bubble
                // styling distinguishes the two sides, so announcing "Yanir"
                // before every reply would only add noise.
                alt=""
                aria-hidden="true"
                width={32}
                height={32}
                loading="lazy"
                onError={() => setPhotoFailed(true)}
                className="object-cover flex-shrink-0 w-8 h-8 rounded border border-border"
            />
        );
    }

    return (
        <div
            aria-hidden="true"
            className={`flex flex-shrink-0 justify-center items-center w-8 h-8 rounded font-mono text-[0.6rem] uppercase tracking-wider ${
                MESSAGE_STYLES[type as keyof typeof MESSAGE_STYLES]
            }`}
        >
            {MESSAGE_AVATARS[type as keyof typeof MESSAGE_AVATARS]}
        </div>
    );
};
