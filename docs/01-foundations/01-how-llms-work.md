# How LLMs work: the mechanics you steer with

> A coding agent is a language model wrapped in a program. This chapter covers the handful of model mechanics that explain most of what you see day to day: tokens, next-token prediction, run-to-run variation, the knowledge cutoff, reasoning effort, prompt caching and model tiers. After reading it you can predict why an agent behaved the way it did and pick the cheapest setting that still does the job.

**Read this when:**
- An agent gave two different answers to the same prompt and you want to know which one to trust.
- Your usage bill or response time jumped and you cannot say why.
- You are choosing a model and effort level for a task, a subagent or an automation.
- An agent stated something false about your project with full confidence.

## One request, start to finish

A large language model (LLM) is a function: text in, text out. It has no session, no memory and no access to your machine. Those are built by the program around it, the harness (see [Harnesses and settings](03-harnesses-and-settings.md)).

Each request carries two things:

- **Context**: every piece of text the model may use. System prompt, tool definitions, the whole conversation so far, tool results.
- **Settings**: which model, how much reasoning effort, which tools exist, output limits.

The model reads the context and produces a continuation. Then it forgets everything. On your next message the harness sends the whole conversation again, plus the new part.

```
turn 1:  [system + tools][msg 1]                          -> reply 1
turn 2:  [system + tools][msg 1][reply 1][msg 2]          -> reply 2
turn 3:  [system + tools][msg 1][reply 1][msg 2][reply 2][tool result][msg 3] -> reply 3
```

Three consequences follow:

1. The model can only use what is in the request or in its training.
2. Every turn re-sends the full history, so long threads cost more per turn, not just in total.
3. What you typed is a small share of what the model reads. The harness adds most of it.

## Tokens: the unit you pay in and run out of

Models do not read characters or words. A tokenizer splits text into tokens, chunks that are often a word, part of a word, or punctuation with its leading space. Each token maps to a number, and the model works on the numbers.

What this means in practice:

- **Billing and limits are in tokens.** Input tokens, output tokens and reasoning tokens are all counted, usually at different prices.
- **Counts depend on the content.** A rough rule for English prose is three to four characters per token. Code, non-English text, emoji, UUIDs, hashes and minified JSON cost noticeably more per character.
- **Counts depend on the model.** Each model family has its own tokenizer. A new model generation can change the count for the same text by tens of percent. Use your provider's token counter, not a tokenizer from another vendor.
- **Images and audio become tokens too.** The model receives numbers, not pixels, so it can miss small text, exact colours or overlapping elements.

The **context window** is the maximum number of tokens one request can hold, input and output together. As of late 2026 flagship models advertise windows from roughly 250k to 1M tokens. If the request plus the reply would exceed the window, the call fails, so harnesses trim or summarise history before that happens.

A large window is a capacity, not a target. Quality drops well before the limit; see [Context engineering](02-context-engineering.md).

## Next-token prediction, and why a bad start compounds

Given the tokens so far, the model computes a probability for every possible next token. The harness or API picks one, appends it, and the process repeats until the model emits a stop token.

```
context:     "The deploy failed because the"
candidates:  " database" 31%   " migration" 24%   " health" 18%   " image" 9%   ...
picked:      " migration"
new context: "The deploy failed because the migration"
```

Three properties matter for steering.

**Chat is a text format.** Your messages are flattened into one long text with special marker tokens around each role. The exact markers differ per model family; the shape is always similar:

```
<|start|>system
You are a coding agent. You can run shell commands with ...
<|end|>
<|start|>user
Why is the build red?
<|end|>
<|start|>assistant
```

The text ends with an open assistant turn, and the model completes it. System prompt, instruction files, tool results and your message are all earlier text. They influence the continuation; nothing in there is executed like code.

**The model cannot take a token back.** Once a token is picked it becomes part of the context for every later token. A wrong assumption in the first sentence of an answer makes the following sentences more likely to build on it. This is why a thread that went wrong early rarely recovers by arguing with it. Start a new thread with a better opening instead.

