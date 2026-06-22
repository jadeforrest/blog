---
title: AI coding
icon: 🤖
description: AI-powered development tools, workflows, and best practices for augmented coding with Claude Code, Cursor, and other AI assistants.
---

## Monitoring the situation

* A good way to stay abreast of AI tooling: [Rands Leadership Slack #ai-coding-tools](https://randsinrepose.com/welcome-to-rands-leadership-slack/)

## Background info

* [Claude Code tutorials](https://www.youtube.com/@anthropic-ai/streams)
* [Claude Code best practices](https://www.anthropic.com/engineering/claude-code-best-practices)

## Workflow

* Document driven (need link)
* [An iterative approach that makes your genie less insane over time](https://ghuntley.com/stdlib/) Stdlib from Ghuntley (Cursor). No longer available to nonsubscribers, but the basic idea is to pay attention to your workflow each time, instead of just banging your head against the wall.
* [A structured approach to coding](https://www.youtube.com/watch?v=fD4ktSkNCw4&t=1701s) by Ryan Carson. For Cursor but generally relevant.
* [Kent Beck described a TDD and tidy first](https://tidyfirst.substack.com/p/augmented-coding-beyond-the-vibes) approach he calls augmented coding. 
* [Vibe engineering](https://simonwillison.net/2025/Oct/7/vibe-engineering/) describes patterns for those who are building high quality code quickly with AI.
* [Why AI swarms can't build architecture](https://jsulmont.github.io/swarms-ai/) and [what to do about that](https://jsulmont.github.io/swarms-ai/part2).
* Consider using [ast-grep](https://ast-grep.github.io) for larger codebases (and also this tool looks amazing).
* Potential tooling for reducing duplication in code: [jscpd](https://github.com/kucherenko/jscpd), [pylint](https://pypi.org/project/pylint/) for Python, [dupl](https://github.com/mibk/dupl) for Go.

## How automated can you get?

* [Humans ON the loop](https://martinfowler.com/articles/exploring-gen-ai/humans-and-agents.html) Articulates a lot of the direction my thinking has been going around where a lot of engineering focus will probably be. **Must read**.
* Pairs nicely with Lethain's [What can agents do](https://lethain.com/what-can-agents-do/) which describes some of the nuts and bolts of what it takes to have an internal agent you have to support.
* [Stripe's Minions](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents) show a workflow for creating pull requests in a large codebase, triggered by Slack. [Part 2](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents-part-2) goes into some detail of how it works. Most interesting part is the orchestration and how it separates deterministic and LLM based approaches. It's a mostly one-shot approach, and suffers a bit because of that. But very interesting!
* [How to kill code review](https://www.latent.space/p/reviews-dead) from Ankit Jain, founder of Aviator. Argues code review isn't sustainable any more, and we have to start developing approaches like BDD and deterministic verification.
* [Intercom on AI approval of PRs](https://www.intercom.com/blog/ai-is-approving-our-pull-requests-heres-how-we-made-it-safe/). 19% of PRs approved by AI. Note I think their metrics are bogus, since of course the easiest and safest PRs will be reviewed by AI. Some nice approaches to how they did it, however.
* [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html). Describes some useful concepts for understanding how to engineer more reliably with coding agents.
* [Dark factories](https://www.danshapiro.com/blog/2026/01/the-five-levels-from-spicy-autocomplete-to-the-software-factory/) this post is mostly alright but the point I found useful is the concept of "dark factories", factories where you are not designing for people but machines.
* [Ratchets and linting](https://forestwalk.ai/blog/test-coverage-wont-save-you-from-incoherence/) as a tool for increasing the amount of quality in automated codebases.

## Maintenance

* [You need AI that reduces maintenance costs](https://www.jamesshore.com/v2/blog/2026/you-need-ai-that-reduces-your-maintenance-costs) shows the numbers.

## Adoption

* [The Gap Through Which We Praise the Machine](https://ferd.ca/the-gap-through-which-we-praise-the-machine.html) on usability issues in agent coding, and why some people seem to be doing well and others aren't.
* [Nobody codes here anymore](https://open.substack.com/pub/ghiculescu/p/nobody-codes-here-anymore?r=8j0ru) A case study on adoption

## Drinking coolaid

* [Revenge of the Junior Developer](https://sourcegraph.com/blog/revenge-of-the-junior-developer) - Steve Yegge (who has a vested interest in this) lays out his vision of where this is going: agents, agent fleets, etc. March 2025.

## AI topics

Should probably have its own page
* [How AI agents software fits into companies](https://lethain.com/what-can-agents-do/)
* [Double standard for women using AI](https://www.linkedin.com/posts/lpeate_the-most-interesting-ai-paper-ive-read-in-activity-7368796283416793092-36WR?utm_medium=ios_app&rcm=ACoAAABlKc0BaeEYgJ_9P6NkNW6WS3BVMP2QmzA)

## AI tooling

* See also [AI tooling wiki page](/wiki/tools/ai/)
