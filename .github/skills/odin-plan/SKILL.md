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

Always use ADF JSON for JIRA comments. **Always use `--body-file`** to pass ADF — never pass ADF inline via `--body` (shell escaping will mangle the JSON and acli will post it as raw text).

### Workflow for ADF comments

1. Build the ADF JSON object in memory.
2. Write it to a temp file (e.g. `/tmp/odin-comment.json`).
3. Pass the file via `--body-file`.
4. Delete the temp file.

```bash
cat > /tmp/odin-comment.json << 'ENDOFJSON'
{"version":1,"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Comment text"}]}]}
ENDOFJSON
acli jira workitem comment create --key TEN-123 --body-file /tmp/odin-comment.json
rm -f /tmp/odin-comment.json
```

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

- **NEVER pass ADF inline via `--body`** — always write to a temp file and use `--body-file`.
- Keep ADF as single-line JSON (no pretty-printing) inside the file.
- Use heredoc with single-quoted delimiter (`<< 'ENDOFJSON'`) to prevent shell variable expansion.

## Command reference (acli)

### View an issue

```bash
acli jira workitem view TEN-123
acli jira workitem view TEN-123 --json
acli jira workitem view TEN-123 --fields "summary,status,comment,assignee,reporter,description"
```

### Add a comment

```bash
cat > /tmp/odin-comment.json << 'ENDOFJSON'
{"version":1,"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Comment text"}]}]}
ENDOFJSON
acli jira workitem comment create --key TEN-123 --body-file /tmp/odin-comment.json
rm -f /tmp/odin-comment.json
```

### List and delete comments

```bash
# List comments as JSON (for finding comment IDs)
acli jira workitem comment list --key TEN-123 --json --paginate

# Delete a comment by ID
acli jira workitem comment delete --key TEN-123 --id <comment-id>
```

## Steps

When invoked with a JIRA issue key (e.g. `/odin-plan TEN-742`):

### Step 1 — Assign and transition the issue

Assign the issue to the person who invoked the skill and move it to "Under arbeid":

```bash
acli jira workitem assign --key TEN-742 --assignee "@me" --yes
acli jira workitem transition --key TEN-742 --status "Under arbeid" --yes
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

### Step 4 — Build the implementation plan

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

### Step 5 — Delete any existing plan comment, then post the new one

There must be **at most one** "Odin's plan" comment on an issue. Before posting, find and delete any previous plan comment.

#### 5a — Find and delete the existing plan comment

List all comments as JSON and look for one whose body contains the text "Odin's plan":

```bash
acli jira workitem comment list --key TEN-742 --json --paginate
```

Parse the JSON output to find any comment where the rendered body or ADF content contains "Odin's plan". Extract the comment **id** for each match.

If a matching comment is found, delete it:

```bash
acli jira workitem comment delete --key TEN-742 --id <comment-id>
```

If multiple matching comments exist (shouldn't happen, but be safe), delete **all** of them so only the new one remains.

#### 5b — Post the new plan comment

Add a comment with the heading **"Odin's plan"**. The plan MUST start with an ADF heading node with text "Odin's plan" so that odin-jira can find it.

Example structure:

```bash
cat > /tmp/odin-plan-comment.json << 'ENDOFJSON'
{"version":1,"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Odin's plan"}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Problem"}]},{"type":"paragraph","content":[{"type":"text","text":"<concise problem summary>"}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Affected repositories"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"eux-neessi","marks":[{"type":"strong"}]},{"type":"text","text":" — <why this repo needs changes>"}]}]}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Changes"}]},{"type":"heading","attrs":{"level":4},"content":[{"type":"text","text":"eux-neessi"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"<specific file and what to change>"}]}]}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Risks and considerations"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"<edge case or concern>"}]}]}]}]}
ENDOFJSON
acli jira workitem comment create --key TEN-742 --body-file /tmp/odin-plan-comment.json
rm -f /tmp/odin-plan-comment.json
```

### Step 6 — Final check

- Verify the JIRA comment was created successfully.
- If any step failed, comment on the JIRA issue explaining what went wrong.
