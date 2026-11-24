# Evidence report: <product or change>

<!-- Fill every line. Write "none" or "not tested" instead of deleting a line.
     This report is valid for the build named below and for no later one. -->

| | |
|---|---|
| Date | <YYYY-MM-DD> |
| Live address | <the address the user supplied> |
| Build under claim | <commit or build name> |
| Build seen live | <identifier read from the page>, before recording: <match / different>, before reporting: <match / different> |
| Video | <path or link>, length <mm:ss> |
| Click log | <path> |
| Browser and viewport | <browser and version>, <width x height> |
| Account used | <test account name; never a real person's> |
| Owner | <who decides product questions> |

## Journeys

| # | Journey, as the user named it | Expected outcome for the person | Outcome check | Result | Video time |
|---|---|---|---|---|---|
| J1 | <steps in one line> | <what they should end up with> | <the explicit check that was run> | <reached / not reached> | <mm:ss to mm:ss> |

## Findings

One block per finding. Leave nothing implied.

### F1: <effect on the person, in one sentence>

- Video time: <mm:ss>
- Seen by: <agent / user, name>
- On screen: <page area or element, viewport position>
- In source: <file:line, or "not located">
- Intended element / element that received the click: <id or text> / <id or text>
- Cause: <one sentence> (<hypothesis / confirmed by reading file:line>)
- Kind: <implementation defect / defect in the specified behaviour>

## What worked

- <journey or step>, <mm:ss>

## Not tested

- <journey, browser, viewport or state that was left out, and why>

## For the owner (only when a finding is in the specified behaviour)

| Alternative | What the person gets | Cost or trade-off |
|---|---|---|
| A: <option> | | |
| B: <option> | | |

Question: <one question whose answer picks an alternative>

Nothing in this section is implemented until the owner answers.
