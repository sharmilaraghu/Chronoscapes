import React, { useEffect, useState } from 'react';
import { warmCache } from './lib/api';
import type { Era, Passage } from './lib/types';
import { useChronoscope } from './hooks/useChronoscope';
import LandingPage from './components/LandingPage';

import Masthead from './components/layout/Masthead';
import NewspaperLayout from './components/layout/NewspaperLayout';
import SearchBar from './components/search/SearchBar';
import ChronoscopeMap from './components/map/ChronoscopeMap';
import AudioPlayer from './components/audio/AudioPlayer';
import SourcePanel from './components/sources/SourcePanel';

const STEPS = [
  { key: 'query',    label: '① Query the Archive' },
  { key: 'select',   label: '② Select a Dispatch' },
  { key: 'listen',   label: '③ Listen' },
] as const;

function getActiveStep(appState: string) {
  if (appState === 'idle' || appState === 'searching') return 'query';
  if (appState === 'selected') return 'select';
  return 'listen';
}

export default function App() {
  const [hasEntered, setHasEntered] = useState(false);

  const {
    appState,
    passages,
    hasSearched,
    musicUrl,
    sfxUrl,
    musicPrompt,
    sfxPrompt,
    error,
    search,
    generate,
    reset,
  } = useChronoscope();

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

  function handlePassageSelect(passage: Passage) {
    generate(passage);
  }

  const isLoading = appState === 'searching' || appState === 'generating';
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
      <Masthead edition={edition} compact />

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
      <div className="layout-body">
        <NewspaperLayout
          showCenter={appState === 'generating' || appState === 'ready'}
          left={
            <ChronoscopeMap
              center={mapCenter}
              locationLabel={currentPlace}
              onLocationSelect={handleLocationSelect}
            />
          }
          center={
            <AudioPlayer
              musicUrl={musicUrl}
              sfxUrl={sfxUrl}
              synthesizedPrompt={sfxPrompt ?? musicPrompt}
              era={currentEra}
              location={currentPlace}
              appState={appState}
              onReset={reset}
            />
          }
          right={
            <SourcePanel
              passages={passages}
              hasSearched={hasSearched}
              isLoading={appState === 'searching'}
              onPassageSelect={appState === 'selected' ? handlePassageSelect : undefined}
              selectedState={appState === 'selected'}
            />
          }
        />
      </div>

      <footer className="app-footer">
        Chronoscape · Acoustic Time Travel · Est. 2026 · All sounds synthesised — no recordings used
      </footer>
    </div>
  );
}
