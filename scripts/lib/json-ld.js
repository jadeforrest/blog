// schema.org JSON-LD for the site's identity (homepage) and posts. Lives with
// the other pure helpers so it can be unit-tested; the Astro pages build the
// objects and BaseLayout serializes them.
export const SITE = "https://www.rubick.com";
export const PERSON_ID = `${SITE}/#person`;
export const ORG_ID = `${SITE}/#organization`;
export const WEBSITE_ID = `${SITE}/#website`;

const SAME_AS = [
  "https://www.linkedin.com/in/jaderubick/",
  "https://github.com/jadeforrest",
  "https://bsky.app/profile/jaderubick.bsky.social",
];

// Safe to drop inside <script type="application/ld+json">: escaping < > &
// stops a "</script>" in any string from closing the element, and U+2028/9
// are escaped for older JS parsers that treat them as line terminators.
export function serializeJsonLd(data) {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function homepageJsonLd({ description, image }) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": PERSON_ID,
        name: "Jade Rubick",
        url: `${SITE}/`,
        image,
        jobTitle: "Engineering leadership advisor",
        description,
        worksFor: { "@id": ORG_ID },
        sameAs: SAME_AS,
        knowsAbout: [
          "Engineering leadership",
          "Engineering management",
          "Organizational design",
          "Product delivery",
        ],
      },
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: "Jade Rubick Consulting, LLC",
        url: `${SITE}/about/`,
        founder: { "@id": PERSON_ID },
        description:
          "Advising, coaching, and interim leadership for engineering and product organizations.",
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        name: "Jade Rubick - Engineering Leadership",
        url: `${SITE}/`,
        description,
        inLanguage: "en",
        author: { "@id": PERSON_ID },
        publisher: { "@id": PERSON_ID },
      },
    ],
  };
}

// Inline (not just an @id) because posts are parsed without the homepage graph.
const JADE = { "@type": "Person", "@id": PERSON_ID, name: "Jade Rubick", url: `${SITE}/` };

// Posts default to Jade as author; guest posts carry their own `author`.
export function blogPostingJsonLd({ title, description, url, datePublished, author, image, tags }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    url,
    mainEntityOfPage: url,
    author: author && author !== "Jade Rubick" ? { "@type": "Person", name: author } : JADE,
    publisher: JADE,
    isPartOf: { "@id": WEBSITE_ID },
    inLanguage: "en",
  };
  if (description) data.description = description;
  if (datePublished) data.datePublished = datePublished;
  if (image) data.image = image;
  if (tags && tags.length > 0) data.keywords = tags.join(", ");
  return data;
}
