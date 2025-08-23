---
title: Shape Up
icon: 🔷
description: Comprehensive overview of Basecamp's Shape Up methodology including six-week cycles, shaping, betting, and scope management techniques.
---

Jade's notes

## Context

* Built for Basecamp. 4->50 people. A dozen in the product team.
* Consulting. Then 4 SaaS products. Wanted to bundle together.
* Highly unusual team, ability to attract some of the best talent anywhere.
* Probably very different context than your situation.

## Six week cycles

* I've noticed teams that copy Shape Up often end up standardizing their feedback loops around six week cycles. Better to decouple releases and etc, and strive for quicker feedback loops.

## Shaping

* Senior group explores and defines project enough before handing off to team to build.
* Concrete enough to provide direction, but abstract enough to give teams room to build.
* Helps solve open questions

## Focus less on estimates, and more on Appetite

* Less on what it will take, but more on how much we want to spend.

## Make teams responsible

* Autonomy to define tasks
* Make adjustment to scope

## Targeting risk

* Risk of not shipping on time.
* Solve open problems before committing to project
* Projects get six weeks, no extension by default.
* Most unknown to least worrisome.

## Shaping

* Wireframes are too concrete.
* Words are too abstract
* It’s rough.
* It’s solved.
* It’s bounded
* Who shapes: design work. Generalist, or collaborate with 1-2 other people.
* Two tracks: one for shaping, one for building.
* Shaping track is private.

## Set boundaries

* Raw idea.
* Set the appetite
* Small batch: one designer and 1-2 programmers can build in 1-2 weeks.
* Big batch: six full weeks.
* Fixed time, variable scope.
* Responding to raw ideas. “Interesting. Maybe some day”.
* Don’t put in a backlog.
* Narrow down the problem (make sure we understand it). What’s really going wrong.
* Watch out for grab-bags.

## Rough out the elements

* Breadboarding.
  * Places, affordances, connection lines.
* Fat marker sketches
* Elements are the output
* Can still walk away from it.

## Address risks and rabbit holes

* Does this require new technical work we’ve never done before?
* Are we making assumptions about how the parts fit together?
* Are we assuming a design solution exists that we couldn’t come up with ourselves?
* Is there a hard decision we should settle in advance so it doesn’t trip up the team?
* Declare out of bounds
* Cut back
* Present to technical experts
* De-risked and ready to write up.

## Write the pitch

1. **Problem** — The raw idea, a use case, or something we’ve seen that motivates us to work on this
2. **Appetite** — How much time we want to spend and how that constrains the solution
3. **Solution** — The core elements we came up with, presented in a form that’s easy for people to immediately understand
4. **Rabbit holes** — Details about the solution worth calling out to avoid problems
5. **No-gos** — Anything specifically excluded from the concept: functionality or use cases we intentionally aren’t covering to fit the appetite or make the problem tractable

## Betting

* Choose a project for a six week cycle, thus prioritizing projects for development.
* 41% of product managers are averaging 3/5 on the scale of how happy they are with planning and prioritizing.
* Decentralized lists
* Important ideas come back

## Team composition

* Six week cycles
* Two week cool-down (no scheduled work)
* Project team: 1 designer + 2 programmers, or 1 designer + 1 programmer. QA person does integration testing later in the cycle.
* Big batch and small batch teams. Small batch = 1-2 weeks.

## Betting table

* Betting table is held during cool-down.
* New pitches + possibly 1-2 older pitches.
* Table at Basecamp = CEO, CTO, senior programmer, product strategist.
* 1-2 hours.
* Everyone reads pitches beforehand.
* Highest level people in the company there.

## Uninterrupted time

* Circuit breaker
* Projects don’t get an extension by default.
* Includes QA and testing.
* Not strict about help documentation, marketing updates, or announcements.

## Bugs

* Use cool-downs
* Bring it to the betting table.
* Schedule a bug smash. (a whole cycle for fixing bugs).
* Holidays good for this.

## R\&D mode vs production mode

* Instead of well-shaped pitch, bet the time on spiking some key piece of the new product idea. Shaping is fuzzier.
* Senior people make up the team.
* Don’t expect to ship anything at end of R\&D  cycle.

## Cleanup mode

* Final phase before shipping a new product.
* Free for all cleaning up.
* No shaping
* No clear team boundaries.
* Work is shipped continuously.

## Kick-off message

* Example message: <https://basecamp.com/shapeup/2.3-chapter-09>

## Assign projects, not tasks

* Projects turn out better if people are responsible for looking at the whole.

## Get one piece done

* Vertical slice.

## Organize by structure, not by person

* People often separate work by person or role. People then complete tasks, but the tasks won’t add up to a finished part of the project early enough.

## Scopes

* Going well:
  * You feel like you can see the whole project and nothing important that worries you is hidden down in the details.
  * Conversations about the project become more flowing because the scopes give you the right language.
  * When new tasks come up, you know where to put them. The scopes act like buckets that you can easily lob new tasks into.
* Vs. problem:
  * It’s hard to say how “done” a scope is. This often happens when the tasks inside the scope are unrelated. If the problems inside the scope are unrelated, finishing one doesn’t get you closer to finishing the other. It’s good in this case to look for something you can factor out, like in the Drafts example.
  * The name isn’t unique to the project, like “front-end” or “bugs.” We call these “grab bags” and “junk drawers.” This suggests you aren’t integrating enough, so you’ll never get to mark a scope “done” independent of the rest. For example, with bugs, it’s better to file them under a specific scope so you can know whether, for example, “Send” is done or if you need to fix a couple bugs first before putting it out of mind.
  * It’s too big to finish soon. If a scope gets too big, with too many tasks, it becomes like its own project with all the faults of a long master to-do list. Better to break it up into pieces that can be solved in less time, so there are victories along the way and boundaries between the problems to solve.

## Mark nice to haves with ~

## Work is like a hill 

* Figuring out what to do (unknowns) and Getting it done.
* Hill charts
* It’s good to think of the first third uphill as “I’ve thought about this,” the second third as “I’ve validated my approach,” and the final third to the top as “I’m far enough with what I’ve built that I don’t believe there are other unknowns.

## Scope hammering

* Is this a “must-have” for the new feature?
* Could we ship without this?
* What happens if we don’t do this?
* Is this a new problem or a pre-existing one that customers already live with?
* How likely is this case or condition to occur?
* When this case occurs, which customers see it? Is it core—used by everyone—or more of an edge case?
* What’s the actual impact of this case or condition in the event it does happen?
* When something doesn’t work well for a particular use case, how aligned is that use case with our intended audience?

## How to scale this

* Dedicated team (Security, Infra, and Performance) handles technical work.
* Ops team keeps lights on.
* They have technical people on support team who can investigate problems raised by customers.
