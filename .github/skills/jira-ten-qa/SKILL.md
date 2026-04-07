---
name: jira-ten-qa
description: >-
  QA review of a TEN JIRA issue. Scores issue quality 1–10 and posts
  constructive feedback as a comment if the score is 7 or lower.
---

# JIRA Issue QA Review

Takes a TEN JIRA issue key (e.g. `TEN-500`), evaluates how well the issue is written, scores it 1–10, and posts feedback as a JIRA comment if the score is 7 or lower.

## Safety rules — ALWAYS follow these

1. **Project scope**: Only operate on project `TEN`. Never touch issues in other projects.
2. **Read-only except comments**: Never edit the issue's summary, description, status, assignee, labels, type, or any other field. The ONLY write operation allowed is adding/replacing a comment.
3. **Threshold gate**: If the score is **8 or higher**, do NOT post a comment. Do NOT touch JIRA at all.
4. **Always use `--body-file`** for ADF comments — never pass ADF inline via `--body`.
5. **Be constructive**: Feedback should help the reporter improve the issue, never criticize the person. Frame suggestions positively.
6. **Write Norwegian**: All JIRA comments must be written in concise Norwegian (bokmål).

## TEN project context

- **Issue types**: Story, Bug, Epic, Oppgave, Sub-task, Service Request
- **Language**: Issue content is typically in Norwegian

## Scoring system

### Score scale

| Score | Label | Meaning |
|-------|-------|---------|
| 9–10 | Utmerket | All key fields well-documented. No improvement needed. |
| 8 | Bra | Minor gaps but fully actionable. No comment posted. |
| 7 | Akseptabel | Workable but noticeable gaps. Feedback posted. |
| 5–6 | Trenger forbedring | Several missing or unclear areas. |
| 3–4 | Mangelfull | Major information gaps. Hard to act on. |
| 1–2 | Utilstrekkelig | Almost no useful information. |

### Criteria by issue type

Evaluate each criterion on a 1–10 scale. The final score is the **weighted average**, rounded to the nearest integer.

If a criterion is not applicable (e.g. stack trace for a UX-only bug), redistribute its weight proportionally to the remaining criteria.

#### Bug

| # | Criterion | Weight | What to look for |
|---|-----------|--------|------------------|
| 1 | Tittelkvalitet | 10% | Short, specific, uniquely identifies the problem |
| 2 | Problembeskrivelse | 20% | Clear explanation of what is broken |
| 3 | Forventet vs faktisk oppførsel | 20% | Both sides documented — what should happen and what happens instead |
| 4 | Reproduksjonssteg / kontekst | 15% | Steps to reproduce, environment, which SED/BUC type or service |
| 5 | Stacktrace / feilinformasjon | 15% | Technical evidence included. For UX/behavioral bugs where stack traces don't apply, evaluate whether visual/behavioral evidence is provided instead (screenshots, specific UI behavior). The weight stays the same. |
| 6 | Samsvar med issuetype | 10% | Content genuinely describes a bug, not a feature request or task |
| 7 | Påvirkning / alvorlighetsgrad | 10% | Who is affected, how often, how critical |

#### Story

| # | Criterion | Weight | What to look for |
|---|-----------|--------|------------------|
| 1 | Tittelkvalitet | 10% | Short, describes the feature or change |
| 2 | Mål / brukerbehov | 25% | Clear what should be built and for whom |
| 3 | Akseptansekriterier | 20% | Concrete conditions for "done" |
| 4 | Forretningskontekst | 15% | Why this matters, what problem it solves |
| 5 | Omfang | 15% | What's in/out, boundaries defined |
| 6 | Samsvar med issuetype | 10% | Content is a feature/enhancement, not a bug |
| 7 | Handlingsdyktighet | 5% | Can someone start working without asking questions |

#### Epic

| # | Criterion | Weight | What to look for |
|---|-----------|--------|------------------|
| 1 | Tittelkvalitet | 10% | Short, identifies the initiative |
| 2 | Overordnet mål | 25% | What the epic achieves overall |
| 3 | Nedbrytning / struktur | 20% | Sub-areas or sub-issues identified |
| 4 | Forretningsverdi | 20% | Why this initiative matters |
| 5 | Suksesskriterier | 15% | How to measure if the epic succeeded |
| 6 | Samsvar med issuetype | 10% | Content is truly epic-level, not a single story |

