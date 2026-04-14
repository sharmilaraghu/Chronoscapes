import type { Era } from '../../lib/types';
import { ERA_LABELS, ERA_YEARS } from '../../lib/types';

interface EraSelectorProps {
  selected: Era | undefined;
  onChange: (era: Era | undefined) => void;
}

const ERAS: Era[] = ['Gilded_Age', 'WWI', 'Jazz_Age', 'WWII'];

export default function EraSelector({ selected, onChange }: EraSelectorProps) {
  return (
    <div className="era-tabs flex-wrap">
      <button
        className={`era-tab${selected === undefined ? ' era-tab--active' : ''}`}
        onClick={() => onChange(undefined)}
        type="button"
      >
        All Eras
      </button>
      {ERAS.map((era) => (
        <button
          key={era}
          className={`era-tab${selected === era ? ' era-tab--active' : ''}`}
          onClick={() => onChange(era)}
          type="button"
          title={ERA_YEARS[era]}
        >
          {ERA_LABELS[era]}
        </button>
      ))}
    </div>
  );
}
