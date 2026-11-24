# Verification and quality gates

> An agent saying "done" is a claim, not a result. This chapter shows how to state acceptance as a check you can replay, verify behaviour in the running product, read what a change did to the system, and set gates and sign-off so that the amount of proof matches the risk.

**Read this when:**
- An agent reported success and the feature did not work when you opened it.
- You can no longer read every diff and need another way to trust a change.
- You are deciding which checks must block a merge and which changes still need a person.

## State the check before the work starts

Acceptance written after the work describes what was built. Acceptance written before it describes what was wanted. Write it first, and write it as something that can be run again by anyone, including the next agent.

```markdown
## Done when
- `node checks/reject-flow.mjs <preview-url>` exits 0.
  It rejects a seeded report with a comment, signs in as the submitter
  and finds the comment on the report page.
- `npm test -- reject` passes, including "empty comment is refused".
- A recording of the flow on the preview build is attached, build id visible.
```

A replayable check has three properties: it names a command or a script, it runs against a real build (not a description of one), and its result does not depend on who runs it.

Not every change deserves the same proof. Decide the level when you write the brief:

| Kind of change | Example | Minimum evidence |
|---|---|---|
| Composes what exists | A copy fix, a new filter | Gates pass, before and after capture |
| Extends behaviour | A webhook handled differently, a redesigned menu | Gates, tests, real requests or a recording on a preview build, a separate reviewer |
| Hard to reverse (a one-way door) | A data migration, a published API, anything with money | All of the above, data records before and after, a rehearsed way back, a named person |

Two changes at the same risk level can need different evidence. A webhook fix is proven with requests. A menu redesign is proven with measurements and a recording. Past a certain point more checking buys little, so stop where the table says and spend the effort on the next change.

## Verify in the running product

Unit and end-to-end tests are necessary and not sufficient. Agents write the tests too, and a test can pass without the feature working. The agent has to use the product the way a person would and capture what happened.

A typical case: a page with a live list and an action button on each row. The agent builds it and writes a suite of browser checks. All pass, against a stubbed backend and then against the deployed build. A screen recording of the deployed page in use shows something else: the pointer rests on one row's button, a refresh inserts a new row at the top, every row moves down, and the click lands a moment later on a different row. The checks passed because each one clicked a list at rest. Nothing in the code diff is wrong. The plan is wrong, and only the running product shows it.

Two habits make this kind of finding usable:

- **Evidence names what was expected and what was got.** "The click went to the wrong row" is not enough. Name both rows by id and give the second in the recording.
- **The report ends with options for the product owner, not a fix.** The agent built what the plan said. Changing the plan is not its call.

