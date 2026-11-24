# FAQ: Teams, adoption and process

### How do I get a whole engineering organisation working well with agents?

Do not try to convert everyone. This is a change-management problem with fear, dislike and ethical objections in it, and pushing does not work.

Use the 1-9-90 pattern found in most communities: about 1% create, 9% contribute now and then, 90% consume. Recruit the 1% deliberately. Take one or two people from each strategic repository and platform (web, backend, each mobile platform, hardware), not simply the keenest volunteers.

That group tries every new tool and compares results per domain; little works everywhere. Each member then embeds what works into their own repository: skills, a maintained `AGENTS.md`, hooks. An average engineer who points an agent at that repository gets good output without being an expert.

This is an internal version of the forward-deployed engineer: someone who learns a team's process and wires the tooling into it, not someone pitching from outside. Once colleagues see a champion's merged work multiply, they start asking how.

See: [AI-first transition playbook](../01-ai-first-transition-playbook.md)

### How do I get teammates to pick up agent workflows without mandating one setup?

Pair. Ten minutes of watching a colleague take a change from prompt to merge teaches more than documentation, in both directions. Pairing has become rarer just as it became more useful, because the thing to learn now is workflow, and workflow is only visible live.

Some concrete moves:

- Find the person who is struggling and sit with them. Do not send a config file.
- Swap diagnostics. Ask colleagues to run the same analysis prompt over their own agent history and share the summary. You will see the problems they hit and you do not.
- Keep shared repo guards (skills, hooks, checks) easy to change. When one blocks somebody's work, fix it the same day.
- Reconsider pre-commit hooks. They are far less painful when the agent runs them and repairs what fails.

Everyone should end up with a workflow they shaped and understand.

See: [AI-first transition playbook](../01-ai-first-transition-playbook.md)

### Which departments need to be on board besides engineering?

Three. Sponsorship from engineering leadership alone does not move things.

- **Finance.** The best tool changes every few months. A three-month procurement cycle keeps you a generation behind, so agree a fast path for AI tooling.
- **IT or developer experience.** They roll shared setup out to every machine: plugins, hooks, MCP servers. You need them to move at your pace.
- **Security.** Bring them in on day one as a partner who watches every step and can stop you, not as a gate at the end. Moving fast is only safe when someone is positioned to say "wrong direction".

If you arrive as a consultant, ask who owns each of these before you build anything. Requests such as database access for an agent stall exactly there.

See: [AI-first transition playbook](../01-ai-first-transition-playbook.md)

### How do I roll out agent automation across many teams without chaos?

Four rules cover most of it:

1. **Start with a pilot.** A few people on one bounded area, and a manager who has been told the first attempt will probably be wrong. You are paying to find the approach that fits your codebase, and any outside recipe would need adapting anyway.
2. **Every agent has an owner.** The person closest to a domain builds its agent, checks it in, and is answerable for how it behaves.
3. **Feedback sits next to the output.** Wherever a bot posts (chat, pull request, issue), the way to respond is right there: a thumbs up or down at minimum, ideally a reply box. Frustration with automation builds up where people cannot answer back.
4. **Someone sees the whole picture.** One named person knows what every team is automating. Without that, everyone builds the same easy things in parallel.

Some duplication is healthy: when building takes an afternoon, non-developers build their own tools and learn from it. When several people have built similar things, put them in one room to merge them.

See: [AI-first transition playbook](../01-ai-first-transition-playbook.md)

### We have a large legacy codebase. Where do we start making it agent-ready?

Start with a map, not with autonomy.

1. **Describe what exists.** With an agent, list the reusable building blocks and where their documentation is. The first version will be messy and full of overlaps. That is useful information.
2. **Record decisions as they stand today.** Rebuild the reasons from the code and from the people who remember.
3. **Recover intent.** An agent cannot tell deliberate behaviour from accident. Talk to product owners about how features should work, give the agent the transcript, and let it point out behaviours nobody mentioned. Encode the confirmed ones as tests.
4. **Make implicit state explicit.** Where behaviour hides in scattered flags and conditionals, model it as a named state machine and test it.

Assign one or two people to this as their main job. It is the same continuous upkeep mature codebases always needed, with higher stakes. Keep reviewing changes by hand until the results have earned less.

See: [AI-first transition playbook](../01-ai-first-transition-playbook.md)

### How do I measure whether AI adoption is helping?

