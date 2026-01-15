---
title: Metrics
icon: 📈
description: Guidance on engineering productivity metrics, board reporting, and approaches to measuring individual and organizational performance.
---

## Productivity metrics

* This is a sticky topic.
* Individual productivity metrics are almost always a bad idea.
* I've generally found that metrics are more useful the higher the degree of trust and safety around the use of the metrics. I.e., you can use really inexact measurements when you're not worried about them being misapplied. The range of usefulness increases as the level of trust increases. This is kind of the correlary to [Goodhart's Law](https://en.wikipedia.org/wiki/Goodhart%27s_law) that "When a measure becomes a target, it ceases to be a good measure"
* You will get a lot of pressure from the GTM side of the business to measure productivity, for individuals, teams, and organizations.
* This makes sense for the GTM side of the business, because their work is mathematical. They can quite rigorously model things like, "If we spend half a million dollars, how will that affect how many customers we can bring in". Things are much fuzzier in engineering, not because of laziness, but because the nature of the work is far different.
* A wonderful post on the dangers of metrics is [Kent Beck on metrics and how they enshittify](https://tidyfirst.substack.com/p/my-fitbit-buzzed-and-i-understood). It outlines a lot of the way that incentives within companies can lead to worse products.

## Productivity measurements in engineering
* [DORA](https://dora.dev) is the most industry accepted way of measurement. It has problems (lagging, sometimes not especially actionable), but can be useful as a way of talking about improvements. Lead time for changes, frequency of deploys, change fail percentage, failed deployment recovery time.
* [The SPACE of Developer Productivity - ACM Queue](https://queue.acm.org/detail.cfm?id=3454124) SPACE (which is kind of DORA v2)
* [CORE 4](https://www.lennysnewsletter.com/p/introducing-core-4-the-best-way-to) is a good approach. It's v3 of DORA. PR Throughput, Developer Experience Index, Change Failure Rate, and % of time spent on new capabilities.
* [Measuring engineering organizations](https://lethain.com/measuring-engineering-organizations/) by Lethain
* See also [Metrics tooling](/wiki/tools/metrics/)

## Engineering reporting at a board meeting

### General board info

* Engineering is rarely a focus in board meetings. That’s not ideal, but often the case. In fact, engineering being discussed much in a board meeting is often a sign things aren't going well.
* Copresenting with product is often a good approach.
* Often good to focus on deep, specific topics.
* Focus on productivity, efficiency, and people stats.
* Tie presentation to product strategy and key initiatives.

### Some format examples

Person A: I have used a pretty basic template here for many years at this point. Same for internal, all hands
* 1 slide on OKRs (or “goals” if the company hates OKRs) target metrics and actuals for the quarter and targets for the rest of the year
* 1 slide on last quarter delivery + results
* 1 slide on next 3 quarters plan

Person B: https://devinterrupted.substack.com/p/4-engineering-slides-ceos-love-that

Person C: may not matter where you are but might:

* cloud costs / your ability to scale customers without linearly increasing costs
* hiring: your ability to quickly hire / onboard new engineers and make them successful
* delivery: your ability to regularly deliver new features that PM / exec team have said are important... I measured this once by showing that the previous engineering leader hadn't delivered a press release worthy feature in 2 years and made it a point to work with PM & Marketing to make sure that we were regularly delivering new features & improvements to the customer base
* reliability / uptime: how many incidents do you have, how bad are they, and are you regularly fixing the issues that caused them?


          
