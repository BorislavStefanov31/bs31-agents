---
name: latest-check
description: Use when the question is which model or product is the current one (the newest, the latest, the most recent release)
  ("what is the latest model from X?", "which is the newest version in this line?"), including
  indirect forms such as a maker's current flagship or whether anything newer has come out. Not for
  other factual questions, for recommending or comparing products, for explaining what a named
  version does, or for working with a version the user already named.
---

# latest-check

Put your recalled answer on the record, then check it against the maker's own current page and cite that page, because what you remember as newest stops at your training date and is often one or more releases behind.

## When to use

Only for the question "which is the newest?" about a model or a product, however it is phrased.

## Steps

1. **Write the recalled name first, with a confidence of high, medium or low, before any lookup.** Committing first stops you from quietly revising the guess once you have seen the answer.
   Done: the line exists and no page has been opened.
2. **Fetch a current first-party source in this session:** the maker's catalogue, release notes, change history or launch announcement. Press coverage and roundups lag and contain errors, so they do not count. Your memory of what such a page said does not count either.
   Done: you hold the page text from a fetch made now.
3. **Match the scope of the question.** Check whether the item is generally available or only announced, and do not swap the most famous item for the most recent one. Say which the answer refers to, because an announced item cannot be used yet.
4. **Copy the name exactly as the maker spells it,** with its punctuation and version format. An approximate name breaks lookups and configuration.
5. **Collect what lets the person confirm it in seconds:** the page address, the date the page displays, and one sentence copied word for word that names the item. If the page shows no date, say so; do not supply one.
6. **Compare with step 1.** If they differ, show both side by side and mark which one is verified. Leave the recalled line exactly as first written, so the person can judge how far to trust your recall next time.
7. **If you cannot reach a current source,** say that, label the recalled name "not verified", and ask for a link. Never present recall as verified, and never cite a page you did not fetch.

## Produce

A reply with these fields, in your own layout:

```text
Recalled (before checking): Tern 3 Pro. Confidence: medium.
Verified: Tern 4, generally available. "Tern 4 Max" is announced only.
Source: https://halden.example/tern/releases (fetched in this session), page dated 2026-10-06
Quote: "Tern 4 is now available to order in all regions."
Conflict: recall said Tern 3 Pro, the maker's page says Tern 4. The page is the verified one.
```

When nothing could be fetched:

```text
Recalled: Tern 3 Pro. Confidence: medium. NOT VERIFIED: I could not open a current page from the maker.
Send me a link to the maker's release page and I will check it.
```

## Stop and ask

- No tool can fetch a page, or the maker's pages are blocked: ask for a link or pasted page text.
- The question does not say which maker or product line is meant.

## Not for

- Comparing, ranking or recommending models or products.
- Pricing, limits, availability details or features of a version.
- Recency claims about anything other than a model or product.
- A version the user already named: use that one.
