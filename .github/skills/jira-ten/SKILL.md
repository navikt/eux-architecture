---
name: jira-ten
description: >-
  Interact with JIRA using acli. Create, search, view, edit, comment, and
  transition issues in the TEN project.
---

# JIRA Skill (acli)

Work with JIRA issues in the **TEN** project using the `acli` CLI tool.

## Safety rules — ALWAYS follow these

1. **Project scope**: Only operate on project `TEN`. Never create or modify issues in other projects.
2. **Reporter check before edits**: Before editing an issue's summary, description, type, or transitioning it, run `acli jira workitem view <KEY> --json` and check the `reporter.emailAddress` field. Compare it against the current user from `acli jira auth status`. If the reporter is someone else, **warn the user and ask for confirmation** before proceeding. Adding comments is OK without this check.
3. **Always use `--yes`** on edit, transition, and assign commands to avoid interactive prompts that hang.
4. **Be concise** when writing summaries, descriptions, and comments. No filler text.
5. **Double-check destructive operations**: Confirm with the user before deleting issues or removing assignees.

## TEN project context

- **Board**: TEN KANBAN BOARD (ID 214, kanban)
- **Issue types**: Story, Bug, Epic, Oppgave, Sub-task, Service Request
- **Statuses**: Ikke klart til arbeid → Klar til arbeid → Under arbeid → Test → Produksjonssatt → Lukket
- **Language**: Issue content is typically in Norwegian

## ADF (Atlassian Document Format)

Always use ADF JSON for `--description` and `--body` flags. **For comments, always use `--body-file`** to pass ADF — never pass ADF inline via `--body` (shell escaping will mangle the JSON and acli will post it as raw text). For `--description` on create/edit, inline `--body` is OK for short descriptions, but prefer `--body-file` for anything complex.

### Workflow for ADF comments

1. Build the ADF JSON object in memory.
2. Write it to a temp file (e.g. `/tmp/jira-comment.json`).
3. Pass the file via `--body-file`.
4. Delete the temp file.

