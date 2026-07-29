/**
 * An ISO date as a reader's date. The index abbreviates the month to keep the
 * meta column narrow; a piece's own header spells it out.
 *
 * Parsed as UTC deliberately: `new Date('2025-11-25')` is midnight UTC, and
 * formatting that in a timezone behind UTC would show the 24th.
 */
export const formatIsoDate = (iso: string, month: 'short' | 'long'): string => {
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return iso;
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
        day: 'numeric',
        month,
        year: 'numeric',
        timeZone: 'UTC',
    });
};
