---
title: Some AI surprises in late 2025
tags: ["communication","meetings"]
cover: lake.png
author: Jade Rubick
discussionId: "ai-notes-2025-09"
description: "Jade shares some observations of things he is seeing that seem unusual or aren't being talked about"
---

Things are changing pretty rapidly, so I have hesitated to write down observations that I know will get out of date quickly. But I have observed a few things I haven't seen widely discussed, so I'll risk it.

<re-img src="lake.png"></re-img>

## Slack could be your new data lake

We use data lakes to drive charts and analytics. We dump all of our company data in these lakes, and find a lot of useful ways to make better decisions with that data.

I'm really not sure if this observation holds water (let me know what you think), but it's possible that Slack will be the data lake for LLMs. It has a million integrations that allow you to feed valuable context into channels in Slack. LLMS are language models, and can use text in a lot of interesting ways, especially when augmented by tooling that supports selecting the right content.

This is a much better user interface for a data lake, because you can ask your company questions, and get summaries and responses back that are in your own language. And you get references to the source.

So my suggestion here is to not sleep on the summarization and AI features of Slack, and to really think about the consequences of having all your meeting summaries piped to Slack. All the work being done piped to Slack. Status updates, and discussions, summaries of decisions. You might want to enable a lot more integrations than you do now.

It's too soon to know how real this will be, but anecdotally, I've heard of one company that eliminated a significant amount of meetings. Most were information sharing meetings.

This doesn't feel like the right solution, and it may be a bad approach. But I think it's *interesting*. It kind of shows a directional way that communication and companies might change in the short future.

Interestingly, I think remote companies might be better positioned to capitalize on this that in person companies.

Think of all of us as beings, engaged in communication. Making decisions, and creating things. LLMs become a part of that ecosystem of communication. If most everything that is said within a company is written down, then we get some really weird properties of being able to be summarize, process, and interact with a much wider pool of information than we did in the past. In the same way that augmented reality is a hybrid of the computer world and the real world, LLMs could weave their way into the fabric of our communication within companies.

Your ability to sense your own company goes up significantly. Product managers probably have a very different role, because their ability to sense and integrate information in their companies is augmented. It all becomes "on demand". 

I'm sure this will be terrible in some ways, but it will also be quite powerful in other ways. I'm particularly curious about how we'll deal with privacy.

My guess is that this will ripple through our communication patterns in companies for the next couple of decades.

## Targeted status updates

I view status updates as a form of "compression". You take a complex state of a situation, reduce the information to the minimum amount you can communicate that gives the most essential information, and reduce the amount of complexity that other parts of the company have to engage with.

Status updates have typically been a difficult problem. Humans are pretty bad at status updates. It is a skill that takes a while to teach, and a while to learn to do well.

And it turns out LLMs are pretty good at status updates nowadays. In my current interim role, I write a weekly update to the CEO and a few stakeholders. Typically what I do is make a list of information sources (including slack summaries, metrics I care about with a few sentences of commentary, and meeting summaries), dump them into an LLM, and give it a good prompt, and voila, I have a pretty decent first draft. I had someone tell me they found my weekly updates intimidatingly impressive. (When they found out my method, I think they were relieved). It was doing a much better job that I would have. Or rather, it gave me a better ability to do a good job with it, because the first draft wasn't something I could have sent, but it gave me a better starting place than I would have had on my own. And it takes less time.

What I like about this I can also craft the prompt to my audience. I might emphasize delivery and quality to the CEO. I might emphasis cost implications and efficiency to the CFO. If I wanted to I could pretty easily craft a different version targeted to what each of my stakeholders cares about.

I do have to edit these drafts. Sometimes they're inaccurate or don't mention what I care the most about. Or they can be overly bland. But to be honest, they usually mention a lot that I would forget, or they emphasize the content more concisely than I do. 

I can see status updates becoming more automated over time. Ideally, that would lead to people spending more time on planning and execution.

## Automated verification is your accelerator

Standard XP and CI/CD practices are becoming even more high leverage. Investing in automated verification seems like the smart bet in 2025.

If your agent can get better context, or test its results as it works, it can keep going on a problem, or self-correct. It seems like this will be the thing that drives a lot of the productivity gains over the next year.

Developer workflows are even more essential: reducing unnecessary code review steps, improved linting, unit tests, integration tests, end to end tests. Synthetic monitoring, observability tooling.

## The cost of evergreen

One thing that has surprised me about coding agents is that they're often pretty good at upgrading things. I've seen a number of times where upgrades are just much less expensive to make than they were in the past. I've even seen some pretty surprising examples of LLMs doing some tricky things during upgrades that I didn't expect.

So the calculous of how expensive software is to maintain is changing. This could result in a lot of legacy software being revitalized.


## Thank you

Image by <a href="https://pixabay.com/users/rubinogiuseppebiancavilla-30701207/?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=8533675">Pippontis Giuseppe Rubens Rubino</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=8533675">Pixabay</a>
