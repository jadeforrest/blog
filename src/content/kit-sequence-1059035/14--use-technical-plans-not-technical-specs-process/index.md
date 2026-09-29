---
kitEmailId: 4688139
sequenceId: 1059035
subject: 'Use technical plans, not technical specs (process)'
previewText: ''
position: 14
published: true
delayValue: 7
delayUnit: days
sendDays:
  - monday
  - saturday
  - sunday
emailTemplateId: null
---
## Step 6: Create technical plans

You should have a technical plan for your projects. It can be simple.

### What should be in the technical plan?

A technical plan does NOT need to be a technical spec. The most important things to surface are things that might affect you in the future. I like to ask people to write briefly about these topics:

-   Tradeoffs being made, and why.
-   Anything new or nonstandard the team is doing. I call these technical bets. It’s usually fine to have a bet or two in a project, but a red flag if there are lots of new approaches being done at once.
-   For any new patterns being introduced, will it require the rest of the codebase to be migrated to that pattern, if we like it? (This requires strong justification)
-   Consider adding a section for things that will be hard to change in the future, like APIs or data models.
-   Any known shortcuts we’re taking that might cause problems later.

A technical plan doesn’t need to be long. It could even be a few sentences long, if there isn’t anything the team is doing that is non-standard or surprising. The more complex the situation, the most the technical plan may need to explain decisions.

### Why create a technical plan?

The technical plan should be a tool for conversation and coordination. It should help people understand and reason about the way technical decisions are made. And they should be shared for others to improve upon.

The main value of a technical plan is that it surfaces assumptions and decisions that are being made, so people can discuss them. The theme for both project plans and technical plans should be to “use the people around you to improve your thinking.”

The entire world shouldn’t be able to weigh in on the technical plans but it should be a way to surface potentially risky decisions and discuss them.

### Who should create the technical plan?

Two approaches I've seen work are:

1.  Team members write the plan. The Tech Lead reviews and coaches the team to make sure the plan is good.
2.  A rotating team member writes the plan. Team members review the plan together in some way.

The first is more explicit about technical leadership roles. The second is more egalitarian. I tend to prefer the first.

If you do the first approach, you do have to emphasize to the Tech Lead that part of their role is to improve the technical reasoning for all the team members -- they are there to coach team members. And also they are responsible for making sure the decisions aren't terrible. This requires good judgment.

### How does a technical plan interact with milestones and projects?

If the project is really long, you can do technical plans a milestone at a time. Sometimes you may also need to do it at the project level.

### How does the technical plan interact with the project plan?

There is an interplay between these plans. The technical plan surfaces technical tradeoffs and choices. The project plan sequences the work and breaks it down into increments.

​

Share this post: [https://www.rubick.com/demo-driven-development/](https://www.rubick.com/demo-driven-development/)​

​
