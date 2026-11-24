<!--
TEMPLATE: a team memory topic file. Copy to .claude/memory/<topic>.md (one topic per file).

What it is: committed domain knowledge that every teammate's agent may need and the code cannot show.
What to change: the frontmatter values and every section. Name the file for what someone would search.

Not for rules (make a path-scoped rule), not for decisions (write an ADR), not for copies of tickets.
The frontmatter keys are a convention, not something a harness reads. Change this file through a PR.
See docs/02-workspace/03-knowledge-and-memory.md.
-->

---
topic: <short name>
owner: <team or role>
verified: <YYYY-MM-DD, against commit or version>
sources: [<ticket key, spec page or file path>]
---

# <Topic>

<Two sentences: what this is and when an agent needs it.>

## What is true

- <Fact>. Source: <where it comes from>.
- <Fact>. Source: <where it comes from>.

## What surprises people

- <The thing that looks right and is wrong>, and what to do instead.

## Where the live values are

- <Threshold or setting>: `<file path or command>`. Do not copy the value here.

## How to check this is still true

`<command, test name or file to read>`

## Does not cover

- <Neighbouring topic>: see `<other file>`.
