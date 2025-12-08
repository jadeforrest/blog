---
title: The danger of fan out work
tags: ["platform-engineering", "delivery", "scaling", "complexity", "architecture"]
cover: fan.jpg
author: Jade Rubick
discussionId: "fan-out-work"
description: "Fan out work spreads tasks across many teams, leading to hidden, externalized costs and poor incentives. We explore the issue and potential solutions."
---

Imagine an engineer who decides to make a breaking change to an API. They think it saves a ton of time. What they may not realize is that this decision will ripple out, causing countless hours of rework for multiple teams across the organization. This is the hidden danger of fan out work.

<re-img src="fan.jpg"></re-img>

Fan out work is a topic I haven’t seen written about before. It is something I've observed mostly in organizations that are medium-sized or larger. 

Fan out work happens when a team can generate work that “fans out” to a very wide set of teams. 

## Examples of fan out work

### Platform teams

Platform teams can sometimes be a source of fan out work. This is not to vilify them. They are reasonable people doing things that they believe are really good for the company. You’ll see projects like:

* Large technical migrations. For example, a mandate to move off MongoDB to Postgres. 
* API deprecation. Whenever there isn’t an easy migration path, a team creates work for all of its customers.
* Large scale capabilities. Features like RBAC can sometimes originate in a platform team out of customer needs, but the work involved can spread out to override other priorities.

### Architects

Architects are another source of generated work. They create plans that represent things they think need to happen, but these plans require work and can come across as unfunded mandates, introducing slowness across every project. 

For example, if an architect mandates a new pattern in a codebase, that means either of these must happen:

1. Every time engineers work in a part of the codebase, they will need to understand how to make that change, and make it. 
2. Or, someone will need to go through and change all the current code to match the new standard.

## What’s wrong with Fan Out Work?

### The cost of fan out work is often hidden

Often the easiest decision for a team member is to do the easiest thing for their local team. For example, an engineer may decide to make a breaking change to save their team a month of work. If ten other teams each spend two weeks adapting to that change, the organization loses five months of engineering time. It is an inexpensive decision for the team member, but an expensive decision for the whole organization, due to externalized costs.

### Fan out work causes poor incentives

So fan out work can result in hidden inefficiencies in your organization.

If we return to the example of the architect mandating a new way of doing things: if that person calculated the amount of work mandating the new pattern in the codebase would be, it could be months of engineering work. Is the change worth a single individual spending several months making that improvement? Often, the answer is no. 

## Addressing fan out work

Here are a couple of approaches for dealing with fan out work:

1. **Teams generating the work should do the work**. For instance, if a platform team mandates a migration, they should do most of that work themselves, in all the dependent team’s codebases. This approach forces costs to not be externalized, so they fully grasp the impact of their decisions. It provides a feedback mechanism. You will need to fund teams sufficiently so they can do the work. Like on-call, this puts the feedback in the right place. This can result in better outcomes, and is my favorite approach.

2. **Limit the number of major projects**. You can also put limits in place for the number of major projects a team can produce. For example, you might tell architects they get a limited number of changes. Or you might tell a platform org they get one big migration project a year.

3. **Calculate and consider costs**. You can require people to do calculations before any fan out work is undertaken. This does require some sort of awareness of fan out work, or a way to detect it. But having people think about the expense can help. If you’re using a prioritization approach that considers effort or costs, this can plug into the value / time equation and help you plan more rationally.

4. **Decouple work to local teams’ timelines**. To reduce the impact of fan out work, you can allow teams to integrate the fan out work into their own priorities on their own timeline. This reduces disruption and allows better local decision-making. 

I'd love to hear your experiences with fan out work. Have you encountered similar challenges in your organization? How have you addressed them, and what strategies worked best for you?

## Podcast on fan out work

I cover the topic of fan out work in this episode of Decoding Leadership:

<iframe src="https://podcasters.spotify.com/pod/show/decodingleadership/embed/episodes/6--Jade-Rubick-on-the-dangers-of-fan-out-work--and-managing-a-bottleneck-team-e2k9fjf" height="102px" width="400px" frameborder="0" scrolling="no"></iframe>

## Thank you

Image by <a href="https://pixabay.com/users/avantrend-321510/?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=497004">Werner Weisser</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=497004">Pixabay</a>
