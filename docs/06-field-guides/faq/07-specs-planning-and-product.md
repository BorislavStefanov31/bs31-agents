# FAQ: Specs, planning and product work

### How do I start a new project so agents work well in it from day one?

Start with three things, none of them a spec tool:

1. **A glossary**, agreed with the agent before code exists.
2. **A stack that fails loudly.** Pick languages and libraries that surface errors at build time, since you will not read most of the code.
3. **Ambition.** Agents remove most of the cost of a harder, faster, more polished stack. Choose what makes the product stand out, and choose a narrow niche.

Then take one of two routes:

- **From nothing.** Empty repository, one thread, a conversation about what you want. Keep it almost embarrassingly simple and add structure only when a real problem asks for it. Good for exploration, and for learning what the agent does and does not understand.
- **From your own starter.** If you build similar products repeatedly, keep a template repository with what you rely on: verification commands, decision-record and spec templates, feature flags, deployment. Before each project, have an agent bring the template up to date (dependencies, plus what you learned last time), then generate from it.

The mistake in both is polishing configuration before any code has landed. Settings tuned against imagined problems rarely match the ones you meet. Land code first, then configure against the problems you hit.

See: [AI-first transition playbook](../01-ai-first-transition-playbook.md)

### What should I write down so agents make changes that fit the product?

Whatever currently lives only in your head. Agents follow written intent. They cannot follow a preference nobody recorded.

A useful minimum:

- **Decision records** (ADRs): what was decided and why.
- **A primitives document**: the core concepts of the system and how they relate.
- **A feature map**: what exists and where it lives.
- **A "must never do" list** for agents.
- **A rollback procedure.**
- **A PR template** that states the goal, the reason, what changed, how it was tested, and a checklist for the human.

Write these with outcomes in mind. The product is the problem solved for the user. The amount of code produced says nothing about it, and with agents the code is the cheap part. Your time goes into deciding what should exist and making that legible.

See: [Intent, specs and decomposition](../../04-delivery/01-intent-specs-and-decomposition.md)

### Do I need a formal spec-driven process, and are big spec files worth maintaining?

Two questions with different answers.

**A spec per change: yes, but you need not be its author or main reader.** Give the agent a template, talk through the feature, and let it fill the template in, keep a list of open gaps and ask you about them. For anything large, have a second agent with access to the codebase and the decision records attack the plan, then confirm the short list of decisions the two return with. Seen this way the spec is an implementation detail of the agents, like a build artefact.

**One large standing spec that drives behaviour and must be kept in sync: probably not for much longer.** This is a bet, not a settled fact. A frontier model at medium effort now handles much of what needed a detailed spec a year ago, and guidance pulled in on demand, such as skills, does the job with less upkeep. A spec also records only constraints: it keeps "must do X" and loses the options you saw and disliked.

So capture intent in small, addressable pieces: a decision record, a skill, an issue with acceptance criteria. Accept that intent is vaguer than code. What stays with you is saying what you want, noticing a misreading, and deciding trade-offs.

See: [Intent, specs and decomposition](../../04-delivery/01-intent-specs-and-decomposition.md)

### Should the product spec and the implementation spec be separate documents?

Usually not. One document with the product goals at the top and the technical plan below is easier to keep consistent, and the implementer should know the background of what it is building. If the product part is long, give the implementer a summary of it.

Separation can make sense in a larger organisation when the product document is how you reach agreement with product people. A good way to produce it: run the meeting with an agent listening, let it ask questions as another participant would, and translate between its technical terms and the business owner's answers.

There is a useful test in the handoff. If the agent turns product goals into a plan that uses the same building blocks you would have chosen, your architecture documentation is working. If it does not, fix the documentation before the plan.

See: [Intent, specs and decomposition](../../04-delivery/01-intent-specs-and-decomposition.md)

### Do I need a skill that makes the agent interview me before it builds?

Sometimes. An interview skill (instructions that make the agent question you until the requirements are complete) earns its place at the start of a new project, or when a normal conversation shows that the agent has not understood you. For everyday features in a codebase with good decision records, a plain planning conversation with a spec template gets to the same place with less effort.

