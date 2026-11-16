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
    /** Mis en avant sur la page d'accueil (section « À la une »). */
    featured: z.boolean().default(false),
  }),
});

export const collections = { articles };
