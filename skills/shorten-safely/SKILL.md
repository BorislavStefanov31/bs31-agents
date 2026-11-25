---
name: shorten-safely
description: Use when a person gives you a text of theirs (an email, meeting notes, a report) and wants it made shorter; when the request names a limit in characters or words, or says trim, condense, tighten or "make it fit"; or when they say some part must stay exactly as written ("cut this to 280 characters but keep the legal line"). Not for summarising material you gathered yourself (web pages, logs, code), shortening your own draft, or translating or changing tone with no length reduction.
---

# shorten-safely

Pin down what must stay word for word, measure with a script instead of estimating, and show the author every removal before the short version is used.

## When to use

A person hands you their text and wants it shorter, to a limit or not, with or without passages that must survive unchanged.

## Steps

1. **Settle the protected passages before editing**, so the cut is planned around them. If the person has not made clear what is untouchable, ask.
2. **Save the source to a file**, for example `work/source.txt`, so checks run on real characters.
3. **Copy each protected passage out of the source file by machine** (a line range or a pattern match written to `work/keep.txt`, passages separated by a line holding only `%%%`). Retyping silently swaps quotation marks, dashes and spaces.
4. **Write the short version** to `work/short.txt`.
5. **Run the script** with the person's limit. Never estimate length: language models miscount characters and words.
6. **On a protected mismatch, fix only the character the script names**, then run again. Rewriting the whole passage usually introduces a different error.
7. **Repeat until the script prints `result: PASS`.**
8. **Before delivering or saving, show the person the report**: measured length, limit and margin; the verdict on each protected passage; every removed sentence; every sentence that is new wording. Condensing can add statements the author never made. Skip this only if they waived it.
9. **If they want something back, reinstate it and run the script again**, because the limit may no longer hold.

## Produce

```
Short version: 268 characters (limit 280, margin +12). PASS
Protected: 1 of 1 intact ("Costs are covered by the repair fund.")
Removed:
- Hello neighbours,
- Thank you for your patience!
New wording (yours to approve):
- The lift works; the back stairs are closed.
  was: During that time the lift stays in service, but the back stairs are closed.

<the short version>
```

## Script

```sh
node scripts/compare-texts.mjs --source work/source.txt --short work/short.txt \
  --protected work/keep.txt --max-chars 280        # or --max-words 60
```

Node 18+, no dependencies, no network, no writes. It prints the measured length against the limit (a character is one Unicode code point; a word is any run without whitespace), and for each protected passage either INTACT or the earliest differing character with its code point, for example:

```
protected 1/1 in short version: MISMATCH at character 11 of the passage
    expected "’" U+2019 RIGHT SINGLE QUOTE
    found    "'" U+0027 STRAIGHT APOSTROPHE
```

It then lists source sentences missing from the short version and short-version sentences missing from the source. Exit 0 only when the limit holds and every passage is intact, 1 when a check fails, 2 on a usage or file error. A passage that is not an exact copy from the source also fails.

Left to you: sentences are compared as exact text, so a reworded sentence shows up in both lists. Pair them yourself and say whether the meaning changed. The script does not judge meaning.

## Stop and ask

- It is unclear which passages are protected, or which unit the limit is in.
- The protected passages alone exceed the limit.
- The limit cannot be met without dropping something the person asked to keep.

## Not for

Improving style or message, summarising sources the person did not supply, or translation.

## Script paths

`scripts/...` in this file means the `scripts/` folder of this skill, wherever the skill is installed. From a project root that is usually `.claude/skills/shorten-safely/scripts/`, so the full form of a command is `node .claude/skills/shorten-safely/scripts/<file>.mjs ...`.
