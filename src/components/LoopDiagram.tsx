/**
 * THE LOOP, DRAWN AS A LOOP.
 *
 * Five beats around a single track, with a pulse that never stops travelling:
 * register → build → share → friends join → rank rises → repeat. Pure SVG with
 * SMIL `animateMotion`, so it is one DOM node, scales like text, and simply
 * sits still under `prefers-reduced-motion`.
 */
const NODES: { x: number; y: number; label: string; step: string }[] = [
  { x: 110, y: 46, label: 'Register', step: '1' },
  { x: 320, y: 46, label: 'Get your project', step: '2' },
  { x: 530, y: 46, label: 'Share your link', step: '3' },
  { x: 430, y: 116, label: 'Friends join', step: '4' },
  { x: 200, y: 116, label: 'Rank rises', step: '5' },
];

export function LoopDiagram({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 168"
      className={className}
      role="img"
      aria-label="The growth loop: register, get your project, share your link, friends join, your rank rises — and repeat."
    >
      <title>The growth loop</title>

      {/* the track: a stadium loop through every beat */}
      <path
        d="M 110 46 H 530 C 585 46 585 116 530 116 H 110 C 55 116 55 46 110 46"
        fill="none"
        stroke="rgba(79,70,229,0.22)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="1 10"
      />

      {/* the pulse — always moving, the loop never idles */}
      <circle r="6" fill="#4F46E5">
        <animateMotion
          dur="7s"
          repeatCount="indefinite"
          path="M 110 46 H 530 C 585 46 585 116 530 116 H 110 C 55 116 55 46 110 46"
          rotate="0"
        />
        <animate attributeName="opacity" values="1;1;0.75;1" dur="7s" repeatCount="indefinite" />
      </circle>
      <circle r="11" fill="rgba(79,70,229,0.18)">
        <animateMotion
          dur="7s"
          repeatCount="indefinite"
          path="M 110 46 H 530 C 585 46 585 116 530 116 H 110 C 55 116 55 46 110 46"
          rotate="0"
        />
      </circle>

      {/* the beats */}
      {NODES.map((n) => (
        <g key={n.label}>
          <rect
            x={n.x - 88}
            y={n.y - 17}
            width="176"
            height="34"
            rx="17"
            fill="#FFFFFF"
            stroke="rgba(79,70,229,0.35)"
            strokeWidth="1.5"
          />
          <circle cx={n.x - 70} cy={n.y} r="9" fill="#EEF0FF" />
          <text
            x={n.x - 70}
            y={n.y + 3.5}
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill="#3730A3"
            fontFamily="ui-monospace, monospace"
          >
            {n.step}
          </text>
          <text
            x={n.x + 10}
            y={n.y + 4}
            textAnchor="middle"
            fontSize="13.5"
            fontWeight="600"
            fill="#0b0f19"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            {n.label}
          </text>
        </g>
      ))}

      {/* the return, named */}
      <text
        x="320"
        y="152"
        textAnchor="middle"
        fontSize="11.5"
        fontWeight="600"
        fill="#3730A3"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        ↺ and every cycle brings the next student
      </text>
    </svg>
  );
}
