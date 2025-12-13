import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  type: "content",
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.string().optional(), // Date often in directory name
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
    cover: image().optional(),
    description: z.string().optional(),
    discussionId: z.string().optional(),
  }),
});

const wiki = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    icon: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const collections = { posts, wiki };