What the interview protects against is context you hold but forgot to say. Ask "serverless or a long-running server?" without mentioning that the app must process media files in the background, and you will get a confident, wrong recommendation. So whichever style you use, volunteer the unusual constraints first: background work, data volume, compliance, anything that already exists and must be kept.

See: [Intent, specs and decomposition](../../04-delivery/01-intent-specs-and-decomposition.md)

### How many technical decisions should I leave to the agent?

Most of them, with a threshold and a report. A workable instruction:

```text
Decide anything you are at least 90% sure about yourself.
Ask me only about the rest.
List the decisions you made on your own, one line each.
```

Then spend your time on the questions it does ask, which tend to be product gaps: what should happen in this case, can that be deferred. Skim the list of decisions it took alone. While you are still building trust, read that list carefully and read the plan too. When you notice that you agree every single time, stop reading the plan and keep skimming the list.

The threshold keeps the conversation short without hiding anything. You can always see what was decided for you.

See: [Intent, specs and decomposition](../../04-delivery/01-intent-specs-and-decomposition.md)

### How do I explore a design direction when I do not know what I want?

Ask for many variations and choose. Do not describe.

1. "Build nine variations of this idea and show them on one grid." Pick one.
2. "Nine variations of the one I picked." Pick again. Repeat until you like it.
3. Move into the real app: "make this part a swappable module with several implementations, and let me cycle through them in place with the 1 to 9 keys".

Step 3 matters because a variation that looks good alone can look wrong in context.

This is fast, since producing nine options costs little more than producing one, and you recognise what you want more easily than you can specify it. Each round also adds to the record of what you rejected, which the agent uses next time.

See: [Intent, specs and decomposition](../../04-delivery/01-intent-specs-and-decomposition.md)

### How do I get precise UI work out of an agent when it keeps missing small details?

Give it a design vocabulary, an approved component set and feedback anchored to frames.

- **Vocabulary.** Install a design skill set that teaches the agent proper design terms and critique steps. Impeccable is one public example. Then "tighten the hierarchy" means something specific to it.
- **Component sheet.** Ask the agent to build your core components in one large throwaway HTML file, fully interactive. Delete what you reject and declare what remains the source of truth for new screens. This is your approved subset, with your states and spacing, which a stock component library does not give you.
- **Stress data.** For stateful UI, have the agent feed many data sets through each component: long names, empty lists, error states.
- **Frame notes.** Record agents driving the components. Review the video in a small tool that lets you pause, capture the frame, draw arrows on it and attach a note with your reasoning. Hand back video, frames and notes together. The agent gets the exact moment and region, which a paragraph of description rarely conveys.

See: [Skills](../../02-workspace/02-skills.md)

### How do I get product owners to accept UX when they will not read a spec?

Show them a simulated user. A prototype used to take days, so you built one. Now you can build many in an afternoon, and the scarce thing is the stakeholder's attention.

1. Build the prototype, or several variants.
2. Give an agent a list of tasks and have it use the prototype as a first-time user while the screen is recorded.
3. Have the agent say what it is trying to do at each step, and turn that into a voice-over with a text-to-speech service such as ElevenLabs or an open model. It costs very little.
4. Watch the video together. The product owner reacts to what they see: agree, disagree, "why did it click there?".
5. Regenerate variants from the feedback.

Acceptance happens in that room, against behaviour. Recordings of real users are still better. Use simulation for the many rounds before you can get real users.

See: [Intent, specs and decomposition](../../04-delivery/01-intent-specs-and-decomposition.md)

### Agents let me build fast, and now I have five things at 90%. How do I finish?

Speed makes it easy to start the next thing before the last one is done. Three habits counter it:

1. **Start from the problem.** Write down the one thing this must do for its user.
2. **Cut to the smallest version that does it.** Have the agent sketch the full solution, then trim. Ship the small version unless something missing would truly frustrate people. Adding a piece later is easier than removing one.
3. **Close threads.** Treat the list of open agent threads as an inbox. A thread leaves only when its change has merged. Aim to empty the list, not to grow it.

Resist building for scale you do not have yet. If the people who should use the thing are not using it, more features will not fix that. Feedback on the small version will.

See: [Working habits and anti-patterns](../03-working-habits-and-anti-patterns.md)
