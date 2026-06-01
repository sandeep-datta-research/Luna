import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  active: boolean;
  color?: string;
  barCount?: number;
}

export function AudioVisualizer({ analyser, active, color = "#7fc7ba", barCount = 12 }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || !analyser || !canvasRef.current) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const barWidth = (width / barCount) - 2;
      let x = 0;

      for (let i = 0; i < barCount; i++) {
        // Sample frequencies across the spectrum
        const sampleIndex = Math.floor((i / barCount) * (bufferLength / 2));
        const barHeight = (dataArray[sampleIndex] / 255) * height;

        ctx.fillStyle = color;
        
        // Draw rounded bars
        const radius = barWidth / 2;
        const y = (height - barHeight) / 2;
        
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, barWidth, barHeight, radius);
        } else {
            ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();

        x += barWidth + 2;
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [active, analyser, color, barCount]);

  return (
    <canvas 
      ref={canvasRef} 
      width={60} 
      height={24} 
      className={`transition-opacity duration-300 ${active ? "opacity-100" : "opacity-0"}`}
    />
  );
}
