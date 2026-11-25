# Prompt: read the playbook with your agent

Use this when you want to **read the playbook like a book**, from the first chapter, with your agent as the guide. It works in any session; no project is needed.

There is nothing to fill in. Paste the prompt as it is. The agent shows you the table of contents, asks what you already know, then takes you through one chapter at a time and waits for you after each one.

## The prompt

```text
I want to read the BS31-Agents playbook with you like a book, starting at the
beginning. The playbook is at
https://github.com/BorislavStefanov31/bs31-agents
If it is not already cloned on this machine, clone it into a temporary folder and
read it from there.

HOW WE START
1. Read the playbook's README section "What is in the playbook" and show me
   the table of contents: the six parts and their chapters, one line each.
2. Ask me two questions and wait for my answers:
   - how much I already know about coding agents (new to them / I use one
     every day / I build my own tools and agents);
   - whether I want every chapter in order, or one of the reading paths the
     README suggests.
3. Then open the first chapter of my choice. If I do not choose, start with
   chapter 1.1.

HOW WE READ EACH CHAPTER
- Read the whole chapter file yourself before you say anything about it.
- Start your reply with where we are, for example "1.2 Context engineering
  (2 of 25)".
- Teach me the chapter in your own words, in about one screen: the main idea
  in two sentences, the three to five points that matter most, and one
  concrete example. Explain any term the first time it appears.
- Do not paste long passages. If a section deserves the full text, name it so
  I can open it.
- From the chapter's "Adopt this" table, name the one practice that is easiest
  to try today, with its first step.
- End with one question: either a check that I understood, or how this would
  apply to my own work.

THE PACE
- Stop after every chapter and wait for me. I will say "next", ask questions,
  say "skip", or name a chapter to jump to. Never go on to another chapter by
  yourself.
- Adjust to my answers: if I clearly know the topic, shorten it; if I am lost,
  slow down and give a second example.
- At the end of each part, give me a five-line recap of the part and ask
  whether to continue with the next one.
- If I come back later and say "continue from 3.2", pick up there without
  starting over.

This is reading only. Change no files and run nothing in my projects; cloning
the playbook into a temporary folder is the one exception.
```

## Follow-ups that work well

- `Next.`
- `Before we go on: how would this chapter apply to the project I am working on? Look at the repository first.`
- `Skip to part 4.`
- `Quiz me on the last three chapters with five short questions.`
- `We have finished part 2. Now run the workspace audit from prompts/audit-my-workspace.md.`

## Why the prompt is shaped this way

- **One chapter at a time, and the agent waits.** A summary of the whole playbook in one reply teaches nothing. Stopping after each chapter keeps the pace yours.
- **It asks what you already know.** The same chapter should be three lines for someone who lives in a coding agent and a full screen for someone who has only used chat.
- **It teaches in its own words and points at the source.** You get an explanation instead of a copy, and you know which section to open when you want the detail.
- **It ends each chapter with something to do and a question.** One practice to try today turns reading into a change, and a question shows both of you whether the idea landed.
- **It says where you are.** A position line at the top of every reply makes it easy to stop and come back.
