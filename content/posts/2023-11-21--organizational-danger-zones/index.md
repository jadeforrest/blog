---
title: Organizational danger zones
tags: ["scaling", "delivery", "complexity", "org-design"]
cover: danger.jpg
author: Jade Rubick
discussionId: "org-danger-zones"
description: "Organizations have two danger zones they go through as they grow. I describe when they happen, what to watch out for, and how to solve them."
---

I've noticed two **danger zones** that organizations run into. Today I'll describe these two danger zones, and give some advice for navigating them.

<re-img src="danger.jpg"></re-img>

I'll talk about this for engineering organizations. But I suspect it's applicable to any group of humans working at these scales. 

## Why are these danger zones important?

I've seen several companies waste years getting trapped in these danger zones. That time is precious for a startup, and can result in the business failing. 

I've seen people that are smarter than me get into these traps over and over. I believe the reason for that is that these are structural problems. Solving them requires some deep refactoring of your organization, and most people haven't done this type of work before. So, they fail, and their company and employees suffer.

The growth traps in these danger zones interact with other leadership and organizational problems in harmful ways. For example, if you have a leadership team that tends to micromanage, these growth traps will make it worse. Or if you have a lack of leadership alignment, that will be more prominent. So the traps in these danger zones have a disproportionate impact.


## Why listen to me on this?

I have both breadth and depth of experience in these danger zones. At New Relic, we had an experienced leader who helped us navigate the first danger zone. But I saw areas where we struggled, and was involved throughout the process. I spent years grappling with the second danger zone at New Relic. It was the most critical deficiency in our engineering organization for years. It was something we continuously grappled with. We worked with Jim Shore, author of The Art of Agile Development, to successfully address it. I was part of the team that fixed it, and it shaped my thinking about the patterns behind how groups of humans can operate at increasingly larger scales. It became a major theme in my leadership work ever since. 

I've since worked at almost twenty-five startups, and any of them that have grown through the danger zones have run into these same growth traps. I've focused a lot of my consulting practice on helping organizations get through these traps and avoid much of the suffering you would expect.


## Danger zone #1: The team trap

The first of these two danger zones is what I call the “team trap”. It generally happens sometime between ten and twenty people. 

You start with a co-founder or leader that is in charge of engineering. The engineers all report to this person. There are lots of projects going on, and they get busier and busier as the team grows. Often, you'll have each individual focusing on their own project! 

Because the team is small enough, everyone has a pretty decent sense of what is going on. You know what projects are being worked on, and how things are progressing. Priorities are fairly clear, and communication is uncomplicated. Usually it all happens in one place, with everyone reading everything or in the same room. Communication is many to many. The future is bright.


## What happens with the team trap

As the team grows, however, things start to break down. The leader works longer and longer hours. Yet, it seems harder and harder to get work done, and execution and quality seem to be slipping. Communication seems muddled, and you hear more people wondering about priorities or what the strategy is.

This is the Team Trap. You're heading towards failure, and unless you reshape things, it will get worse and worse!


## Why it's hard to fix the team trap

You will face a few obstacles to make the right changes. First of all, the founders and early people are often really smart, incredibly dedicated people. They will work harder and harder, and try to brute force themselves through the Team Trap. That won't work – it will only delay the solution.

Second, some of the solutions to the Team Trap will feel like bureaucracy to the founders and early people in the company. They'll resist the changes because they want to preserve the way the company felt early on – everything could happen quickly and effortlessly. They will often have an aversion to the changes they might need to make.


## What to do about the team trap

The changes you typically need to make at this phase are structural changes:



* You need to set up cross-functional teams with ownership. This is a hard thing to do well, and if done incorrectly, can actually make everything worse! I advise you to read [Team Topologies](/management-books/), and to [get help with this](/about/). You can also try an alternative approach: [FAST agile collectives](/fast-agile/). 
* You'll need to start thinking about your organization's design. You may need managers. But you may need a [different type of manager](/engineering-manager-vs-tech-lead/) than you think. You'll need to think about how to design your meetings. You may need some lightweight role definition. Ultimately, someone has to start thinking about the way your organization is structured, and how all the pieces will fit together. 
* Part of this organizational design is to also think through your communication design. You probably want to start segmenting communication, so that people know what they need to, but aren't flooded with a lot of information they don't need. 

