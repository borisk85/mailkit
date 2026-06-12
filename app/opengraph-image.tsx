import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "MailKit — Professional email on your domain without the DNS headache";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadGoogleFont(family: string, weight: number, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const match = css.match(
    /src: url\((.+?)\) format\('(woff2?|opentype|truetype)'\)/,
  );
  if (!match) throw new Error("Failed to parse Google Font CSS");
  return fetch(match[1]).then((r) => r.arrayBuffer());
}

export default async function Image() {
  const badge = "EMAIL SETUP AUTOMATION";
  const logoText = "MailKit";
  const tagline =
    "Professional email on your domain — without the DNS headache.";
  const features = [
    "Cloudflare Email Routing",
    "Postmark SMTP",
    "Gmail Send-As",
    "SPF · DKIM · DMARC",
  ];
  const bottomLine = "$5 one-time · getmailkit.com";
  const allText = badge + logoText + tagline + features.join("") + bottomLine;

  const [interBold, interBlack] = await Promise.all([
    loadGoogleFont("Inter", 700, allText),
    loadGoogleFont("Inter", 900, logoText + badge),
  ]);

  return new ImageResponse(
    <div
      style={{
        background: "#07090F",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Gradient blobs */}
      <div
        style={{
          position: "absolute",
          top: -140,
          left: -140,
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: "rgba(37,99,235,0.22)",
          filter: "blur(90px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -120,
          right: -120,
          width: 440,
          height: 440,
          borderRadius: "50%",
          background: "rgba(139,92,246,0.16)",
          filter: "blur(90px)",
        }}
      />

      {/* Top badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(37,99,235,0.14)",
          border: "1px solid rgba(37,99,235,0.38)",
          borderRadius: 999,
          padding: "6px 20px",
          marginBottom: 30,
        }}
      >
        <span
          style={{
            color: "#60A5FA",
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: 2.5,
          }}
        >
          {badge}
        </span>
      </div>

      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 26,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://getmailkit.com/brand/mailkit-icon.png"
          alt="MailKit"
          width={68}
          height={68}
          style={{ borderRadius: 16 }}
        />
        <span
          style={{
            color: "#F8FAFC",
            fontSize: 58,
            fontWeight: 900,
            letterSpacing: 1,
          }}
        >
          {logoText}
        </span>
      </div>

      {/* Tagline */}
      <p
        style={{
          color: "#CBD5E1",
          fontSize: 24,
          fontWeight: 700,
          textAlign: "center",
          maxWidth: 860,
          lineHeight: 1.45,
          margin: 0,
          padding: "0 40px",
        }}
      >
        {tagline}
      </p>

      {/* Feature badges */}
      <div style={{ display: "flex", gap: 12, marginTop: 40 }}>
        {features.map((f) => (
          <div
            key={f}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.11)",
              borderRadius: 8,
              padding: "9px 18px",
              color: "#94A3B8",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {f}
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          color: "#64748B",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: 1,
        }}
      >
        {bottomLine}
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Inter", data: interBold, weight: 700, style: "normal" },
        { name: "Inter", data: interBlack, weight: 900, style: "normal" },
      ],
    },
  );
}
