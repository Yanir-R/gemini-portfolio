#!/usr/bin/env node
/*
 * Asserts that the link-preview copy matches the page.
 *
 * The home page standfirst appears in four places outside the module graph:
 * three description tags in index.html and the card text in
 * tools/og-image.html. None of them can import a constant, so all four are
 * written by hand and can drift from SITE_COPY.STANDFIRST independently.
 *
 * Drift is invisible from inside the app - the page renders correctly and every
 * other check passes, while the preview advertises a sentence the site no
 * longer says. The only symptom appears in someone else's chat client, which is
 * why this is a CI step rather than a note in a README.
 *
 * This compares text only. It cannot tell whether public/og-image.png was
 * regenerated from og-image.html afterwards; see that file's header for the
 * headless Chrome command.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const CONFIG = 'src/constants/config.ts';
const source = read(CONFIG);

// The constant is the source of truth; take it as written rather than
// duplicating it here, which would just move the drift into this file.
const match = source.match(/STANDFIRST:\s*(['"])((?:\\.|(?!\1).)*)\1/);
if (!match) {
    console.error(`Could not find SITE_COPY.STANDFIRST in ${CONFIG}.`);
    process.exit(2);
}
const standfirst = match[2].replace(/\\(['"\\])/g, '$1');

const targets = [
    { file: 'index.html', expected: 3, what: 'description / og:description / twitter:description' },
    { file: 'tools/og-image.html', expected: 1, what: 'the card standfirst' },
];

let failed = false;
for (const { file, expected, what } of targets) {
    const found = read(file).split(standfirst).length - 1;
    if (found === expected) {
        console.log(`  ok    ${file} - ${expected}x (${what})`);
    } else {
        failed = true;
        console.error(`  FAIL  ${file} - found ${found}x, expected ${expected}x (${what})`);
    }
}

if (failed) {
    console.error(
        `\nThe link preview no longer matches the page.\n` +
            `Copy this sentence from ${CONFIG} into the places listed above:\n\n` +
            `  ${standfirst}\n\n` +
            `Then regenerate public/og-image.png - see the header of tools/og-image.html.`
    );
    process.exit(1);
}

console.log('\nPreview copy matches the page.');
