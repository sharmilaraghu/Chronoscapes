interface LandingPageProps {
  onEnter: () => void;
}

const SCENES = [
  { src: '/scene-jazz.jpeg',   alt: 'Jazz club, 1940s — musicians playing drums and maracas' },
  { src: '/scene-street.jpeg', alt: 'Crowded city street, Gilded Age — horse-drawn carriages' },
  { src: '/scene-market.jpeg', alt: 'Open-air market, early 1900s — vendors and street life' },
];

export default function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <div className="landing-root">
      {/* Noise texture overlay */}
      <div className="landing-noise" aria-hidden />

      <main className="landing-center">
        {/* Vol line */}
        <p className="landing-vol">
          Vol. I &nbsp;·&nbsp; Anno Domini 2026 &nbsp;·&nbsp; Est. 2026
        </p>

        {/* Red rule */}
        <div className="landing-rule" />

        {/* Title */}
        <h1 className="landing-title">Chronoscapes</h1>

        {/* Tagline */}
        <p className="landing-tagline">Music from the Long-Lost Ages</p>

        {/* Red rule */}
        <div className="landing-rule" />

        {/* Scene images */}
        <div className="landing-scenes">
          {SCENES.map((s) => (
            <div key={s.src} className="landing-scene-frame">
              <img src={s.src} alt={s.alt} className="landing-scene-img" />
            </div>
          ))}
        </div>

        {/* Short pitch */}
        <p className="landing-pitch">
          Hear music from the ages where almost nothing was recorded.<br />
          We retrieve what history forgot — and bring it back to life.
        </p>

        {/* Era strip */}
        <div className="landing-eras">
          {[
            { label: 'Gilded Age', years: '1870–1900' },
            { label: 'World War I', years: '1914–1918' },
            { label: 'Jazz Age', years: '1920–1929' },
            { label: 'World War II', years: '1939–1945' },
          ].map((e) => (
            <div key={e.label} className="landing-era-badge">
              <span className="landing-era-name">{e.label}</span>
              <span className="landing-era-years">{e.years}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button className="landing-enter-btn" onClick={onEnter} type="button">
          Enter the Archive &nbsp;→
        </button>
      </main>

      <p className="landing-credit">
        Chronoscapes · Powered by Gemini · ElevenLabs · turbopuffer · All sources public domain
      </p>
    </div>
  );
}
