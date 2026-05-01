export type Post = {
  slug: string;
  category: string;
  categoryColor: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  content?: string;
  /**
   * Hidden from /blog listing and sitemap — style reference for the marketing bot.
   * Remove after publishing new reference articles.
   */
  hidden?: boolean;
};

export const posts: Post[] = [];
