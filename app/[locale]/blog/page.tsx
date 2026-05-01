import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";

import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";
import { posts } from "@/lib/blog-posts";

const visiblePosts = posts.filter((p) => !p.hidden);

export const metadata: Metadata = {
  title: "Blog — MailKit",
  description:
    "Guides, comparisons, and tips on email setup, DNS, deliverability, and building a professional inbox on your domain.",
  openGraph: {
    title: "Blog — MailKit",
    description:
      "Guides, comparisons, and tips on email setup, DNS, deliverability, and building a professional inbox on your domain.",
    url: "https://getmailkit.com/blog",
    type: "website",
  },
};

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-surface-base pb-24 px-4 sm:px-6">
        <section className="pt-36 pb-14 text-center max-w-2xl mx-auto">
          <h1 className="text-mk-text-primary text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Blog
          </h1>
          <p className="text-mk-text-secondary text-base sm:text-lg">
            Guides, comparisons, and tips on setting up professional email on
            your own domain.
          </p>
        </section>

        <div className="max-w-4xl mx-auto">
          {visiblePosts.length === 0 ? (
            <p className="text-center text-mk-text-tertiary text-sm py-16">
              No posts yet — check back soon.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {visiblePosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col rounded-2xl bg-surface-elevated border border-mk-border-subtle p-6 hover:border-mk-border-strong transition-colors"
                >
                  <span
                    className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mb-4 self-start"
                    style={{
                      background: `${post.categoryColor}18`,
                      color: post.categoryColor,
                    }}
                  >
                    {post.category}
                  </span>
                  <h2 className="text-mk-text-primary font-semibold text-base leading-snug mb-2 group-hover:text-mk-accent transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-mk-text-secondary text-sm leading-relaxed mb-4 flex-grow line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-mk-text-tertiary mt-auto">
                    <span>{post.date}</span>
                    <span className="w-1 h-1 rounded-full bg-mk-border-strong" />
                    <span>{post.readTime} read</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
