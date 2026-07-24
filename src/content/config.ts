import { defineCollection, z } from "astro:content";

const articles = defineCollection({
  schema: z.object({
    title: z.string(),
    date: z.string(),
    postSlug: z.string(),
    year: z.string(),
    month: z.string(),
    day: z.string(),
    categories: z.array(z.string()).default([]),
    categorySlugs: z.array(z.string()).default([]),
    excerpt: z.string().optional(),
    image: z.string().optional(),
    urlPath: z.string(),
  }),
});

export const collections = { articles };
