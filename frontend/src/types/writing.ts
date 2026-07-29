/**
 * A published piece: a long-form article or a short post, written elsewhere and
 * republished here with a link back to the original.
 *
 * `kind` separates the two because they are read differently - an article is
 * sat down with, a post is scanned - and because the list needs to say which is
 * which before you click.
 */
export interface WritingEntry {
    slug: string;
    title: string;
    content: string;
    kind: 'article' | 'post';
    /** Where it was first published, shown as the attribution. */
    source: string;
    /** Canonical link to the original. */
    url: string;
    /** ISO date, so it sorts as text. */
    date: string;
    /** Root-relative paths under public/writing, in the order they appear. */
    media?: string[];
    summary?: string;
    /** Slugs of related pieces, e.g. a post that summarises an article. */
    related?: string[];
}

export const WRITING_KIND_LABEL: Record<string, string> = {
    article: 'Article',
    post: 'Post',
};

/**
 * Long-form gets the emphasis colour, short posts stay neutral. The list is
 * mostly posts, so this reads as "these two are the substantial ones" rather
 * than as decoration.
 */
export const WRITING_KIND_STYLE: Record<string, string> = {
    article: 'text-signal border-signal/40',
    post: 'text-muted border-border',
};
