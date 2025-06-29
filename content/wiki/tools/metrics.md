---
title: Metrics tooling
---

## SonarQube

I have an acquaintance that is doing some due diligence on SonarQube, and I offered to collect some information for him. Anyone have experience with it or similar tools, and willing to answer these questions?

### Is the solution a nice to have or essential for any modern, high velocity eng team?

* "I've used it at three startups. It depends, but I can say the following: While you can do fine without it, I'd say it's a "must-have" if you can work with it."
* "Probably more essential than not. It comes up on security questionnaires very often, so if you're a SaaS then you probably need it. It provides generally useful data, although someone has to parse the output and usually make prioritization decisions."
* "I think it's essential. I use this as part of my SOC2 compliance, leaning particularly on gating commits on sonar runs passing & peer review. It also is checked in security questionnaires."

### What is the preference (assuming value prop is strong/clear) between a self managed solution versus a cloud one?

* "I'd recommend a light self-hosted POC to see how it goes before jumping into a paid SaaS."
* "I use Sonarcloud, we pay with a CC on lines of code, ~$150 a month for covering all prod repos managed by about 45 engineers. It's a slam dunk on cost to value."

Advice:

* Find a team who's interested in it/or interested in trying it out, and let them experiment with it (that should be 150-200 USD); let them tinker with it for a while, and keep gathering feedback/metrics... within a few weeks (6+) you'll have some data to make a decision.

* If the team is resistant to change or believes they don't need it, it will be challenging, especially when SonarQube will spam them while pointing out every l ittle detail in their code (they might hate it)

* It's hard to roll out, especially initially. There are settings for 'a line in the sand' where commits that don't make things worse pass, but old stuff doesn't need to be cleaned up.

* It helps tremendously to have advocates for this, pairing a rollout with good IDE settings to let a dev know before they commit if it'll pass.

* You need to teach folks why you're doing it, otherwise it's just a hurdle.

* I would also recommend a slow rollout, find your advocate, pick one repo, educate the contributors, ..., profit.


