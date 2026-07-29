/**
 * Drops the level-2 sections whose heading the backend has already parsed into
 * metadata. Those values are rendered by the page's own layout - as chips,
 * links, dates and a lede - so printing them again as body copy would repeat
 * everything the header just said.
 *
 * Splitting on `\n## ` keeps each heading attached to the section it introduces,
 * and a leading chunk with no heading (the document's title and intro) is always
 * kept. The result is returned untrimmed, so a caller can run further passes
 * over the head of the document before trimming it itself.
 */
export const stripMetadataSections = (markdown: string, headings: readonly string[]): string =>
    markdown
        .split(/\n(?=## )/)
        .filter((section) => {
            const heading = section.match(/^## (.+)$/m)?.[1]?.trim();
            return !heading || !headings.includes(heading);
        })
        .join('\n');
