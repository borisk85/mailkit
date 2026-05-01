"use client";

import dynamic from "next/dynamic";

const SupportChatWidget = dynamic(() => import("./SupportChatWidget"), {
  ssr: false,
});

export default function SupportChatWidgetMount() {
  return <SupportChatWidget />;
}
