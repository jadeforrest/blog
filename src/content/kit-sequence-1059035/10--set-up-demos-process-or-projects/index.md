---
kitEmailId: 4687359
sequenceId: 1059035
subject: Set up demos (process or projects)
previewText: ''
position: 10
published: true
delayValue: 7
delayUnit: days
sendDays:
  - monday
  - saturday
  - sunday
emailTemplateId: null
kitSyncHash: 47aeda34a615364d2d82f547ea7126e4
kitSyncedAt: '2026-09-09T18:52:16.169Z'
---
Over the next couple of posts, I'm going to describe an approach to managing projects that is the most lightweight possible approach I can think of that still gives you pretty rigorous project management. Yet it also results is a highly flexible approach.

This may or may not be right for your organization. But as you read it, consider whether your company has better patterns you can copy, or whether adopting this approach will help you out.

## What is this approach?

I call it “demo-driven development”. I believe it incentivizes the right things to both improve your planning, and take into account the chaos and change in product development.

## What is demo-driven development?

Demo-driven development is a practice where you use 
1. regular demos, 
2. a standard week-by-week project plan, and 
3. value-based user stories. 

You use this as a lightweight and flexible structure for planning the team's work. These then drive meetings that encourage more active tweaking and improvement of the project. 

## Why demo-driven development?

Some advantages of demo-driven development over [other approaches](/three-anti-patterns-for-project-management/) are:

* You think backwards from the needs of customers. This connects the team with the business impact, yielding better results. 

* Goals for the week are more clear, leading to better focus and collaboration within the team. 

* Team members feel more satisfaction. Why? People have an innate need to feel progress, and to connect their work to the value they’re delivering. They love to solve problems and understand why it is important. 

* Demo-driven development provides a structure to improve the quality of conversations around projects. Plans are simple and easy to play with. User stories are at a level of granularity that make it easy to control scope. This leads to more fluid and dynamic projects -- projects that are actually managed as opposed to projects that run on autopilot. 

## Step 1: Demos on Fridays

So how do you go about implementing demo-driven development? 

The first thing to do, if you haven’t done it already, is to introduce weekly or biweekly demos (I'll use weekly during this post, but you can substitute biweekly if that makes more sense for you). You can structure them many different ways, but to start with:

* Have each team demo their work every week. If you're doing this within a team, have each team member demo their work.
* For each group of people working on something, rotate the person that demos that work. This helps ensure that everyone gets recognized for the team’s work, and gives engineers practice with the valuable skill of showing their work.
* The demos can be done in a meeting, or asynchronously recorded and posted in a room in Slack. If you do it asynchronously, copy what I learned from Bjorn Freeman-Benson: ask each team to do a two-minute video. Suggest to people that they ask questions in Slack threads, and use Slack react emoji to cheer on accomplishments. I like to tell people to spend 10 minutes on a 2 minute video, to prevent the recordings from being too large of a time suck to produce. 

Be prepared to tweak the format until it feels good for the people involved. Here are a few things to be careful of, or that you might want to tweak after you've gotten demos set up:

**Include all the work**. One thing to be careful of is that the demos are inclusive of all the work required to build functional software. Prepare the team to demo all the parts of their work: the APIs, the infrastructure, the reliability work, and the testing. It's important for you to cheerlead the work that isn't customer facing. 

**Focus on customer**. You can use demos to make teams more customer centric. One thing I like to do after a couple of weeks is to introduce a standard format for the demos:

1. Today, I'm going to demo XYZ.
2. [Thank anyone that contributed or helped you out]
3. The reason we're doing this work is... [explain the customer or business value in a couple of sentences]
4. [Show your work in 2-3 minutes]

**Use demos to educate**. If you're in an environment where there is less trust, or the leadership doesn't understand how software should be built, you may need to use the demos to educate and give context on the team's work. You absolutely don't want people to feel scared to demo, so don't make it a scary thing to do.

**Critique during demos**. When you do have a high trust environment, you can start to nudge the demos to involve a little critique from fellow team members. The ideal is if people are excited about each other's work, and looking for feedback from their teammates. And their teammates are thinking about the customer or business value of the work, and suggesting ways to do it better, or to make it simpler. You want a little of this, not a ton of it, so it can be a delicate balance, and is often something to introduce later.

## Thank you

Many experienced engineering leaders give helpful feedback on drafts of this post. Thank you to [Seth Falcon](https://www.linkedin.com/in/sethfalcon/), [Bjorn Freeman-Benson](https://www.linkedin.com/in/bjornfreemanbenson/) and [Kenichi Nakamura](https://www.linkedin.com/in/kenichi/) for numerous structural and content suggestions that made this post stronger and more focused. And thank you to [Brent Miller](https://www.linkedin.com/in/foliosus/), [Davy Stevenson](https://www.linkedin.com/in/davystevenson/), and [Darin Swanson](https://www.linkedin.com/in/darinswanson/) for their improvements! Thank you to [davidkunz](https://news.ycombinator.com/user?id=davidkunz) for [pointing out potential failure modes](https://news.ycombinator.com/item?id=27417551). I learned a lot of these approaches from [Alex Kroman](https://www.linkedin.com/in/alexkroman/).

​

Share this post: [https://www.rubick.com/demo-driven-development/](https://www.rubick.com/demo-driven-development/)​

​
