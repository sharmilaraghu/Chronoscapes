import sceneJazz   from '../images/DxeICoe57j_nT8nKdSOiv9Xrn_vBurtDC0Ff4vMIuF3B0p36o4EcTVnQVzBkgusXRHhcO3QNL4X0T0Zvo0EPldpm28PFGjkbAk-7XzjldYyu4TViuIG1O7KlesacrtZ1uteMT7ZK7E8vPyKEd9hohmuxzNfGinmB-JBihiXFQ8wSohQ1VbZaJy4igpQN1BKc.jpeg';
import sceneStreet from '../images/f06e5sU1VjQDZG7MSlLPCGcSkD-ZkzqpOPpoZTHa7sY9NVTpFJkreQNMCixypiuhXT6m4AjX4LWpEhTtvyZVKhkVpbAp3IXQbZ-J6OQLV02qyBLO-ZiyaJNoKUSuKltA7HLoDJ4C39Pe4ckrUdFlnlot7WJ5AiVfEsAAbMTIRBTED6D2w5e5hy6iaY0ZHj_1.jpeg';
import sceneMarket from '../images/NLwKhVo1iatYoFnF9uYGLFr7TIck6w0I9sP2Q6QAlca2fnCT7phh-GqGlvOrhdyDM_ysNe1HijhX_1FfBD2XZGqb1J2RoV2WTih-TByUm0hLhnQFpGNU2A2bGQeMmNt_oHXRjPcCoKBAxnIPJu9nNyoPF2VMQNIahSlDDKBtD5-35Qib41mitc6mHkf8V8ca.jpeg';

interface LandingPageProps {
  onEnter: () => void;
}

const SCENES = [
  { src: sceneJazz,   alt: 'Jazz club, 1940s — musicians playing drums and maracas' },
  { src: sceneStreet, alt: 'Crowded city street, Gilded Age — horse-drawn carriages' },
  { src: sceneMarket, alt: 'Open-air market, early 1900s — vendors and street life' },
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
