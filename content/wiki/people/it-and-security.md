---
title: Information technology and security
---

## Where IT and security report in to

* "As an IT manager myself, I have reported to CTOs (10 employee startup many years ago), and COO and then later CFO (300 employee non-software company)"
* "Our IT currently reports in through our centralized strategy & ops function, before that it was through the CISO who reports to head of Eng, before that I think it was somewhere in G\&A"
* "(~150 employees, ~20m ARR): IT & Security -> VP of Engineering worked fine, put both functions along side cloud engineering. I liked a lot of the outcomes that drove."
* "(~1000 employees, Buttloads of ARR): IT & Security -> Legal / COO (TERRIBLE IDEA, slowest, most bureaucratic teams I ever encountered. Also, successfully navigated the business through highly regulated customers and FEDRAMP)"
* "(~150 employees, ~40m ARR): IT -> COO - Works fine. It's a tiny team supplemented with Upwork."
* "Security -> CTO. Security handles SOC, Pentests, design review, and supports GTM, including pre-sales and marketing material. At some point I may move IT under Security."
* "(120 people) IT & Security -> VP of Engineering. Worked well."

## Admin access for engineers

How do folks approach admin access to laptops for devs?

* General concensus has been that it is normal to give admin access.
* If you want them to manage risk have them take security training. Acceptable use policy.
* Can be a sticking point on SOC2-ish audits.
* "We use a tool called Admin By Request on the Mac now, which primarily exists to make the user exist unprivileged and then grants admin to that user temporarily when you self-serve activate it. Like using sudo instead of always being logged in as root. Unfortunately, it sounds simple, but something about it offends the gods, and so it causes a lot of strange performance issues. On balance, I don’t think it is a win. (But it could be if it worked better.) To prevent installing unapproved software, the endpoint security software builds a list of everything installed and IT puts things on a block list. This used to be rare, but after some spicy incidents, we now immediately ban most things that are not clearly dev related."
