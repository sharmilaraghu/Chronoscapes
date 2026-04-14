interface MastheadProps {
  edition?: string;
  compact?: boolean;
}

export default function Masthead({ edition, compact }: MastheadProps) {
  if (compact) {
    return (
      <header className="masthead-compact">
        <span className="masthead-compact-title">Chronoscapes</span>
        <span className="masthead-compact-rule" />
        {edition ? (
          <span className="masthead-compact-edition">── {edition} ──</span>
        ) : (
          <span className="masthead-compact-subtitle">Acoustic Time Travel · Est. 2026</span>
        )}
      </header>
    );
  }

  return (
    <header className="masthead">
      <div className="masthead-red-rule" />
      <span className="masthead-ornament">✦ ──────────────────────── ✦</span>
      <h1 className="masthead-title">Chronoscapes</h1>
      <p className="masthead-subtitle">Acoustic Time Travel &middot; Est. 2026</p>
      {edition && (
        <p className="masthead-edition">── Edition: {edition} ──</p>
      )}
      <span className="masthead-ornament">✦ ──────────────────────── ✦</span>
      <div className="masthead-red-rule" />
    </header>
  );
}
