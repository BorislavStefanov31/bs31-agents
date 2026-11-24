# FAQ: Review, testing and quality

### Does reading every line of a change make it safe?

No. Reading is weaker evidence than it feels. The most sensitive code gets the most eyes and still causes outages.

Agents change the economics of the alternative. Verification that used to be too tedious to build is now affordable. Engineers avoid tedium; agents do well in it. A checking harness twenty times the size of the change it guards is a reasonable trade when an agent writes the harness.

So move effort from reading diffs to building things that prove behaviour: tests, an eval the agent can be scored on, an agent that clicks through the running application. Keep human reading for changes whose risk calls for it, and stop treating "a person looked at it" as proof of correctness.

See: [PR review with agents](../../04-delivery/04-pr-review-with-agents.md)

### How do I trust code I am not going to read?

Move your attention from the diff to three other things.

- **Agreement on intent before the work.** It comes from the planning conversation and from decisions already written down in the repo. You can tell when an agent has misread you the way you can with a colleague, and you correct it before anything is built.
- **Verification after it.** The agent has tools to prove the outcome matches the intent, and has used them.
- **A toolchain that rejects bad code.** A strict compiler, typed errors and explicit state machines turn whole classes of mistakes into build failures, which the agent fixes before you see anything. A program can still compile cleanly and do the wrong thing, so this supports behaviour checks and does not replace them.

With these in place, the size of a change stops being the measure of risk. A migration to a different runtime, database and hosting model can be one merge if it was verified end to end. A ten-line change with no verification is the one to worry about.

Spend review time on whether the checks were adequate, and keep reading diffs until that habit has proven itself in your codebase.

See: [Verification and quality gates](../../04-delivery/03-verification-and-quality-gates.md)

### Our checks catch 99.9% of bad changes. Why is that no longer enough?

Because the number of changes went up. Linting, types, tests and review each lower the chance that a merged change is bad. At a hundred merges a day, a 0.1% failure rate is one incident every ten days. Multiply the merges by ten and it is one a day. You cannot push the rate down fast enough to keep up.

So work on both sides of the merge button.

- **Before:** tooling, instructions and verification that make you confident by the time a change is ready.
- **After:** systems that make a bad change cheap. Staged rollout. A nightly or internal build that every employee runs by default, so breakage hits you first. A ramp to users. Fast rollback.

The strictest review processes still let bad code through. The question that matters is what happens when it lands.

See: [Verification and quality gates](../../04-delivery/03-verification-and-quality-gates.md)

### How do I make verification fast enough that agents always do it?

Ask the agent what was slow, then remove it. After each task, have it report the friction: "to test this I created a user through the UI and added three records by hand, about five minutes". That report is a specification for a command. Build a small project CLI that puts the app into the needed state in under a second, and the next agent runs it every time without being told.

Two more aids:

- A feature map: a short index of which screens and endpoints belong to which feature, so the agent knows what to exercise.
- A hard requirement that the change has been started and used before it comes back to you.

Few things drain motivation like spending twenty minutes checking out a branch that does not even launch. Extra verification tokens are cheap next to that.

See: [Verification and quality gates](../../04-delivery/03-verification-and-quality-gates.md)

### Our services cannot run together locally, so agents cannot test end to end. Do we need to re-architect?

No. You need one command that brings up something testable. This problem is older than agents: fast developers were always blocked by systems they could not run. Agents just hit the wall more often.

What sits behind the command matters little. It can be a cloud environment provisioned on demand, a Docker Compose file, or a pile of scripts that start things in the right order with seeded data. It will never equal production. Closer is better.

This is also the right place for quick, unpolished, agent-written code. The tooling does not ship to users. Its job is to reproduce what does ship, so a rough version that works beats a clean one that is still being designed. Build it before you invest in review, because confidence gained before a pull request is opened is the cheapest confidence there is.

See: [Verification and quality gates](../../04-delivery/03-verification-and-quality-gates.md)

### My agents wrote thousands of tests and now CI is flaky. What do I do?

Delete tests. Agents will write them for as long as you let them, and volume is not coverage. Once flaky or meaningless failures outnumber useful ones, the suite slows down agents and humans alike. One project removed more than half of an agent-written unit suite, and the agents' work got easier afterwards.

