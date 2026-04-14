import type { Passage } from '../../lib/types';
import { ERA_LABELS } from '../../lib/types';

interface ClippingCardProps {
  passage: Passage;
  index: number;
  dimmed?: boolean;
}

// Deterministic tilt from index — no random re-renders
const TILTS = ['-0.6deg', '0.5deg', '-0.9deg', '0.7deg', '-0.4deg', '0.8deg', '-0.6deg', '0.4deg'];

export default function ClippingCard({ passage, index, dimmed = false }: ClippingCardProps) {
  const tilt = TILTS[index % TILTS.length];

  const pubName = 'HISTORICAL RECORD';

  const headline = passage.title || `${ERA_LABELS[passage.era]} · ${passage.location}`;

  return (
    <article
      className="clipping-card"
      style={{
        transform: `rotate(${tilt})`,
        opacity: dimmed ? 0.5 : 1,
        transition: 'opacity 0.2s, box-shadow 0.15s, transform 0.15s',
      }}
    >
      <p className="clipping-pub">
        {pubName} &nbsp;·&nbsp; {passage.date || passage.year}
      </p>
      <hr className="section-rule" style={{ margin: '0.2rem 0 0.4rem' }} />
      <h3 className="clipping-headline">{headline}</h3>
      <p className="clipping-body">{passage.text}</p>
      <div className="clipping-footer">
        ─── {passage.location.toUpperCase()} &nbsp;·&nbsp; {ERA_LABELS[passage.era].toUpperCase()} ───
      </div>
    </article>
  );
}
