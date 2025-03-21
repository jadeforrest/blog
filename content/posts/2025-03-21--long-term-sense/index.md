---
title: How to develop a sixth sense for the long-term
tags: []
cover: slope.jpg
author: Jade Rubick
discussionId: "long-term-slope"
description: "We talk about some simple techniques to judge the long term trends of a situation."
---

Most leaders do not seem to be very good at seeing the long-term impact of things. There was a time I was very much in that camp, but I've learned a few techniques for seeing things more clearly. I'd like to share one of those techniques today. This technique can help you see the long-term impact of something. 

<re-img src="slope.jpg"></re-img>

## Inputs and outputs

In leadership, you mostly hear about the "output" of something. You hear about problems. But you don't hear what caused that problem to occur. And specifically, you don't hear the dimension along which the problem is based.

So you will hear about problems like these:

* Support tickets are crushing the engineering team.
* We're spending too much time maintaining our software.
* The security team isn't growing fast enough to keep up with demand.
* Our reliability is getting worse and worse. 

Let me describe an approach for identifying the "input" and doing somethign about it.

## How to analyze long term trends

The step to take when looking at a problem like this are:

**(1) Identify the largest driver to the problem**. This is the "input". There can be multiple inputs, but try to look for the largest ones. And choose one that is varying right now. So for example, you might be hearing that the engineering team is spending more and more of their time with support tickets. The question is, **what is varying** that is making the support tickets increase? Is it that we're having a lot of new customers recently? Is it that we're releasing a lot of new functionality? Or is it that we are doing something else differently? 

The varying part is important, because you're looking for an "input" that is driving the output. Let's say in this case, that it seems to be due to a lot of new customers. Customers are growing 10% a month, and the team's support load seems to also be growing proportionally. Maybe not 10%, but it seems to be varying depending on the customer growth.

If you can identify that, you've identified your "input" -- the largest driver to the problem.

**(2) Look at the long term implications of that trend**. The next step is to think about if that trend is going to continue. Are there counter forces that will make things better? Or does it continue like this?

I can't tell you how often I find that the answer is, _it is going to continue like this_. You should be at that moment thinking, "oh shit". Because you've just identified a **"time bomb"**.

This part of the analysis is pretty important. You basically are trying to determine: _is this going to get better, or get worse, over time_?

**(3) Look at how much time there is left on the time bomb**. The danger with time bombs is that they're often not urgent. And they're often not visible. This means they often are easy to defer or ignore.

Figuring out the time horizon for the problem helps you get clear on how responsible you're being to defer it. Either way, you should have a plan or a way to track the time bomb, or you're neglecting your job as a leader.

One thing about deferring time bombs is that if you're doing that in one place, you're probably doing it in other places too. So a culture of deferment can result in all of your time bombs hitting at the same time.

**(4) Look for two kinds of solutions**. Even if you decide to defer it, it can be useful to have a high level thought on what type of solutions you might employ. I usually look for type types of solutions: (A) a solution that fixes it forever, and (B) a solution that merely gets you to a situation where things are always getting a little better. If it's always getting a little better, you pretty much don't have to worry about it. But if the gap between these two types of solutions isn't major, you might want to bite the bullet and solve it for good. 

## Example with software tests

Let's look at a few examples. The first example is you hear from a new team member that the software test suite is painfully slow, taking 20 minutes to run each time.

(For context for those with a less technical background: in software, developers write tests for their code. As they add more and more features, the library of tests increases. As you increase the number of tests, it takes longer and longer to run, making this a very common scenario).

Let's go through our steps:

(1) **The driver** in this case is the number of tests. There could be other factors, like tests that take too long. But the thing that varies the most is the number of tests, leading to the time it takes to run the tests to increase over time. 

