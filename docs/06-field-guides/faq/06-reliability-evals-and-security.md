# FAQ: Reliability, evals and security

### How do I get output that is as deterministic as possible?

Shrink the part the model produces. Anything that must be exact (a figure, a record, a status) should come from code. If a tool already returns the exact answer the user needs, consider showing it directly and not having the model restate it. Keep the model for the places that need interpretation.

Then measure what is left. An eval suite run repeatedly tells you how often the model-driven part is right, which is the only honest meaning of "deterministic enough".

An agent left to "just do the work" holds up on a side project and gets you burned quickly under real usage. Most of the engineering is in what you build around the model.

See: [Reliability, observability and evals](../../03-agents/04-reliability-observability-evals.md)

### Why is one passing run not enough, and can the agent write my evals?

Agent output varies from run to run, so a single pass proves little. Run each case many times and track pass rates and averages over time. An eval is closer to a measurement than to a unit test.

On authorship: models are mediocre at writing tests and no better at evals. They produce volume, not sharp cases. Someone who understands the product has to design them. Treat that as a skill to learn deliberately, the way software testing once was, or as a role. Teams hired dedicated testers because most developers neither liked the work nor excelled at it, and the same may turn out to be true for eval writers.

Let the agent write the runner code and expand your cases in bulk. Keep the decision about what good looks like.

See: [Reliability, observability and evals](../../03-agents/04-reliability-observability-evals.md)

### Where do good eval cases come from?

Two sources work well.

**Your own history.** Session logs contain every moment an agent did something you did not want. No human would comb through months of transcripts, and agents do well on exactly this kind of tedium. For mistakes a team keeps hitting, such as agents misusing one internal tool:

1. Write a prompt that asks an agent to scan local session history for every case where the tool was used badly, and to summarise each case.
2. Run it yourself and send the same prompt to a few colleagues. Different people hit different failures.
3. Turn the combined list into cases: a situation, plus what a correct tool call looks like.
4. Let an agent change the tool's description, arguments or error messages, and re-run until the cases pass.

You end with a tool surface (an MCP server, say) that fits how agents really try to use it, with fewer errors and less context spent, plus a regression suite for the next change.

**Black-box generation.** Hand your agent to a second agent, describe what the first should be able to do, and have the second invent around fifty scenarios and run them.

Pair either source with a fix loop: change one instruction, re-run, keep the change only if the scores hold.

See: [Self-improving systems](../../05-autonomy/05-self-improving-systems.md)

### How do I choose between two designs for the same job?

Build both and let evals decide. Code is cheap now. Have your coding agent implement each variant (a skill or a sub-agent, an LLM call or a small decision model or plain code), run the same eval set many times against each, and compare.

Intuition is unreliable here. A specialised decision model can look like the obvious fit for a routing step and still lose to the alternative once measured. The same goes for "production ready" claims about a new class of model: ready in general does not mean best for your task.

If you do use a decision model (one that answers yes or no, or picks from a list) to select a code path, remember that its input can mislead it like any LLM. Guard the branches with consequences, such as issuing a refund.

See: [Reliability, observability and evals](../../03-agents/04-reliability-observability-evals.md)

### An eval that used to pass is failing. What changed?

Usually not the eval. Something in the agent's build changed: the model version, a skill, the system prompt, a tool, or several of these together. Check them in turn.

One cause is easy to miss. A model upgrade can make your existing instructions harmful. Guidance written to compensate for an older model (extra prompt sections, paragraphs in `AGENTS.md`, whole skills) can lower scores once the model no longer needs it. After an upgrade, the fix for a regression is often deletion.

Reading the result and adjusting the agent is a permanent cycle, not a one-off launch task. Budget time for it whenever a model, skill or prompt changes.

See: [Self-improving systems](../../05-autonomy/05-self-improving-systems.md)

### Do I need to version my prompts?

Not as a separate practice, if you have evals. Put evals on your system instructions and your skills, and run them on every change to either. Version control already gives you the history.

The useful question is not "which version is live" but "did this change make the agent better or worse". A version label cannot answer that. An eval run can.

See: [Reliability, observability and evals](../../03-agents/04-reliability-observability-evals.md)

### How do I tune a prompt when "good" is a matter of my taste?

Build a small eval from your own corrections. For a daily change summary, for example:

1. Collect around twenty outputs you did not like and rewrite each one the way you want to read it. These are your references.
2. Take real inputs (two commit hashes, say) and have the prompt under test produce a summary.
3. Have judge agents compare each new summary with the references and score from 1 to 10 how likely you are to like it.
4. Let an agent revise the prompt and repeat until the score stops improving.

It is not cheap, and for a one-off prompt it is not worth it. For something you read every morning it pays back quickly, and you finish with a written definition of your preference that survives a model change.