#### Oppgave / Sub-task / Service Request

| # | Criterion | Weight | What to look for |
|---|-----------|--------|------------------|
| 1 | Tittelkvalitet | 15% | Short, descriptive |
| 2 | Oppgavebeskrivelse | 30% | Clear what needs to be done |
| 3 | Kontekst / motivasjon | 20% | Why this task exists |
| 4 | Ferdigkriterier | 20% | How to verify completion |
| 5 | Samsvar med issuetype | 15% | Content matches the task-like nature |

### Scoring guidelines

- Score each criterion individually before computing the weighted average.
- Be fair: a missing description is a low score, but a brief-but-sufficient one can still score well.
- Consider the reporter's perspective: not everyone has access to stack traces or deep technical context. If the reporter clearly cannot provide something (e.g. they are a non-technical stakeholder), note this but don't penalize as harshly.
- Issue type alignment matters: if a "Bug" is actually a feature request, that affects multiple criteria (not just the alignment criterion).
- **Acknowledged gaps are OK**: If the reporter has addressed a concern but explicitly acknowledges that the information is not available at this time (e.g. "I don't have the stack trace but the error occurs when…"), that is generally acceptable — don't penalize heavily. The acknowledgement must be clean and clear, not just omitting the information without comment.
- **Threshold decision**: Use the **raw weighted average** (not rounded) for the ≤7 / ≥8 comment decision. Round only for display. Example: raw 7.6 → display "8/10" but the threshold treats it as 7.6, so feedback IS posted.

## ADF (Atlassian Document Format)

Always use ADF JSON for JIRA comments. **Always use `--body-file`** — never pass ADF inline via `--body`.

### Workflow for ADF comments

1. Build the ADF JSON object in memory.
2. Write it to a temp file (e.g. `/tmp/jira-qa-comment.json`).
3. Pass the file via `--body-file`.
4. Delete the temp file.

```bash
cat > /tmp/jira-qa-comment.json << 'ENDOFJSON'
{"version":1,"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Comment text"}]}]}
ENDOFJSON
acli jira workitem comment create --key TEN-123 --body-file /tmp/jira-qa-comment.json
rm -f /tmp/jira-qa-comment.json
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

**Rule (horizontal line):**
```json
{"type":"rule"}
```

**Table:**
```json
{"type":"table","attrs":{"isNumberColumnEnabled":false,"layout":"default"},"content":[
  {"type":"tableRow","content":[
    {"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Header"}]}]},
    {"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Header"}]}]}
  ]},
  {"type":"tableRow","content":[
    {"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Cell"}]}]},
    {"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Cell"}]}]}
  ]}
]}
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

### List and delete comments

```bash
# List comments as JSON
acli jira workitem comment list --key TEN-123 --json --paginate

# Delete a comment by ID
acli jira workitem comment delete --key TEN-123 --id <comment-id>
```

### Add a comment

```bash
cat > /tmp/jira-qa-comment.json << 'ENDOFJSON'
{"version":1,"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Comment text"}]}]}
ENDOFJSON
acli jira workitem comment create --key TEN-123 --body-file /tmp/jira-qa-comment.json
rm -f /tmp/jira-qa-comment.json
```

## Steps

When invoked with a JIRA issue key (e.g. `/jira-ten-qa TEN-500`):

### Step 1 — Fetch the issue

Retrieve the full issue details:

```bash
acli jira workitem view TEN-500 --json
```

Extract and note:
- **Issue type** (Bug, Story, Epic, Oppgave, Sub-task, Service Request)
- **Summary** (the title)
- **Description** (the main body — may be ADF or plain text)
- **Status**

Then fetch all comments explicitly — reporters often add crucial context (stack traces, reproduction steps, clarifications) in follow-up comments:

```bash
acli jira workitem comment list --key TEN-500 --json --paginate
```

