import axios from 'axios';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { WritingEntry } from '@/types/writing';

const CONNECTION_ERROR =
    'Cannot connect to backend service. Please check if the server is running.';

const toRequestError = (error: unknown, context: string): Error => {
    console.error(`${context}:`, error);

    if (axios.isAxiosError(error)) {
        if (error.response) {
            const { status, statusText, data } = error.response;
            return new Error(`Server error (${status}): ${data?.detail || statusText}`, {
                cause: error,
            });
        }
        if (error.request) {
            return new Error(CONNECTION_ERROR, { cause: error });
        }
    }

    return new Error(`Request failed: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
    });
};

/**
 * Metadata sections the backend parses out of each document. They are rendered
 * as chips, links and dates in the page's own layout, so printing them again as
 * body copy would repeat everything the header already said.
 */
const METADATA_HEADINGS = ['Kind', 'Source', 'URL', 'Date', 'Media', 'Summary', 'Related'];

export const stripWritingMetadata = (markdown: string): string =>
    markdown
        .split(/\n(?=## )/)
        .filter((section) => {
            const heading = section.match(/^## (.+)$/m)?.[1]?.trim();
            return !heading || !METADATA_HEADINGS.includes(heading);
        })
        .join('\n')
        // The title is rendered as the page heading, so drop the leading H1 to
        // avoid showing it twice.
        .replace(/^#\s+.*\n?/, '')
        .trim();

export const writingService = {
    async getAll(): Promise<WritingEntry[]> {
        try {
            const response = await apiClient.get<{ writing: WritingEntry[] }>(
                API_ENDPOINTS.WRITING
            );
            return response.data.writing || [];
        } catch (error) {
            throw toRequestError(error, 'Error fetching writing');
        }
    },

    async getBySlug(slug: string): Promise<WritingEntry> {
        try {
            const response = await apiClient.get<{ entry: WritingEntry }>(
                API_ENDPOINTS.WRITING_ENTRY(slug)
            );
            return response.data.entry;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                throw new Error(`Nothing published at "${slug}"`, { cause: error });
            }
            throw toRequestError(error, `Error fetching writing ${slug}`);
        }
    },
};
