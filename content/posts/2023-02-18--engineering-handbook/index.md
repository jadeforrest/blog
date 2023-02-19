---
title: Your process should be open source
tags: ["company-culture", "scaling", "information-flow", "onboarding", "remote-work", "process", "engineering-handbook"]
cover: umbrellas.jpg
author: Jade Rubick
discussionId: "open-source-process"
description: "Engineering handbooks can be done in an open-source manner, which allows process to adapt quickly to the needs of an organization."
---

Process: a series of actions or events performed to make something or achieve a particular result – Cambridge English Dictionary

<re-img src="umbrellas.jpg"></re-img>

Today, we delve into the great debate about Process. Is Process the solution to the chaos in organizations? A way of applying good discipline and operations to make stuff happen? Or is Process itself the problem, adding overhead and getting in the way of people doing their best work? 

I’ll argue there is a way to manage Process that preserves its benefits, while eliminating most of its downsides. It’s probably something you’ve never seen before. And I’ll describe how to roll it out, what the rules are for operating in in this way, and some of the surprising benefits.

## Process is how we work together

The first thing to realize about Process is that it exists already, whether you acknowledge it or not. Process is the way we work together. 

Process can be explicit and written down. Or it can be implicit, something people understand just because they’re used to working in a particular way as a team. 

Process can be something a group of people are aligned on. They all agree how things work. Or it can be something that people don’t really agree about. They may have different ideas of how things get done.

Because Process is a part of humans working in groups, it’s nonsensical to be opposed to Process. That doesn’t stop people from trying! But the real question is _how_ you shape and define the way we work together. 

## Process can be problematic

Most of the opposition to Process comes from people’s bad experiences with it. This is natural. Process is a bit like code – without attention, Process can degrade and cause problems.

The challenge with Process is that it has a life of its own.

For example, let’s say a software engineering team is only focusing on new work, and not doing any work on bugs that are coming in from the support team. 

Ignoring that you should probably look deeper into why this is happening, and let’s pretend we’re just going to make a process response to this problem. You could:

* Have the engineering manager and product manager decide to schedule some bugs every sprint.
* Decide that the team will have the on-call person do bugs for the week they’re on call. 
* Add an SLA around bugs.

Whatever you decide, you’re seeing a problem, and you’re changing the team’s behavior to try and address that problem in the future. This is Process work. 

So let’s say you decide that the engineering manager and product manager will meet with their support liaison once a week and prioritize the most important bugs each week. You set up the meeting, and it starts happening every week.

The problem is that two years later, the problem might evolve. And the people who created that Process may not even be there. So the people involved in that meeting two years later may not understand the problems the meeting was intended to solve.

This uncertainty about the origins of Process can make people reluctant to change things. This is particularly true if the Process is important or around something that seems dangerous. So Process can take on a life of its own, where it operates as a sort of zombie. And people follow it because they have to, even if it is bad or harmful.

Again, this is like legacy code. It works, but anytime you touch it, there is a danger that you’re going to cause other problems. So mostly people try to avoid touching it.

## What if Process were fluid and dynamic?

What would ideal Process look like?

* It would feel fluid and dynamic. Easy to adapt to the needs of the organization.
* It would embed good context inside of it. This would make changes easier to make.
* It would be clear, concise, and up to date.
* It would be the source of truth, so you could rely on it.

## Treat your Process like code

In short, good Process is a bit like good code:

* It can be updated easily.
* You have version control. You have good historical information to see how it has changed over time.
* The cost of change is minimized. 
* You have good context that allows you to see why the process exists and what it’s trying to do. 
* The process is what describes how things work.

## Solution: open source process

So how do you get flexible Process, that can adjust to the changing needs of your organization? 

The best solution I’ve found is to open source your process. Write down your process, and allow anyone to suggest changes. Tell everyone they can change the way the company runs. 

While this can be a lot of work, it can also be immensely clarifying. And it can feel empowering to be able to say: the way we work together is written down. And anyone can make changes to it. 

## Advantages of a written culture

Writing down your process is a core practice for an organization with a written culture. And there are a number of advantages to writing things down:

* Writing is clearer thinking. It requires precision. It provides clarity.
* Writing is asynchronous and always available. Writing is more scalable, because it doesn’t require meeting to share information.
* Writing is thus better for distributed teams. 

The primary disadvantage is that documentation requires effort to maintain. 

## How to open source your process: an engineering handbook

So how does one go about building a written culture, and create a flexible, maintainable process for an organization?

You create an engineering handbook. It is a repository of how things work in your organization. It represents your process documentation.

I’ve done this numerous times. Here’s the general steps I recommend.

### 1. Choose a format for your engineering handbook

The first challenge you’ll have is to figure out where to keep your process documentation. I’ve never found anything that works perfectly. I have a separate post which shares my [notes on which tools to use for employee handbooks](/engineering-handbook-tools/). The important step is to choose something. You can change your mind later.

### 2. Bootstrap the content

The next thing to do is to start filling in content. Anytime you encounter a process, write it up, even briefly. Describe how things currently work.

This works especially well as you join an organization. You can use these writeups to clarify how things work. You can even show your writeups to people and ask them if it is correct. 

I might do this for a couple of months before proceeding to roll it out further. As I make organizational changes, I will document them, and have a before and after section. After I make the change, I’ll put the before section into a history part of the doc, so people can see how our process is evolving over time.

Often you’ll find that there are previous versions of process docs that are sitting around somewhere. They might be incomplete, or unmaintained. But they can shortcut a lot of this process. Organize them and start maintaining them. 

