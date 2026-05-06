/**
 * Gmail wizard step schematics — stylized SVG illustrations that
 * sit at the top of each Gmail Send-As step body per
 * UI_REVIEW_BRIEF §3.3. Architect's call: real Gmail screenshots are
 * a post-launch deliverable; for the premium pass we ship branded
 * schematics so each step has a visual anchor before the
 * copy-paste fields.
 *
 * All six schematics share the same chrome (rounded card border,
 * accent highlights on the field that's relevant to the step). They
 * render at width:100% / max-width 480px / aspect-ratio 16/9.
 */
type StepId =
  | "openSettings"
  | "senderInfo"
  | "smtpSettings"
  | "verificationEmail"
  | "confirm"
  | "done";

const accent = "#7C5CFF";
const ink = "currentColor";

export function GmailStepSchematic({ id }: { id: StepId }) {
  return (
    <div className="mb-4 w-full max-w-[480px] overflow-hidden rounded-xl border border-mk-border-subtle bg-surface-elevated p-6">
      <svg
        viewBox="0 0 480 270"
        className="h-auto w-full text-mk-text-tertiary"
        role="img"
        aria-hidden
      >
        {renderSchematic(id)}
      </svg>
    </div>
  );
}

function renderSchematic(id: StepId) {
  switch (id) {
    case "openSettings":
      return (
        <>
          <rect
            x="20"
            y="30"
            width="440"
            height="210"
            rx="12"
            fill="none"
            stroke={ink}
            strokeWidth="1.5"
            opacity="0.4"
          />
          <text x="40" y="60" fontSize="11" fill={ink} opacity="0.5">
            Gmail / Settings
          </text>
          <rect
            x="40"
            y="80"
            width="180"
            height="14"
            rx="3"
            fill={ink}
            opacity="0.15"
          />
          <rect
            x="40"
            y="104"
            width="220"
            height="10"
            rx="3"
            fill={ink}
            opacity="0.1"
          />
          <g transform="translate(360, 80)">
            <circle cx="20" cy="20" r="20" fill={accent} opacity="0.16" />
            <path
              d="M20 11l9 6-9 6-9-6 9-6zm0 13l9-6v9l-9 6-9-6v-9l9 6z"
              fill={accent}
            />
          </g>
          <text x="40" y="160" fontSize="11" fill={accent} fontWeight="600">
            Accounts and Import →
          </text>
          <rect
            x="40"
            y="172"
            width="200"
            height="2"
            fill={accent}
            opacity="0.6"
          />
          <text x="40" y="210" fontSize="10" fill={ink} opacity="0.5">
            mail.google.com/mail/u/0/#settings/accounts
          </text>
        </>
      );

    case "senderInfo":
      return (
        <>
          <rect
            x="20"
            y="30"
            width="440"
            height="210"
            rx="12"
            fill="none"
            stroke={ink}
            strokeWidth="1.5"
            opacity="0.4"
          />
          <text x="40" y="60" fontSize="11" fill={ink} opacity="0.5">
            Add another email address
          </text>
          <text x="40" y="100" fontSize="10" fill={ink} opacity="0.5">
            Name
          </text>
          <rect
            x="40"
            y="108"
            width="380"
            height="32"
            rx="6"
            fill={accent}
            opacity="0.06"
            stroke={accent}
            strokeOpacity="0.5"
          />
          <text x="52" y="129" fontSize="13" fill={accent} fontWeight="600">
            Your Name
          </text>
          <text x="40" y="170" fontSize="10" fill={ink} opacity="0.5">
            Email address
          </text>
          <rect
            x="40"
            y="178"
            width="380"
            height="32"
            rx="6"
            fill={accent}
            opacity="0.06"
            stroke={accent}
            strokeOpacity="0.5"
          />
          <text
            x="52"
            y="199"
            fontSize="13"
            fill={accent}
            fontFamily="ui-monospace, monospace"
            fontWeight="600"
          >
            hello@yourdomain.com
          </text>
        </>
      );

    case "smtpSettings":
      return (
        <>
          <rect
            x="20"
            y="20"
            width="440"
            height="230"
            rx="12"
            fill="none"
            stroke={ink}
            strokeWidth="1.5"
            opacity="0.4"
          />
          <text x="40" y="50" fontSize="11" fill={ink} opacity="0.5">
            SMTP Server
          </text>
          {[
            { label: "Server", value: "smtp.postmarkapp.com", y: 60 },
            { label: "Port", value: "587", y: 105 },
            { label: "Username", value: "(server token)", y: 150 },
            { label: "Password", value: "••••••••••", y: 195 },
          ].map((row) => (
            <g key={row.label}>
              <rect
                x="40"
                y={row.y + 10}
                width="380"
                height="30"
                rx="6"
                fill={accent}
                opacity="0.06"
                stroke={accent}
                strokeOpacity="0.45"
              />
              <text
                x="52"
                y={row.y + 22}
                fontSize="9"
                fill={ink}
                opacity="0.55"
              >
                {row.label}
              </text>
              <text
                x="52"
                y={row.y + 35}
                fontSize="12"
                fill={accent}
                fontFamily="ui-monospace, monospace"
                fontWeight="600"
              >
                {row.value}
              </text>
            </g>
          ))}
        </>
      );

    case "verificationEmail":
      return (
        <>
          <rect
            x="60"
            y="40"
            width="360"
            height="190"
            rx="12"
            fill="none"
            stroke={ink}
            strokeWidth="1.5"
            opacity="0.4"
          />
          <rect
            x="80"
            y="60"
            width="320"
            height="10"
            rx="3"
            fill={ink}
            opacity="0.15"
          />
          <rect
            x="80"
            y="80"
            width="200"
            height="8"
            rx="3"
            fill={ink}
            opacity="0.1"
          />
          <rect
            x="80"
            y="100"
            width="280"
            height="8"
            rx="3"
            fill={ink}
            opacity="0.1"
          />
          <rect
            x="80"
            y="118"
            width="240"
            height="8"
            rx="3"
            fill={ink}
            opacity="0.1"
          />
          <g transform="translate(180, 150)">
            <rect
              width="120"
              height="44"
              rx="22"
              fill={accent}
              opacity="0.12"
            />
            <text
              x="60"
              y="28"
              fontSize="13"
              fill={accent}
              fontWeight="700"
              textAnchor="middle"
            >
              Confirm
            </text>
          </g>
          <text
            x="240"
            y="216"
            fontSize="10"
            fill={ink}
            opacity="0.55"
            textAnchor="middle"
          >
            Verification email arrives in your inbox
          </text>
        </>
      );

    case "confirm":
      return (
        <>
          <rect
            x="20"
            y="30"
            width="440"
            height="210"
            rx="12"
            fill="none"
            stroke={ink}
            strokeWidth="1.5"
            opacity="0.4"
          />
          <text x="40" y="60" fontSize="11" fill={ink} opacity="0.5">
            Send mail as
          </text>
          <rect
            x="40"
            y="80"
            width="380"
            height="50"
            rx="8"
            fill={accent}
            opacity="0.06"
            stroke={accent}
            strokeOpacity="0.5"
          />
          <text
            x="56"
            y="103"
            fontSize="13"
            fill={accent}
            fontFamily="ui-monospace, monospace"
            fontWeight="700"
          >
            hello@yourdomain.com
          </text>
          <text x="56" y="120" fontSize="10" fill={ink} opacity="0.55">
            Use as default · verified
          </text>
          <g transform="translate(380, 95)">
            <circle cx="14" cy="14" r="14" fill={accent} opacity="0.18" />
            <path
              d="M9 14.5l3.5 3.5L20 10.5"
              fill="none"
              stroke={accent}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </>
      );

    case "done":
      return (
        <>
          <g transform="translate(140, 60)">
            <circle cx="100" cy="80" r="60" fill={accent} opacity="0.12" />
            <path
              d="M70 82l22 22 38-46"
              fill="none"
              stroke={accent}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <text
            x="240"
            y="220"
            fontSize="12"
            fill={ink}
            opacity="0.7"
            textAnchor="middle"
            fontWeight="600"
          >
            Send-As verified
          </text>
        </>
      );
  }
}
