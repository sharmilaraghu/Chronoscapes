import type { ChunkAnalysis } from '../../lib/types';
import DispatchCard from './DispatchCard';

interface SourcePanelProps {
  analyzedChunks: ChunkAnalysis[];
  rawTextById: Map<string, string>;
  selectedChunkIds: string[];
  onToggleChunk: (id: string) => void;
  onConfirmSelection: () => void;
  appState: string;
  hasSearched: boolean;
}

export default function SourcePanel({
  analyzedChunks,
  rawTextById,
  selectedChunkIds,
  onToggleChunk,
  onConfirmSelection,
  appState,
  hasSearched,
}: SourcePanelProps) {
  const isLoading = appState === 'analyzing';
  const isSynthesizing = appState === 'synthesizing';
  const isEmpty = !isLoading && analyzedChunks.length === 0;
  const noResults = isEmpty && hasSearched;

  // Sort: soundKeywords desc, failed last
  const sortedChunks = [...analyzedChunks].sort((a, b) => {
    if (a.error && !b.error) return 1;
    if (!a.error && b.error) return -1;
    return b.soundKeywords.length - a.soundKeywords.length;
  });

  return (
    <div className="source-panel">
      <h2 className="source-panel-header">Dispatches from the Archive</h2>

      {/* Loading state — analyzing chunks */}
      {isLoading && (
        <div className="source-panel-loading">
          <p className="telegraph-blink">Analyzing Archive Dispatches</p>
          <p style={{ marginTop: '0.4rem', fontSize: '0.65rem', opacity: 0.6 }}>
            Extracting sound signatures from historical records…
          </p>
          <div className="dispatch-loading-skeleton">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        </div>
      )}

      {/* Synthesizing state */}
      {isSynthesizing && (
        <div className="source-panel-loading">
          <p className="telegraph-blink">Composing Soundscape</p>
          <p style={{ marginTop: '0.4rem', fontSize: '0.65rem', opacity: 0.6 }}>
            Merging selected dispatches into a coherent audio scene…
          </p>
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

      {/* Dispatch cards — sorted by soundKeywords count */}
      {sortedChunks.length > 0 && !isLoading && !isSynthesizing && (
        <>
          <div className="dispatch-selection-hint">
            <span>Select 1–3 dispatches to compose your soundscape</span>
            <span className="dispatch-selection-count">
              {selectedChunkIds.length}/3 selected
            </span>
          </div>

          <div className="dispatch-list">
            {sortedChunks.map((chunk, i) => (
              <DispatchCard
                key={chunk.id}
                analysis={chunk}
                rawText={rawTextById.get(chunk.id) ?? ''}
                selected={selectedChunkIds.includes(chunk.id)}
                onToggle={onToggleChunk}
                index={i}
              />
            ))}
          </div>

          {/* Confirm button — only when in selected state */}
          {appState === 'selected' && selectedChunkIds.length > 0 && (
            <button
              className="dispatch-confirm-button"
              onClick={onConfirmSelection}
              type="button"
            >
              ✦ Compose Soundscape ({selectedChunkIds.length} dispatch{selectedChunkIds.length !== 1 ? 's' : ''})
            </button>
          )}
        </>
      )}
    </div>
  );
}