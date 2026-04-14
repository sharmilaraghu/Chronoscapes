import { useEffect, useState } from 'react';
import type { Era } from '../../lib/types';
import EraSelector from './EraSelector';

interface SearchBarProps {
  onSearch: (query: string, era: Era | undefined) => void;
  isLoading: boolean;
  externalQuery?: string; // pre-fills the box when user clicks the map
}

const PLACEHOLDERS = [
  'Harlem on a rainy night, 1925…',
  'Chicago stockyards district, 1919…',
  'New York harbour at dawn, 1905…',
  'London street market, 1940…',
  'San Francisco docks, 1917…',
];

export default function SearchBar({ onSearch, isLoading, externalQuery }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [era, setEra] = useState<Era | undefined>(undefined);
  const [placeholderIdx] = useState(() => Math.floor(Math.random() * PLACEHOLDERS.length));

  useEffect(() => {
    if (externalQuery) setQuery(externalQuery);
  }, [externalQuery]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), era);
    }
  }

  return (
    <form className="dispatch-form" onSubmit={handleSubmit}>
      <div className="dispatch-row">
        <div className="dispatch-field dispatch-field--query">
          <input
            id="query-input"
            className="dispatch-input dispatch-input--query"
            type="text"
            placeholder={PLACEHOLDERS[placeholderIdx]}
            maxLength={200}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            autoComplete="off"
          />
        </div>

        <div className="dispatch-field dispatch-field--btn">
          <button
            className={`dispatch-button${isLoading ? ' telegraph-blink' : ''}`}
            type="submit"
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? 'Searching…' : 'Search Archive'}
          </button>
        </div>
      </div>

      <div className="era-row">
        <span className="era-row-label">Era:</span>
        <EraSelector selected={era} onChange={setEra} />
      </div>
    </form>
  );
}
