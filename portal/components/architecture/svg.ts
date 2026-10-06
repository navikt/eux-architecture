/** Orthogonal polyline with rounded corners, as an SVG path string. */
export function rounded(pts: [number, number][], r = 12): string {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const d1 = Math.hypot(x1 - x0, y1 - y0);
    const d2 = Math.hypot(x2 - x1, y2 - y1);
    const rr = Math.min(r, d1 / 2, d2 / 2);
    const ax = x1 + ((x0 - x1) / d1) * rr;
    const ay = y1 + ((y0 - y1) / d1) * rr;
    const bx = x1 + ((x2 - x1) / d2) * rr;
    const by = y1 + ((y2 - y1) / d2) * rr;
    d += ` L ${ax} ${ay} Q ${x1} ${y1} ${bx} ${by}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  return `${d} L ${lx} ${ly}`;
}

/** Keyboard handler that treats Enter and Space as a click. */
export const onActivate =
  (fn: () => void) =>
  (ev: React.KeyboardEvent): void => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      fn();
    }
  };
