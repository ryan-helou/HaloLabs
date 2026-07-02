/**
 * A decorative facial-landmark mesh — a schematic constellation of nodes and
 * triangulated edges plus corner registration ticks, echoing the "technical
 * analysis" motif of aesthetics tools. It is purely ornamental: the points are
 * fixed, not measured, and it never implies a score. Rendered pointer-events-
 * none over an image panel at low opacity.
 */

// Nodes in a 100 x 125 space (matches the 4:5 panel), loosely tracing a face.
const NODES: [number, number][] = [
  [46, 16], // crown
  [34, 24], // forehead-l
  [58, 22], // forehead-r
  [26, 40], // temple-l
  [64, 38], // temple-r
  [33, 50], // eye-l
  [54, 49], // eye-r
  [43, 58], // nose bridge
  [43, 68], // nose tip
  [29, 62], // cheek-l
  [60, 60], // cheek-r
  [35, 78], // mouth-l
  [52, 77], // mouth-r
  [43, 74], // philtrum
  [27, 74], // jaw-l
  [61, 72], // jaw-r
  [43, 92], // chin
];

// Edges as index pairs — a hand-tuned triangulation, not a full mesh.
const EDGES: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4], [1, 5], [2, 6], [3, 5], [4, 6],
  [5, 6], [5, 7], [6, 7], [7, 8], [5, 9], [6, 10], [9, 8], [10, 8],
  [9, 14], [10, 15], [8, 13], [13, 11], [13, 12], [11, 12], [11, 14],
  [12, 15], [11, 16], [12, 16], [14, 16], [15, 16], [3, 9], [4, 10],
];

export default function LandmarkOverlay({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 125"
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full text-white ${className}`}
      fill="none"
      aria-hidden
    >
      {/* Corner registration ticks (bottom corners stay clear of the labels). */}
      <g stroke="currentColor" strokeWidth={0.6} opacity={0.5}>
        <path d="M4 116 h6 M4 116 v-6" />
        <path d="M96 116 h-6 M96 116 v-6" />
      </g>

      {/* Faint dashed centre guide. */}
      <line
        x1="50"
        y1="8"
        x2="50"
        y2="100"
        stroke="currentColor"
        strokeWidth={0.4}
        strokeDasharray="1.5 3"
        opacity={0.28}
      />

      {/* Triangulated edges. */}
      <g stroke="currentColor" strokeWidth={0.45} opacity={0.42}>
        {EDGES.map(([a, b], i) => (
          <line
            key={i}
            x1={NODES[a][0]}
            y1={NODES[a][1]}
            x2={NODES[b][0]}
            y2={NODES[b][1]}
          />
        ))}
      </g>

      {/* Nodes. */}
      <g fill="currentColor" opacity={0.75}>
        {NODES.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={0.9} />
        ))}
      </g>
    </svg>
  );
}