There is a balance to this. You don't want to overtilt towards structure, but you also don't want to avoid necessary structure.

All of this is pretty hard, and I've built a business helping engineering organizations with this (so definitely [reach out](/about/) if you need help with it, or find someone else to help you).


## Why does the team trap happen?

Incidentally, I believe the reason this seems to happen at between ten and twenty engineers is because that's when one person can no longer reasonably manage everyone in engineering. You have to start to split the world. And once you do that, it forces a lot of other changes to happen at the same time.

It's a little like when you have a web server that is delivering content over the internet. As soon as you want a second server for redundancy or scaling reasons, all the sudden, you need a lot more in place to make things work. You may need a load balancer. You may need to think about state and caching, since it is done independently for each server. All of these concerns happen at the same time. 

If you're successful in your design, you'll have a structure that will take you pretty far. Your teams will be autonomously creating value for the company. And things should go pretty well, until you hit the second danger zone.


## Danger zone #2: The cross-team project trap

The next trap is with how teams work with each other. You reach a level of complexity where the primary challenge for your organization is how to ensure that anything that crosses team boundaries can be successful. 

As the number of teams grows, each of them delivers value. But they aren't perfect encapsulations of delivery. Teams need things from each other. And as your product grows, you'll need things from multiple teams.

The themes for this stage are coordination and dependencies. How do you get teams to coordinate, to deliver something bigger than themselves? And how do you deal with the fact that dependencies often aren't reasonable? How do you sort through those dependencies, and minimize them?

The cross-team project danger zone occurs somewhere after about forty people. I often see it happen between forty and sixty people in an organization. At New Relic, we tried valiantly to fix cross-team projects, but we didn't really succeed until we worked with Jim Shore, and at that time there were probably 200 engineers in the organization. It was long overdue. 

As an aside: It's plausible that our failure to address this earlier was instrumental in Datadog's ascendance. Why? We were much less effective in engineering at the time, and this slowed our ability to succeed in the enterprise market. Most of the bigger projects were enterprise features. Our focus on growing into the enterprise distracted us from Datadog's rise, and prevented us from addressing shifts in the way developers were working with microservices. It's possible that handling this earlier could have resulted in a completely different outcome, though there were a lot of factors involved.


## What happens with the cross-team project trap

To understand the cross-team project trap, consider a couple of examples.

First, you may want to do some work that affects many teams. For example, let's say your customers are asking for role-based access controls. This is work that many teams will need to focus on. Yet the enabling work might be done by one team. This can require coordination.

Another need you'll see increasingly is that multiple teams need similar functionality. They might both want a similar table user interface. Or they might both require a similar API. Or they might depend on similar data. This type of work tends to require teams to depend on other teams to do work for them. This is a growth in dependencies. 

At some point, coordination and dependencies grow to become your most serious obstacle to delivery. 

You'll know you're in this second danger zone if you see some of these symptoms:

* There is a lack of confidence from the rest of the company that engineering can deliver large, important initiatives. The general track record is that engineering ships late, if at all.
* You see lots of heroic effort to deliver anything that crosses team boundaries. 
* You may have a few people who are unusually good program managers, but even they have failures. You might see opposing instincts to add more structure, or operate more “like a startup”. A few really experienced engineers who can get things done that are held up as saviors. But the general default is that things don't ship well.
* You have areas of the organization that are such hot spots that they go through waves of failure. Often because they are the hot spot for dependencies. 


## Why it's hard to fix the cross-team project trap

When I was at New Relic, I was leading up the engineering side of a new analytics product. It was an ambitious product. We had widespread agreement that it was a top priority. However, we needed things from many parts of engineering in order to deliver on the complete vision for the product. 

