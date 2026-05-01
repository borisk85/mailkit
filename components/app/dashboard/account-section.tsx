import { useTranslations } from "next-intl";

export function AccountSection({
  email,
  fullName,
}: {
  email: string;
  fullName: string | null;
}) {
  const t = useTranslations("dashboard.account");

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-mk-text-primary">
        {t("title")}
      </h2>
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-mk-text-tertiary">{t("emailLabel")}</dt>
          <dd className="text-zinc-900 dark:text-zinc-100">{email}</dd>
          {fullName ? (
            <>
              <dt className="text-mk-text-tertiary">{t("nameLabel")}</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{fullName}</dd>
            </>
          ) : null}
        </dl>
      </div>
    </section>
  );
}
