import { useEffect, useRef } from 'react';

interface WaveformVizProps {
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
  /** When true, show gentle idle sine animation even without loaded audio */
  isSynthesizing?: boolean;
}

export default function WaveformViz({ analyserNode, isPlaying, isSynthesizing }: WaveformVizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    function drawIdle() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = '#8b1a1a';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      frameRef.current += 0.03;
      for (let x = 0; x < W; x++) {
        const y = H / 2 + Math.sin((x / W) * Math.PI * 6 + frameRef.current) * 2;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(drawIdle);
    }

    function drawLive() {
      if (!ctx || !analyserNode) return;
      const bufLen = analyserNode.frequencyBinCount;
      const data = new Uint8Array(bufLen);
      analyserNode.getByteTimeDomainData(data);
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = '#8b1a1a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const sliceW = W / bufLen;
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const v = data[i] / 128.0;
        const y = (v * H) / 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceW;
      }
      ctx.lineTo(W, H / 2);
      ctx.stroke();
      rafRef.current = requestAnimationFrame(drawLive);
    }

    cancelAnimationFrame(rafRef.current);

    if (isPlaying && analyserNode) {
      drawLive();
    } else if (isSynthesizing) {
      // Gentle idle wave while audio is being synthesized
      drawIdle();
    }
    // When idle (no audio yet, not synthesizing): leave canvas blank — no animation

    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserNode, isPlaying, isSynthesizing]);

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={40}
      style={{
        width: '100%',
        height: '40px',
        background: '#1a1208',
        borderRadius: '2px',
        display: 'block',
      }}
    />
  );
}
