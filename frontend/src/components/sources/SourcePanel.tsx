import { useEffect, useRef, useState } from 'react';
import type { Passage } from '../../lib/types';
import ClippingCard from './ClippingCard';

interface SourcePanelProps {
  passages: Passage[];
  hasSearched: boolean;
  isLoading: boolean;
  onPassageSelect?: (passage: Passage) => void;
  selectedState?: boolean;
}

const AUTO_PROCEED_SECONDS = 8;

export default function SourcePanel({
  passages,
  hasSearched,
  isLoading,
  onPassageSelect,
  selectedState,
}: SourcePanelProps) {
  const [countdown, setCountdown] = useState(AUTO_PROCEED_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoProceedRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selectedState && passages.length > 0 && onPassageSelect) {
      setCountdown(AUTO_PROCEED_SECONDS);
      intervalRef.current = setInterval(() => {
        setCountdown((n) => Math.max(0, n - 1));
      }, 1000);
      autoProceedRef.current = setTimeout(() => {
        onPassageSelect(passages[0]);
      }, AUTO_PROCEED_SECONDS * 1000);
    } else {
      setCountdown(AUTO_PROCEED_SECONDS);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (autoProceedRef.current) clearTimeout(autoProceedRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (autoProceedRef.current) clearTimeout(autoProceedRef.current);
    };
  }, [selectedState, passages, onPassageSelect]);

  const countdownFraction = countdown / AUTO_PROCEED_SECONDS;

  const isEmpty = !isLoading && passages.length === 0;
  const noResults = isEmpty && hasSearched;

  return (
    <div className="source-panel">
      <h2 className="source-panel-header">Dispatches from the Archive</h2>

      {isLoading && (
        <div className="source-panel-loading">
          <p className="telegraph-blink">Searching the Archive</p>
          <p style={{ marginTop: '0.4rem', fontSize: '0.65rem', opacity: 0.6 }}>Retrieving historical dispatches…</p>
        </div>
      )}

      {/* No results after search */}
      {noResults && (
        <div className="source-panel-empty">
          <p className="source-panel-empty-rule">✦ ─────────────── ✦</p>
          <p className="source-panel-empty-text">No dispatches found for this query</p>
          <p className="source-panel-empty-hint">
            Try broadening your search — remove the era filter, use a larger city, or adjust the year.
          </p>
          <p className="source-panel-empty-rule">✦ ─────────────── ✦</p>
        </div>
      )}

      {/* Never searched yet */}
      {isEmpty && !hasSearched && (
        <div className="source-panel-empty">
          <p className="source-panel-empty-rule">✦ ─────────────── ✦</p>
          <p className="source-panel-empty-text">
            Search above to retrieve dispatches from the archive
          </p>
          <p className="source-panel-empty-examples">
            "Harlem, 1925" &nbsp;·&nbsp; "London, 1940" &nbsp;·&nbsp; "Chicago, 1919"
          </p>
          <p className="source-panel-empty-rule">✦ ─────────────── ✦</p>
        </div>
      )}

      {/* Countdown bar */}
      {selectedState && passages.length > 0 && (
        <div className="source-countdown-bar">
          <div
            className="source-countdown-fill"
            style={{ width: `${countdownFraction * 100}%` }}
          />
          <div className="source-countdown-label">
            <span style={{ fontFamily: 'var(--font-caption)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-ink-faded)' }}>
              Click a dispatch to compose its soundscape · auto-selects in {countdown}s
            </span>
          </div>
        </div>
      )}

      <div>
        {passages.map((passage, i) => (
          <div
            key={passage.id}
            className={selectedState ? 'clipping-wrapper clipping-wrapper--selectable' : 'clipping-wrapper'}
            onClick={() => {
              if (autoProceedRef.current) clearTimeout(autoProceedRef.current);
              if (intervalRef.current) clearInterval(intervalRef.current);
              onPassageSelect?.(passage);
            }}
          >
            <ClippingCard passage={passage} index={i} dimmed={false} />
            {selectedState && (
              <div className="clipping-select-badge">Select this dispatch →</div>
            )}
          </div>
        ))}
      </div>

      {passages.length > 0 && !selectedState && (
        <p className="source-panel-count">
          {passages.length} record{passages.length !== 1 ? 's' : ''} retrieved
        </p>
      )}
    </div>
  );
}
