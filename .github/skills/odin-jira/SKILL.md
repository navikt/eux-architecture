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
2. **NEVER commit to `main` or `master`**: Always create a feature branch. Never push directly to `main` or `master`.
3. **NEVER deploy backends**: Only deploy eux-web-app (frontend) to odin environments. Never trigger backend deploy workflows.
4. **Always use `--yes`** on acli edit, transition, and assign commands to avoid interactive prompts.
5. **Be concise** in JIRA comments and PR descriptions. No filler text.
6. **Verify before PR**: Always verify that changes compile/build and are correct before creating pull requests.
7. **One branch per repo**: Use the same branch naming convention across all affected repos: `fix/<ISSUE-KEY>-<short-description>`.
8. **Write Norwegian**: All JIRA comments must be written in concise Norwegian (bokmål). PR titles and descriptions remain in English.

## Reviewer tagging rules

When commenting on JIRA after creating PRs, **use proper ADF `mention` nodes** so reviewers receive JIRA notifications. Plain text names do NOT trigger notifications.

### Reviewer account IDs

Use these Atlassian account IDs to build ADF mention nodes:

| Repository | Reviewer | Atlassian Account ID |
|---|---|---|
| `eux-web-app` | Dey Rittik | `62f25d6ef15eecaf500fbbe8` |
| `eux-rina-api` | Arild Spikkeland | `557058:db5de1a2-5606-4749-8a0e-03d7f89682a3` |
| `eux-fagmodul-journalfoering` | Arild Spikkeland | `557058:db5de1a2-5606-4749-8a0e-03d7f89682a3` |
| `eux-nav-rinasak` | Vegard Hillestad | `712020:9222ebea-ab05-497c-81f6-38a689b6d0f4` |
| `eux-neessi` | Vegard Hillestad | `712020:9222ebea-ab05-497c-81f6-38a689b6d0f4` |
| `eux-person-oppdatering` | Knut Bjørnar Wålberg | `62b035ab673f2103622cb2a9` |
| `eux-barnetrygd` | Knut Bjørnar Wålberg | `62b035ab673f2103622cb2a9` |
| `eux-legacy-rina-events` | Torsten Kirschner | `557058:941fd5b5-9b73-45a6-b54a-cc95bd6bf555` |
| `eux-all-rina-events` | Torsten Kirschner | `557058:941fd5b5-9b73-45a6-b54a-cc95bd6bf555` |

Multiple repos may be changed — mention all relevant people.

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

**Mention (triggers JIRA notification):**
```json
{"type":"mention","attrs":{"id":"<accountId>","text":"@Display Name","accessLevel":""}}
```

Example — mention Vegard Hillestad:
```json
{"type":"mention","attrs":{"id":"712020:9222ebea-ab05-497c-81f6-38a689b6d0f4","text":"@Vegard Hillestad","accessLevel":""}}

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

### Step 1 — Assign, transition, and comment that work has started

First, determine the current user's identity:

```bash
acli jira auth status
```

Assign the issue to the person who initiated the skill, and transition it to "Under arbeid":

```bash
acli jira workitem assign --key TEN-742 --assignee "@me" --yes
acli jira workitem transition --key TEN-742 --status "Under arbeid" --yes
```

Then add a comment announcing that work is in progress:

```bash
acli jira workitem comment create --key TEN-742 \
  --body '{"version":1,"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"🤖 Odin analyserer denne saken og jobber med en fiks. Oppdatering kommer."}]}]}'
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

### Step 3 — Evaluate description quality

Before attempting implementation, evaluate whether the issue description contains enough information to act on. A description is **sufficient** if you can answer **all** of these:

1. **What** is the problem or desired change?
2. **Where** in the system does it occur? (which service, screen, flow, SED/BUC type, etc.)
3. **How** to reproduce or verify it? (steps, example data, error messages, screenshots, or expected vs actual behavior)

**If the description is sufficient** → proceed to Step 4.

**If the description is insufficient** → comment on the JIRA issue explaining what is missing, then **stop**. Do not attempt implementation. Example:

```bash
acli jira workitem comment create --key TEN-742 \
  --body '{"version":1,"type":"doc","content":[
    {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"🤖 Odin — Trenger mer informasjon"}]},
    {"type":"paragraph","content":[{"type":"text","text":"Kunne ikke starte automatisk fiks fordi beskrivelsen mangler nødvendige detaljer."}]},
    {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Hva mangler"}]},
    {"type":"bulletList","content":[
      {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"<konkret detalj som mangler, f.eks. hvilken SED-type, feilmelding, steg for å reprodusere>"}]}]}
    ]},
    {"type":"paragraph","content":[{"type":"text","text":"Oppdater beskrivelsen med de manglende detaljene, og kjør Odin på nytt."}]}
  ]}'
```

Tailor the "What is missing" bullets to the specific gaps. Be concrete — say exactly what information would unblock implementation.

### Step 4 — Determine which repositories need changes

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
- Search the code to confirm where the fix needs to go.

### Step 5 — Create feature branches

For each repository that needs changes, determine the default branch (`main` or `master`), ensure it is up to date with GitHub, then create the feature branch from it:

```bash
cd <repo-directory>
DEFAULT_BRANCH=$(git remote show origin | grep 'HEAD branch' | awk '{print $NF}')
git checkout "$DEFAULT_BRANCH"
git pull origin "$DEFAULT_BRANCH"
git checkout -b fix/TEN-742-short-description
```

Use the **same branch name pattern** across all repos: `fix/<ISSUE-KEY>-<short-description>`.

