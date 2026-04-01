---
name: deploy-branch
description: >-
  Pushes current branch to GitHub and triggers build/deploy workflows for EUX
  services. Safety: refuses to deploy from main. Frontend defaults to parallel.
---

# Deploy Branch

Pushes the current branch to GitHub and triggers GitHub Actions build/deploy workflows for EUX services in q-environments.

## Safety rules — ALWAYS follow these

1. **NEVER deploy from `main` or `master`**: Before ANY action, check the current branch. If on `main` or `master`, **STOP immediately** and ask the user which branch to switch to. Do NOT proceed until on a feature branch.
2. **Always push before triggering**: The branch must exist on GitHub before triggering a workflow.
3. **Confirm before deploying**: Show the user what will happen (repo, branch, environment, workflow) and ask for confirmation before triggering.
4. **Frontend defaults to `q2-parallel`**: When deploying eux-web-app, default to `q2-parallel` unless the user specifies otherwise.
5. **One push, one trigger**: Push the branch and trigger the workflow in sequence. Do not batch across repos without confirming each.

## Supported repositories and workflows

| Repository | Type | Workflow file | Inputs | Default target |
|---|---|---|---|---|
| `eux-web-app` | frontend | `build-and-deploy-to-q.yaml` | `environment` (choice) | `q2-parallel` |
| `eux-neessi` | backend | `build-and-deploy-to-q1-and-q2.yaml` | — | q1 + q2 |
| `eux-fagmodul-journalfoering` | backend | `build-and-deploy-to-q1-and-q2.yaml` | — | q1 + q2 |
| `eux-rina-api` | backend | `build-and-deploy-to-q1-and-q2.yaml` | — | q1 + q2 |
| `eux-nav-rinasak` | backend | `build-and-deploy-to-q1-and-q2.yaml` | — | q1 + q2 |
| `eux-journal` | backend | `build-and-deploy-to-q1-and-q2.yaml` | — | q1 + q2 |
| `eux-oppgave` | backend | `build-and-deploy-to-q1-and-q2.yaml` | — | q1 + q2 |

### Frontend environment options (eux-web-app)

Available values for the `environment` input:

- `q2-parallel` ← **default**
- `q1-parallel`
- `q2-experimental`
- `q1-experimental`
- `q2-odin`
- `q1-odin`
- `q2` (base, shared — be careful)
- `q1` (base, shared — be careful)

## Steps

### Step 1 — Determine what to deploy

Figure out which repository(ies) the user wants to deploy:

- **If the user is inside an EUX repo directory** → use that repo.
- **If the user says "frontend"** → `eux-web-app`.
- **If the user says "backend" or "BFF"** → `eux-neessi`.
- **If the user says "journalfoering" or "fagmodul"** → `eux-fagmodul-journalfoering`.
- **If the user says "all" or lists multiple repos** → handle each one in sequence.
- **If the user names a specific repo** → use that repo.

To detect which repo the current directory belongs to:

```bash
basename "$(git rev-parse --show-toplevel 2>/dev/null)"
```

If the user asks to deploy a repo they are NOT currently in, look for it in the parent directory (sibling checkout):

```bash
WORKSPACE="$(dirname "$(git rev-parse --show-toplevel 2>/dev/null)")"
ls "$WORKSPACE/<repo-name>" 2>/dev/null
```

### Step 2 — Safety check: verify branch

For **each** repository to deploy:

```bash
cd <repo-directory>
BRANCH=$(git branch --show-current)
echo "Current branch: $BRANCH"
```

**If `$BRANCH` is `main` or `master` → STOP immediately.** Tell the user:

> ⛔ You are on `main` in `<repo>`. I will NOT deploy from main.
> Which branch should I switch to?

Wait for the user to provide a branch name, then:

```bash
git checkout <branch-name>
```

If the branch doesn't exist locally, try:

```bash
git fetch origin <branch-name>
git checkout <branch-name>
```

### Step 3 — Push the branch to GitHub

```bash
cd <repo-directory>
git push -u origin "$BRANCH"
```

If the push fails, show the error and stop. Common issues:
- Branch needs rebase → tell the user.
- No upstream configured → the `-u` flag handles this.

### Step 4 — Trigger the GitHub Actions workflow

**For backend repos** (eux-neessi, eux-fagmodul-journalfoering, eux-rina-api, etc.):

```bash
gh workflow run build-and-deploy-to-q1-and-q2.yaml \
  --repo navikt/<repo-name> \
  --ref "$BRANCH"
```

**For frontend** (eux-web-app):

```bash
gh workflow run build-and-deploy-to-q.yaml \
  --repo navikt/eux-web-app \
  --ref "$BRANCH" \
  -f environment=q2-parallel
```

Replace `q2-parallel` with the user's chosen environment if they specified one (e.g. "deploy to experimental" → `q2-experimental`, "deploy to odin" → `q2-odin`).

### Step 5 — Confirm and provide monitoring links

After triggering, show:

1. ✅ Confirmation of what was triggered (repo, branch, environment)
2. Link to the GitHub Actions page:

```
https://github.com/navikt/<repo-name>/actions
```

3. Optionally, fetch the latest run to get a direct link:

```bash
gh run list --repo navikt/<repo-name> --limit 1 --json databaseId,status,url,headBranch \
  | jq '.[0]'
```

### Step 6 — Monitor (only if asked)

If the user asks to watch/monitor the build:

```bash
RUN_ID=$(gh run list --repo navikt/<repo-name> --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch --repo navikt/<repo-name> "$RUN_ID"
```

## How users invoke this skill

Example user requests and how to interpret them:

| User says | Action |
|---|---|
| "deploy" | Deploy current repo from current branch |
| "deploy frontend" | Push + deploy `eux-web-app` to `q2-parallel` |
| "deploy backend" | Push + deploy `eux-neessi` to q1/q2 |
| "deploy frontend to experimental" | Push + deploy `eux-web-app` to `q2-experimental` |
| "deploy frontend to odin" | Push + deploy `eux-web-app` to `q2-odin` |
| "deploy frontend and backend" | Push + deploy both repos |
| "deploy journalfoering" | Push + deploy `eux-fagmodul-journalfoering` to q1/q2 |
| "deploy all three" | Push + deploy frontend + neessi + journalfoering |
| "build and deploy to q2" | Same as "deploy" — push + trigger workflow |
