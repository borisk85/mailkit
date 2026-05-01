export type Post = {
  slug: string;
  category: string;
  categoryColor: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  content?: string;
  /** Hidden from /blog listing and sitemap. Style reference for the marketing bot. */
  hidden?: boolean;
};

export const posts: Post[] = [];
