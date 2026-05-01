import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { marked } from "marked";
import { setRequestLocale } from "next-intl/server";

import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";
import { posts } from "@/lib/blog-posts";

marked.setOptions({ gfm: true, breaks: false });

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post || post.hidden) return { title: "Post not found" };
  const ogImage = `https://getmailkit.com/blog/${post.slug}/opengraph-image`;
  return {
    title: `${post.title} — MailKit Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://getmailkit.com/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [ogImage],
    },
  };
}

export async function generateStaticParams() {
  return posts.filter((p) => !p.hidden).map((p) => ({ slug: p.slug }));
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  setRequestLocale(locale);

  const post = posts.find((p) => p.slug === slug);
  if (!post || post.hidden) notFound();

  const cleanContent = (post.content || "").replace(/\[📸[^\]]*\]/g, "");
  const html = cleanContent ? await marked.parse(cleanContent) : "";

  // Extract H2 headings for Table of Contents
  const headings = cleanContent
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => {
      const text = line.replace(/^##\s+/, "").trim();
      const id = text
        .toLowerCase()
        .replace(/["""''']/g, "")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      return { text, id };
    });

  // Add ids to H2 elements
  let htmlWithIds = html;
  for (const h of headings) {
    htmlWithIds = htmlWithIds.replace(
      `<h2>${h.text}</h2>`,
      `<h2 id="${h.id}">${h.text}</h2>`,
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-surface-base pt-36 pb-24 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {/* Back */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-mk-text-tertiary hover:text-mk-text-secondary text-sm mb-10 transition-colors"
          >
            <span>←</span> All posts
          </Link>

          {/* Meta */}
          <div className="mb-8">
            <span
              className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mb-4"
              style={{
                background: `${post.categoryColor}18`,
                color: post.categoryColor,
              }}
            >
              {post.category}
            </span>
            <h1 className="text-mk-text-primary text-2xl sm:text-3xl font-bold leading-snug tracking-tight mb-4">
              {post.title}
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-mk-text-tertiary text-sm">{post.date}</span>
              <span className="w-1 h-1 rounded-full bg-mk-border-strong" />
              <span className="text-mk-text-tertiary text-sm">
                {post.readTime} read
              </span>
            </div>
          </div>

          {/* Category banner */}
          <div
            className="w-full h-40 sm:h-52 rounded-2xl mb-10 flex items-center justify-center"
            style={{ background: `${post.categoryColor}12` }}
          >
            <span
              className="text-4xl font-bold tracking-tight"
              style={{ color: post.categoryColor }}
            >
              {post.category}
            </span>
          </div>

          {/* Table of Contents */}
          {headings.length >= 3 && (
            <nav className="mb-10 rounded-xl border border-mk-border-subtle bg-surface-elevated">
              <details open>
                <summary className="cursor-pointer select-none p-5 text-mk-text-tertiary text-xs font-semibold uppercase tracking-wider list-none flex items-center justify-between [&::-webkit-details-marker]:hidden">
                  Contents
                  <svg
                    className="w-4 h-4 text-mk-text-tertiary transition-transform [[open]>&]:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <ol className="space-y-2 px-5 pb-5 list-none">
                  {headings.map((h, i) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className="text-mk-text-secondary hover:text-mk-accent text-sm transition-colors flex items-baseline gap-2"
                      >
                        <span className="text-mk-text-tertiary text-xs font-mono min-w-[1.2rem]">
                          {i + 1}.
                        </span>
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            </nav>
          )}

          {/* Content */}
          <article
            className="
              [&_h2]:text-mk-text-primary [&_h2]:text-xl [&_h2]:sm:text-2xl [&_h2]:font-bold
              [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:pb-3 [&_h2]:border-b [&_h2]:border-mk-border-subtle
              [&_p]:text-mk-text-secondary [&_p]:leading-relaxed [&_p]:mb-5
              [&_a]:text-mk-accent [&_a]:no-underline [&_a:hover]:underline
              [&_strong]:text-mk-text-primary [&_strong]:font-semibold
              [&_em]:text-mk-text-secondary [&_em]:italic
              [&_code]:bg-surface-elevated [&_code]:text-[#a78bfa] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm
              [&_pre]:bg-surface-elevated [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-6
              [&_blockquote]:border-l-4 [&_blockquote]:border-mk-accent [&_blockquote]:pl-4 [&_blockquote]:text-mk-text-secondary [&_blockquote]:my-6
              [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-4
              [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:my-4
              [&_li]:text-mk-text-secondary [&_li]:mb-2
              [&_hr]:border-mk-border-subtle [&_hr]:my-8
              [&_img]:rounded-xl [&_img]:w-full [&_img]:my-6
            "
            dangerouslySetInnerHTML={{ __html: htmlWithIds }}
          />

          {/* Back link */}
          <div className="mt-12 pt-8 border-t border-mk-border-subtle">
            <Link
              href="/blog"
              className="text-sm text-mk-text-tertiary hover:text-mk-accent transition-colors"
            >
              ← Back to all posts
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