Read through all comments. Context added in comments counts toward the scoring evaluation (e.g. if the description lacks reproduction steps but a comment provides them, credit that).

### Step 2 — Analyze and score

Using the **scoring criteria for the matching issue type** (see tables above):

1. Score each criterion individually (1–10) with a brief justification.
2. If a criterion is not applicable, redistribute its weight.
3. Compute the weighted average (keep the raw decimal value).
4. Round to the nearest integer for display → this is the **display score**.
5. Use the **raw average** for the threshold decision (≤7.0 vs >7.0).

**Be thorough**: read the entire description and all comments fetched in Step 1. Context added in comments counts toward the evaluation.

### Step 3 — Print results to terminal

**Always** print the score and a summary to the terminal, regardless of score.

Format:

```
═══════════════════════════════════════
  QA Review: TEN-500 (Bug)
  Score: 6/10 — Trenger forbedring
═══════════════════════════════════════

Criteria breakdown:
  Tittelkvalitet:              7/10 — OK but could be more specific
  Problembeskrivelse:          4/10 — Very vague, missing details
  Forventet vs faktisk:        3/10 — Not documented
  Reproduksjonssteg:           8/10 — Good context provided
  Stacktrace:                  6/10 — Partial error message
  Samsvar med issuetype:       9/10 — Correct type
  Påvirkning:                  5/10 — Not mentioned

Action: Posting feedback comment to JIRA...
```

For score ≥ 8 (raw > 7.0):

```
═══════════════════════════════════════
  QA Review: TEN-500 (Story)
  Score: 9/10 — Utmerket
═══════════════════════════════════════

Criteria breakdown:
  ...

✅ Godt skrevet issue! Ingen kommentar lagt til i JIRA.
```

If an old QA comment was cleaned up, also print:

```
🧹 Fjernet gammel QA-kommentar fra TEN-500 (issue er nå god nok).
```

### Step 4 — Decide: comment or not

- **Raw average > 7.0 (display score ≥ 8)**: Clean up any stale QA comment (Step 5), then stop. Do NOT post a new comment. Print positive message to terminal.
- **Raw average ≤ 7.0 (display score ≤ 7)**: Proceed to Step 5 to replace/post feedback.

### Step 5 — Remove existing QA comment (if any)

**Always run this step** — both for high scores (cleanup only) and low scores (cleanup before posting new).

#### 5a — Find the existing comment

```bash
acli jira workitem comment list --key TEN-500 --json --paginate
```

Parse the JSON output. Look for any comment whose body contains a **heading node** with text `🔍 jira-ten-qa`. This is the strict identifier — do not match on other mentions of the skill name in unrelated comments. Also verify the comment was authored by the current bot/user when possible.

#### 5b — Delete existing comment(s)

If a matching comment is found:

```bash
acli jira workitem comment delete --key TEN-500 --id <comment-id>
```

Delete all matches (there should be at most one, but be safe).

**If raw average > 7.0**: Stop here after cleanup. The stale comment is removed and no new comment is posted.

**If raw average ≤ 7.0**: Proceed to Step 6.

### Step 6 — Post the feedback comment

Build an ADF comment with this structure:

1. **Heading**: `🔍 jira-ten-qa` (level 2) — this is the identifier for future replacement
2. **TLDR paragraph**: `Poeng: X/10 — <one-line summary of why>`
3. **Horizontal rule**
4. **Table** with columns: Kriterium | Poeng | Kommentar
   - One row per criterion that scored below 8
   - Only include criteria that need improvement — skip criteria that scored 8+
5. **Heading**: `Forslag til forbedring` (level 3)
6. **Bullet list**: Specific, actionable suggestions in Norwegian

Write the ADF to a temp file and post:

```bash
cat > /tmp/jira-qa-comment.json << 'ENDOFJSON'
<ADF JSON here>
ENDOFJSON
acli jira workitem comment create --key TEN-500 --body-file /tmp/jira-qa-comment.json
rm -f /tmp/jira-qa-comment.json
```

### Step 7 — Confirm

Verify the comment was posted successfully. If it failed, report the error to the terminal.

Print to terminal:

```
✅ Feedback posted to TEN-500. Score: 6/10.
```