(2) **Long term implications** if the trend continues, the test suite will take a greater and greater amount of time. You can look for some evidence of how quickly it is growing. (A good activity might be to add this as a key performance indicator (KPI) you are tracking, so you know if it's getting better or worse over time, and can keep an eye on it).

Experienced engineers will tell you that there is a significant difference between a 10 second test suite and a 1 minute test suite. And a significant difference between that an a 10 minute test suite. It changes the nature of the work so much that it can transform the way you work. 

(3) **Time left** This is very much an important but not urgent problem. It is not a time bomb that explodes at one point, but something that adds increasing friction over time. The effect on the team will be easy to underestimate. And it is a problem easy to ignore. But clearly ignoring it is irresponsible -- the trend is that you'll make engineering slower and slower, and that it will combine with other problems to make your whole organization worse off. 

So it's not something that has to be done immediately, but it shouldn't be deferred very long either. 

(4) **Two kinds of solutions** present themselves:

For a solution that makes sure things are incrementally better, you could put in place a rule that the build will fail if it takes over a certain amount of time. And you can slowly ratchet that down over time. Disruptive, yes, and maybe not the best solution. But it's an example of a "slowly get better" solution.

A "fix it forever" solution might be to run your tests in parallel. If you want to run more and more tests over time, you can divide it up into more jobs, and run more jobs in parallel. It might get more expensive as you run more jobs, and there might be some limits to how much you can divide them in parallel, but you should be able to run them at a fairly constant rate. 

Looking at the difference in the amount of time it will take to do each of these things, the incremental solution is probably something you could do in half a day. But it will result in a lot of build failures, so it will have a higher long term cost. The fix it forever solution might take a week, and will result in some tests needing to be rewritten, but the savings will be pretty constant in the future.

This is a simplified view of the tradeoffs, but you can see how you might make a tradeoff on this, package up a project around this work, and make sure it's scheduled.

## Example with security team not growing fast enough

Let's say you're working at a place with high security needs. You're talking with the manager of the application security team. Her team's job is to review the code from engineering and make sure security problems aren't being introduced. 

She complains to you that they're swamped, and that they aren't hiring application security engineers as quickly as the rest of the organization.

You can mentally do these steps in your head:

(1) **The driver** is the number of engineers writing code, because as that increases, her teams' work increases.

(2) **The long-term implication** is that her team will get behind, and be ineffective at identifying security vulnerabilities. Ultimately, they won't be able to fulfill their function. If the company has high security needs, then this is a pretty bad situation.

(3) The amount of **Time left** depends on how quickly we're hiring, and how much her team is falling behind with the growth in engineers. This may not be a linear thing -- it may drop off dramatically at some point. You can ask her some questions about how it's evolved to get a sense of this. 

(4) **Two kinds of solutions**, fix it forever, and incremental.

The root problem is that her team isn't able to keep up. This can be solved through headcount, or a better strategy for her team. 

Ideally, an application security team would be increasingly effective over time, so they wouldn't need to grow at the same rate as the rest of engineering. The fact that they are probably speaks to a lack of automation. So getting better tooling, or changing their relationship with the rest of engineering might be the best approach. For example, they might employ tooling, and good partnership with engineering, and training, so that the rest of engineering takes a lot of responsibility for security, and gets better visibility into security issues. This is a high leverage approach, so I'd call it the fix it forever approach. 

An incremental approach that would make things work would be to hire at a ratio of the rest of engineering. I think this is less than ideal, but it might be the stopgap solution until the more permanent solution is in place. The key issue here is to troubleshoot hiring, and make sure she has the right amount of headcount.

My suggestion to her would be, make the time bomb visible, show how you're addressing it. Make a plan that shows you're going to slow the growth of your team versus the rest of engineering. Ask for additional headcount to fill the gap until a solution is in place. Make it a business decision: "do we want to accept the security risk for this until a better, more scalable version of my team is in place, or do we want to increase the headcount by X amount?" This becomes a tradeoff decision.

## Some tips on using this technique

The general thing I'm going for with this approach is to assess a situation, look at the long term implications, and think about whether it will be a problem or not. 

Questions I ask myself are, "is this getting better or worse over time". If something makes engineering slower over time, that's a really bad thing. You want all of your long-term trends to be heading in a positive direction, so that your flywheel of value delivery is getting faster over time.

One thing I've found useful is to often add a **comparison**. So for example, if AWS costs are rising quickly, the input might be the amount of customer data coming in. The important question to answer is, "is the rate rising sustainably, or unsustainably". You can often look at whether the growth is above a line or below a line. In this case, are costs rising faster than customers are paying us? Or below that line?

This is the basic sense you're trying to build as you learn this skill. It takes some practice, but after a while, you'll have this new sixth sense, and notice problems that nobody else is thinking about yet.

This can also change the way you relate to other departments. You can talk with finance about the rate of growth, and the relative priority of profit margins versus capturing more market share. This makes you into more of an executive.

## Talking about time bombs

The only thing I find unfortuante about building this skill is that it can be thankless. Yes, you'll feel very smart when you see problems other people aren't seeing. But a lot of time this means you're fixing issues nobody is aware of.

One thing I've found useful when talking about these type of problems is to come up with a really succinct phrase that gets at why it's important. Sometimes time bombs are existential, that's perfect. For example,

"Our AWS costs were rising at such a quick rate that if we don't address it, we'll be losing money on every customer within two years". 

Something like that can really help people see why it's important. Another example might be:

"Support tickets are rising at an unsustainable rate. At the current trend, engineering will be completely focused on support within 18 months, and not delivering any new value to the business". Holy moly, that got my attention.

## Feedback

I hope you found that useful. Let me know your experiences as you try this skill out!

## Thank you

Image from <a href="https://pixabay.com/photos/san-francisco-california-houses-210230">Pixabay</a>. 