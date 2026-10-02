import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { PERSON_ID, blogPostingJsonLd, homepageJsonLd, serializeJsonLd } from "./json-ld.js";

test("serializeJsonLd cannot close the script element", () => {
  const out = serializeJsonLd({ name: "</script><script>alert(1)</script> & \u2028\u2029" });
  assert.doesNotMatch(out, /<|>|&|\u2028|\u2029/);
  assert.ok(out.includes("\\u2028\\u2029"));
  assert.deepEqual(JSON.parse(out), { name: "</script><script>alert(1)</script> & \u2028\u2029" });
});

test("property: serialization round-trips and never emits markup characters", () => {
  fc.assert(
    fc.property(fc.jsonValue(), (value) => {
      const out = serializeJsonLd(value);
      assert.doesNotMatch(out, /[<>&\u2028\u2029]/);
      assert.deepEqual(JSON.parse(out), JSON.parse(JSON.stringify(value)));
    })
  );
});

test("homepage graph: Person, Organization and WebSite linked by @id", () => {
  const data = homepageJsonLd({ description: "desc", image: "https://www.rubick.com/a.jpg" });
  assert.equal(data["@context"], "https://schema.org");
  const byType = Object.fromEntries(data["@graph"].map((n) => [n["@type"], n]));
  const person = byType.Person;
  assert.equal(person["@id"], PERSON_ID);
  assert.equal(person.name, "Jade Rubick");
  assert.equal(person.url, "https://www.rubick.com/");
  assert.equal(person.description, "desc");
  assert.equal(person.image, "https://www.rubick.com/a.jpg");
  assert.ok(person.sameAs.every((u) => u.startsWith("https://")));
  assert.equal(person.worksFor["@id"], byType.Organization["@id"]);
  assert.equal(byType.Organization.name, "Jade Rubick Consulting, LLC");
  assert.equal(byType.WebSite.author["@id"], PERSON_ID);
});

test("blog posting with every field", () => {
  const data = blogPostingJsonLd({
    title: "T",
    description: "D",
    url: "https://www.rubick.com/t/",
    datePublished: "2026-09-27",
    image: "https://www.rubick.com/i.jpg",
    tags: ["a", "b"],
  });
  assert.equal(data["@type"], "BlogPosting");
  assert.equal(data.headline, "T");
  assert.equal(data.description, "D");
  assert.equal(data.datePublished, "2026-09-27");
  assert.equal(data.image, "https://www.rubick.com/i.jpg");
  assert.equal(data.keywords, "a, b");
  assert.equal(data.author.name, "Jade Rubick");
  assert.equal(data.author["@id"], PERSON_ID);
  assert.equal(data.mainEntityOfPage, "https://www.rubick.com/t/");
});

test("blog posting omits missing fields and credits guest authors", () => {
  const data = blogPostingJsonLd({ title: "T", url: "u", author: "Guest Writer", tags: [] });
  for (const key of ["description", "datePublished", "image", "keywords"]) {
    assert.equal(key in data, false, key);
  }
  assert.deepEqual(data.author, { "@type": "Person", name: "Guest Writer" });
  assert.equal(blogPostingJsonLd({ title: "T", url: "u", author: "Jade Rubick" }).author["@id"], PERSON_ID);
});

// Pins the published identity: any change to what agents and search engines
// read about Jade should be a deliberate edit here too.
test("homepage graph snapshot", () => {
  assert.deepEqual(homepageJsonLd({ description: "D", image: "I" }), {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": "https://www.rubick.com/#person",
        name: "Jade Rubick",
        url: "https://www.rubick.com/",
        image: "I",
        jobTitle: "Engineering leadership advisor",
        description: "D",
        worksFor: { "@id": "https://www.rubick.com/#organization" },
        sameAs: [
          "https://www.linkedin.com/in/jaderubick/",
          "https://github.com/jadeforrest",
          "https://bsky.app/profile/jaderubick.bsky.social",
        ],
        knowsAbout: [
          "Engineering leadership",
          "Engineering management",
          "Organizational design",
          "Product delivery",
        ],
      },
      {
        "@type": "Organization",
        "@id": "https://www.rubick.com/#organization",
        name: "Jade Rubick Consulting, LLC",
        url: "https://www.rubick.com/about/",
        founder: { "@id": "https://www.rubick.com/#person" },
        description:
          "Advising, coaching, and interim leadership for engineering and product organizations.",
      },
      {
        "@type": "WebSite",
        "@id": "https://www.rubick.com/#website",
        name: "Jade Rubick - Engineering Leadership",
        url: "https://www.rubick.com/",
        description: "D",
        inLanguage: "en",
        author: { "@id": "https://www.rubick.com/#person" },
        publisher: { "@id": "https://www.rubick.com/#person" },
      },
    ],
  });
});

test("blog posting links back to the website node", () => {
  assert.deepEqual(blogPostingJsonLd({ title: "T", url: "u" }).isPartOf, {
    "@id": "https://www.rubick.com/#website",
  });
});

test("blog posting snapshot for a minimal post", () => {
  assert.deepEqual(blogPostingJsonLd({ title: "T", url: "u" }), {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: "T",
    url: "u",
    mainEntityOfPage: "u",
    author: { "@type": "Person", "@id": PERSON_ID, name: "Jade Rubick", url: "https://www.rubick.com/" },
    publisher: { "@type": "Person", "@id": PERSON_ID, name: "Jade Rubick", url: "https://www.rubick.com/" },
    isPartOf: { "@id": "https://www.rubick.com/#website" },
    inLanguage: "en",
  });
});