Having enough content to interact with is important. It shows that there is momentum behind the practice, and that it will be taken seriously. This allows people to invest their own time in it.

### 3. Choose a maintainer: it’s probably you

You will need someone who makes sure these process docs are taken seriously. That they’re updated and organized. You can enlist help, but ultimately it needs someone to be invested in them. This might not be something you can easily delegate.

Ideally, it’s something that all management takes seriously, and you can model it but have a larger group of people helping out. 

### 4. Communicate how it all works, and roll out the changes

The next step is to roll it out. If you’ve been bootstrapping the content, it may not be a surprise to the whole organization that you’re rolling it out. Some people might have already seen it before. 

What I’ve typically done is to talk about the reasons why we’re emphasizing a written culture, and then share the rules we’re following to ensure we keep our process docs up to date (more on that in a second). And then I try to share how anyone can improve the way the organization works, and describe how that works. This can be an exciting, empowering thing for the team. 

## Rules for process

So what are the rules for process documentation? Here are the things I like to share.

### 1. Reply with documentation

The first thing I like to share is the concept of replying with documentation. I’ll usually share it with the whole engineering team, in an All Engineering meeting, or in a newsletter to the organization. And I’ll try to model it myself. What is “replying with documentation”?

When someone asks you a question, ideally you want to reply with a URL that answers that question. You do this by going to the wiki, making sure the answer isn’t there, and adding it if it isn’t. Then you send them the URL.

This does a couple of things:

1. It ensures that the question can be answered in the future without you having to reply to it.
2. It trains the person asking where they can find answers to future questions. 

Replying with documentation is putting a caching layer in front of all the questions people might ask you. It makes your expertise more widely available.

For the organization, the impact of Replying with Documentation is that you are future proofing your answers. Instead of answering the question a million times, you’re ensuring it only needs to be answered once. You’re systematically solving problems rather than just doing a one-off.

### 2. It’s not official until it’s in the handbook

The next rule is something I repeat over and over to the management team. It’s not official until you put it in the handbook. Whenever a manager is making a change, or rolling out a plan, I say the plan needs to include a URL. 

* Is the team moving to two week sprints? That should be in the handbook.
* Is someone moving to a different team? There should be a list of people on that team, in the handbook.

This rule is important because otherwise, the handbook is not the source of truth. People can’t rely on it to be accurate. This degrades trust in the handbook, and makes it a less useful source of information. But adding this constraint makes what is in the handbook the truth. It’s a completely necessary rule if you care about keeping your process docs up to date.

### 3. Editing a process document isn’t sufficient to make a change

A third rule I share is that you can’t make people do something just by editing a document. That’s not how humans work. But you need this rule as otherwise, many people will attempt it.

You will need a page that describes how changes work. I usually call it something like “How to change the way we work”. It describes:

* Who the maintainer of the handbook is.
* That anyone can make changes. 
* That you can’t dictate how things work just by editing things in the wiki. You have to communicate and get buy-in from the appropriate people. But that improvements are encouraged, and process should be fluid.
* That the hierarchy of power is still in existence. Anyone can make improvements, but ultimately the VP of Engineering is delegating these decisions to the whole organization.

You will also need to describe the rules for approval and change. I’ve done things through a full approval process, and I’ve done things in a wiki, where anyone can make changes. When you do things in the wiki, it can be good to monitor the changes periodically, to make sure inappropriate changes aren’t introduced. I also would generate release notes periodically, so people knew what had changed in the way we operated over time.

### 4. Process should include context and history

You’ll probably want some sort of a template for your process pages, which explicitly includes a section for context and history. This can feel like extra overhead. But it’s helpful. You can explicitly call out the situation that warranted the process you’re implementing. And you can sometimes even mention when it won’t be useful any more, or when you might want to rethink this way of doing things.

Adding history can help people understand the changes that have been made over time. And the context can help people understand how to shape future changes.

## Take it to the next level: make it public

If you’ve rolled out your Engineering Handbook, and it’s been successful, you might consider taking it to the next level: and opening it up to the whole world to see.

This is a radical step, and probably not a fit at a lot of companies. And it may be difficult to get people on board with the idea. But it does have some advantages:

* You’re marketing your organization to the rest of the world. It can attract candidates, who see how well your organization is run, and the principles by which you’re organized.
* Having a public audience will automatically result in a higher quality of process. Wouldn’t you do a better writeup of your team’s process if the whole world could see it?
* Having your process in the open will also help others learn from you.

The company most notable for doing this is Gitlab. The [Gitlab handbook](https://about.gitlab.com/handbook/) is the operating manual for the company, and it’s quite well done. 

## Thank you

[Bjorn Freeman-Benson](https://www.linkedin.com/in/bjornfreemanbenson/) came up with the idea of and practice of putting the New Relic process in Github.

[Rebecca Campbell](https://www.linkedin.com/in/rebecca--campbell/) was my partner in crime for a few years with the New Relic process docs. I learned lots from our time maintaining the process docs there.

[Alex Kroman](https://www.linkedin.com/in/alexkroman/) asked me to write the New Relic engineering handbook, which was essentially our book on how we did product development. It included our practices, roles, and standards. 

[Gabriel Ricard](https://www.linkedin.com/in/gabrielricard/) introduced me to the idea of Replying with Documentation.

Image by <a href="https://pixabay.com/users/pexels-2286921/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=1281751">Pexels</a> from <a href="https://pixabay.com//?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=1281751">Pixabay</a>