**Stopping is a decision too.** The model stops because it is done or because it wants a tool to run. A tool call is structured output that names a tool and its arguments. The harness runs it, appends the result and calls the model again. That loop is the whole agent (see [The agent loop and primitives](../03-agents/01-agent-loop-and-primitives.md)). The model only knows a tool exists because its description is in the context.

Practical consequences:

- Ask for a short plan or a list of assumptions before code. Early tokens steer everything after them, and a plan is cheap to correct.
- Put the facts the model needs before the question, in the order it needs them. Models, especially smaller ones, do measurably worse when the same premises arrive in a shuffled order.
- Prefer one clear instruction to three hedged ones. Vague text spreads probability across many continuations.

## Why two runs differ

Picking the next token involves sampling. If the top candidate has 31% and the second 24%, the second will be chosen fairly often, and from that point the two runs diverge.

API parameters such as `temperature` and `top_p` change how adventurous the sampling is. Temperature `0` picks the most likely token each time, yet identical output is still not guaranteed: batching and hardware differences on the provider side can flip a close call. Several current reasoning models fix these parameters or reject non-default values, so check your provider's reference.

Treat an LLM call as a draw from a distribution: make good outcomes more likely, then check the result with something deterministic.

| Situation | What to do |
|---|---|
| One run produced a design you like | Save it to a file. You may not get it again. |
| You are comparing two prompts or two models | Run each several times on the same inputs. One run each proves nothing. |
| A step must be correct every time | Do not rely on the prompt. Add a test, a type check, a linter or a hook that fails loudly. |
| You write tests for LLM output | Assert on structure and facts, not on exact strings. |

Verification is covered in [Verification and quality gates](../04-delivery/03-verification-and-quality-gates.md).

## What the model knows, and what it cannot know

A model's built-in knowledge comes from training data that ends at a **knowledge cutoff**. Released models are typically several months to more than a year behind the calendar.

It cannot know, unless the context or a tool provides it:

| Missing knowledge | Symptom | Fix |
|---|---|---|
| Today's date | Answers as if it were the cutoff year | Harnesses usually inject the date; in your own agent, add it |
| Latest version of a library or API | Uses a removed flag, an old import path, a deprecated config key | Let it read the lockfile, run `--help`, or fetch current docs |
| Your repository | Invents file names, function signatures, module boundaries | Let it search and read files before writing |
| Your conventions and decisions | Correct code in the wrong style or the wrong layer | Instruction files and rules (see [Instruction files and rules](../02-workspace/01-instruction-files-and-rules.md)) |
| Runtime facts | Guesses at data shapes, env vars, failing test output | Let it run the command and read the output |

When knowledge is missing the model does not stop. It produces the most plausible continuation, which reads exactly like a correct one. This is **confabulation** (often called hallucination). It cannot be switched off, only made rarer, and with current models most of it traces back to missing or wrong context.

Structured output deserves a specific warning. A JSON schema guarantees that fields exist and have the right types. It does not guarantee the values are real: a model asked for the population of a city that does not exist returns a well-formed number.

Coding agents get around the cutoff with tools: they read files, run commands and search the web, and the results land in the context. An answer therefore depends less on what the model memorised and more on whether it looked. If an agent answers a question about your code without a single read or search, be suspicious.

## Reasoning effort

Modern models can produce reasoning tokens before the visible answer. This matters because of the no-take-back property: in the answer, a wrong step stays; in the reasoning, the model can notice the error and change direction before committing.

Reasoning tokens are billed as output and take time. Most providers expose a dial, usually called effort or thinking level, with steps such as `low`, `medium`, `high` and above. The names, the defaults and the meaning of each step differ per model and change between releases.

How to use the dial:

| Task | Starting effort |
|---|---|
| Rename, format, mechanical edits, simple lookups | Low |
| Routine feature work in a codebase with good tests | Medium |
| Debugging across modules, design decisions, security review, long autonomous runs | High |
| A hard problem where a wrong answer is expensive | The top levels, only after a lower one failed |

