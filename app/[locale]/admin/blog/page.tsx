import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { posts } from "@/lib/blog-posts";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

const GITHUB_FILE_URL =
  "https://github.com/borisk85/mailkit/edit/main/lib/blog-posts.ts";

export default async function AdminBlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(user.email ?? "")) {
    notFound();
  }

  const visible = posts.filter((p) => !p.hidden);
  const hidden = posts.filter((p) => p.hidden);

  return (
    <main className="min-h-screen bg-surface-base px-4 sm:px-6 pt-24 pb-20">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-mk-text-primary text-2xl font-bold tracking-tight">
              Blog admin
            </h1>
            <p className="text-mk-text-tertiary text-sm mt-1">
              {visible.length} published · {hidden.length} hidden
            </p>
          </div>
          <a
            href={GITHUB_FILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-mk-accent hover:bg-mk-accent-hover text-white text-sm font-medium transition-colors"
          >
            Edit blog-posts.ts on GitHub ↗
          </a>
        </div>

        {/* Published posts */}
        <section className="mb-10">
          <h2 className="text-mk-text-secondary text-xs font-semibold uppercase tracking-widest mb-4">
            Published ({visible.length})
          </h2>
          <div className="space-y-2">
            {visible.length === 0 && (
              <p className="text-mk-text-tertiary text-sm py-4">
                No posts yet. Use /article in the marketing bot to generate the
                first one.
              </p>
            )}
            {visible.map((post) => (
              <div
                key={post.slug}
                className="flex items-center justify-between gap-4 p-4 rounded-xl border border-mk-border-subtle bg-surface-elevated"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        background: `${post.categoryColor}18`,
                        color: post.categoryColor,
                      }}
                    >
                      {post.category}
                    </span>
                    <span className="text-mk-text-tertiary text-xs">
                      {post.date} · {post.readTime} read
                    </span>
                  </div>
                  <p className="text-mk-text-primary text-sm font-medium truncate">
                    {post.title}
                  </p>
                  <p className="text-mk-text-tertiary text-xs mt-0.5 font-mono">
                    {post.slug}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    className="px-3 py-1.5 rounded-lg border border-mk-border-subtle text-mk-text-secondary hover:text-mk-text-primary text-xs transition-colors"
                  >
                    View
                  </Link>
                  <a
                    href={GITHUB_FILE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-mk-border-subtle text-mk-text-secondary hover:text-mk-accent text-xs transition-colors"
                  >
                    Edit
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Hidden posts */}
        {hidden.length > 0 && (
          <section>
            <h2 className="text-mk-text-secondary text-xs font-semibold uppercase tracking-widest mb-4">
              Hidden / drafts ({hidden.length})
            </h2>
            <div className="space-y-2">
              {hidden.map((post) => (
                <div
                  key={post.slug}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl border border-mk-border-subtle bg-surface-elevated opacity-60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-mk-text-secondary text-sm font-medium truncate">
                      {post.title}
                    </p>
                    <p className="text-mk-text-tertiary text-xs mt-0.5 font-mono">
                      {post.slug}
                    </p>
                  </div>
                  <a
                    href={GITHUB_FILE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-mk-border-subtle text-mk-text-tertiary hover:text-mk-accent text-xs transition-colors shrink-0"
                  >
                    Edit
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Instructions */}
        <div className="mt-12 p-5 rounded-xl border border-mk-border-subtle bg-surface-elevated">
          <h3 className="text-mk-text-primary text-sm font-semibold mb-3">
            How to publish a new article
          </h3>
          <ol className="space-y-1.5 text-mk-text-secondary text-sm list-decimal ml-4">
            <li>
              In the marketing bot, switch to MailKit project:{" "}
              <code className="text-xs bg-surface-base px-1.5 py-0.5 rounded font-mono">
                /project mailkit
              </code>
            </li>
            <li>
              Run{" "}
              <code className="text-xs bg-surface-base px-1.5 py-0.5 rounded font-mono">
                /article
              </code>{" "}
              and describe the topic
            </li>
            <li>
              Bot creates a PR in{" "}
              <code className="text-xs bg-surface-base px-1.5 py-0.5 rounded font-mono">
                article/*
              </code>{" "}
              branch
            </li>
            <li>Add screenshots with /screenshot on the PR branch</li>
            <li>Merge the PR → Vercel deploys automatically</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
