---
title: Engineering strategy
---

> Do others here leverage some type of engineering strategy in conjunction with a product strategy? I was wondering if that would be a good way to give my head of engineering a place to explore and communicate our architectural and operational options moving forward and the assumptions guiding them. Or, if it would just end up feeling like strategy overload.

## Jade's response

* Will Larsen is writing a book on engineering strategy, and has written a lot about it. Most recently here: https://lethain.com/eng-strategies/ I love his writing and learn a lot from every post of his. I think that's probably the best place to start for engineering strategy. Here is a [placeholder for the book](https://craftingengstrategy.com), which comes out in late 2025.
* That said, I feel like my strategy work is a little different from his, and from the Rumelt Good Strategy, Bad Strategy approach. I basically think the important thing is to have a correct view of the current situation (which is really hard to do), and then to have a clearly defined "what needs to happen". And then the strategy work is having a theory of how to get there. So my strategy docs tend to be in the form of problem / solution, or current situation / goal / plan formulations.
* For engineering strategy, I learned from Alex Kroman to have an engineering response to a product strategy. Which basically defines the plan to make the product strategy work, combined with everything engineering has to be thinking about. 
* I've seen some of my clients follow Lethain's posts and come up with a set of constraints and artifacts that are similar to his. But I think generally he's been working at larger companies, where those constraints ARE the path to making that goal happen. In smaller companies, it might make more sense to have a prescribed set of activities, or a plan to organize in a particular way, or a set of projects, or whatever.

## Alex's response

* I think it can be really helpful to think about strategy as a “plan to solve problems”. As an engineering leader you’ll probably get hired or fired to solve (or for not solving) one of these problems: 1) Reliability - Customers are upset because the product is unreliable or insecure, 2) Costs - Investors are upset because hosting or people costs are too high, 3) People - Engineers are upset because we are a terrible place to work and nothing gets done. 4) Innovation - Sales is upset because we aren’t shipping enough new products. Step 1 of creating the strategy is figuring out what problem to solve: So you ask the CEO what their biggest problems are and they say “The board is killing me to get costs down and last quarter our sales sucked because we don’t have anything new to sell”….Now you’ve got your two problems to solve: 1. Costs, 2. Innovation.
* Step 2 is creating a metric for each of these problems so you’ll know when the problem is solved. This is so important so that you get locked into the problem and not any chosen solutions or approaches.
* Step 3 is creating the plan to get to these metrics. Based on your experience you know that the only way to get costs down is to relocate the engineering team to another location. You also realize that the fastest way to drive renewal new ARR is making an adjacent new product that highly utilized customers have been clamoring for.
          
