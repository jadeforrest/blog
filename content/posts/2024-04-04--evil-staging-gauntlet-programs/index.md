---
title: Evil staging and gauntlet programs, tools to increase your software reliability
tags: ["platform-engineering", "software-design", "standards", "reliability"]
cover: evil-staging-dalle.jpg
author: Jade Rubick
discussionId: "evil-staging-gauntlet-programs"
description: "Evil staging and gauntlet programs are chaos engineering inspired, systemic approaches to improve software reliability."
---

I’m excited to share some innovative but experimental practices today. You can use them to improve the reliability of your engineering organization. They are based on ideas from [chaos engineering](https://www.gremlin.com/community/tutorials/chaos-engineering-the-history-principles-and-practice). 

<re-img src="evil-staging-dalle.jpg"></re-img>

## What is chaos engineering?

The idea behind chaos engineering is to test your systems by deliberately injecting failure into those systems. By doing so, you inoculate your software to those classes of failure. For example, you might fill up the disk on a server, and see if anything breaks. If it does, you learn how it fails, and you fix it. If it doesn’t break, then you’ve learned your software is currently resilient to that class of failure. 

The way I remember it, the techniques of chaos engineering largely emerged with cloud computing. Early cloud computing systems were not reliable. And they encouraged an architecture which was more distributed and [microservice](https://en.wikipedia.org/wiki/Microservices) based. Companies like Netflix and Amazon were essentially trying to create reliable systems on a substrate of unreliable systems.

Typically, chaos engineering uses an approach where you use [gamedays](https://wa.aws.amazon.com/wellarchitected/2020-07-02T19-33-23/wat.concept.gameday.en.html) and deliberately test your systems for failure. Gamedays are a wonderful practice. I encourage you to use them! But I’m going to talk about some chaos engineering approaches that are more systemic. They are also more experimental, and less common. If executed well, they _should_ guarantee good results. And, you might use gamedays as a regular practice while you roll them out. 


## 😈 Evil Staging

The first technique is “evil staging”. What is this diabolical practice?

In software engineering, the idea of a [deployment pipeline](https://martinfowler.com/bliki/DeploymentPipeline.html) is to take software and gradually release it into more and more realistic and rigorous stages, until you release it to customers. Thus, a common practice is to have engineering teams…

1. Work locally (on _dev_). 
2. Then push their work into a shared environment (_staging_). 
3. And then finally to deploy it to production (_prod_). 

Typically, each stage is more and more “life-like” and rigorous. For example, typically your _staging_ environment will have more realistic data in it than _dev_. It will have more people using it. It will be closer to what is happening in production.

The key idea behind Evil Staging is that you make your staging environment more evil 😈. For example, it might have no free disk space. Or the processes might be restarted every hour. Or it might frequently run out of memory. All of these are realistic scenarios, that will happen to your application in production. But Evil Staging makes them happen _all the time_.

There are a million ways you could do Evil Staging:

* You can do it as a staging environment, or do it as a separate production environment. 
* You could organize the failures with some sort of regular schedule, or do them randomly.

But the basic idea is to make these failures happen more often. 

Will this improve reliability? It might not. If people respond to failures in staging by investigating them and fixing them, then this might work for you! If alerts on staging don’t cause any response, then it’s probably not a good fit.

If it’s not a good fit, read on for Gauntlet programs.

## Gauntlet Programs

The second technique is what I call a Gauntlet Program. 

<re-img src="gauntlet-program-dalle.jpg" width="75%"></re-img>

A Gauntlet Program is where you gradually introduce faults into your staging and then production environments. But, you do it on a gradual schedule. It might take a year or two to fully ramp up the gauntlet. 

The idea is that you are gradually inoculating your software from entire classes of failure. So a gauntlet program might look like this:

* **Month 1**: Introduce the Gauntlet Program to the engineering team. Train engineers on using failure injection tools (it could be [Gremlin](https://www.gremlin.com), or any of the alternative tools available). Communicate it in a fun way, give teams time to prepare their systems, and then they can get back to whatever other work they were doing. Then, you start the challenge. The initial challenge is to make systems resilient to unexpected host restarts within 30 days. First this will happen on staging, then it will happen in production (yes, truly!). You give teams a playbook that includes observability, gamedays, and a lot of support, as they prepare their systems for the first stage of the Gauntlet. Then the time comes, and there are some minor issues, but they are resolved, and fixed. Congratulations, you’ve just eliminated an entire category of failure from your system. And since it’s ongoing, it won’t reoccur. 
* **Month 3**: Focus shifts to preparing systems to withstand hosts running out of disk space. The failures start in staging, and two weeks later, move to production. (Yes, truly!)
* **Month 5**: The challenge involves making systems resilient against running out of memory. The failures start in staging, and two weeks later, move to production. 
* **Month 7**: Teams work to ensure their systems can handle maximum disk I/O consumption. With the same sequence of staging and production failures. 
* **Month 9**: The focus shifts to time being out of sync. Various time offsets are introduced, following the standard pattern.
* **Month 11**: The challenge for this period is that latency is added to some or all network traffic. 
* **Month 13**: The teams now face the fact that a percentage of all network traffic fails. 
* **Month 15**: Next, the teams face the challenge of dealing with making their systems resilient to network partitions. 
* **Month 17**: The challenge is to run out of file handles. Sneaky one that!
* **Month 19**: The final challenge involves making systems resilient to DNS failures. They should ensure that things degrade in a reasonable way, until DNS resumes.

Each challenge is designed to innoculate your software from a new category of common failure. As you progress through the Gauntlet, your systems should become gradually more reliable. They should also learn to be more proactive about reliability issues, and think about their software in an adversarial and proactive way. This builds a culture of proactive and systematic reliability. 

You can make this as aggressive or gradual as you like. Adding a challenge per quarter might be a more reasonable approach in some environments. Or, if reliability is truly a concern, you might make it happen even faster!

Note that you can add additional types of challenges to the gauntlet. You might add some security related challenges, for example. You could even add some usability challenges, to guarantee that basic workflows in your application are never broken (this would pair nicely with training on Synthetic monitoring). And, there are a [lot of limits I didn't include](https://github.com/lorin/awesome-limits) in the list above.

## Make the gauntlet into a Reliability Race

You could design a gauntlet as a Reliability Race, where you have a maturity model, and each team turns up the difficulty level until they reach MAX LEVEL. 

<re-img src="reliability-race-dalle.jpg" width="75%"></re-img>

It could look like this:

* **Newbie**: have an on-call set up. Get a basic level of monitoring in place for the team. 
* **Level 1**: have run a game day.
* **Level 2**: added the “host restart” failure to their software (in staging and production), and it’s running fine.
* **Level 3**: added the “disk is full” failure to their software, and it’s running fine.
* **Level 4**: added the “memory full” failure to their software, and it’s running fine.
* **Level 5**: added  “maxed out disk I/O” failure to their software, and it’s running fine.
* **Level 6**: added the “time drift” failure to their software, and it’s running fine.
* **Level 7**: added the “network latency” failure to their software, and it’s running fine.
* **Level 8**: added the “packet loss” failure to their software, and it’s running fine.
* **Level 9**: added the “network down” failure to their software, and it’s running fine. 
* **Level 10**: added the “file handles full” failure to their software, and it’s running fine.
* **Max level, you win**! Added the “DNS is down” failure to their software, and it’s running fine. 

By the way, running fine can mean whatever makes sense for your application. It may mean graceful failure, it might mean you’ve decided the failure is acceptable, or it might mean doing extraordinary things to make the experience okay. That’s for you to decide. Leadership should probably provide some guidance on how to reason about these things, so every team doesn’t interpret it differently. 

Making it a Reliability Race could make it more enjoyable for participants. It could also make it easier for some teams to reason about their local priorities versus the Reliability Race. For example, a team could already be doing some important reliability work, and decide to prioritize that before dealing with “host restart” failures. Every team will also have a different amount of work they have to do to meet the Gauntlet, so this makes that more flexible.

## The Newbie Gauntlet

A variation of the Gauntlet Program is a Newbie Gauntlet. This is easier to introduce because you only do it for new things. 

<re-img src="newbie-gauntlet-dalle.jpg" width="75%"></re-img>

Whenever you spin up a new service, you start with all the failures in your staging and production environment. This makes it so you have to build things to be resilient at every point. It forces good reliability and engineering practices in everything you do. 

The advantage of this is that it makes all your new services reliable by default. But you would have to be careful you don’t make it so onerous that people want to avoid creating new services!

## Why I like these approaches

I like these approaches because they can guarantee good results. They are systemic in nature, so they make it necessary to build your software in a different way.

You’ll notice that they are analogous to test suites. They are always present, always defending you against making the mistakes you are certain to make. They make the expectations of reliability explicit in your software, and give you safeguards to ensure you don’t violate them. 

## The objections you’ll hear

Objection: **you shouldn’t do this because it will cause failures in production**. Those failures will happen anyway – they will just come at an inconvenient time. This method gives teams time to prepare. It also communicates that the expectation is that you build things in a reliable way. Often, teams do not get this type of explicit guidance, and they can ironically be punished for building things in a reliable way.

Objection: **production is already evil**. You're already getting lots of signal from your production environment, because things are failing a lot! So it can seem like a stretch to add more failures to your approach. But it is valuable to have the failures happen more predictably and consistently. If you only run out of disk space once a year, you're unlikely to know about that until you run out of disk space! But if you have that failure right after you commit a change that will cause a problem, it's much better to be able to know about that right away.

I hope more companies experiment with variations like this! Let me know your experiences, and what you come up with!

## Prereqs

For this to be successful:

* Your leadership team needs to value reliability.
* You probably need to have an on call rotation. 
* You probably also need observability tooling (something like [Honeycomb](https://www.honeycomb.io), [New Relic](https://newrelic.com), or [Datadog](https://www.datadoghq.com)).
* The rollout should ideally be communicated well, and by leadership that has empathy and can do good change management. 
* I will note that a lot of SRE organizations do not have this level of support. It is similar in some ways to [error budgets](https://cloud.google.com/blog/products/management-tools/sre-error-budgets-and-maintenance-windows) or [SLAs](https://cloud.google.com/blog/products/devops-sre/sre-fundamentals-sli-vs-slo-vs-sla) in that it needs a high degree of support to be successful. 

## Thank yous

Evil staging was inspired by some of the practices I heard from Netflix. I remember it being talked about at New Relic when I was there. I don’t remember who coined the term. I believe Gauntlet programs are my own invention, but of course I’ve been in several environments where a lot of these ideas were floating around. And I’ve worked with people who have been at Netflix, Amazon, and other places where reliability practices were pioneered. I developed Gauntlet Programs as a potential product strategy for [Gremlin](https://www.gremlin.com), when I was VP of Engineering and Product there.

Thank you to [Tim Tischler](https://www.linkedin.com/in/timtischler/) for sharing with me the list of limits. And [Katie Wilde](https://www.linkedin.com/in/katiewilde/) for feedback on the post. 

Images were generated by Dalle. I'm sure they'll look very dated in a year. Very 2024 AI generated. It will seem vintage, I'm sure.
