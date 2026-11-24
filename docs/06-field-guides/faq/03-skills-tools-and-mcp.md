# FAQ: Skills, tools and MCP

### Will skills still matter when models get smarter?

Yes, because skills do not exist to patch missing capability. The model is generic. A skill (a folder of instructions the agent loads on demand) carries what cannot be in its training data: how your team wants this done, in your repository, with your conventions and tools.

Well-built harnesses ship their own internal skills for using their tools. That is one reason two products with the same connectors behave differently: each vendor has encoded its own view of how the work should go.

What does change as models improve: a skill that explains how to do something the model now does well becomes dead weight, and can make results worse. Keep the skills that encode preference and process. Re-test, then trim or delete, the ones that were compensating for an old weakness.

See: [Skills](../../02-workspace/02-skills.md)

### Should I install popular skill packs?

Read them, then install very little. A published skill collection is best used as a reference for how someone else works. Take the two or three ideas that fit, rewrite them shorter in your own words, and fold them into skills you already have. That keeps the count low and the descriptions accurate, which matters because every installed skill adds to what the agent must weigh at the start of a session.

There is a second reason. A workflow you assembled and understand will serve you better than a stronger one you were handed and cannot debug. When an adopted skill misfires, you need to know which sentence caused it. With your own, you do.

See: [Skills](../../02-workspace/02-skills.md)

### Where should shared skills and rules live so every teammate and every harness gets them?

In the repository, when they are about the project. Anyone who clones it gets them, and they are reviewed like code. Most harnesses use near-identical formats for instruction files and skills, so supporting two tools means keeping the same content in two folders, not maintaining two systems.

Keep everything that is not project-specific out of mandatory configuration. A good model is an editor's "recommended extensions" file: the repo suggests, the developer decides. A bad model is the locked-down corporate browser. If you want people to adopt a plugin or a skill set, make the case for it and make it the easiest path.

Hard rules ("never do X in this module") belong in CI and in code review, where they are checked, more than in the instructions an agent reads during daily work.

See: [Portable agent config](../../05-autonomy/02-portable-agent-config.md)

### When should a skill become a program?

As soon as part of it is the same on every run. A skill makes the agent redo the work by reasoning each time. That is slow, costs tokens and varies between runs, and the agent will never complain about it. Writing "do it this way" also stops the agent from automating the routine on its own.

Review each skill and move the fixed parts into code: fetching, parsing, formatting, scheduling, validation. Keep the model for the parts that need judgement.

Two habits help:

- After a task, ask the agent what was awkward. If the answer is "I worked out the API by trial and error", have it write a tool with usage notes, not a paragraph of advice.
- Put rules inside the tool. A tool that rejects bad input enforces a preference. A sentence in a prompt only suggests it.

See: [Skills](../../02-workspace/02-skills.md)

### Why use MCP when a CLI does the job?

For one developer doing coding tasks, a CLI the agent calls from the shell is often enough. That is where the early scepticism about MCP came from, and for that case it was fair.

MCP pays off when agents move beyond coding and have to reach many business applications on behalf of many people. Then a shared protocol for connecting any client to any service is worth more than a pile of local scripts. The specification has also matured. As of late 2026 it supports deployments beyond one client talking to one local server, and features beyond tool calls, such as elicitation (the server asks the user for input mid-operation) and tasks (long-running work).

Rule of thumb: a CLI for developer tooling on your own machine, MCP when a capability must be shared across harnesses, people or non-coding agents.

See: [Tools and MCP](../../02-workspace/04-tools-and-mcp.md)

### My skills and MCP servers eat a big share of the context before I type anything. What scales better?

Stop preloading descriptions. Give the agent two things: a search tool over your capabilities, and a way to run code that calls them.

The agent searches for what the task needs and finds small code packages, one per integration or routine. It writes a short script that imports and combines them, and sends the script to a sandbox that runs it. Only the result returns to the context. The catalogue can then grow without limit, because nothing in it costs tokens until it is found, and chaining three services is one script, not three round trips through the model.

You can build this as a folder of scripts with a search index, or use a hosted product designed around the pattern. The two hard parts are credentials (the agent should name a secret, never see it) and sharing the catalogue with teammates.

See: [Tools and MCP](../../02-workspace/04-tools-and-mcp.md)
