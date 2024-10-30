---
title: Don't repeat incidents
tags: ["reliability", "prioritization"]
cover: incident.jpg
author: Jade Rubick
discussionId: "dont-repeat-incidents"
description: "I share an approach to gradually increasing the reliability of a software development organization, without over or underinvesting in reliability"
---

Today, I’ll share the best organizational approach I’ve found to improving reliability. It is effective at organizations that focus on shipping, and struggle to prioritize reliability work. 

<re-img src="incident.jpg"></re-img>

With this approach, you can enjoy the benefit of rare, artisanally curated incidents, instead of repeating the same boring incidents you’ve experienced before.

This approach is called “Don’t Repeat Incidents” work. Or, DRI work. 

## The origin of Don't Repeat Incidents

We developed this approach at New Relic. New Relic’s engineering culture was quite focused on delivering features. All of the pressure on teams was around delivery. Yet, there were periods when our systems became fragile, and we started to have serious incidents. Customers would complain, and sometimes leave.

As a result, the leadership would make hard pivots towards reliability work, stopping all current projects. This made leadership feel better, and customers felt like their concerns were taken seriously. But for many of the engineers, it felt wrong. We would switch to focusing on reliability, and then go back to focusing on projects. Until it got bad enough that we focused on reliability again. 

And the thing was, we were underinvesting in reliability. Even though there was a lot of business value in focusing on reliability work, it was hard to reason about when to make it a priority versus some other project. Usually, we didn’t prioritize as highly as we should have.

Reliability wasn’t baked into the way the teams were operating. Even though we were doing fairly modern practices of having teams own their own operations, and being on call, all of the pressure was to deliver features. 

