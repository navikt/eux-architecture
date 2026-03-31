---
name: odin-plan
description: >-
  Analyzes a TEN JIRA issue and posts an implementation plan as a comment.
  Does not implement anything — planning only.
---

# Odin Plan — Implementation Planning Skill

Takes a TEN JIRA issue key (e.g. `TEN-742`), analyzes the problem, determines which repositories and code areas need changes, and posts an implementation plan as a JIRA comment. Does **not** implement anything or create PRs.

## Safety rules — ALWAYS follow these

1. **Project scope**: Only operate on project `TEN`. Never create or modify issues in other projects.
2. **Planning only**: Never create branches, modify code, create PRs, or trigger deployments.
3. **Always use `--yes`** on acli edit, transition, and assign commands to avoid interactive prompts.
4. **Be concise** in JIRA comments. No filler text.

## ADF (Atlassian Document Format)

Always use ADF JSON for `--body` flags when creating JIRA comments. acli accepts ADF inline.

### ADF structure

```json
{"version":1,"type":"doc","content":[...nodes]}
```

### Common node types

**Paragraph:**
```json
{"type":"paragraph","content":[{"type":"text","text":"Some text"}]}
```

**Heading (level 1-3):**
```json
{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Title"}]}
```

**Bullet list:**
```json
{"type":"bulletList","content":[
  {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Item"}]}]}
]}
```

**Bold text:**
```json
{"type":"text","text":"bold text","marks":[{"type":"strong"}]}
```

**Link:**
```json
{"type":"text","text":"click here","marks":[{"type":"link","attrs":{"href":"https://example.com"}}]}
```

### ADF guidelines

- Keep ADF compact — single-line JSON, no pretty-printing, when passing via `--body`.
- Wrap the entire JSON in single quotes on the command line to avoid shell escaping issues.

## Command reference (acli)

### View an issue

```bash
acli jira workitem view TEN-123
acli jira workitem view TEN-123 --json
acli jira workitem view TEN-123 --fields "summary,status,comment,assignee,reporter,description"
```

### Add a comment

```bash
acli jira workitem comment create --key TEN-123 \
  --body '{"version":1,"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Comment text"}]}]}'
```

## Steps

When invoked with a JIRA issue key (e.g. `/odin-plan TEN-742`):

### Step 1 — Analyze the JIRA issue

Fetch the full issue details to understand what needs to be done:

```bash
acli jira workitem view TEN-742 --json
```

Read the summary, description, and comments carefully. Understand:
- What is the problem or request?
- What behavior is expected vs actual?
- Are there stack traces, error messages, or specific SED/BUC types mentioned?
- Are there any comments with additional context?

### Step 2 — Determine which repositories need changes

Use the EUX Architecture document (`navikt/eux-architecture` README.md) to understand the platform and identify which repositories are involved.

To read the architecture overview:

```bash
cat eux-architecture/README.md
```

Or if not locally available:

```bash
gh api repos/navikt/eux-architecture/contents/README.md --jq '.content' | base64 -d
```

Based on the issue analysis:
- Map the problem to specific services (e.g. journaling issues → eux-journalfoering, eux-journal; RINA case issues → eux-nav-rinasak, eux-rina-api; frontend issues → eux-web-app, eux-neessi).
- Clone or navigate to the relevant repositories.
- Search the code to find the exact files and functions that need changes.

### Step 3 — Build the implementation plan

Create a detailed plan that covers:

1. **Problem summary** — what the issue is about, in one or two sentences.
2. **Affected repositories** — which repos need changes and why.
3. **Changes per repository** — for each repo, list:
   - Which files need to be modified or created
   - What the change should be (describe the logic, not just "fix it")
   - Any new classes, endpoints, or components needed
4. **Risks and considerations** — edge cases, breaking changes, migration concerns, or things to verify.
5. **Dependencies** — if changes must be deployed in a specific order.

Be specific enough that someone (or odin-jira) can implement the plan without re-analyzing the issue.

### Step 4 — Post the plan as a JIRA comment

Add a comment with the heading **"Odin's plan"**. The plan MUST start with an ADF heading node with text "Odin's plan" so that odin-jira can find it.

Example structure:

```bash
acli jira workitem comment create --key TEN-742 \
  --body '{"version":1,"type":"doc","content":[
    {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Odin's plan"}]},
    {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Problem"}]},
    {"type":"paragraph","content":[{"type":"text","text":"<concise problem summary>"}]},
    {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Affected repositories"}]},
    {"type":"bulletList","content":[
      {"type":"listItem","content":[{"type":"paragraph","content":[
        {"type":"text","text":"eux-neessi","marks":[{"type":"strong"}]},
        {"type":"text","text":" — <why this repo needs changes>"}
      ]}]}
    ]},
    {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Changes"}]},
    {"type":"heading","attrs":{"level":4},"content":[{"type":"text","text":"eux-neessi"}]},
    {"type":"bulletList","content":[
      {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"<specific file and what to change>"}]}]}
    ]},
    {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Risks and considerations"}]},
    {"type":"bulletList","content":[
      {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"<edge case or concern>"}]}]}
    ]}
  ]}'
```

### Step 5 — Final check

- Verify the JIRA comment was created successfully.
- If any step failed, comment on the JIRA issue explaining what went wrong.