Judge each test by one criterion: does it make the right change easier and the wrong change harder?

Then choose verification per situation:

- heavy tests written up front for a risky area
- a measurable eval the agent can climb
- an agent exercising the running application and confirming it works

There is no formula. Adjust the mix until failures are mostly real.

See: [Verification and quality gates](../../04-delivery/03-verification-and-quality-gates.md)

### Can a model be my QA engineer, and what replaces manual QA?

Not out of the box. A builder tries to show that the thing works, a tester tries to make it fail. An agent that just wrote a feature tends to confirm it, as developers do with their own code.

A testing agent needs:

- a separate session from the one that built the feature
- a persona whose stated goal is to break things
- explicit teaching: what good testing means for your product and which risks matter
- a tester's brief for each change: what changed, where you think the risky edges are, what to try

Have it capture screenshots or video so you can spot-check quickly, and review its findings yourself at first. Otherwise you become the QA engineer for your own agent.

Two shifts in process go with it:

- **Validate sets, not single changes.** Checking every change by hand before it lands does not scale. Land changes you are roughly 98% sure of into a nightly build, exercise twenty of them together, fix what shows up, then promote. Cut stable releases from a nightly you have already used.
- **Keep humans for feel.** Settle the look of a screen early by iterating on a mock-up with the planning agent. Test touch gestures and first impressions yourself on a preview build.

See: [Verification and quality gates](../../04-delivery/03-verification-and-quality-gates.md)

### How can an agent verify work that has no obvious pass or fail?

Give it a reference and a jury. When the goal is "behaves like this existing thing" (a game mechanic, an animation, a port of an interface), record the original: screen capture plus the inputs that produced it. The building agent replays the same inputs against its own version and records the outcome. A panel of separate agents then sees both recordings and votes on which follows the inputs better. The loop continues until the panel prefers the new version, or cannot tell them apart.

The general point: verification does not have to be an assertion. A comparison against a recorded target, judged by agents that did not write the code, lets a long task run unattended on work you would otherwise check by eye. Keep a final human look for anything where feel matters.

See: [Verification and quality gates](../../04-delivery/03-verification-and-quality-gates.md)

### How do I find the UI problems that tests and DOM-driving agents miss?

Restrict the testing agents to pixels. Give them the running product and a rule: screenshots only. No source, no accessibility tree, no DOM tools. Then either hand them tasks or let them invent their own.

Record the screen. Each agent reports what it tried, where it got stuck and what looked wrong.

Then close the loop:

1. Give the recording, the reports and the codebase to a model that understands video natively.
2. It spots what frame sampling misses: layout shift, a popup covering a control, a font that renders oddly while typing.
3. It fixes what it found.
4. Run the pixel-only agents again.
5. Stop when the video reviewer finds nothing new.

The loop suits anything visual or time-based: animation, media, games. Tooling for it is still thin, so expect to assemble the recorder and the loop yourself.

See: [Verification and quality gates](../../04-delivery/03-verification-and-quality-gates.md)

### How does testing change when users arrive through agents?

A scripted journey (click here, then there, expect this) assumes you know the path. Agents take paths you would not predict, and they often use a tool more inventively than its author would.

So test the outcome. Did the goal get accomplished, and how much friction was there on the way? Friction still matters. The exact route does not.

Generative UI, where the interface is produced on the fly for a given user or goal, pushes this further. There is no fixed screen to assert against.

Selector-based suites in Cypress or Playwright stay useful for fixed flows. They will not cover agent-driven use, so start adding goal-level checks next to them.

See: [Verification and quality gates](../../04-delivery/03-verification-and-quality-gates.md)

### An agent reviewer always finds something. When is a change ready for a pull request?

Use one bounded pass, not a loop. Before the agent marks its pull request ready, it reads its whole diff once with a single question: can anything here be simpler? The usual finds are leftovers from an approach it abandoned halfway and code that the final design no longer needs. It may change nothing. Then the pull request is marked ready, and CI and an independent reviewer take over.

This step is not a review. The author has already decided how the thing should work and will defend that, exactly as a human author does. So it is a tidy-up before someone else looks.

If you find yourself in an endless fix-and-review cycle, the missing piece is usually a definition of done that can be executed: specific checks that pass or fail, in place of "review until clean".