```bash
cat > /tmp/jira-comment.json << 'ENDOFJSON'
{"version":1,"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Comment text"}]}]}
ENDOFJSON
acli jira workitem comment create --key TEN-123 --body-file /tmp/jira-comment.json
rm -f /tmp/jira-comment.json
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

**Ordered list:**
```json
{"type":"orderedList","content":[
  {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Step 1"}]}]}
]}
```

**Code block:**
```json
{"type":"codeBlock","attrs":{"language":"kotlin"},"content":[{"type":"text","text":"val x = 1"}]}
```

**Bold/italic text (marks on text nodes):**
```json
{"type":"text","text":"bold text","marks":[{"type":"strong"}]}
{"type":"text","text":"italic text","marks":[{"type":"em"}]}
```

**Link:**
```json
{"type":"text","text":"click here","marks":[{"type":"link","attrs":{"href":"https://example.com"}}]}
```

**Rule (horizontal line):**
```json
{"type":"rule"}
```

### ADF guidelines

- **For comments**: Always write ADF to a temp file and use `--body-file`. Never pass complex ADF inline via `--body`.
- For `--description` on create/edit, short inline ADF is OK, but prefer `--body-file` for anything with multiple nodes.
- Keep ADF as single-line JSON (no pretty-printing) inside the file.
- Use headings + bullet lists for structured descriptions. Avoid walls of text.
- Use code blocks for stack traces, config snippets, or technical details.
- Use heredoc with single-quoted delimiter (`<< 'ENDOFJSON'`) to prevent shell variable expansion.

## Command reference

### Search issues

```bash
# JQL search (most flexible)
acli jira workitem search --jql "project = TEN AND status = 'Under arbeid'" --limit 20

# My open issues
acli jira workitem search --jql "project = TEN AND assignee = currentUser() AND status != Lukket" --limit 20

# Issues I reported
acli jira workitem search --jql "project = TEN AND reporter = currentUser() ORDER BY created DESC" --limit 10

# Search by text
acli jira workitem search --jql "project = TEN AND text ~ 'search term'" --limit 10

# Custom fields
acli jira workitem search --jql "project = TEN AND status = 'Klar til arbeid'" --fields "key,summary,assignee,status,priority" --limit 20

# Count results
acli jira workitem search --jql "project = TEN AND type = Bug AND status != Lukket" --count
```

### View an issue

```bash
# Default view (summary, status, assignee, description)
acli jira workitem view TEN-123

# Full JSON (for programmatic checks like reporter)
acli jira workitem view TEN-123 --json

# Specific fields
acli jira workitem view TEN-123 --fields "summary,status,comment,assignee,reporter"

# Open in browser
acli jira workitem view TEN-123 --web
```

### Create an issue

```bash
# Basic creation with ADF description
acli jira workitem create --project TEN --type Story --summary "Short summary" \
  --description '{"version":1,"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Brief description"}]}]}' \
  --assignee "@me"

# Bug with structured description
acli jira workitem create --project TEN --type Bug --summary "Bug title" \
  --description '{"version":1,"type":"doc","content":[{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Problem"}]},{"type":"paragraph","content":[{"type":"text","text":"What is broken"}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Steps to reproduce"}]},{"type":"orderedList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Step 1"}]}]}]}]}' \
  --assignee "@me"

# With labels
acli jira workitem create --project TEN --type Oppgave --summary "Task title" --label "tech-debt"

# Sub-task under a parent
acli jira workitem create --project TEN --type Sub-task --summary "Sub-task title" --parent TEN-123
```

### Edit an issue

```bash
# Edit summary (check reporter first!)
acli jira workitem edit --key TEN-123 --summary "Updated summary" --yes

# Edit description with ADF
acli jira workitem edit --key TEN-123 \
  --description '{"version":1,"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Updated description"}]}]}' --yes

# Change assignee
acli jira workitem assign --key TEN-123 --assignee "@me" --yes
acli jira workitem assign --key TEN-123 --assignee "user@nav.no" --yes

# Add labels
acli jira workitem edit --key TEN-123 --labels "label1,label2" --yes
```

### Transition (change status)

```bash
# Move to a status (check reporter first for non-own issues!)
acli jira workitem transition --key TEN-123 --status "Under arbeid" --yes
acli jira workitem transition --key TEN-123 --status "Klar til arbeid" --yes
acli jira workitem transition --key TEN-123 --status "Test" --yes
acli jira workitem transition --key TEN-123 --status "Produksjonssatt" --yes
acli jira workitem transition --key TEN-123 --status "Lukket" --yes
```

### Comments

```bash
# Add comment with ADF (always use --body-file for formatted comments)
cat > /tmp/jira-comment.json << 'ENDOFJSON'
{"version":1,"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Comment text"}]}]}
ENDOFJSON
acli jira workitem comment create --key TEN-123 --body-file /tmp/jira-comment.json
rm -f /tmp/jira-comment.json

# Plain text comment (auto-wrapped in ADF) — fine for simple comments
acli jira workitem comment create --key TEN-123 --body "Simple comment"

# List comments
acli jira workitem comment list --key TEN-123

# List comments as JSON
acli jira workitem comment list --key TEN-123 --json
```

### Links

```bash
# Link two issues
acli jira workitem link create --out TEN-123 --in TEN-456 --type "Blocks" --yes

# List links
acli jira workitem link list --key TEN-123
```

## Steps

When the user asks to work with JIRA:

1. **Understand the request**: Determine which operation(s) the user needs (search, view, create, edit, comment, transition).

2. **For searches**: Build a JQL query scoped to `project = TEN`. Show results in a readable format. If the user's request is vague, search broadly and present options.

3. **For viewing**: Fetch the issue and present key fields clearly: key, type, status, assignee, summary, description. Include comments if relevant.

4. **For creating**: Confirm the issue type and summary with the user if not explicit. Always set `--project TEN`. Assign to `@me` unless the user specifies otherwise.

5. **For editing/transitioning**: First view the issue with `--json` to check the reporter. If the reporter is not the current user (check via `acli jira auth status`) or is null, warn and ask for confirmation. Then proceed with `--yes`.

6. **For commenting**: Add the comment directly. Keep it concise.

7. **Present results clearly**: After any operation, show the relevant output to the user. For creates, show the new issue key.