During this time, New Relic [gradually developed a world-class reliability program](https://youtu.be/FX03FnvIE0g?si=OduyolVmeDYQEhRK&t=929). Our internal tools for this were the model for some of the [incident tooling](https://www.blameless.com) [modern](https://www.pagerduty.com/platform/jeli/) [teams](https://incident.io) [use](https://firehydrant.com) to manage incidents. We improved our competency in many ways. For example, we got pretty good at running [blameless retrospectives](https://www.blameless.com/blog/what-are-blameless-postmortems-do-they-work-how). We learned from our incidents. And during these retrospectives, we would capture lists of follow-up work. Incident write-ups often were quite well written, and thoughtful.


## Why we didn’t do follow-up work

One of our bigger problems was that **we would uncover a lot of follow-up work, and it would never get worked on**. It would get put in the backlog somewhere, and seldom get prioritized.

It wasn't that the people were lazy or that they didn't care. It would go something like this:

1. We would put the incident follow-up items in Jira. 
2. We would prioritize it. When we created it, we would think, “yes, this is really important. We need to do that. We’ll schedule it after this urgent thing we are working on.”
3. When the urgent thing we were working on was finished, the urgency from the incident would have faded. 
4. The follow-up item would then be prioritized against a few other things. Since it felt less urgent, it seemed like something that could happen later. After all, this other important project needs to get out!

This would happen over and over. It was being scheduled in a way that seems rational (after all, someone is prioritizing it). But it wasn’t improving reliability.  

Often, very similar incidents would occur a few weeks later. These were especially frustrating. Often, the plan was to start work on it the next week. The incidents would be so disruptive, because they would take the whole team’s time for a day or two. And it would be extra disappointing because something similar had happened before.

During this time, someone observed something interesting about our incident retrospectives. They usually came up with a pretty long list of followup work. All of them were good ideas, but the larger items were big projects. And the smaller things would often fall by the wayside. In this was the seed of “Don’t Repeat Incidents”.


## How Don't Repeat Incidents works

There were basically three parts to “Don’t Repeat Incidents”:


### Step 1: fast retro or post-mortem

**After an incident, you always schedule a retrospective. It should be done within a day or two**. 

This is not a common practice. Most of the time, teams won’t schedule a post-mortem or retrospective right away. They might spend a week writing up what happened. Or they might wait until the next sprint retrospective, and talk about it as a part of that retrospective.

Doing retrospectives within 24 or 48 hours is a dramatically better approach. Why?

* Everything is fresh in your mind. You learn more from the incident by examining it within a day or two.
* You could have a similar incident within that time period, if you don’t act more quickly.
* The longer you wait, the less likely you’ll have the retrospective. **This will mean you’ve incurred the cost of the incident, without receiving the benefit of the incident**, which is the learning and improvements you make.  

We did this for all incidents above a certain severity level.

### Step 2: identify “DRI items”

At the retrospective, you identify what happened, learn what you can about your systems, and how the team works. And **identify actions you can take to make your systems more resilient**. 

You identify these, and tag them as “DRI work”.

This is the way we defined DRI work:

1. Takes a maximum of X weeks, for the full team to complete.
2. Will substantially reduce the likelihood of the issue occurring again (MTBF), or substantially reduce the severity (eg, scope of impact, MTTD, or MTTR) if the issue does occur again.
3. Ideally, mitigates the general class of issue that occurred, rather than a specific issue. For example, if an issue was caused by disk space on server X filling up, the DRI solution should be addressed to the general case of preventing disk space from filling up on any of the team’s servers rather than specifically about server X.
4. Ideally, addresses the underlying causes of the issue rather than its symptoms (for at least the owning team).

For DRI work to be effective, the items you select and tag as “DRI work” need to be small. We capped it at two weeks of work, but you can set this according to your company’s needs. I've made it shorter at other companies. DRI Work is often a hack, or small temporary fix. Ideally, it is a day or two of work. The smaller the unit of time, the easier it is from a process perspective.

### Step 3: follow the “DRI rule”

Then a new rule kicks in: **we do the “Don’t Repeat Incidents” work before we get back to anything else**. This work is automatically more important than deadlines, projects, or anything else. 

This work can be technical work, improved monitoring, or a new checklist in our process. 

That was the whole change. 

## Don't repeat incidents helped, a lot

This small rule ended up being one of the best changes we made. It had a significant impact on reliability. 

It’s something I recommend, if your team has a lot of pressure to focus on projects, and isn’t doing enough reliability work.

## Why DRI?

When I step back and look at this change, I think it worked for a couple of reasons. 

First of all, we had a constant pressure to ship. The DRI rule gave teams the leverage to actually do reliability work – it became a counterpressure to the pressure to ship. When there was an incident, no matter what, you had the space, and even the obligation, to take a few days to prevent it from happening again, or to make it not as bad next time. 

It was not only effective for the fixes to software and alerting. It had an important influence on the culture of operational excellence. The policy admitted that incidents were a normal cost of writing software. The DRI expectation meant every incident was a built-in reminder that reliability demanded continuous improvement, and was a first-class concern, not an afterthought.

It also kept the responsibility for identification of problems and solutions directly in the experts on the teams closest to the ground truth in production.

## Limitations of “Don’t repeat incidents”

One of the problems with “Don’t Repeat Incidents” is that it allows for only small pieces of work. This is incredibly valuable, because you get bandaids that help your reliability. But there can be some type of reliability issues where the bandaids are not sufficient.

For example, when I was supporting a team at New Relic, we had some challenges that required large changes to improve the reliability of the product. These weren’t something that could be done in a couple of days. Yet the amount of work required was substantial.

In some cases, teams working on reliability projects would get interrupted frequently by DRI work. So even if they were working on a solution to a class of problems, the demand for a short term solution would interrupt the larger project. Don’t repeat incidents can focus your attention [too narrowly on the technical problems](https://surfingcomplexity.blog/2023/04/15/missing-the-forest-for-the-trees-the-component-substitution-fallacy/). The need for larger systemic changes can be hidden by the small changes. And the emotional relief from the quick fix can contribute to teams delaying larger projects that require more substantial change. DRI helped, but wasn’t sufficient to drive larger reliability work. We developed other approaches to deal with that.

Another way you can handle this is “[error budgets](https://sre.google/sre-book/embracing-risk/)”. This is well covered in the Google [Site Reliability Engineering](https://sre.google/sre-book/table-of-contents/) book. Error budgets are more complicated. You can implement don’t repeat incidents just by getting people to agree to it – error budgets require more tooling and measurement.

Like all organizational changes, it does require people to agree to it. You need to have your leadership team agree that it’s the way to do things. And it’s important to agree on the parameters and definition of DRI work. One thing that can be helpful is to provide an explicit prioritization across all types of work (features / security / customer escalation / incident follow-up work). 

## Podcast on this topic

Decoding Leadership is my podcast on leadership. I cover this topic in one of the episodes: 

<iframe src="https://podcasters.spotify.com/pod/show/decodingleadership/embed/episodes/10--Jade-Rubick-on-preventing-incidents-e2mjolc/a-abf5trv" height="102px" width="400px" frameborder="0" scrolling="no"></iframe>

You can also [view it on Youtube](https://youtu.be/uTdAFTaE7Do).

## Thank you

[Marcos Wright-Kuhns](https://www.linkedin.com/in/marcoswk/) helped me locate the [video](https://youtu.be/FX03FnvIE0g?si=OduyolVmeDYQEhRK&t=929) of a talk that [Beth Adele Long](https://www.linkedin.com/in/beth-adele-long/) and [Matthew Flaming](https://www.linkedin.com/in/matthew-flaming-6762b94/) did on the history of the reliability improvements at New Relic. It’s a wonderful, insightful look at all the changes we made over a couple of years. [Eric Dobbs](https://www.linkedin.com/in/dobbse/) pointed out some limitations of DRI, and shared a post I linked to on missing the forest for the trees. He also had some very helpful suggestions about similar incidents versus repeat incidents. He contributed language to the Why DRI section on the impact on operational culture and practices, and also the respect for local expertise. He also added language around larger reliability projects and how they related to DRI work. [Beth Adele Long](https://www.linkedin.com/in/beth-adele-long/) added nuance to “what is a repeat incident”. [Andrew Bloomgarden](https://www.linkedin.com/in/andrewbloomgarden/) pointed out that doing retrospectives within a few days wasn’t a common practice, and needed more emphasis. [Elisa Binette](https://www.linkedin.com/in/elisa-binette/) pointed out some of the preconditions for DRI work to be effective, and also emphasized the importance of similar incidents versus repeat incidents. She also added some nuance to the fast retrospective section, and improved some of the language around monitoring versus alerting. She shared some specific definitions of DRI work, that I included. 

Image by <a href="https://pixabay.com/users/ajale-1481387/?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=1474965">Andrea</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=1474965">Pixabay</a>