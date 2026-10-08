import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { availabilityBanner, servicesPhrase, visibleForAvailability } from "./availability.js";

test("interim wording appears only when interim is available", () => {
  assert.match(availabilityBanner(true), /interim/i);
  assert.doesNotMatch(availabilityBanner(false), /interim/i);
  assert.match(servicesPhrase(true), /interim/i);
  assert.doesNotMatch(servicesPhrase(false), /interim/i);
});

test("both banners still advertise advising", () => {
  for (const interim of [true, false]) assert.match(availabilityBanner(interim), /advising/);
});

const item = fc.record({ id: fc.nat(), interimOnly: fc.option(fc.boolean(), { nil: undefined }) });

test("property: interim on shows everything, in order", () => {
  fc.assert(
    fc.property(fc.array(item), (items) => {
      assert.deepEqual(visibleForAvailability(items, true), items);
    })
  );
});

test("property: interim off removes exactly the interimOnly items, preserving order", () => {
  fc.assert(
    fc.property(fc.array(item), (items) => {
      const out = visibleForAvailability(items, false);
      assert.ok(out.every((i) => !i.interimOnly));
      assert.deepEqual(out, items.filter((i) => !i.interimOnly));
    })
  );
});
