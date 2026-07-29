"""Assembles everything the chat is allowed to know about Yanir.

This is the single place the corpus is built. Nothing else reads the docs
directories for chat purposes, so "what does the model know" has exactly one
answer and one place to change.

Two properties are deliberate:

**It is cached against file mtimes, not loaded per request.** Parsing every
markdown and PDF on each chat message is affordable at this size, but it leaves
the cost of the corpus invisible - nothing reports how much context a request is
paying for. Here it is loaded once, logged once with its token estimate, and
rebuilt only when a file actually changes.

**An empty corpus is an error, not a fallback.** `docs/templates/` holds
placeholder files (`[brief story]`, `[your main programming languages]`) as a
starting point for anyone forking this repo. Falling back to them when the
profile directory is empty would mean a misconfigured deploy answering visitors
from placeholders in a confident first person instead of failing. Templates are
documentation; they are never sent to the model.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import List, Tuple

from docs_helper import (
    PROFILE_DIR,
    PROJECTS_DIR,
    WRITING_DIR,
    get_all_projects,
    get_all_writing,
    read_markdown_file,
    read_pdf_file,
)

logger = logging.getLogger(__name__)

# Rough characters-per-token for English prose. Used only for logging and for
# deciding when selectivity is worth building - never for a hard limit, so an
# approximation is fine.
CHARS_PER_TOKEN = 4

# Purely advisory. If the logged estimate crosses this, the corpus has grown
# past the point where sending all of it on every request is obviously correct,
# and it is time to look at tag routing or retrieval. Nothing enforces it.
CONTEXT_REVIEW_TOKENS = 20_000


@dataclass(frozen=True)
class Knowledge:
    """The corpus, plus enough metadata to reason about its cost."""

    text: str
    sources: Tuple[str, ...]
    approx_tokens: int

    @property
    def is_empty(self) -> bool:
        return not self.text.strip()


EMPTY = Knowledge(text="", sources=(), approx_tokens=0)

_CONTENT_DIRS = (PROFILE_DIR, PROJECTS_DIR, WRITING_DIR)
_READABLE_SUFFIXES = (".md", ".pdf")

# (fingerprint, knowledge) of the last successful build.
_cache: Tuple[Tuple, Knowledge] | None = None


def _fingerprint() -> Tuple:
    """Identity of the content on disk: path, size and mtime of each file.

    Cheap enough to run per request (a handful of stat calls) and precise enough
    that editing a file locally is picked up without a restart.
    """
    entries: List[Tuple[str, int, int]] = []
    for directory in _CONTENT_DIRS:
        if not os.path.isdir(directory):
            continue
        for name in sorted(os.listdir(directory)):
            if not name.endswith(_READABLE_SUFFIXES):
                continue
            path = os.path.join(directory, name)
            try:
                stat = os.stat(path)
            except OSError:
                continue
            entries.append((path, stat.st_size, int(stat.st_mtime_ns)))
    return tuple(entries)


def _read(path: str) -> str:
    return read_pdf_file(path) if path.endswith(".pdf") else read_markdown_file(path)


def _profile_sections() -> List[Tuple[str, str]]:
    """Yanir's own documents, as (label, body) pairs."""
    sections: List[Tuple[str, str]] = []
    if not os.path.isdir(PROFILE_DIR):
        logger.warning("Profile directory %s does not exist", PROFILE_DIR)
        return sections

    for name in sorted(os.listdir(PROFILE_DIR)):
        if not name.endswith(_READABLE_SUFFIXES):
            continue
        body = _read(os.path.join(PROFILE_DIR, name))
        if body.strip():
            sections.append((f"Profile / {os.path.splitext(name)[0]}", body.strip()))
    return sections


def _project_sections() -> List[Tuple[str, str]]:
    """The project write-ups the site already publishes, reused as chat context.

    The blog and the chat answer from the same files on purpose: two corpora
    would eventually disagree with each other about the same project.
    """
    sections: List[Tuple[str, str]] = []
    for project in get_all_projects():
        body = (project.get("content") or "").strip()
        if body:
            title = project.get("title") or project.get("slug") or "Untitled"
            sections.append((f"Project / {title}", body))
    return sections


def _writing_sections() -> List[Tuple[str, str]]:
    """Published writing, on the same terms as the project write-ups.

    This is what makes the claim on the writing page true rather than
    aspirational: a post is one document, rendered for a reader and given to the
    model, so the two cannot drift. It also means the chat can answer "what have
    you written about evals?" from the actual posts instead of declining.
    """
    sections: List[Tuple[str, str]] = []
    for entry in get_all_writing():
        body = (entry.get("content") or "").strip()
        if body:
            title = entry.get("title") or entry.get("slug") or "Untitled"
            sections.append((f"Writing / {title}", body))
    return sections


def _build() -> Knowledge:
    sections = _profile_sections() + _project_sections() + _writing_sections()
    if not sections:
        return EMPTY

    # Each section is fenced and labelled so the model can attribute a fact to a
    # source, and so injected text inside a document cannot pass itself off as
    # the end of the corpus. prompt.py wraps the whole block again.
    body = "\n\n".join(
        f"### {label}\n{content}" for label, content in sections
    )
    return Knowledge(
        text=body,
        sources=tuple(label for label, _ in sections),
        approx_tokens=len(body) // CHARS_PER_TOKEN,
    )


def get_knowledge() -> Knowledge:
    """Returns the corpus, rebuilding only when the files on disk have changed."""
    global _cache

    fingerprint = _fingerprint()
    if _cache is not None and _cache[0] == fingerprint:
        return _cache[1]

    knowledge = _build()
    _cache = (fingerprint, knowledge)

    if knowledge.is_empty:
        logger.error(
            "Knowledge corpus is empty - no readable files in %s. "
            "Chat will decline to answer questions about Yanir.",
            PROFILE_DIR,
        )
    else:
        logger.info(
            "Knowledge corpus loaded: %d sections, ~%d tokens per request (%s)",
            len(knowledge.sources),
            knowledge.approx_tokens,
            ", ".join(knowledge.sources),
        )
        if knowledge.approx_tokens > CONTEXT_REVIEW_TOKENS:
            logger.warning(
                "Corpus is ~%d tokens, past the ~%d review threshold. Every chat "
                "request now pays for all of it; consider selecting sections per "
                "question instead of sending the whole corpus.",
                knowledge.approx_tokens,
                CONTEXT_REVIEW_TOKENS,
            )

    return knowledge
