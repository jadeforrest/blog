import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/posts",
    generateId: ({ entry }) => entry, // preserve legacy id: "YYYY-MM-DD--slug/index.mdx"
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.string().optional(), // Date often in directory name
      author: z.string().optional(),
      tags: z.array(z.string()).optional(),
      cover: image().optional(),
      description: z.string().optional(),
      discussionId: z.string().optional(),
      kitEmails: z.string().optional(),
      kitSyncHash: z.string().optional(),
    }),
});

const wiki = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/wiki",
    generateId: ({ entry }) => entry, // preserve legacy id: "path/index.md"
  }),
  schema: z.object({
    title: z.string(),
    icon: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const collections = { posts, wiki };
