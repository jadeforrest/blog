---
title: Reliability is all sticks, no carrots
tags: ["reliability"]
cover: carrot.jpg
author: Jade Rubick
discussionId: "reliability-no-carrots"
description: "The reliability space is all sticks, no carrots. Here are some ways to produce good results anyway"
---

I had a great conversation recently with [Katie Wilde](https://www.linkedin.com/in/katiewilde/) about the reliability space. (You can see or hear the conversation [here](https://creators.spotify.com/pod/show/decodingleadership/episodes/17--Katie-Wilde-on-the-challenging-step-to-director--and-the-perverse-incentives-of-reliability-e2rgdth/a-ablas7g)). She made a wonderful observation about reliability work: all of the incentives in the reliability space are wrong. Doing the right thing in reliability is almost always the thing that isn't rewarded.

In the discussion, I found some lessons and techniques that I think are worth sharing, not just for people doing reliability work, but for any leader dealing with misaligned incentives. (That's a lot of leadership!)

<re-img src="carrot.jpg"></re-img>

## People don't generally value reliability

When I was new to management, my first hire was a person to do IT work for the company. After he had been around for a while, making a lot of improvements, the CFO came to me and said: "Why do we need to have an IT person? We don't have any problems with our computer systems. We may have had a lot of issues a while ago, but they seem pretty good right now!"

I said, "Exactly". The IT person had made the problems go away, so the perception of his work was that it wasn't necessary. But that was actually a sign he was doing excellent work.

Reliability work is like that. You're making a class of problems disappear. And they only seem important if they _don't_ disappear. 

A lot of people in the reliability space complain about how nobody values reliability. Nobody values quality. They're kind of right. It's a natural bias. Like Katie said in our podcast, "people don't generally value reliability that much unless the site is down, or things are really bad."

I noticed this when I was leading product and engineering at [Gremlin](https://www.gremlin.com), a company that is all about being proactive with your reliability work, through the use of chaos engineering. The space was a lot harder to compete in than I expected, because honestly most companies don't want to focus on reliability. They view it as a waste of time.

So this means that if you want to create reliable software, and solid experiences, you're often fighting with the perception that it's not important. It's **actually not important** until it becomes the top priority when things go sideways. 

## Make it interesting, and intrinsic

Both Katie and I have approached this in similar ways: focusing on appealing to people's intrinsic motivations: their desire to learn, and their pride in their work. But Katie had a new approach I hadn't used, that I think is brilliant: **make it fun and _interesting_**!

Her approach is to make the incident review meeting and post-mortem writeup so interesting and spicy, that everyone wants to see it:

"It'll get very real and kind of juicy, I would say. So then people want to come because they want to see the things that are going to go down at incident review. And so they do come and then I do a write up, which I try to make approachable and amusing. Did you know about this login functionality that we have that broke? Well, we didn't know about it either! I try to make it really fun."

As a result, she's seen a lot more engagement in the reliability work: "I've seen people actually want to join because they're going to be where the action is. We're going to see things at scale and see things break at scale. And it's just going to be really interesting and fun, for some sort of perverted sense of fun."

I'm certainly copying that approach. The other thing that I've found work is to talk about what the work requires of us. As we work at greater scale, we have to grow and be a different sort of engineer -- to grow our skills and do things in a way different than what we're used to. I've found that if you paint a believable picture of where we're going, the whole team can get on board with that vision, and start to own it.

## Heroics are also misaligned incentives

Another area in the reliability space where incentives are misaligned is with heroic behavior. You can build a dependency on your heroes. And your heroes will feel great, because they will step in and save the day every time.

This doesn't create a reliable system -- it creates a dysfunctional situation that is fragile. Yet all the incentives are to continue: we all praise the hero for saving the day. And when there is an emergency, of course you want to call the person most able to fix it, right?

The obvious thing to do is to fix the system so it doesn't rely on the hero. Cross-train people. Put the hero on the second line of paging, so other people have to learn it too. Do Gamedays so people have to practice.

But one of the things I've struggled with is how to show appreciation for heroism, without encouraging it. I've handled this in the past by contextualizing my praise for them. But Katie suggested phrasing it as **lucky**. "We were lucky that we have Alice, thank you Alice! What if Alice had been in the hospital?"

We were lucky to be bailed out by Alice, but we acknowledge that it's a dangerous dependency. 

## Use authority to emphasize the value of reliability

A lot of times you will find senior leaders who do care about reliability. You can use their authority by asking them to attend incident reviews. People notice these things. And for you as a leader, you should make sure you attend anything reliability related in your organization, to show you care about it.

## Don't let a good incident go to waste

One of the things you can often do is to introduce changes that make people's incentives align with the needs of the company. One of the better examples of this was the use of the [Don't Repeat Incidents](/dont-repeat-incidents/) rule. This rule is that when there is an incident, you have to do at least a little work to reduce the impact or likelihood of that happening again. 

You may be able to get people to agree to a rule like that (particularly after an incident). When you do, you are adding leverage during future incidents, because every incident is now a little more expensive. Every incident affects the timeline for projects in that part of engineering. Which, in turn, makes it easier for your product managers. They don't want their timelines affected by incidents, so they may be more likely to support important reliability work.

What you've done is to rope all of your product team into caring about reliability a little bit more, because every time there's an incident, it affects their roadmap. 

As a sidenote, this is an area you have to be careful with heroics. If an incident takes two days of reliability improvements by the team, that adds two days to the roadmap. If you heroically fix that, you're preventing the organization from caring about reliability work.

## Thank you

A lot of the inspiration and content for this came from this Decoding Leadership interview with Katie Wilde. Check it out!

<iframe src="https://creators.spotify.com/pod/show/decodingleadership/embed/episodes/17--Katie-Wilde-on-the-challenging-step-to-director--and-the-perverse-incentives-of-reliability-e2rgdth/a-ablas7g" height="102px" width="400px" frameborder="0" scrolling="no"></iframe>

Image by <a href="https://pixabay.com/users/maxmann-665103/?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=2309814">Th G</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=2309814">Pixabay</a>