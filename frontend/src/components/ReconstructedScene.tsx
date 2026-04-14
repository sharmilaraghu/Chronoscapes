import type { SynthesizedScene } from '../lib/types';

interface ReconstructedSceneProps {
  scene: SynthesizedScene;
  musicUrl: string | null;
  sfxUrl: string | null;
}

function IntensityBar({ intensity }: { intensity: string }) {
  const level = intensity === 'bustling' ? 4
    : intensity === 'loud' ? 3
    : intensity === 'moderate' ? 2
    : intensity === 'quiet' ? 1
    : 2;

  return (
    <div className="reconstructed-scene-intensity-bar">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`reconstructed-scene-intensity-fill${i > level ? ' reconstructed-scene-intensity-fill--empty' : ''}`}
        />
      ))}
      <span style={{ fontFamily: 'var(--font-caption)', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginLeft: '0.25rem', color: 'var(--color-ink-faded)' }}>
        {intensity}
      </span>
    </div>
  );
}

export default function ReconstructedScene({ scene }: ReconstructedSceneProps) {
  return (
    <div className="reconstructed-scene">
      <div className="reconstructed-scene-header">✦ Reconstructed Scene</div>

      <p className="reconstructed-scene-summary">{scene.sceneSummary}</p>

      {scene.dominantSounds.length > 0 && (
        <div className="reconstructed-scene-sounds">
          {scene.dominantSounds.map((sound: string) => (
            <span key={sound} className="reconstructed-scene-sound-tag reconstructed-scene-sound-tag--dominant">
              {sound}
            </span>
          ))}
        </div>
      )}

      {scene.secondarySounds.length > 0 && (
        <div className="reconstructed-scene-sounds">
          {scene.secondarySounds.map((sound: string) => (
            <span key={sound} className="reconstructed-scene-sound-tag">
              {sound}
            </span>
          ))}
        </div>
      )}

      <div className="reconstructed-scene-meta">
        <div className="reconstructed-scene-meta-item">
          <span>🏙</span>
          <span>{scene.environment}</span>
        </div>
        <div className="reconstructed-scene-meta-item">
          <span>🕐</span>
          <span>{scene.timeOfDay}</span>
        </div>
        <div className="reconstructed-scene-meta-item">
          <span>🔊</span>
          <IntensityBar intensity={scene.intensity} />
        </div>
        <div className="reconstructed-scene-meta-item">
          <span>🎙</span>
          <span>{scene.acousticProfile}</span>
        </div>
      </div>

      {scene.backgroundSounds.length > 0 && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--color-ink-light)', marginBottom: '0.5rem' }}>
          Ambient layer: {scene.backgroundSounds.join(', ')}
        </p>
      )}

      <div className="chronoscape-radio">
        <span className="chronoscape-radio-label">✦ Chronoscapes Radio</span>
      </div>
    </div>
  );
}