See: [PR review with agents](../../04-delivery/04-pr-review-with-agents.md)

### Should we build our own AI code review, and which model should it use?

Buy before you build. Good automated review is much more than a model told to "review this": it needs context selection, noise control, and often the ability to run the code. Commercial reviewers specialise in that and choose models for you. There is no stable answer to "which model is best for review". If you roll your own, test candidates on your own past pull requests.

Also consider how long the investment will last. As agents get more changes right the first time, review shrinks as a separate stage, and review vendors are already widening into full delivery pipelines. Some teams reportedly work trunk-based already, with review before the commit and CI before deploy, and no pull requests.

Where procurement makes buying slow, a simple in-house reviewer is better than none. Keep it simple.

See: [PR review with agents](../../04-delivery/04-pr-review-with-agents.md)

### How do I separate "I am trying an idea" from "I want this shipped"?

Make the difference explicit and visible to people and to agents. Rough, half-working versions are valuable: you can feel a change, show it to a few users, and use it as a reference for the real implementation. The danger is only that one gets merged.

Practical markers:

- A `do-not-merge` label, or draft status, that automation respects. No auto-merge, and no review requests sent to humans.
- A line in the task brief that states the mode: explore, or land.
- A branch naming convention for experiments, so cleanup jobs can find and remove them.

With agents producing changes all day, a human should still decide which ideas move from explored to landing. That decision is product work, and it is a good place to keep a person in the loop even when everything after it is automated.

See: [The delivery loop](../../04-delivery/02-the-delivery-loop.md)

### If I no longer read most of the code, do readability and library choice still matter?

Maintainability matters as much as before. The reader has changed. Ask of every pattern and dependency: does this make the codebase easier for an agent to work in correctly?

That favours a stack that is hard to get wrong over one that is pleasant to type:

- **A strict compiler.** One reason to pick Rust for a new agent-written project is that most errors surface at compile time.
- **Typed effects and errors.** In TypeScript, a library such as Effect forces every failure path into the type signature, in place of ad hoc try/catch.
- **Explicit state machines.** A library such as XState replaces scattered booleans and makes impossible states unrepresentable.

The usual objection, too much ceremony, mostly disappears: an agent does not mind verbose, rigid patterns the way a person does. You can also ask the agent whether adopting a library would improve this codebase, and why.

Your personal style preferences matter less. A codebase organised around what most contributors, human and agent, understand with the fewest questions beats one organised around a favourite tool.

What still needs your judgement is long-term direction: avoid decisions that are hard to reverse, and put a flag in front of the ones you cannot avoid.

See: [Verification and quality gates](../../04-delivery/03-verification-and-quality-gates.md)

### Agents keep copying our worst old patterns. How do I stop that?

Agents do not question what they find. If a pattern is everywhere, they conclude it is how things are done here and add more of it. Two countermeasures:

**Name what you are retiring.** Keep a documentation section that lists the patterns on their way out, what replaces each, and when the old one can go. When a change starts a migration that cannot finish in one step, the agent files a cleanup issue describing what is left.

**Delete on a schedule.** Run a weekly agent whose only task is to remove as much code as it can without changing behaviour. Where it cannot prove something is unused, it adds instrumentation to measure real usage and files an issue stating how to check the result. A second scheduled agent revisits those issues and deletes what the data clears.

Legacy appears quickly. Codebases under a year old already need this.

See: [Learning after release](../../04-delivery/05-learning-after-release.md)

### Is formal verification worth adding to an agent pipeline?

For most products, no, not yet. Formal verification means proving properties of the code, as opposed to testing examples of them. It is expensive to set up and it is a long commitment. The setup is tuned to how today's models write and prove things, and models change every few months, so the investment ties you to a generation.

The same trade-off applies to any heavy up-front constraint: the more you lock down, the harder it is to pick up the next improvement.

Use it where failure is unacceptable: safety-critical systems, anything where lives or large irreversible sums depend on correctness. Everywhere else, put the effort into cheaper layers such as strict types, black-box tests, sandboxed permissions and review. Those keep working across model changes.

See: [Verification and quality gates](../../04-delivery/03-verification-and-quality-gates.md)
