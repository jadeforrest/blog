// Copy that changes with the sitewide INTERIM_AVAILABLE switch (src/config/consulting.js).
// Kept pure so the Astro pages and the tests share one source of truth.

/** Header banner text. */
export function availabilityBanner(interim) {
  return interim
    ? "Available for advising, coaching, and interim leadership."
    : "Available for advising and coaching.";
}

/** Short list of services, used in the homepage hero and site description. */
export function servicesPhrase(interim) {
  return interim
    ? "advising, coaching, leadership hiring, and interim leadership"
    : "advising, coaching, and leadership hiring";
}

/** Drop items flagged `interimOnly` unless interim work is on offer. */
export function visibleForAvailability(items, interim) {
  return items.filter((item) => interim || !item.interimOnly);
}