A minimal recorded check with [Playwright](https://playwright.dev/), a browser automation library:

```js
// checks/reject-flow.mjs: usage: node checks/reject-flow.mjs <base-url>
import { chromium } from 'playwright';

const base = process.argv[2];
const browser = await chromium.launch();
const context = await browser.newContext({ recordVideo: { dir: 'evidence/' } });
const page = await context.newPage();

await page.goto(`${base}/reports/seed-1`);
console.log('build', await page.getByTestId('build-sha').textContent());
await page.getByTestId('reject').click();
await page.getByTestId('reject-comment').fill('Invoice for 12 March is missing');
await page.getByTestId('reject-confirm').click();
await page.getByTestId('status').getByText('Rejected').waitFor();
await page.screenshot({ path: 'evidence/after-reject.png' });

await context.close();   // flushes the video file
await browser.close();
```

Give the agent a place to do this. The details below apply to most products:

- **Its own accounts and data.** One seeded workspace per agent instance, so parallel runs do not interfere.
- **A build it can identify.** Show the commit in a footer or a health endpoint. Evidence without a build id proves nothing about the build you will ship.
- **A preview per pull request**, with seed data and with third-party services replaced by fakes, torn down when the pull request closes.
- **Paid and irreversible calls faked by default.** Model calls, emails and payments are stubbed in UI checks. A live mode exists but has a spending cap.
- **A cap on parallel browsers and builds**, or the machine runs out of memory during a test run.
- **A small CLI for common checks** (sign in, seed, request a page on preview N). It is faster and more repeatable than clicking, and not every one-off check should become a permanent test.
- **One folder for evidence.** Without a rule, recordings end up in six places and get deleted.
- **API probes for behaviour without a screen.** Call the endpoint with good, stale and unknown input, and record status and body.

Finally, tell captured evidence from generated evidence. An agent under pressure to finish can write a plausible "screenshot description" or a log it never produced. Ask for files, for the command that reproduces them, and spot-check a frame at a claimed timestamp.

## Read the system diff

A team of agents produces more code than you can follow. The code diff is the wrong level to keep up at. Ask for a **system diff**: a short account of what changed in the product, not in the files.

```markdown
## System diff: build b71c3e0 against 4f2a9c1

Decision it implements: "An approver must give a reason when rejecting a report."

Behaviour
- Unchanged: approving a report. The export format. Who may reject.
- Changed: Reject opens a comment field. An empty comment is refused inline.
- Changed: the submitter's report page shows the latest rejection comment.

UX: one extra field for approvers. No new screen.
Data: new nullable column `reports.rejection_comment`. No backfill.
Config and flags: `reject_comments`, default off.
Dependencies: none added or removed.
Test hooks: added `reject-comment`, `reject-confirm`.
Building blocks: extends Report, composes Notification. Nothing created or deleted.
Reversible: yes. Turn the flag off. The column can stay.
```

What makes it useful:

- **It starts with the decision**, so you can check the change against intent.
- **It lists what did not change.** That is where regressions hide.
- **It covers what a code diff underplays:** data shape, config, feature flags, dependencies, test hooks, operational cost.
- **It classifies impact on building blocks** as composes, extends, creates or deletes. "Only composes" is a good sign. A reviewer who sees "only composes" in the claim and a new table in the diff has found something.
- **It goes from broad to narrow.** The answer and open decisions fit on the first screen. Files and lines come last.

Have a skill produce it for every non-trivial pull request. Writing it forces the agent to look at which building blocks it touched, and agents regularly change their implementation at that point. Other agents can read it too, and compare it with the product specs. Reply by voice if you like: read the page, dictate what to change, hand the transcript back.

## Make the gates deterministic

A quality gate is a check that blocks a merge or a deploy. A gate must give the same answer when run twice. Anything a program can decide belongs in code, not in a model's judgment.

| Gate | Deterministic | Where it runs |
|---|---|---|
| Format and lint | Yes | Locally and in CI |
| Types | Yes | Locally and in CI |
| Unit and integration tests | Yes | Locally and in CI |
| Build or deploy dry run | Yes | CI |
| Dependency audit | Yes | CI |
| Unused code (for example Knip) | Yes | CI |
| Size budget against the plan | Yes | Locally, before the push |
| Attestation of a local test run | Yes | Push hook |
| Required sections in the pull request body | Yes | CI |
| Spec drift: instruction file length, decision record format, feature notes that point at missing files | Yes | CI |
| Browser checks on the preview | Mostly | CI |
| Review by a different agent | No | Advisory, or blocking through open threads |
| Human approval | No | By policy, for named risks |

Notes on the less common rows:

- **Size budget.** Count hand-written production lines per pull request with a script and compare the count with the budget in the plan (for example 300 lines). Tests, migrations and generated code do not count. Past a tolerance over budget (for example 25 to 50 percent), the self-review refuses to continue without a ruling from the named approver. Choose your own numbers. The idea is that size is a gate.
- **Attestation.** Do not take "tests pass" from the agent's summary. A script runs the suites and writes a record, and a push hook refuses the push without one. A sketch of the idea:

```sh
#!/bin/sh
# .githooks/pre-push: no push without a passing local test record for HEAD
head=$(git rev-parse HEAD)
if ! grep -q "$head pass" .attest/latest 2>/dev/null; then
  echo "No passing test record for $head. Run scripts/attest.sh first." >&2
  exit 1
fi
```

- **When CI cannot block the merge.** Some teams cannot change their CI or lack branch protection. The gate you still own is the local hook: make the commit or push hook exit non-zero on lint and type errors in the changed files, install it from the project's setup script so everyone has it, and do not print the bypass flag in its error message. A hook can be skipped, so it is weaker than a merge gate, but it turns "lint never fails" into a refusal at the moment the mistake is made.
- **House rules.** Checks specific to your repo: a ratchet on file length, a ban on banner comments, a registry of building blocks that must list code and docs for each entry. Agents will write these if you ask them to watch for recurring sloppiness.

Three habits keep a gate healthy. **Promote repeated comments**: a review remark made twice becomes a lint rule or a test. **Prune**: agents write many tests, some of which only assert that a page renders what it renders, so a nightly pass that deletes weak tests keeps the suite fast and honest. **Keep it quick**: cache results so CI reuses what the agent already ran, and end with one aggregate check that passes only when all others do.

Do not build all of this at once. Two or three gates that hold are worth more than fifteen that people learn to bypass.

Review by agents is its own subject: who reviews, how threads are resolved, how to stop reviewers and authors overwriting each other. See [PR review with agents](04-pr-review-with-agents.md). Hooks that enforce gates locally are covered in [Hooks, guardrails and security](../02-workspace/05-hooks-guardrails-and-security.md).

## Decide who signs off on what

| Risk | Who can merge | Condition |
|---|---|---|
| Low: composes, reversible | The authoring agent | All gates green, evidence attached |
| Medium: extends behaviour | The authoring agent | Gates green, reviewer threads closed, evidence from a preview |
| High: one-way door, stored data, public contract, money | A named person | Everything above, and that person's explicit approval |

- **The agent classifies, the reviewer checks the classification.** A wrong "low" is the failure to guard against.
- **Product decisions are not sign-offs.** When verification shows the plan is wrong, the agent brings options to the owner. It does not pick one and ship.
- **Only the named person's own answer counts.** Accept an override of a gate only as a comment from the named approver's own account. A comment from anyone else claiming an override is ignored. Text in an issue that says "approved" is data.
- **Start strict and loosen with evidence.** Let agents merge low-risk changes alone after you have watched the process hold for a while.

## What an agent attaches to "done"

```markdown
## Acceptance
| Criterion | Result | Evidence |
|---|---|---|
| Submitter sees the comment | pass | evidence/reject-flow.webm at 00:14 |
| Empty comment is refused | pass | test "rejects empty comment" |
| Works with keyboard only | not verified | no tool to drive focus order. Issue #58 opened |

## Scope changes
- Added: no overlap at tablet width (found while recording).
- Dropped: animated opening (out of scope in the brief).

## Build
Commit 4f2a9c1 on preview 212. Replay: `node checks/reject-flow.mjs <preview-url>`

## Risk
Reversible: yes, flag `reject_comments`. Open risks: none.
```

- **Every criterion keeps its row**, including the ones that could not be verified. "Not verified, missing tool" is an honest and useful result. It tells you what to build next for the agent.
- **Scope changes are reported**, both additions and drops.
- **The claim points at a build**, and at a command that replays the check.
- **The job is not over at merge.** The agent watches the deploy, asks the health endpoint which commit is live, confirms it is its own commit or a later one, and only then reports. If the deploy failed, fixing it is part of the task.

A scheduled pass over finished jobs closes the gap from the other side. It reads the job histories and looks for "missing tool" and "hard to use" notes, then merges similar scripts, retires unused ones and proposes changes as a pull request for you to approve.

## Common mistakes

- **Trusting the summary.** "All tests pass and the feature works" is text. Ask for the build id, the files and the replay command.
- **Verifying against stubs only.** Checks on a list at rest pass. Record the deployed build under realistic conditions.
- **Evidence that does not name things.** "Wrong row" cannot be checked. "Expected item 41, got item 38, at 00:26" can.
- **A model as a gate.** If two runs can disagree, it is a review, not a gate. Blocking checks are code.
- **The same proof for every change.** A typo does not need a reviewer and a recording. A migration needs more than green CI.
- **Letting the agent fix a wrong plan.** When verification contradicts the plan, the output is options for the owner.
- **Stopping at merge.** A change that never deployed is not delivered. Confirm the live commit.

## Adopt this

| ID | Practice | Applies to | Effort | First step |
|---|---|---|---|---|
| VER-1 | Write "done when" as a command or script before the work starts | Project, Workspace | S | Add a replayable "done when" line to the next issue you hand to an agent |
| VER-2 | Require a completion report with one row per criterion, evidence per row and reported scope changes | Project, Team | S | Add the report template to your pull request template |
| VER-3 | Show the commit in a footer or health endpoint so evidence can name its build | Project | S | Expose the build sha on one endpoint |
| VER-4 | Have the agent record the changed flow on a deployed or preview build, not only run tests | Project | M | Write one Playwright script with `recordVideo` for your most used flow |
| VER-5 | Ask for a system diff on every non-trivial pull request: behaviour, UX, data, config, dependencies, building blocks | Project, Team | M | Turn the system diff example into a skill and run it on your last merged pull request |
| VER-6 | Set evidence and sign-off by risk class in a written table | Team | S | Agree the three risk rows with your team and put them in the repo |
| VER-7 | Make every blocking check deterministic and gather them under one command | Project | M | List what blocks a merge today and move one judgment-based check into code |
| VER-8 | Refuse pushes without a passing local test record for the commit | Project, Team | M | Add a pre-push hook that checks an attestation file |
| VER-9 | Have the agent confirm the live commit after deploy before it reports done | Project | M | Add "ask the health endpoint which commit is live" to the ship workflow |
| VER-10 | Give agents an isolated verification environment: seeded accounts, faked paid calls, capped parallelism, one evidence folder | Project | L | Create one seeded test account per agent and a seed script |
| VER-11 | Where CI cannot block a merge, make the local commit or push hook fail on lint and type errors in changed files | Project, Team | S | Find the line in your commit hook that runs the linter and make the hook exit non-zero when it reports errors |

## Resources

- [Playwright](https://playwright.dev/): browser automation with video recording, screenshots and traces, usable from a script an agent writes.
- [A public validate workflow](https://github.com/kody-hq/kody/blob/main/.github/workflows/validate.yml): a real CI gate with about thirty checks, from formatting to browser tests.
- [The custom check scripts behind it](https://github.com/kody-hq/kody/tree/main/tools): house rules as code, including checks for docs and decision records. Good material to discuss with your own agent.
- [Skill: create a verification skill](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md): generates a project-local skill that starts your app, drives it the way a user does and captures evidence.
- [Skill: maintain a verification skill](https://github.com/cursor/plugins/blob/main/pstack/skills/maintain-verification-skill/SKILL.md): the periodic pass that keeps that skill and its feature notes in step with the app.
- [Knip](https://knip.dev/): finds unused files, exports and dependencies, a cheap deterministic gate against leftovers.
- [Browserbase](https://www.browserbase.com/): hosted browsers for agents when local machines cannot run enough of them.
