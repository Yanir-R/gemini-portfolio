# YANIR ROT - FULL-STACK AI ENGINEER

## CONTACT

<!-- This file is published: it ships in a public repository and is served over the
     API. Only contact details that are already public on the site belong here.
     The phone number on the PDF CV is deliberately not reproduced. -->

-   📧 rotyanir@gmail.com
-   🔗 Github - Yanir Rot
-   💼 LinkedIn - Yanir Rot

## PROFILE

Full-stack engineer specializing in production LLM and multi-agent systems. Works across the whole range, from a React component to a Helm chart, and is most useful on the correctness of an agent pipeline: evidence provenance, hallucination prevention, and token economics. Reproduces a failure against production data before shipping a fix.

## WORK EXPERIENCE

### Founding Engineer - seed-stage AI SRE platform _Aug 2025 - present_

<!-- The company is not named here, matching the public LinkedIn entry. -->

Multi-agent LLM investigations over Kubernetes, AWS and observability telemetry, producing evidence-cited root-cause analysis.

-   Designed the evidence-provenance architecture across three services, binding citations to retrieved evidence instead of letting the synthesizer model choose them - removing a structural class of hallucinated evidence rather than filtering it after the fact
-   Cut multi-agent token cost and latency by root-causing runaway fan-out and context bloat, including a query that dispatched 32 sub-agents for 369K wasted tokens and an agent that accumulated 6.1M tokens of tool results, through agent decomposition, context compaction and circuit-breaker enforcement
-   Built a tool-failure guard with error-classified retry and self-healing query repair, later generalized into a second service
-   Shipped a linter validating LLM-generated queries across eight query languages before execution, and Qdrant-backed semantic retrieval for agent skill hints
-   Built Go and Python services: the Kafka consumer/aggregator/router pipeline and the Redis + MongoDB session store
-   Led the product frontend in Next.js and React: chat and session architecture, SSE token streaming, evidence renderers, and the Next.js and React 19 migration

### Moonsite - Full Stack Developer _2023 - 2025_

-   Led frontend architecture for a sports betting platform serving 500K+ daily active users using React, React Native, TypeScript and SCSS
-   Managed a finance application used by major Israeli enterprises from planning through deployment, using React, JavaScript, TypeScript and SCSS
-   Worked with designers and backend developers on dynamic, data-driven interfaces, and implemented responsive design across devices and browsers

### Devforce - Full Stack Developer _2022 - 2023_

-   Built an AI-powered image tagging system for a startup's SaaS platform, improving tagging efficiency and data quality, using React, TypeScript, MobX, Leaflet and MUI
-   Revamped the order flow for a leading flight booking platform with React and TailwindCSS
-   Handled post-launch maintenance with a leading media company using React, TypeScript, Next.js, Node.js, Strapi and TailwindCSS

### Bond Sports - Automation Developer _2021 - 2022_

-   Created and executed automated tests with Testim.io
-   Defined, documented and performed sanity, functional, regression and end-to-end testing

### Tauora Products - Co-founder & Operations Manager _2018 - 2019_

-   Developed prototypes from concept to minimum viable product
-   Managed market development, including communication planning, writing and product design
-   Conducted competitive and market analysis across a target group of over 500 people

## SIDE PROJECTS

-   **Hermes** - a self-hosted agent running continuously with a custom persona, Obsidian-vault memory and a Telegram interface
-   **This site** - a document-grounded assistant on Gemini, hardened against prompt injection, with a golden-question set covering grounding, refusal and injection cases
-   **ReelSensei** - an AI video highlight service; built, shipped, and currently paused

## EDUCATION

-   Practical Software Engineer | Technion, Tel Aviv _2019 - 2020_

## SKILLS

### AI & LLM

-   Multi-agent orchestration
-   RAG & embeddings
-   Prompt engineering
-   Qdrant
-   Langfuse
-   Claude
-   Gemini / Vertex AI

### Languages

-   Python
-   TypeScript
-   Go
-   JavaScript

### Frontend

-   React
-   Next.js
-   React Native
-   TailwindCSS

### Backend & data

-   Node.js
-   Kafka
-   Redis
-   MongoDB
-   Memgraph / Cypher

### Infra & cloud

-   Kubernetes
-   Helm
-   ArgoCD
-   GCP
-   AWS

## LANGUAGES

-   English - fluent
-   Hebrew - native
