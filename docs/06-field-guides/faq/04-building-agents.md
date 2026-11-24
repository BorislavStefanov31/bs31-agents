# FAQ: Building agents

### How do I tell whether a use case needs an agent at all?

Ask one question of each step: does it need judgement or reasoning that I cannot write as code?

- **No.** Write code. It is cheaper, faster and far more predictable.
- **Yes, at one point.** Keep the flow deterministic and add a single model API call at that point. This costs much less than a full agent.
- **Yes, as an open-ended sequence of decisions and tool calls.** Now build an agent.

In an event-driven backend where components already have defined responsibilities and talk through messages, most components stay exactly as they are. A model belongs only at the few places where a decision cannot be expressed as rules.

"Use the best tool for the job" still applies. That an agent can do something is not a reason to delegate it, and "agentic" being fashionable is not a requirement.

See: [Agent loop and primitives](../../03-agents/01-agent-loop-and-primitives.md)

### Should I hand-roll my agent or use a framework?

Use a framework for anything headed to production: Mastra, LangChain, or the agent SDKs from the model vendors. The basic loop is small. The hard parts sit around it:

- compaction and memory
- workflows with ordered steps
- long-running background tasks that may need user input later
- a user who interrupts or changes their mind mid-flow (steering)

Frameworks ship these as components you switch on. You describe the agent as an object (model, instructions, tools, skills, memory) and customise from there. Pick open source if you want to read and change the internals, a vendor platform if you want support.

The exception is a personal helper. That is often just a folder: some notes, a few Markdown knowledge files and skills, run by a harness you already use. It needs no framework.

See: [Build your own agent](../../03-agents/02-build-your-own-agent.md)

### Can I prototype a product agent inside my coding agent first?

You can, but it is a poor shortcut. With a closed, off-the-shelf harness you cannot see how it assembles context, manages the task or decides on tool calls. Those are exactly the things you need to observe when designing your own agent. You would also spend more effort making the coding agent pretend to be the product agent than building a small real one.

Build the simplest real version with an agent framework instead: one model, a short system prompt, two or three tools. Test that against real requests, then add memory, skills and checks as the failures show you what is missing.

See: [Build your own agent](../../03-agents/02-build-your-own-agent.md)

### How should an agent ask the user clarifying questions?

Through a structured tool, not in prose. Give the model a "request user input" tool. When it discovers missing information (for example, an order form needs a phone number and a delivery date you never mentioned), it calls the tool with all its questions at once. The harness renders them as a dialog with one field per question and returns the answers as the tool result.

The alternative is a paragraph containing five questions. People answer two, skip the rest, and the agent guesses.

Current coding harnesses work this way, and MCP elicitation is the same idea for servers. If your framework has a built-in tool for this, use it.

See: [Agent loop and primitives](../../03-agents/01-agent-loop-and-primitives.md)

### Every rule I add makes the agent less creative. How do I balance that?

For a production system, that is mostly the point. Reliability is the goal, and creativity is not an ingredient you need much of. Sort the work into three groups:

1. **No judgement needed.** Move it into code.
2. **Judgement needed, low risk.** Let the model work freely. Describe what good looks like and where the limits are; do not script each step.
3. **Judgement needed, real consequences.** Let the model decide, but put a check between its decision and the tool execution: a policy at a gateway, or a hook.

A non-deterministic model does not mean an uncontrolled system. The aim is not to sit in the loop approving every step. It is to own the loop: you decide what enters the context, which tools exist, and what is checked before anything takes effect.

See: [Hooks, guardrails and security](../../02-workspace/05-hooks-guardrails-and-security.md)

### Do I still need carefully designed contracts for other agents to talk to my system?

Less than before. As of late 2026, a class of small, very fast models returns a decision in roughly a tenth of a second for almost no cost. Put one at the front door and it can take a loose request, a few sentences or a raw payload, and route it to the right place: the booking agent, the issue tracker, a human queue.

That changes the design. You used to need a strict facade between two agents so that neither misread the other. A fast model can stand in that gap and interpret intent. Clients increasingly arrive as agents that phrase things vaguely, so this matters more each month.

Keep strict schemas where a wrong call is expensive: payments, deletes, anything irreversible. Use the fast router for intake and triage.

Because it responds in real time, the same model can run on every keystroke and show what pressing Enter will do before you press it.

See: [Tools and MCP](../../02-workspace/04-tools-and-mcp.md)

### How do I make a custom agent good at my domain?

Build a lab for it. A lab is a sandbox with a set of tasks from your domain, a way to score each run, and a loop: run the agent, read the failures, adjust its prompt, tools or context, run again. It is reinforcement learning done by hand on the agent's configuration instead of on model weights.

You do not have to write the lab yourself. Ask a frontier model to build one for your exact case; a purpose-built lab often beats a generic eval framework.

Looking further ahead, adapting a model to one product is becoming practical. Smaller open models tuned on your data are approaching what frontier models did a year ago. The eval tasks you collect now are the training and test data you would need for that, so the lab pays off either way.

See: [Reliability, observability and evals](../../03-agents/04-reliability-observability-evals.md)

### What is a personal assistant agent good for in practice?

Uses that hold up over months:

- **Long errands.** Chasing a contractor or a supplier until something is fixed. Keep one repository per errand with the contract, the evidence and every message. The agent resumes from the files, so nothing depends on a chat history.
- **Home devices.** An MCP server on a machine at home exposes devices to the assistant.
- **Calendar upkeep.** A schedule someone posts every week ends up in your calendar without you.
- **Customer mail.** When someone buys or cancels, the agent looks for an earlier conversation with that person and drafts a reply in the same thread. You edit and send.

Two rules. Anything addressed to a person stops at a draft. And when a routine repeats (a heating or shading plan that depends on the forecast, say), have the agent write a program that computes it, then step out of the loop.

See: [Build your own agent](../../03-agents/02-build-your-own-agent.md)

### Should I invest in a full agent pipeline, or build something else?

Build the pipeline small and expect to rebuild it. The wiring between agents that people call a software factory is a temporary problem: each model generation needs less of it and writes more of it for you. You can assemble one in an afternoon. Take a working example of a pattern, have the agent apply it to your project, run it on real tasks, and if it fails, ask for five variations and keep the best.

The longer-lived investment is a workspace around the thing you ship: a small custom app that shows your real output and lets you hand pieces of it to agents. Two shapes:

- A support desk over your issue tracker: open a request, type "summarise", get a summary and a draft reply as a thread.
- A content tool: draft a script, annotate a paragraph, send it to an agent, record audio against it.

Each is an afternoon of prompting on subscriptions you already have. Decide up front who uses it, which views exist, what the glossary is, and which model does which job.

See: [Build your own agent](../../03-agents/02-build-your-own-agent.md)
