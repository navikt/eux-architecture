---
name: odin-jira
description: >-
  Analyzes a TEN JIRA issue, implements a fix across EUX repositories,
  creates PRs, and reports back to JIRA with results and reviewer tags.
---

# Odin JIRA — Automated Fix Skill

Takes a TEN JIRA issue key (e.g. `TEN-742`), analyzes the problem, implements a fix across the relevant EUX repositories, creates pull requests, and reports back to JIRA.

## Safety rules — ALWAYS follow these

1. **Project scope**: Only operate on project `TEN`. Never create or modify issues in other projects.
2. **NEVER commit to `main`**: Always create a feature branch. Never push directly to `main`.
3. **Always use `--yes`** on acli edit, transition, and assign commands to avoid interactive prompts.
4. **Be concise** in JIRA comments and PR descriptions. No filler text.
5. **Verify before PR**: Always verify that changes compile/build and are correct before creating pull requests.
6. **One branch per repo**: Use the same branch naming convention across all affected repos: `fix/<ISSUE-KEY>-<short-description>`.

## Reviewer tagging rules

When commenting on JIRA after creating PRs, tag the following people based on which repositories were changed:

| Repository | Tag in JIRA |
|---|---|
| `eux-web-app` | Dey Rittik |
| `eux-rina-api` | Arild Spikkeland |
| `eux-fagmodul-journalfoering` | Arild Spikkeland |
| `eux-nav-rinasak` | Vegard Hillestad |
| `eux-neessi` | Vegard Hillestad |
| `eux-person-oppdatering` | Knut Bjørnar Wålberg |
| `eux-barnetrygd` | Knut Bjørnar Wålberg |
| `eux-legacy-rina-events` | Torsten Kirschner |
| `eux-all-rina-events` | Torsten Kirschner |

Multiple repos may be changed — tag all relevant people.

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

### Search issues

```bash
acli jira workitem search --jql "project = TEN AND key = TEN-123" --limit 1
```

## Steps

When invoked with a JIRA issue key (e.g. `/odin-jira TEN-742`):

### Step 1 — Comment that work has started

Add a comment to the JIRA issue announcing that automated analysis and fix is in progress:

```bash
acli jira workitem comment create --key TEN-742 \
  --body '{"version":1,"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"🤖 Odin is analyzing this issue and working on a fix. Stand by for updates."}]}]}'
```

### Step 2 — Analyze the JIRA issue

Fetch the full issue details to understand what needs to be done:

```bash
acli jira workitem view TEN-742 --json
```

Read the summary, description, and comments carefully. Understand:
- What is the problem or request?
- What behavior is expected vs actual?
- Are there stack traces, error messages, or specific SED/BUC types mentioned?
- Are there any comments with additional context?

### Step 3 — Determine which repositories need changes

Use the EUX Architecture document (`navikt/eux-architecture` README.md) to understand the platform and identify which repositories are involved.

To read the architecture overview:

```bash
cat /Users/vegard/workspace/eux-architecture/README.md
```

Or if not locally available:

```bash
gh api repos/navikt/eux-architecture/contents/README.md --jq '.content' | base64 -d
```

Based on the issue analysis:
- Map the problem to specific services (e.g. journaling issues → eux-journalfoering, eux-journal; RINA case issues → eux-nav-rinasak, eux-rina-api; frontend issues → eux-web-app, eux-neessi).
- Clone or navigate to the relevant repositories.
- Search the code to confirm where the fix needs to go.

### Step 4 — Create feature branches

For each repository that needs changes, create a branch from `main`:

```bash
cd <repo-directory>
git checkout main
git pull
git checkout -b fix/TEN-742-short-description
```

Use the **same branch name pattern** across all repos: `fix/<ISSUE-KEY>-<short-description>`.

**CRITICAL: NEVER make changes directly on the `main` branch.**

### Step 5 — Implement the fix

Make the necessary code changes in each repository. Follow the coding patterns and conventions already established in each repo. Use the appropriate developer agent if available:
- For Java repos → use `eux-java-dev` agent patterns
- For Kotlin repos → use `eux-kotlin-dev` agent patterns
- For frontend (eux-web-app) → use `eux-full-stack-dev` agent patterns

### Step 6 — Verify changes

For each repository with changes:

1. Review the diff to ensure correctness:
   ```bash
   git --no-pager diff
   ```

2. Run the build if a build system is available:
   ```bash
   # Maven-based projects
   mvn compile -q
   # or for Node.js projects
   npm run build
   ```

3. Run tests if available:
   ```bash
   mvn test -q
   # or
   npm test
   ```

4. Verify no unintended files were changed.

### Step 7 — Commit and push

For each repository:

```bash
git add -A
git commit -m "fix: <concise description of the fix>

Resolves TEN-742

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git push -u origin fix/TEN-742-short-description
```

### Step 8 — Create pull requests

For each repository, create a PR using the GitHub CLI:

```bash
gh pr create \
  --title "fix: <concise description> (TEN-742)" \
  --body "Resolves [TEN-742](https://jira.adeo.no/browse/TEN-742)

## Changes
- <bullet list of what was changed and why>

## Verification
- <how the fix was verified>" \
  --base main
```

Collect all PR URLs for the JIRA comment.

### Step 9 — Comment on JIRA with results

Create a detailed comment on the JIRA issue summarizing what was done. The comment MUST include:

1. A summary of the changes made
2. Which repositories were modified
3. **Links to all open Pull Requests**
4. **Tags for reviewers** based on the reviewer tagging rules above

Build the ADF comment dynamically. Example structure:

```bash
acli jira workitem comment create --key TEN-742 \
  --body '{"version":1,"type":"doc","content":[
    {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"🤖 Odin — Fix implemented"}]},
    {"type":"paragraph","content":[{"type":"text","text":"Changes have been implemented for TEN-742."}]},
    {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Summary"}]},
    {"type":"paragraph","content":[{"type":"text","text":"<description of what was changed>"}]},
    {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Pull Requests"}]},
    {"type":"bulletList","content":[
      {"type":"listItem","content":[{"type":"paragraph","content":[
        {"type":"text","text":"eux-neessi: ","marks":[{"type":"strong"}]},
        {"type":"text","text":"PR #123","marks":[{"type":"link","attrs":{"href":"https://github.com/navikt/eux-neessi/pull/123"}}]}
      ]}]}
    ]},
    {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Reviewers"}]},
    {"type":"paragraph","content":[{"type":"text","text":"Tagging for review: Vegard Hillestad"}]}
  ]}'
```

**Important**: Always include working links to every PR that was created. Use the actual PR URLs returned by `gh pr create`.

### Step 10 — Final check

- Verify all PRs are open and have the correct base branch (`main`).
- Verify the JIRA comment was created successfully.
- If any step failed, comment on the JIRA issue explaining what went wrong and what was completed.
