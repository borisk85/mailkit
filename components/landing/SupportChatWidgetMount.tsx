"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const SupportChatWidget = dynamic(() => import("./SupportChatWidget"), {
  ssr: false,
});

export default function SupportChatWidgetMount() {
  const pathname = usePathname();
  // Dashboard has its own Email support link; hide widget there to
  // prevent the fixed bubble from overlapping card content on mobile.
  if (pathname.includes("/app")) return null;
  return <SupportChatWidget />;
}
