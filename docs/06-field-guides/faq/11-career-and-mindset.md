# FAQ: Career and mindset

### If agents write the code, what is left for engineers?

More than before, for now, but different work. The role that is ending is turning a well-defined issue into code by typing. What has grown:

- **Building agentic systems.** This is code-heavy: you write everything around the model (context assembly, tools, memory, checks, evals), and prompting alone does not get such a system working. Products are increasingly expected to have an agent built in, so employers will look for people who can build one, not only drive one.
- **Looking after the codebase** so that people and agents can land changes quickly. Expect this to take more of your time than features do.
- **Holding intent.** Implementation is cheap to redo: rewrites that once took teams years have been done as a supervised agent loop in weeks. The reason a thing exists changes more slowly than its code, and keeping people and agents agreed on it is where the effort goes.
- **System design.** Agents design well with full context. Mostly they lack it, and you supply it.
- **Accountability.** Whoever deploys an agent answers for what it does to customers and colleagues.

Be honest about the horizon. Design skill may be automated too. What should last longer is deep knowledge of a real problem area combined with close attention to new capabilities, so you see the fit first.

See: [Build your own agent](../../03-agents/02-build-your-own-agent.md)

### Which skills stay valuable, and should I still specialise in a language or a layer?

Nobody predicts this field well a year out, so choose skills that survive being wrong:

- **Outcome over output.** Know which problem you are solving and for whom. Code volume means nothing.
- **Precise articulation.** Understand the concepts, the technology and the audience well enough to ask for the right thing.
- **System design.** Requirements always change. Design systems that absorb change and in which agents can deliver, and learn to recognise a bad design when an agent proposes one.
- **Adapting to what just became possible.** Keep noticing where a real problem meets a new capability.
- **Unlearning.** Mental models formed on an older generation of tools go stale. Revisit them on purpose.

On specialising: being T-shaped still wins, and the depth you already have shows in how well you direct agents and judge their output. But fluency in one language or one layer is losing value as a differentiator, so deepening it further is not the best use of learning time right now. Put that time into working with agents, building agentic systems, systems thinking and architecture.

Setting up abstractions and vocabulary for agents takes technical judgement today. Harnesses may absorb much of that later. The habit of adapting will not expire.

See: [Working habits and anti-patterns](../03-working-habits-and-anti-patterns.md)

### How should a senior engineer prepare for the next few years?

Nobody can forecast a decade. More of the stack will become something you direct without fully understanding it, and there will be security failures along the way. Three things are in your control:

- **Stay current on capabilities.** You do not need every tool. You do need to know what is possible this quarter, because that changes monthly.
- **Be the visible AI person at work.** Post what you learn, answer questions in the team channel, share what worked. The colleague everyone asks about agents is hard to replace.
- **If you build a product, choose a niche.** The large model vendors will keep absorbing broad categories such as task tracking and team communication. Find a small group with a specific pain and solve it with agents. Do not build anything a model vendor would obviously build next.

See: [Working habits and anti-patterns](../03-working-habits-and-anti-patterns.md)

### How do I build engineering taste when the agent writes the code?

By exposure and correction. Taste is a sense of which option is better, and you only get it by seeing many options. Generate many, compare them, reject most, and say why. Stating the reason is what turns exposure into taste.

For juniors the route is the same as before, with different material. Nobody became senior by typing. People became senior by attempting senior work, doing it less well, and being corrected inside limits that kept the damage small. Senior work now means directing agents to build systems, so juniors should do exactly that, with:

- **Guardrails:** restricted permissions, required review, small scopes.
- **Feedback:** a senior reviews the outcome and the way the junior steered the agent, not just the diff.
- **Repetition:** attempt, feedback, retry. Have the junior explain why a result is good or bad before being told.

Juniors also have a real advantage: not knowing what is supposed to be impossible. An experienced engineer rules out a hard feature because of old pain. A junior who owns it pushes through the same obstacles and ships it. If you lead a team, give an eager junior full ownership of one hard problem, with agents. If you are the junior, ask for that.

See: [Working habits and anti-patterns](../03-working-habits-and-anti-patterns.md)

### How do I get better at system design when the agent writes all the code?

Practise the conversation, since that is now where design happens.

- **Take apart systems you know as a user.** Ask an agent how a food-delivery app, a banking app or a subscription service is probably built. Where are the module boundaries? What are the main components? What would you do differently in a rebuild? Ask for diagrams.
- **Collect vocabulary.** The aim is fluency in the terms, so that you can use them precisely in your own planning sessions.
- **Reference prior art.** "Model subscriptions the way that product does" is a compact, exact instruction once you have studied that product.
- **Read about systems in general.** *Thinking in Systems* and *The Design of Everyday Things* are both broader than software, and both transfer.