Those dependencies didn't seem optional. So the way I attempted to handle this was by acting as a program manager. I tried to organize my dependencies as projects. Each of them would update on progress and risks. Fairly standard stuff for program management. 

But what I found is that the structure of the organization didn't make execution on this type of project possible. It was mathematically impossible. Every team had their own priorities. Even if they thought we were the top priority, that was subject to change. If they had a reliability problem, they had to do work to address that problem. Sometimes something new would come up, and bump our priority back. I was essentially making plans that weren't based on anything structurally sound.

It was difficult to fix at that point. I couldn't tell all of engineering how to operate! At the time, I didn't know what would fix the situation. We had tried for years at New Relic to crack the “cross-team project” problem. We rewarded people who were good at project and program management. We hired people that were good at it. We even made delivery of cross-team projects part of our promotion criteria! But ultimately, we didn't make the structural changes we needed.

The challenges you face to fixing these at this stage are mostly that there is a lot of organizational inertia. Changes can feel threatening. People can feel demotivated to make changes when they are under so much stress. Working within the existing system can take all of your bandwidth, so people will be reluctant to work extra to extricate themselves from the mess. And structural fixes can intrude on leadership turf, so you need a high level of support from the very top of the organization to make your changes.

This is not something you can just ignore. It will continue to get worse and worse, until any project that crosses team boundaries ends up being impossible to complete.


## What to do about the cross-team project trap

These are the types of changes I recommend if you run into the cross-team project trap: 

* Centralize cross-team priorities (possibly with a [product council](/product-council/)) and teach teams how to work with those central priorities. 
* Define organizational and team [coordination models](/coordination-models/). For example, move platform teams from [service model teams](/service-provider-model/) to [self-service](/platform-teams-and-the-self-service-model/). Make your product teams act as [independent executors](/independent-executor-model/), assuming no dependencies in their projects. Carefully design which teams act in an [embedded model](/embedded-model/). 
* Use program managers for cross-team initiatives.
* Limit the number of cross-team initiatives.
* Reorganize your teams mostly along cross-functional lines. Reduce dependencies between teams. Or, you might experiment with [FAST agile teams](/fast-agile/). 
* Reduce the size of projects (using [milestones](/milestones-not-projects/) or increments).
* Ideally, [get help](/about/)!


## Why does the cross-team project trap happen?

I have a hunch these growth traps are the result of complexity jumps that occur when you add a layer of management. The first danger zone corresponds to when you add managers, the second danger zone is often when you add directors. 

When you have this jump in complexity, you have to shift the structure of the organization. Otherwise, you have a mismatch between what is necessary for that structure to be successful, and the way it really is. 

This is not to say that adding managers or directors is what causes the problem. You can run into these growth traps even if you have managers or directors. It's just that you need them both at the same time.

Incidentally, this is why I am bullish on FAST agile. I think it may allow you to have a simpler organizational structure for a longer period of time. Combined with some of these other structures, I think the potential benefits outweigh the fact that it is a new, less well-developed practice. 


## Thank you

I try to credit people who have influenced my thinking or directly affected my approach. 

Much of the first danger zone is through my own observation. I'm not sure I've seen anyone else articulate it. But I would guess others have seen the same thing – when I talk with other leaders or venture capitalists, they have a look of “yeah, that sounds familiar”. 

For the second danger zone, there isn't a place I can point to (that I remember) that highlights this as a scaling barrier for organizations. I'm pretty sure something must exist! For how to address it, my biggest source of credit goes to [Jim Shore](https://www.jamesshore.com). His work at New Relic was quite effective, and it was a career highlight to work with him and the Upscale team to design and implement the solutions. While the [coordination models](/coordination-models/) have been my own pattern language for organizational and cross-team work, you'll notice he is credited on many of them.

Image by <a href="https://pixabay.com/users/atulcodex-8240447/?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=4101998">atul prajapati</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=4101998">Pixabay</a>