See: [Self-improving systems](../../05-autonomy/05-self-improving-systems.md)

### How do I start an optimisation loop: with target metrics or without?

Without. Write the targets second.

1. Ask the agent to do the best it can, with no metric.
2. Review the first few passes yourself and reject what is bad.
3. Keep a list of why each one failed. This is where the edge cases surface, along with what a typical user would expect, since the model's defaults reflect what it has seen people do.
4. When the agent stops improving by its own judgement, discard that run.
5. Start again with explicit targets written from your failure list.

Step 2 can take days of rejecting poor output. That is the work. A metric written before you have seen the failures measures what you guessed would matter. You are ready to write targets when you can list the failure modes from memory.

See: [Self-improving systems](../../05-autonomy/05-self-improving-systems.md)

### Is it safe to let an agent run commands on my machine?

Risk tracks three things: how capable the model is, how open-ended the task is, and whether the agent has a proper tool for it. "Find the pull request that changed this" is low risk. "Find the email about this" without a mail tool is higher, because the agent may improvise through your browser. Money is higher again.

Build trust in steps: start with actions you can watch, widen permissions as the agent earns it, and re-test when you change model. What the harness gives you differs:

- **A built-in classifier.** Claude Code's auto mode (as of late 2026; check the current permission docs) puts a second model in front of each action, whose only job is to judge whether it is safe. That beats both full access and approving every command by hand.
- **A minimal harness** such as Pi ships few safety defaults and a lot of configuration, so the gate you want may be a setting. Ask the agent to list the options for restricting commands. As of late 2026 no extension is the community standard for a classifier mode, so you may have to write a small one.

For anything that runs without you, prefer a container or VM where a bad command is cheap. A filter can miss one.

Expect the opposite problem too: agents are often overcautious and copy things they should edit or delete.

See: [Hooks, guardrails and security](../../02-workspace/05-hooks-guardrails-and-security.md)

### Where should secrets live so the model never sees them?

Outside the repository and outside the context window, injected only into the process that needs them. The agent refers to a secret by name, and the runtime that executes the call resolves the name to a value. The value never appears in the prompt, the tool result or the transcript.

- **Local agents.** Use a password manager with a CLI. With 1Password, `.env` holds references and the real values are resolved at run time, optionally behind a biometric prompt that covers a time window:

  ```sh
  # .env contains: DATABASE_URL=op://dev/app-db/url
  op run --env-file=.env -- npm run migrate
  ```

- **Hosted agents.** Use the secret store of the platform that runs them, and re-read its guidance now and then. Platforms revise secret handling after incidents.
- **Tools you build.** Design the names for several identities per service. The task says which account, and the agent picks the matching name, for example `personal-mail`. A shared service account is the team default, and the same tool code runs under a different credential without edits. This is what makes a tool safe to hand to a colleague.

Check your harness docs first, since each has a recommended mechanism. The rule that does not vary: no plaintext secret in a file the agent can open.

See: [Hooks, guardrails and security](../../02-workspace/05-hooks-guardrails-and-security.md)

### How do I check that an autonomous agent's guardrails hold?

Attack them. Put the agent in a sandbox and give a second agent the job of making it misbehave: read outside its paths, call a tool it should not have, change system config, act outside its role. The attacker only uses the agent from outside, the way a user or another agent would, and does not see how it is built.

This is the same method model labs use on their own systems, at a much smaller scale. It is less work than it sounds: ask an agent to set up the sandbox and write the attack scenarios, then read the report.

Run it:

- before an agent first runs unattended,
- after any change to its permissions or tools,
- after a model upgrade, because a new model may find routes the old one did not.

Fix what it finds by tightening permissions. Adding a sentence to the prompt is not a fix.

See: [Hooks, guardrails and security](../../02-workspace/05-hooks-guardrails-and-security.md)

### Why put an AI gateway in front of agents, and how do we manage MCP access at scale?

A gateway sits in the request path between agents and the models and tools they use. Beyond rate limits and quotas, it gives you:

- **Policy at the point of action.** It sees each tool or MCP call before it executes, compares it with company policy and blocks what is not allowed. The model stays flexible; the action is what gets checked.
- **Cost control.** Spend limits per person or kind of task, and early detection of a runaway loop.
- **Model routing.** Routine requests go to cheaper models.

For MCP discovery, access control and user identity, an internal catalogue of servers works at first. Once you have dozens or hundreds of internal servers, use a control plane: one place that lists approved servers and skills and decides who may use which, as whom.

If your agents connect to the systems of a real business, treat a gateway as required.

See: [Hooks, guardrails and security](../../02-workspace/05-hooks-guardrails-and-security.md)
