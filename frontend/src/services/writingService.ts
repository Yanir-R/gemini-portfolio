import axios from 'axios';
import { apiClient, toRequestError } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { WritingEntry } from '@/types/writing';
import { stripMetadataSections } from '@/utils/markdown';

/** Sections the backend parses out of each document into `WritingEntry` fields. */
const METADATA_HEADINGS = ['Kind', 'Source', 'URL', 'Date', 'Media', 'Summary', 'Related'];

export const stripWritingMetadata = (markdown: string): string =>
    stripMetadataSections(markdown, METADATA_HEADINGS)
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
