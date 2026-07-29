import React from 'react';
import { ChatMessage } from '@/types/chat';
import { MESSAGE_STYLES, MESSAGE_AVATARS } from '@/constants/chat';

interface MessageAvatarProps {
    type: ChatMessage['type'];
}

/*
 * Where Yanir's photograph comes from:
 *
 *   1. VITE_AVATAR_URL  - production. Set in CI, pointing at the same external
 *                         host the project screenshots already use.
 *   2. /profile.jpeg    - local development ONLY. Present on Yanir's machine
 *                         and listed in .gitignore, so it never enters the
 *                         public repository or its permanent history.
 *   3. the letter mark  - whenever neither is available, and the reason a fresh
 *                         clone renders correctly with no binary in the tree.
 *
 * The dev-only guard on step 2 is load-bearing, not tidiness. The file is
 * gitignored, so it does not exist in a CI build, and `_redirects` maps `/*` to
 * index.html - a production request for `/profile.jpeg` would not 404, it would
 * answer 200 with a page of HTML that the browser cannot decode. Every
 * re-render would ask again, so the avatar would flicker between a broken image
 * and the letter mark. Never asking for a file that cannot exist is what
 * prevents that.
 *
 * Step 3 also catches a configured URL that breaks at runtime, so a dead image
 * host degrades to a mark rather than the browser's grey broken-image icon.
 */
const CONFIGURED_AVATAR = import.meta.env.VITE_AVATAR_URL as string | undefined;
const AVATAR_SRC = CONFIGURED_AVATAR || (import.meta.env.DEV ? '/profile.jpeg' : '');

// Module scope on purpose. Each message renders its own avatar, so a per
// component failure flag would let every one of them retry the same dead URL
// and re-run the same failure. Recording it once means the first failure
// settles it for the whole transcript, and for every message that arrives after.
let avatarKnownBroken = false;

// Only the assistant speaks as Yanir, so only the assistant wears his face. A
// photograph on the visitor's own messages would be claiming to be them.
const PHOTO_TYPES = new Set(['ai', 'initial']);

export const MessageAvatar: React.FC<MessageAvatarProps> = ({ type }) => {
    const [photoFailed, setPhotoFailed] = React.useState(avatarKnownBroken);
    const showPhoto = Boolean(AVATAR_SRC) && PHOTO_TYPES.has(type) && !photoFailed;

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
                // Not lazy. This sits in the first screenful of every visit, so
                // deferring it saves no bandwidth and only delays the one image
                // on the page - arriving after the text beside it reads as a
                // broken image rather than a pending one.
                loading="eager"
                onError={() => {
                    avatarKnownBroken = true;
                    setPhotoFailed(true);
                }}
                className="object-cover flex-shrink-0 w-8 h-8 rounded border border-border"
            />
        );
    }

    return (
        <div
            aria-hidden="true"
            className={`flex flex-shrink-0 justify-center items-center w-8 h-8 rounded font-mono text-[0.6rem] uppercase tracking-wider ${MESSAGE_STYLES[type]}`}
        >
            {MESSAGE_AVATARS[type]}
        </div>
    );
};