Then try things and watch how they turn out. Experiments are cheap now, and several small builds teach more than reading does.

See: [Intent, specs and decomposition](../../04-delivery/01-intent-specs-and-decomposition.md)

### How does an engineer develop product thinking?

Get close to the people who deal with customers, and take notes on products.

- Ask the support team whether you can listen to calls or read transcripts. Nothing teaches the details of your own product faster.
- Talk to sales and marketing about what people ask for and what they object to.
- Keep a running note on products you use: what you love, what irritates you. You do not need to know why at first. Later, discuss an entry with an agent and work out the reason.
- Learn one or two prioritisation frameworks, such as the Kano model and RICE scoring, and read *The Mom Test* on how to interview users without leading them.

The best engineers always had this. It matters more now because the other thing engineers offered, implementation skill, is what agents supply. Saying no to ideas remains part of it, even when building them has become cheap.

See: [Intent, specs and decomposition](../../04-delivery/01-intent-specs-and-decomposition.md)

### How do I use agents to learn a new technology?

Have the agent build you something to learn with. Explanations alone do not stick. Four approaches:

- **A game.** Ask for a small game that drills the topic: timed questions, levels, a score to beat. You can prompt one in a day, and wanting to get further keeps you practising.
- **A story.** Ask for real-world walkthroughs: "a developer's agent stopped responding after a config change; investigate with me, step by step". Abstract material sticks once it solves a concrete problem.
- **An image per concept.** Generate one picture or character for each idea. A picture you can glance at brings back the idea without rereading a wall of text.
- **A place per subject.** Recall is partly tied to where you learned something. Study one subject in one spot and you switch into it faster when you sit down there.

Choose the format you will enjoy, because that is the one you will repeat.

See: [Working habits and anti-patterns](../03-working-habits-and-anti-patterns.md)

### Working with agents all day leaves me drained. What helps?

Writing code used to give you a rest between decisions. Now every minute is a decision. The main task is rarely what tires you. The side tasks do: each feels important, and each needs checking, steering and reviewing.

- **Plan away from the screen.** Hold planning conversations by voice while walking. It is still thinking, and it restores more than it costs.
- **Stay at the product level.** Sessions about trade-offs and what to build tend to energise. Sessions about implementation detail tend to drain. Delegate the detail.
- **Stop spinning plates.** Use one coordinating agent in place of four threads you rotate through. Before you launch another parallel task, ask whether it is worth the attention it will take.
- **Protect your attention with tokens.** Arrange things so that whatever returns to you is very likely to work. A few wasted checkouts in a row can end a productive day.
- **Mute the slot machine.** Hide threads that are still running and batch notifications.

Use your own enjoyment as the measure. If the workflow is not fun, or you keep landing in tasks that frustrate you, that is the clearest sign to change it. Borrow what looks enjoyable in other people's setups.

See: [Working habits and anti-patterns](../03-working-habits-and-anti-patterns.md)

### How do I avoid burning out when the agent never gets tired?

The machine will let you work every hour of the day, and access from your phone puts the project in your pocket. Pacing is now your job.

- **Stop treating idle time as waste.** When one agent is working on a long task, you do not have to start a second one. Leave the desk: walk, nap, go outside.
- **Choose the one thread that matters most** and spend your agent time on it.
- **Treat deep dives with care.** They are more rewarding than they used to be, because the agent can finish them, and that makes them more addictive. Decide in advance where you stop.
- **Know your "good enough" point for tooling** and stop customising there. Choosing a tool partly because it keeps the work fun is legitimate.
- **Finish things.** Building is cheap. Committing to a release is the scarce act, and what limits you is attention, yours and your users'.
- **Be selective about the information you let in.** Constant overload is the default state.
- **Keep capacity for other people.** A small project with family or friends is a better use of spare agent time than an invented task.

You will not do this perfectly.

See: [Working habits and anti-patterns](../03-working-habits-and-anti-patterns.md)

### My employer caps AI spend so low that I cannot work this way. What can I do?

In order:

1. **Make the case with evidence.** Build something real on your own time and your own plan, and show the result next to the cost.
2. **Propose a contained trial.** Ask for a team or a workload with no sensitive data, where individual plans can be expensed. Some companies book this under their education budget.
3. **Use what is allowed fully.** Even a small budget goes further once your environment is tuned and waste is removed.
4. **If the answer stays no, weigh it honestly.** Skills in this area compound fast, and a year without practice is hard to recover. Many employers are actively looking for engineers who work fluently with agents. The colleagues who care about this tend to leave restrictive companies first, and the people around you are the main reason to stay anywhere.

Respect data policies throughout. Wanting better tools is no reason to move company code through an account your employer has not approved.

See: [AI-first transition playbook](../01-ai-first-transition-playbook.md)
