import React, { useEffect, useState } from 'react';
import { warmCache } from './lib/api';
import type { Era } from './lib/types';
import { useChronoscape } from './hooks/useChronoscape';
import LandingPage from './components/LandingPage';

import Masthead from './components/layout/Masthead';
import NewspaperLayout from './components/layout/NewspaperLayout';
import SearchBar from './components/search/SearchBar';
import ChronoscapeMap from './components/map/ChronoscapeMap';
import AudioPlayer from './components/audio/AudioPlayer';
import SourcePanel from './components/sources/SourcePanel';
import ReconstructedScene from './components/ReconstructedScene';

const STEPS = [
  { key: 'query',    label: '① Query the Archive' },
  { key: 'analyze',  label: '② Analyze Dispatches' },
  { key: 'select',   label: '③ Select & Compose' },
  { key: 'listen',   label: '④ Listen' },
] as const;

function getActiveStep(appState: string) {
  if (appState === 'idle') return 'query';
  if (appState === 'searching' || appState === 'analyzing') return 'analyze';
  if (appState === 'selected' || appState === 'synthesizing') return 'select';
  if (appState === 'ready') return 'listen';
  return 'query';
}

export default function App() {
  const [hasEntered, setHasEntered] = useState(false);

  const {
    appState,
    passages,
    analyzedChunks,
    selectedChunkIds,
    rawTextById,
    synthesizedScene,
    musicUrl,
    sfxUrl,
    hasSearched,
    error,
    musicDuration,
    setMusicDuration,
    search,
    selectChunk,
    deselectChunk,
    confirmSelection,
    reset,
  } = useChronoscape();

  const [currentPlace, setCurrentPlace] = useState('');
  const [currentEra, setCurrentEra] = useState<Era | undefined>(undefined);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);
  const [mapQuery, setMapQuery] = useState<string | undefined>(undefined);

  useEffect(() => {
    warmCache();
  }, []);

  async function handleSearch(query: string, era: Era | undefined) {
    setCurrentPlace(query);
    setCurrentEra(era);
    await search(query, era);
  }

  function handleLocationSelect(placeName: string, coords: [number, number]) {
    setMapCenter(coords);
    setCurrentPlace(placeName);
    setMapQuery(placeName);
    search(placeName, currentEra);
  }

  function handleToggleChunk(id: string) {
    if (selectedChunkIds.includes(id)) {
      deselectChunk(id);
    } else {
      selectChunk(id);
    }
  }

  const isLoading = appState === 'searching' || appState === 'analyzing' || appState === 'synthesizing';
  const activeStep = getActiveStep(appState);

  const edition =
    currentPlace
      ? `${currentPlace}${passages[0] ? ` · ${passages[0].year}` : ''}`
      : undefined;

  if (!hasEntered) {
    return <LandingPage onEnter={() => setHasEntered(true)} />;
  }

  return (
    <div className="app-shell">
      <Masthead edition={edition} compact onTitleClick={() => setHasEntered(false)} />

      {/* Search bar */}
      <div className="search-bar-strip">
        <SearchBar onSearch={handleSearch} isLoading={isLoading} externalQuery={mapQuery} />
      </div>

      {/* Step progress indicator */}
      <div className="step-indicator">
        {STEPS.map((step, i) => (
          <React.Fragment key={step.key}>
            <span className={`step-label${activeStep === step.key ? ' step-label--active' : ''}`}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && <span className="step-arrow">──→</span>}
          </React.Fragment>
        ))}
      </div>

      {/* Error banner */}
      {appState === 'error' && error && (
        <div className="stop-press" style={{ margin: '0 1rem 0.5rem' }}>
          <p className="stop-press-header">Stop Press</p>
          <p style={{ fontFamily: 'var(--font-caption)', fontSize: '0.8rem', marginTop: '0.4rem', color: 'var(--color-ink-faded)' }}>
            {error}
          </p>
        </div>
      )}

      {/* Three-column layout */}
      <div className={`layout-body${appState === 'ready' ? ' layout-body--ready' : ''}`}>
        <NewspaperLayout
          showCenter={appState === 'ready' && (!!musicUrl || !!sfxUrl)}
          left={
            <div className={appState === 'ready' ? 'map-panel map-panel--compact' : 'map-panel'}>
              <ChronoscapeMap
                center={mapCenter}
                locationLabel={currentPlace}
                onLocationSelect={handleLocationSelect}
              />
            </div>
          }
          center={
            <>
              {/* Audio player — top, only when ready AND audio is present */}
              {appState === 'ready' && (musicUrl || sfxUrl) ? (
                <AudioPlayer
                  musicUrl={musicUrl}
                  sfxUrl={sfxUrl}
                  synthesizedPrompt={synthesizedScene?.sfxPrompt ?? synthesizedScene?.musicPrompt ?? null}
                  era={currentEra}
                  location={currentPlace}
                  appState={appState}
                  onReset={reset}
                />
              ) : null}

              {/* Scene reconstruction — below radio, only when ready */}
              {appState === 'ready' && synthesizedScene ? (
                <ReconstructedScene
                  scene={synthesizedScene}
                  musicUrl={musicUrl ?? null}
                  sfxUrl={sfxUrl ?? null}
                />
              ) : null}
            </>
          }
          right={
            <SourcePanel
              analyzedChunks={analyzedChunks}
              rawTextById={rawTextById}
              selectedChunkIds={selectedChunkIds}
              onToggleChunk={handleToggleChunk}
              onConfirmSelection={confirmSelection}
              appState={appState}
              hasSearched={hasSearched}
              musicDuration={musicDuration}
              onMusicDurationChange={setMusicDuration}
            />
          }
        />
      </div>

      <footer className="app-footer">
        Chronoscapes · Acoustic Time Travel · Est. 2026 · All sounds synthesised — no recordings used
      </footer>
    </div>
  );
}