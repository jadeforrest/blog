---
kitEmailId: 4688132
sequenceId: 1059035
subject: Move to using user stories (process or projects)
previewText: ''
position: 12
published: true
delayValue: 7
delayUnit: days
sendDays:
  - monday
  - saturday
  - sunday
emailTemplateId: null
kitSyncHash: fc3eeff9887edbbdebc0e8c5e949650a
kitSyncedAt: '2026-09-28T17:25:49.507Z'
---
(You may notice we're skipping step 3 here. That's because I consider step 3 to be a little advanced, so we'll cover it some other time)

## Step 4: Move the team’s work to using user stories

Your next step is to move to using user stories, instead of tasks.

### What are user stories?

-   User stories represent things you might demo on a particular week. For example, “a user can select a color for the chart in a dashboard”. “A user can save the selected color for the chart”.
-   User stories should be something a product manager, or an engineer from another team could understand. (This gives the product manager a lot more power to control scope by moving around user stories). If you have a particular approach in mind, you can say so, but the user story should mostly communicate what capability you’re offering the business or your customer.
-   Ideally, their size should be a couple of days of work.
-   User stories should be team-focused, not individual focused. A common mistake is to make user stories that can be accomplished by an individual. For example, a poor user story might divide the frontend work from the backend work. Write user stories so they are "cross-functional" in nature -- crossing skill boundaries. They should mention the user and what they are able to do: "User is able to see a list of items they have listed for sale in a table". Note this implies both frontend and backend work.
-   User stories can be an increment towards something bigger, but if it is possible, they should try to be valuable in some way.

### How does the team break user stories down to technical work?

Teams tend to like to create todo items that correspond to _technical_ work.

If your team feels a need to do so, [Jim Shore](https://www.jamesshore.com/) taught me an approach that works quite well. Use subtasks underneath the user stories to represent the technical work.

When you do this:

-   User stories represent something a product manager or technical person outside the team can reason about.
-   Then under that user story, you create tasks that represent the technical work you need to do to accomplish that user story.

The task breakdown doesn’t need to happen until the week you get to it. That can be the activity in the kickoff meeting after you talk about what to demo. Or it can be done after that meeting by the people involved.

Ideally, the kickoff meeting then becomes the engineering manager saying: “these are the next couple of user stories. What do you think we can demo this week?”

The team decides what they think is reasonable to accomplish that week, and talks through the approach they might take. Then the rest of the meeting is the logistics and coordination around delivering that, including creating the task breakdown and figuring out who will do what.

### How does this compare to other common ways of doing it?

Contrast the way this weekly kickoff feels to the [task treadmill approach](https://www.rubick.com/three-anti-patterns-for-project-management). In those meetings, the engineering manager might pull up a list of 20 or 30 tickets, and go over the many things that are still in flight. They’ll have a bunch of things typically that are moving between weeks. They team spends the meeting talking about these tasks rather than the goal they’re trying to accomplish. The tasks don’t feel meaningful, they just feel like a list of things to do.

In a [million-meeting agile](https://www.rubick.com/three-anti-patterns-for-project-management) format, they’ll spend all their time talking about these tasks, and making sure everyone understands them, and who will do what. Instead of talking about the goal and how to work together to achieve that goal, the team focuses on the reviewing tasks in the ticketing system.

In a [Gantt-aholic](https://www.rubick.com/three-anti-patterns-for-project-management) kickoff meeting, usually the focus is on the tasks and the points associated with everything. How many points did we accomplish, what are the estimates for the upcoming items, and how are we tracking. The focus is more on the timeline than the objective.

Instead, focus the meeting on the goal you want to accomplish, and use your tooling to record things at the level of impact to your customers: user stories.

## Thank you

Many experienced engineering leaders give helpful feedback on drafts of this post. Thank you to [Seth Falcon](https://www.linkedin.com/in/sethfalcon/), [Bjorn Freeman-Benson](https://www.linkedin.com/in/bjornfreemanbenson/) and [Kenichi Nakamura](https://www.linkedin.com/in/kenichi/) for numerous structural and content suggestions that made this post stronger and more focused. And thank you to [Brent Miller](https://www.linkedin.com/in/foliosus/), [Davy Stevenson](https://www.linkedin.com/in/davystevenson/), and [Darin Swanson](https://www.linkedin.com/in/darinswanson/) for their improvements! Thank you to [davidkunz](https://news.ycombinator.com/user?id=davidkunz) for [pointing out potential failure modes](https://news.ycombinator.com/item?id=27417551). I learned a lot of these approaches from [Alex Kroman](https://www.linkedin.com/in/alexkroman/).

​

Share this post: [https://www.rubick.com/demo-driven-development/](https://www.rubick.com/demo-driven-development/)​

​
