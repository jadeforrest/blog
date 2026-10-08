// Evidence for /work-with-me/ and the homepage: logos, client quotes, and
// anonymized engagement stories. Items with `interimOnly: true` are hidden
// unless INTERIM_AVAILABLE is set (src/config/consulting.js).

// Logos are the companies' own wordmarks, saved to public/logos/. They render
// as a single-color mask, so their original colors don't matter. `ratio` is
// the SVG viewBox width / height.
export const logos = [
  { name: "New Relic", file: "/logos/newrelic.svg", ratio: 246 / 48 },
  { name: "Gremlin", file: "/logos/gremlin.svg", ratio: 113 / 25 },
  { name: "Honeycomb", file: "/logos/honeycomb.svg", ratio: 164 / 48 },
  { name: "Mode", file: "/logos/mode.svg", ratio: 111 / 35 },
  { name: "Jeli", file: "/logos/jeli.svg", ratio: 101 / 41 },
  { name: "Campus", file: "/logos/campus.svg", ratio: 114 / 25 },
  { name: "Castle", file: "/logos/castle.svg", ratio: 602 / 158 },
  { name: "Surface Ventures", file: "/logos/surface.svg", ratio: 519.01 / 167.23 },
  { name: "Radian Capital", file: "/logos/radian.svg", ratio: 163 / 47 },
];

// Shown after the logos. Your LinkedIn says "over thirty startups"; five of
// them have logos above.
export const moreClientsLabel = "and 25+ more";

// Quotes are verbatim from LinkedIn recommendations or client feedback, trimmed
// with ellipses. People are identified by role and company type, not name.
export const testimonials = [
  {
    quote:
      "We brought Jade onboard for a three-month commitment where he quickly identified a set of process improvement[s] and was able to make the engineering team feel appreciated and seen. At the end of the commitment, Jade helped us recruit a full-time VP of Engineering who … was able to be productive in his first week.",
    role: "CEO & co-founder",
    company: "Venture-backed security startup",
  },
  {
    quote:
      "He took a deep look at our systems and processes, implemented some lightweight solutions, and tee'd the organization up very well for our incoming Engineering leader. Jade also played an important role in hiring the new leader.",
    role: "CEO",
    company: "Series D data analytics company",
  },
  {
    quote:
      "We came to every meeting with abstract ideas, and walked out with concrete steps to make it happen.",
    role: "Advisory client",
    company: "Venture-backed startup",
  },
  {
    quote:
      "[Startup] life would have been considerably worse without Jade. I dropped my therapist but kept Jade.",
    role: "Advisory client",
    company: "Venture-backed startup",
  },
  {
    quote:
      "He was skillful at describing and weighing the tradeoffs of different approaches to solving organizational problems and was careful to pay close attention to the specifics of our context before advising.",
    role: "VP of Engineering, coaching client",
    company: "Developer tools startup",
  },
  {
    quote:
      "Jade helped align every component of our hiring process by detailing how each stage should be focused and evaluated … allowing us to achieve our aggressive headcount goals.",
    role: "Recruiting lead",
    company: "Venture-backed security startup",
  },
  {
    quote:
      "Hiring and ramping someone would take 3-4 months, however Jade was available and started work the next day. He quickly gained everyone's trust and was able to make some immediate improvements to how teams were working.",
    role: "COO",
    company: "Venture-backed startup",
    interimOnly: true,
  },
];

export const engagementStories = [
  {
    title: "From stuck to shipping before an acquisition",
    company: "PE-backed software company",
    situation:
      "The company was preparing for an acquisition, and every plan depended on engineering delivering. Nobody was confident it could.",
    approach:
      "Started with an assessment: weak organizational leadership, little automation, and outdated practices. Then led the org through the fixes: feature flags, trunk-based development, lighter code review, fewer meetings, observability and on-call, and the team's first use of AI agents.",
    duration: "Six months",
    result:
      "Twice as many things delivered and about 50% more value shipped. PR review time halved. The first no-drama peak season in the company's history.",
  },
  {
    title: "Hiring the right engineering leader",
    company: "Series A startup",
    situation:
      "Growing fast without engineering operations experience. Hiring wasn't working, people were overwhelmed and isolated, and the team felt disconnected from leadership.",
    approach:
      "Advised the founders on high-impact, low-effort fixes for each problem to hold things together until the hire. Defined the profile of the leader they needed, designed the interview process, and sorted out problems with their executive recruiter.",
    result:
      "They hired the leader they needed. In the CEO's words: “Jade was crucial in navigating a critical company transition.”",
  },
  {
    title: "Getting delivery back on track before product-market fit",
    company: "Seed-stage startup",
    situation:
      "The company had scaled ahead of product-market fit. Delivery was slipping, and the leadership team wasn't working well together.",
    approach:
      "Ongoing advising with the CEO and leadership team: team structure, role definitions, and meeting structure, with engineering focused entirely on reaching product-market fit and better decision-making.",
    result: "The CEO's summary: engineering delivery was “completely solved.”",
  },
];