There is no universal rule. More effort often helps on hard tasks and only adds cost and latency on easy ones. Take a few real tasks you can check, run them at two or three levels, and keep the lowest level that passes. Repeat when you change models, because levels are recalibrated between generations.

High effort does not fix missing context. A model reasoning carefully over the wrong facts reaches a well-argued wrong answer.

## Prompt caching: why cost and speed depend on what stays the same

Because every turn re-sends the whole conversation, a 40-turn session would process the early messages 40 times. Prompt caching avoids that. The provider stores the processed form of the start of your request, the **prefix**, and reuses it when the next request begins with exactly the same tokens.

```
turn 7:  [system + tools][project context][turns 1-6]            | [turn 7]
          '------------- cached, cheap, fast -------------'        new, full price
turn 8:  [system + tools][project context][turns 1-7]            | [turn 8]
```

The rules are simple and strict:

- **It is a prefix match.** One changed token anywhere invalidates everything after it. There is no per-file or per-message cache.
- **Cached input is much cheaper and faster.** On Anthropic's API as of late 2026, reading from the cache costs about a tenth of the normal input price or less, and writing to it costs a premium of 1.25x for the default five-minute lifetime or 2x for one hour. Other providers use different numbers with the same shape. Check the pricing page of yours.
- **Entries expire.** The lifetime is minutes to an hour, refreshed each time the entry is read. After a longer break, the first turn back re-reads the whole conversation at full price.
- **The cache is per model.** Switching models mid-conversation starts from zero.

This explains harness behaviour that otherwise looks odd. Stable content goes first (system prompt, tool definitions) and everything else is appended. When the environment changes mid-session, the harness adds a reminder message at the end instead of editing the system prompt. Skills arrive as appended messages for the same reason.

What it means for you:

| Action mid-session | Effect on the cache (Claude Code, as of late 2026) |
|---|---|
| Switch model | Full re-read of the conversation on the next turn |
| Change effort level | Full re-read on most models; some newer ones keep the cache |
| Connect an MCP server (an external tool connector) whose tools load up front | Full re-read |
| Compact the conversation | Conversation cache rebuilt for the shorter history |
| Invoke a skill, change permission mode, edit a file | Cache kept; new content is appended |
| Come back after lunch | Cache expired; one slow, full-price turn |

So: pick the model and effort at the start of a task, connect the tools you need before you begin, and compact at natural breaks. Other harnesses differ in detail; the prefix rule is the same everywhere.

If you build your own agent, keep the system prompt frozen, serialise tools in a stable order, and put timestamps and per-request values at the end. See [Build your own agent](../03-agents/02-build-your-own-agent.md).

## Model tiers, and picking one per task

Every major provider ships a ladder: a large flagship model, a mid-size general model and a small fast one. Larger models reason better over long, messy tasks and cost more per token. Small models are fast and cheap and fall off sooner on multi-step work.

Two dials, model and effort, give you a grid:

| | High effort | Low effort |
|---|---|---|
| **Largest model** | Hard design, cross-cutting debugging, long autonomous runs | Everyday work when you want good judgment without the wait |
| **Mid-size model** | Well-specified implementation, reviews with clear criteria | Routine edits, test writing, summaries |
| **Small model** | Rarely worth it; move up a tier instead | Classification, extraction, renames, bulk mechanical changes |

Guidelines that hold up in practice:

- **Default to the best model for interactive work.** Your time is the expensive part. Reach for cheaper settings when a task is automated, runs at scale, or is plainly mechanical.
- **Try lower effort before a smaller model.** The largest model at a lower effort level is often good enough, and one model means one cache instead of two. Measure that option before you build a cascade of cheaper models.
- **Compare cost per finished task, not price per token.** A cheap model that reasons at length or needs retries can cost more:

  | | Price per 1M tokens | Tokens used for the task | Cost per task |
  |---|---|---|---|
  | Model A | $1 | 300k | $0.30 |
  | Model B | $5 | 50k | $0.25 |

