/**
 * A framed surface for SVG diagrams and other illustrations.
 *
 * The diagrams draw every fill, stroke and text colour from Aksel `--ax-*`
 * design tokens, so they re-theme themselves in dark mode. This wrapper is just
 * a neutral, theme-aware card that frames them consistently in both themes.
 */
export function DiagramSurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`portal-diagram${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}
