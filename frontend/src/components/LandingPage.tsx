interface LandingPageProps {
  onEnter: () => void;
}

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
        <h1 className="landing-title">Chronoscopes</h1>

        {/* Tagline */}
        <p className="landing-tagline">Acoustic Time Travel</p>

        {/* Red rule */}
        <div className="landing-rule" />

        {/* Short pitch */}
        <p className="landing-pitch">
          Pick a place. Pick an era.<br />
          Hear what history sounded like.
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

        <p className="landing-credit">
          Chronoscape · Powered by Gemini · ElevenLabs · turbopuffer · All sources public domain
        </p>
      </main>
    </div>
  );
}