**CRITICAL:**
- **NEVER make changes directly on the default branch (`main`/`master`).**
- **ALWAYS `git pull` before branching** to ensure you branch from the latest remote state.

### Step 6 — Implement the fix

Make the necessary code changes in each repository. Follow the coding patterns and conventions already established in each repo. Use the appropriate developer agent if available:
- For Java repos → use `eux-java-dev` agent patterns
- For Kotlin repos → use `eux-kotlin-dev` agent patterns
- For frontend (eux-web-app) → use `eux-full-stack-dev` agent patterns

### Step 7 — Verify changes

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

### Step 8 — Commit and push

For each repository:

```bash
git add -A
git commit -m "fix: <concise description of the fix>

Resolves TEN-742

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git push -u origin fix/TEN-742-short-description
```

### Step 9 — Create pull requests

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

### Step 8.5 — Deploy branch to odin test environments

After pushing (both on initial PR creation and after subsequent updates), deploy the eux-web-app feature branch to the odin test environments so changes can be verified before merge.

**Only for eux-web-app changes** (never deploy backends from this skill):

```bash
gh workflow run build-and-deploy-to-q.yaml \
  --repo navikt/eux-web-app \
  --ref fix/TEN-742-short-description \
  -f environment=q2-odin

gh workflow run build-and-deploy-to-q.yaml \
  --repo navikt/eux-web-app \
  --ref fix/TEN-742-short-description \
  -f environment=q1-odin
```

After triggering, verify the workflows started:

```bash
gh run list --repo navikt/eux-web-app --branch fix/TEN-742-short-description --limit 2
```

### Step 9 — Comment on JIRA with results

Create a detailed comment on the JIRA issue summarizing what was done. The comment MUST include:

1. A summary of the changes made
2. Which repositories were modified
3. **Links to all open Pull Requests**
4. **Tags for reviewers** based on the reviewer tagging rules above

Build the ADF comment dynamically. Use `mention` nodes (not plain text) for reviewer tags. Example structure:

```bash
acli jira workitem comment create --key TEN-742 \
  --body '{"version":1,"type":"doc","content":[
    {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"🤖 Odin — Fiks implementert"}]},
    {"type":"paragraph","content":[{"type":"text","text":"Endringer er implementert for TEN-742."}]},
    {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Oppsummering"}]},
    {"type":"paragraph","content":[{"type":"text","text":"<beskrivelse av hva som ble endret>"}]},
    {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Pull Requests"}]},
    {"type":"bulletList","content":[
      {"type":"listItem","content":[{"type":"paragraph","content":[
        {"type":"text","text":"eux-neessi: ","marks":[{"type":"strong"}]},
        {"type":"text","text":"PR #123","marks":[{"type":"link","attrs":{"href":"https://github.com/navikt/eux-neessi/pull/123"}}]}
      ]}]}
    ]},
    {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Reviewer"}]},
    {"type":"paragraph","content":[
      {"type":"text","text":"Ber om review: "},
      {"type":"mention","attrs":{"id":"712020:9222ebea-ab05-497c-81f6-38a689b6d0f4","text":"@Vegard Hillestad","accessLevel":""}}
    ]}
  ]}'
```

**Important**: Always include working links to every PR that was created. Use the actual PR URLs returned by `gh pr create`.

### Step 11 — Final check

- Verify all PRs are open and have the correct base branch (`main`).
- Verify the JIRA comment was created successfully.
- Verify odin deploy workflows were triggered successfully.
- If any step failed, comment on the JIRA issue explaining what went wrong and what was completed.

---

## Re-implementation after feedback

These steps apply **every time** changes are requested — whether from a GitHub PR review, from the user in the same conversation after the initial implementation, or from a subsequent `/odin-jira` invocation. Any push of updated code to a PR MUST be followed by a JIRA comment and an odin deploy.

### Step R1 — Understand the feedback

If feedback comes from a PR review, read the review comments:

```bash
gh pr view <PR-NUMBER> --repo navikt/<repo> --comments
gh api repos/navikt/<repo>/pulls/<PR-NUMBER>/reviews --jq '.[].body'
```

If feedback comes from the user in the current conversation, use what they said directly.

### Step R2 — Implement the requested changes

Check out the existing feature branch, make the changes, and verify:

```bash
cd <repo-directory>
git checkout fix/TEN-742-short-description
git pull
```

Make the code changes, then verify (build/test as in Step 6).

### Step R3 — Commit and push

```bash
git add -A
git commit -m "fix: <concise summary of what changed>

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git push
```

### Step R4 — Deploy to odin environments

If eux-web-app was changed, trigger builds to the odin test environments (same as Step 8.5).

### Step R5 — Comment on JIRA with update

Add a JIRA comment summarizing what was modified. Do this after **every** push — not just the first one. The comment MUST include:

1. What feedback was addressed
2. A summary of the code modifications made
3. Confirmation that the branch was redeployed to odin environments (if eux-web-app)

Example:

```bash
acli jira workitem comment create --key TEN-742 \
  --body '{"version":1,"type":"doc","content":[
    {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"🤖 Odin — Update pushed"}]},
    {"type":"paragraph","content":[{"type":"text","text":"Updated PR based on feedback:"}]},
    {"type":"bulletList","content":[
      {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"<summary of each modification made>"}]}]}
    ]},
    {"type":"paragraph","content":[{"type":"text","text":"Branch redeployed to q2-odin and q1-odin for verification."}]}
  ]}'
```

**Repeat steps R1–R5 for every round of feedback** within the same conversation or across invocations.