- **Route per subtask.** A subagent, a separate thread the main agent starts, can run on its own model and effort. A reasonable split for a multi-agent task: the hardest item goes to the largest model at medium effort, routine items to the mid tier at low effort, and mechanical ones to the smallest tier. See [Subagents and multi-agent patterns](../03-agents/03-subagents-and-multi-agent.md).
- **Benchmarks give a baseline, not an answer.** Rankings change every few weeks. Check on your own tasks and avoid a setup that only works with one vendor.
- **Capability thresholds are real.** Multi-agent and long-running workflows that work on current flagship models can fail outright on older or small open-weight models.
- **Do not let a model enforce a privacy boundary.** If some code or data must never reach a hosted model, separate it deterministically: a different tool, machine or network path. An instruction such as "use the local model for private files" is a suggestion the model can route around.

## Common mistakes

- **Treating the model as a database of current facts.** It answers from training data that is months old. Make it look things up: read the lockfile, run the command, fetch the docs.
- **Trusting one run.** A single good output is one sample. For anything that matters, add a deterministic check or run it again.
- **Arguing with a derailed thread.** Earlier wrong tokens keep pulling the continuation. Start fresh with the correction in the first message.
- **Turning effort to maximum everywhere.** You pay in latency and money on tasks that do not benefit. Find the lowest level that passes on real tasks.
- **Switching model or effort mid-task to save money.** The switch discards the cache and re-reads the whole conversation at full price. Decide at the start.
- **Reading a schema-valid response as a correct one.** Shape is enforced, truth is not. Validate values against a source.

## Adopt this

| ID | Practice | Applies to | Effort | First step |
|---|---|---|---|---|
| LLM-1 | Choose model and effort at the start of a task and do not change them mid-session | Workspace | S | Before your next task, set both, then leave them until the task is done or you start a new thread |
| LLM-2 | Make the agent look up version-sensitive facts instead of recalling them | Project, Workspace | S | Add one line to your instruction file: "Check the lockfile or run the tool's help before using a library API or CLI flag" |
| LLM-3 | Restart a thread that went wrong instead of correcting it in place | Workspace | S | Next time an agent repeats a mistake twice, open a new thread and put the correction in the first message |
| LLM-4 | Back every must-hold rule with a deterministic check | Project, Team | M | Pick one rule the agent sometimes breaks and add a test, lint rule or hook that fails when it is broken |
| LLM-5 | Find the lowest effort level that passes on your own tasks | Workspace, Team | M | Take three finished tasks with tests, rerun each at two effort levels, record pass or fail, time and cost |
| LLM-6 | Assign a model tier and effort per kind of subtask | Project, Team | M | Write a three-row table (hard, routine, mechanical) with model and effort, and put it where your orchestrating agent reads it |
| LLM-7 | Track cost per finished task instead of price per token | Team | M | For one week, log tokens and cost per merged change for two model settings and compare |
| LLM-8 | Keep private code away from hosted models with a hard boundary | Project, Team | L | List the repositories or directories that must not leave your network and decide the tool or machine that handles them |

## Resources

- [Let's build the GPT Tokenizer](https://www.youtube.com/watch?v=zduSFxRajkE): a from-scratch walkthrough of tokenization.
- [Tiktokenizer](https://tiktokenizer.vercel.app/): paste text and see tokens, IDs and the chat-format markers.
- [What Is ChatGPT Doing ... and Why Does It Work?](https://writings.stephenwolfram.com/2023/02/what-is-chatgpt-doing-and-why-does-it-work/): an older long read on next-token prediction that is still accurate.
- [Defeating Nondeterminism in LLM Inference](https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/): why the same input can give different output even at temperature zero.
- [Why language models hallucinate](https://openai.com/index/why-language-models-hallucinate/): the incentives behind confident wrong answers.
- [Premise Order Matters in Reasoning with Large Language Models](https://arxiv.org/pdf/2402.08939): evidence that the order of facts changes the result.
- [Prompt caching (Claude API docs)](https://platform.claude.com/docs/en/build-with-claude/prompt-caching): the prefix-match mechanism, lifetimes and pricing.
- [How Claude Code uses prompt caching](https://code.claude.com/docs/en/prompt-caching): which everyday actions keep or invalidate the cache in one harness.
