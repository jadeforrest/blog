---
title: Your team may need a Hero Rotation
tags: ["delivery", "information-flow", "communication", "coordination-models", "coordination-models-team"]
cover: hero.jpg
author: Jade Rubick
discussionId: "hero-rotation"
description: "Why your engineering team may need a hero rotation to combine focus and responsiveness"
---

You're working on a complicated engineering problem. An urgent Slack question catches your attention. By the time you get back to the problem, you’ve lost the chain of thought, and it usually takes quite a while to get back into that productive “zone”. This is common on engineering teams (and with other types of thoughtful work). 

<re-img src="hero.jpg"></re-img>

Engineering teams often face challenges because the work requires uninterrupted time if you want to be productive. But there are a lot of reasons to interrupt a team: support questions, small bugs, and communication needs (“is this expected behavior?”, “what’s our latest thinking on the estimate for this project?”). Coordination and responsiveness compete with focus.

You can destroy your team’s productivity if you requiring constant communication and allow interruptions. The other failure mode is walling your team from the rest of the company. This leads the rest of the company to be less effective. 

My favorite way to solve this problem is a Hero Rotation. A Hero Rotation balances the needs of *focused* and *responsive* work:

* **Most of the team is in Focus Mode**: they are working on projects, and getting stuff done. 
* **The Hero is in Responsive Mode**: they work on small, easily interruptible work. They try to be responsive to emergencies and communication needs. They aim to protect the team from interruptions. 

A Hero Rotation gets you the best of both worlds: Focused AND Responsive.

## Why have a Hero role?

* **Enhance team focus**: protect other team members from interruptions, allowing them to be more productive. 
* **Encourage knowledge sharing**: you’ll be asked questions that only one person might know the answer to. Over time, being a Hero helps everyone share knowledge throughout the team.
* **Build empathy across teams**: everyone on the team gets exposure to what is happening in support and other parts of the company that interface with your team. 

## What does a Hero do?

* Handle on-call and respond to alerts from Pagerduty (or whatever). 
* Act as the primary contact with the support team, and other teams that communicate with your team. Aim to respond within an hour or less.
* Minimize interruptions for the team by fielding communication throughout the week. 
* There is an understanding that the Hero will be less productive in their project work during their rotation.

## How to set up automations for Hero rotations

I like to set up some sort of automation that tells people when it’s their turn to be Hero, and handles overrides. I find a paging system to be a good source of truth. Why? They're built for exactly this use-case.

After setting it up in Pagerduty, I next will find a way to connect it to Slack. One easy but imperfect way of doing this is with Slack Workflows. Ask at the beginning of the week who is on the rotation, and post the result to all relevant channels.

Here are a few things I like to set up:

* **Announce when someone goes on rotation**, both for that person’s benefit, and awareness in the channels that communicate with the Heroes. 
* **Share a "rotation calendar"**, so it’s easy to look up who the Hero is. 
* **Set up an alias for the Hero in Slack**, so that people can @ mention the Hero without knowing who it is. Train people to do that instead of pinging a certain person. 

## Tips for being a Hero

* **You don’t have to know everything** to be the Hero. It is expected that you won't know the answer to many topics. Spend a few minutes trying to figure it out and handle it if you can. Otherwise, escalate to the person who can help on the team. Do try and rotate the people you escalate to, but don’t feel bad about escalating – this is all a part of spreading the knowledge around. When you escalate, be sure to learn all you can about the topic. That way, the next time this comes up, you may not need to interrupt your teammate.
* If you’re paged, **you don’t have to be able to fix everything**. If there is a runbook, you go through the steps on the runbook, and then escalate. If there isn’t a runbook, escalate freely.

## When you start your Hero rotation

* Check in with last week’s Hero - is anything carrying over from Friday? Is anything in progress that you may need context on before diving in? Are there any high priority issues that need your attention or continued focus? 
* Monitor the support channel actively. Try to respond quickly to anything posted.
* If you see something needing attention, do one of these things:
    * Create tickets for new issues. Let the person know we are tracking it, and offer workarounds whenever possible. 
    * You do not need to solve the issues you log unless they are urgent! 
    * Escalate urgent issues that you can’t fix yourself. You can ask for help!
* Give the support team updates, and let them know what you are focusing on. 

## Advice on running Hero Rotations

* **Consider two Heroes**: If the load gets to be larger than an individual, you can sometimes have two Heroes, each doing a two week shift. This is actually kind of nice, because that gives you a person who is rotating out, and a person who is rotating in. That preserves more context between weeks. It also helps people feel less isolated and more like they have a teammate during their shift. This makes sense on larger teams that have a heavy support or operational burden. It also makes sense when the team has decided to shift a lot of responsibilities to the Hero.
* **Monitor the responsibilities of the Hero**: you will often find that if you have a Hero, it will be natural to add more and more responsibilities to the Hero. For example, you might have them do the bug fixes for the week. Or you might have them do the deployments, or be the person most responsive for code reviews. These things will balloon over time. Be sure to keep an eye on whether the level of investment makes sense for your team, and what the tradeoffs are. Also don't allow the Hero role to substitute for automation.
* **Pay attention to handoffs**: handoffs can be a challenge, especially if the Hero ends up doing a lot of bug fixing or operational improvements during the week. Anything that doesn’t end at the end of the rotation becomes problematic. I usually give the guidance that you should only do work that can be done by the end of your rotation. And escalate anything else that needs to get done to the manager, so that can be worked out. 
* **Set clear expectations**: different people will invest different amounts in their rotations. So you need pretty clear guidance on how much to invest. Otherwise, you might find some people spend 100% of their time on Hero Rotation duties, and others hardly handle those responsibilities at all. It can be confusing to know how to spend your time when your turn comes, so spell it out really clearly and talk through it with the team.

## About the Hero terminology

Some people find the Hero role to be challenging. They may get anxious about doing it well. And they may feel isolated. Others may find the role to be fun, because they get to fix a lot of little issues, and be helpful to a lot of people. 

For the people that find the role less desirable, the Hero name can help, because they are helping their teammates be more focused. The name emphasizes that, so you'll feel like you're doing something for your team. 

But one downside to the term is that it does imply a Hero who rushes in to save the day. And this can lead to hero syndrome, where people don’t proactively fix issues that should be solved systematically. It can lead to MORE emergencies, instead of less. [Katie Wilde](https://www.linkedin.com/in/katiewilde/) and I talk about that in this episode of Decoding Leadership: 

<iframe src="https://creators.spotify.com/pod/show/decodingleadership/embed/episodes/17--Katie-Wilde-on-the-challenging-step-to-director--and-the-perverse-incentives-of-reliability-e2rgdth" height="102px" width="400px" frameborder="0" scrolling="no"></iframe>

So all of this is to say, feel free to use your own terminology. 

## Thank you

This came out of the Support Hero role at New Relic. I don’t remember the history behind that, so if I should be crediting someone (or crediting myself!) sorry about that.

Image by <a href="https://pixabay.com/users/lovechicco-14817111/?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=8554882">Nikki Luijpers</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=8554882">Pixabay</a>