Adoption rate is the right metric only while it is low. Once nearly everyone uses the tools, it tells you nothing except who is running up the invoice. Usage leaderboards measure spending.

The next question is whether committed work reaches customers faster. A practical test is to put agents into normal planning and let them pick up real issues from the sprint board. If the planned scope is finished in a fraction of the sprint and the team has to pull in more, you have a change in delivered work that you can count. Teams that get this right have reported around three times their usual throughput; treat that as one outcome, not a benchmark.

Measure issues closed against commitments, problems solved for customers and features shipped. Do not measure prompts sent or tokens used.

See: [AI-first transition playbook](../01-ai-first-transition-playbook.md)

### Has everyone working with their own agent killed collaboration?

It reduces it. Team chat goes quiet because people ask their agent before they ask a colleague. Pairing and mobbing fade for the same reason.

One counter-pattern is to move agent conversations into a shared space: a chat workspace where agents are participants. A design discussion then happens where other people, and their agents, can join in, not inside one person's desktop harness.

Two caveats:

- It only works when the whole team opts in.
- People often dislike being addressed by someone else's assistant. Agree on etiquette before you invite yours into a channel.

Keep personal tools and configuration personal. Share what the team depends on (skills, plugins) through the repository, so collaboration does not rely on everyone running the same setup.

See: [AI-first transition playbook](../01-ai-first-transition-playbook.md)

### Which engineering mistake matters most on an agent-heavy team?

Working silently. Agents make it easy to build a great deal alone, and that makes it easy to drift from the team without noticing.

The habits that prevent it:

- Say what you are working on, before it is finished.
- Report the problems you hit while you are still in them.
- Say early when you will miss a date.

Most other mistakes are how engineers learn. This is a field that rewards trying things, overreaching, breaking something and coming out better for it; the strongest engineers usually have the worst incident stories. Experience has a cost as well. After enough years you avoid whole areas because you are too proud to be the person who breaks production there. Notice that caution in yourself, and do not hand it on to people who are still learning.

See: [Working habits and anti-patterns](../03-working-habits-and-anti-patterns.md)

### Are Scrum, sprints and story points still useful?

Keep the part that was about coordination and drop the part that was about human capacity.

Story points and sprint planning exist to estimate how much work people can finish. When implementation takes an agent half an hour either way, that estimate is noise. Stand-ups as status reports go the same way once a status view exists.

What does not go away:

- **Avoiding overlap.** Several people feeding one codebase through agents can start conflicting work within the same hour. Someone has to see that.
- **Prioritising.** Deciding what is worth building is now the main constraint.
- **Surfacing friction.** Knowing where work gets stuck was always the valuable part of a stand-up.

Replace rituals with visibility: a shared view of what is in flight, what is stuck and what it costs. Then try assigning an agent to chase the stuck items.

See: [AI-first transition playbook](../01-ai-first-transition-playbook.md)

### How should we restructure an eight-to-ten person team around agents?

The direction many organisations are taking, as of late 2026:

- **Smaller squads with more surface.** Two or three engineers can own what a team of eight did. Every added person multiplies the context that has to be shared between heads, and that cost now outweighs the extra hands.
- **A pipeline owner.** One or two people own the delivery system itself: verification tooling, agent configuration, review automation, flags and recovery. It is the old developer-infrastructure role with a larger effect. Everyone else does product work through that system.
- **Build it in-house if you are large.** Vendors selling a complete agent delivery pipeline (often called a software factory) tend to aim at small and mid-sized companies. Big engineering organisations tend to build their own.

The hardest part is not tooling. Some colleagues will not want to work this way, and that takes direct conversations and time. Plan for it explicitly.

See: [AI-first transition playbook](../01-ai-first-transition-playbook.md)

### How should we interview engineers now?

Test what the job has become: working with someone on a real problem, with agents available. A format that respects candidates is to send the options weeks ahead and let them choose.

1. A classic algorithm exercise, for people who prepared for one.
2. A realistic task in a realistic codebase, worked through together.
3. Their own project. They send the repository in advance and you pair on it for ninety minutes to two hours.
4. A format they propose, subject to your approval.

The goal is to see the best version of the person and how collaboration with them feels: how they ask questions, handle disagreement and direct their tools. Trick questions measure none of that.

One rule for both sides: the people who interview should be the people the candidate will work with. As a candidate, ask whether that is the case and whether you can pair with the team. A refusal tells you a lot.

See: [AI-first transition playbook](../01-ai-first-transition-playbook.md)
