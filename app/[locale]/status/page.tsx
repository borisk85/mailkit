import { redirect } from "next/navigation";

/**
 * Status now lives on Better Stack (status.getmailkit.com) with real
 * uptime monitoring. The old hand-maintained page is gone — this just
 * forwards anyone hitting /status to the live status page.
 */
export default function StatusPage() {
  redirect("https://status.getmailkit.com");
}
