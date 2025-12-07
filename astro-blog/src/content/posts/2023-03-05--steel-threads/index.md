---
title: Steel threads are a technique that will make you a better engineer
tags: ["software-design", "project-management", "architecture", "feature-flags", "hacker-news", "hackernoon-frontpage", "dzone-featured", "popular"]
cover: thread.jpg
author: Jade Rubick
discussionId: "steel-threads"
description: "Steel Threads are a powerful but obscure software design approach. Learning about Steel Threads will make you a better engineer. You can use them to avoid common problems like integration pain. And you can use them to cut through the complexity of system design."
---

Steel Threads are a powerful but obscure software design approach. Learning about Steel Threads will make you a better engineer. You can use them to avoid common problems like integration pain. And you can use them to cut through the complexity of system design.

<re-img src="thread.jpg"></re-img>

## So obscure it was deleted on Wikipedia in 2013

How unknown are Steel Threads? The concept was [deleted from Wikipedia](https://en.wikipedia.org/w/index.php?title=Special:Log&logid=53361687) in 2013 because “the idea is not notable within Software Engineering, and hasn’t received significant coverage from notable sources.” Let’s add to the coverage, and also talk through why it is such a useful approach.

## What are Steel Threads?

A steel thread is a very thin slice of functionality that threads through a software system. They are called a “thread” because they weave through the various parts of the software system and implement an important use case. They are called “steel” because the thread becomes a solid foundation for later improvements.

**With a Steel Thread approach, you build the thinnest possible version that crosses the boundaries of the system and covers an important use case.**

## Example of conventional, problematic approach

Let’s say you’re building a new service to replace a part of your monolithic codebase. The most common way to do this would be 

1. Look at the old code, and figure out the needs of the new system. 
2. Design and build out the APIs that provide the capabilities you need.
3. Go into the old code, and update references to use the new APIs. Do it behind a feature flag.
4. Cut over using the feature flag.
5. Fix any issues that come up until it’s working, turning off the feature flag if necessary to go back to the old code path.
6. When it’s stable, remove the old code paths.

Sounds reasonable, right? Well, this is the most common way software engineers operate, but this approach has a lot of landmines.

What problems would I expect in this project?

1. It may be appealing to build the new service in a way disconnected from the old system. After all, the design might feel more pure. But you’re also introducing significantly more structural change and you’re making these changes without any integration to the old system. This increases integration pain significantly. My expectation would be that all the estimates for the project are unrealistic. And I’d expect the project to be considered a failure after it is completed, even if the resulting service has a generally good design.
2. I would expect the switchover to the new system to be problematic. There will be a series of problems uncovered as you switch over, that will require switching back to the old code paths or working intensely to fix problems in the final stages of the project.

Both of these things are avoidable, by not having a huge cutover. Note that even cutting over one percent of traffic to the new service with a feature flag is a cutover approach. Why? You’re cutting over all that one percent of traffic to all the changes at the same time. I still would not expect it to go well. You are taking steps that are too large.

## Example using a Steel Thread

Contrast that approach with the Steel Thread way of doing it. 

1. Think about the new system you’re building. Come up with some narrow use cases that represent Steel Threads of the system – they cover useful functionality into the system, but don’t handle all use cases, or are constrained in some ways.
2. Choose a starting use case that is as narrow as possible, that provides some value. For example, you might choose one API that you think would be part of the new service.
3. Build out the new API in a new service.
4. Make it work for just that narrow use case. For any other use case, use the old code path. Get it out to production, into full use. (Tip: you could even do both the new AND old code path, and compare!)
5. Then you gradually add the additional use cases, until you’ve moved all of the functionality you need to, to the new service. Each use case is in production.
6. Once you’re done, you rip out the old code and feature flags. This isn’t risky at all, since you’re already running on the new system.

Isn't this also the "strangler" pattern? Yes, but this can be used for new projects too. Read on for a greenfield example.

## Steel threads avoid integration pain, and give you higher confidence

Integration pain is one of the bigger causes of last minute problems in projects. When you cut over to a new system, you **always** find problems you don’t expect. You should be suspicious of anything that involves a cut-over. Do things in small increments. Steel Threads integrate from the beginning, so you never have a lot of integration pain to wade through. Instead, you have small integration pain, all along the way.

Also, your service never needs to be tested before it goes live, because you’ve tested it incrementally, along the way. You know it can handle production loads. You’ve already added network latency, so you know the implications of that. All the surprises are moved forward, and handled incrementally, as just part of the way you gradually roll out the service.

The important thing is that you have a working, integrated system, and as you work on it, you keep it working. And you flesh it out over time.

## Steel threads can help cut through complexity

When you’re designing a system, you have a LOT of complexity. Building a set of requirements for the new system can be a challenging endeavor.

When using a Steel Thread approach, you choose some of the core requirements and phrase them in a way that cuts through the layers of the system, and exercises your design. It provides a sort of skeletal structure for the whole system. The implementation of that Steel Thread then becomes the bones upon which further requirements can be built.

Thus, Steel Threads are a [subset of the requirements](https://www.cs.du.edu/~snarayan/sada/docs/steelthreads.pdf) of a system. 

## Steel threads can be used on greenfield work as well

Let’s say you’re implementing a clone of Slack. Your initial Steel Thread might be something like:

“Any unauthenticated person can post a message in a hardcoded #general room in a hardcoded account. Messages persist through page refreshes.”

Note how limited this initial Steel Thread is. It doesn’t handle authentication, users, or accounts. It does handle writing messages, and persisting them.

Your second Steel Thread can move the system towards being more useful. You could, for example, have a Steel Thread that allows the message poster to choose the name they post under. 

This second Steel Thread hasn’t actually done much. You still don’t have authentication, accounts, or even a concept of a user. But you have made a chat room that works enough that you can start using it.

Also note that you haven't pulled the Steel Thread through every portion of the system. But you have stubbed out the concepts of users and accounts.

## Steel Threads provide early feedback

Note that in this Slack clone example, you can get early feedback on the system you’re building, even though you haven’t built that much yet. This is another powerful reason for using Steel Threads. 

After just those two Steel Threads, your team could start using the chat room full time. Think about how much your team will learn from using your system. It’s a working system. 

Compare that to what you would have learned building out the User and Account systems, and hooking everything up, and finally building out a chat room. 

## Start with Steel Threads

Steel Threads are often a good place to start when designing your projects. They create a skeleton for the rest of the work to come. They nail down the core parts of the system so that there are natural places to flesh out.

I encourage you to try a Steel Threaded approach. I think you’ll find it can transform your projects. Let me know your experiences with it!

## Steel Threads relation to other patterns

Steel threads are also referred to as [Tracer Bullets](https://wiki.c2.com/?TracerBullets), especially when doing it for new work. They have also been referred to as a [Walking Skeleton](https://wiki.c2.com/?WalkingSkeleton) approach. When used with migration projects, the pattern is referred to as a [Strangler Fig Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig). 

Steel threads are closely related to vertical slices. I describe the concept in my post on [Milestones](/milestones-not-projects/?utm_source=website-steel-threads&utm_medium=link&utm_campaign=steel-threads). 

Steel Threads are a software design technique that result in delivering your software in vertical slices. The term tends to be used to describe the initial vertical slices of a system. They’re closely related concepts, but not completely the same.

## Thank you

Image by <a href="https://pixabay.com/users/steenjepsen-1490089/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=1232723">Steen Jepsen</a> from <a href="https://pixabay.com//?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=1232723">Pixabay</a>