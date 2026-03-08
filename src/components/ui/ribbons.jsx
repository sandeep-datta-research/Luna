import { useEffect, useMemo, useRef } from "react";

function toRgba(color, alpha) {
  if (typeof color !== "string") {
    return `rgba(82,39,255,${alpha})`;
  }

  const value = color.trim();

  if (value.startsWith("#")) {
    let hex = value.slice(1);

    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((char) => char + char)
        .join("");
    }

    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }

  if (value.startsWith("rgb(")) {
    const channels = value.slice(4, -1);
    return `rgba(${channels}, ${alpha})`;
  }

  if (value.startsWith("rgba(")) {
    return value.replace(/rgba\(([^)]+),\s*[^,]+\)$/, `rgba($1, ${alpha})`);
  }

  return value;
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default function Ribbons({
  baseThickness = 30,
  colors = ["#5227FF"],
  speedMultiplier = 0.5,
  maxAge = 500,
  enableFade = false,
  enableShaderEffect = false,
  className,
}) {
  const canvasRef = useRef(null);

  const config = useMemo(
    () => ({
      baseThickness,
      colors: Array.isArray(colors) && colors.length > 0 ? colors : ["#5227FF"],
      speedMultiplier: Math.max(0.1, speedMultiplier),
      maxAge: Math.max(120, maxAge),
      enableFade,
      enableShaderEffect,
    }),
    [baseThickness, colors, speedMultiplier, maxAge, enableFade, enableShaderEffect],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const parent = canvas.parentElement;
    if (!parent) {
      return undefined;
    }

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      return undefined;
    }

    const particles = [];

    const pointer = {
      active: false,
      x: 0,
      y: 0,
      lastX: 0,
      lastY: 0,
    };

    let colorIndex = 0;
    let frameId = null;
    let width = 0;
    let height = 0;
    let lastTime = performance.now();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = parent.clientWidth;
      height = parent.clientHeight;

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawnTrail = (x, y, dx, dy) => {
      const distance = Math.hypot(dx, dy);
      const baseCount = clamp(Math.floor(distance / 10), 1, 8);
      const speed = config.speedMultiplier;
      const spread = Math.max(4, config.baseThickness * 0.18);

      for (let i = 0; i < baseCount; i += 1) {
        const color = config.colors[colorIndex % config.colors.length];
        colorIndex += 1;

        const jitterX = random(-spread, spread);
        const jitterY = random(-spread * 0.6, spread * 0.6);

        const vx = dx * 0.05 * speed + random(-1.3, 1.3) * speed;
        const vy = dy * 0.05 * speed + random(-1.3, 1.3) * speed;

        const xPos = x + jitterX;
        const yPos = y + jitterY;

        particles.push({
          x: xPos,
          y: yPos,
          px: xPos - vx,
          py: yPos - vy,
          vx,
          vy,
          age: 0,
          life: config.maxAge * random(0.75, 1.35),
          width: Math.max(1.4, config.baseThickness * random(0.18, 0.46)),
          color,
          seed: random(0, 1000),
        });
      }

      if (particles.length > 1400) {
        particles.splice(0, particles.length - 1400);
      }
    };

    const getPointerPosition = (event) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const handlePointerMove = (event) => {
      const { x, y } = getPointerPosition(event);

      if (x < 0 || y < 0 || x > width || y > height) {
        pointer.active = false;
        return;
      }

      if (!pointer.active) {
        pointer.active = true;
        pointer.x = x;
        pointer.y = y;
        pointer.lastX = x;
        pointer.lastY = y;
      }

      const dx = x - pointer.lastX;
      const dy = y - pointer.lastY;
      const distance = Math.hypot(dx, dy);
      const steps = clamp(Math.floor(distance / 8), 1, 12);

      for (let step = 1; step <= steps; step += 1) {
        const ratio = step / steps;
        const sx = pointer.lastX + dx * ratio;
        const sy = pointer.lastY + dy * ratio;
        spawnTrail(sx, sy, dx / steps, dy / steps);
      }

      pointer.x = x;
      pointer.y = y;
      pointer.lastX = x;
      pointer.lastY = y;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    const update = (dt, nowMs) => {
      if (pointer.active && Math.random() < 0.16) {
        spawnTrail(pointer.x, pointer.y, pointer.x - pointer.lastX, pointer.y - pointer.lastY);
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];

        particle.age += dt * 1000;
        particle.px = particle.x;
        particle.py = particle.y;

        const wobble = config.enableShaderEffect
          ? Math.sin((nowMs * 0.006) + particle.seed + particle.age * 0.02) * 0.9
          : 0;

        particle.vx *= 0.94;
        particle.vy *= 0.94;

        particle.x += particle.vx * 3.2 + wobble;
        particle.y += particle.vy * 3.2 + wobble * 0.45;

        if (
          particle.age >= particle.life ||
          particle.x < -120 ||
          particle.x > width + 120 ||
          particle.y < -120 ||
          particle.y > height + 120
        ) {
          particles.splice(index, 1);
        }
      }
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";
      context.lineCap = "round";
      context.lineJoin = "round";

      particles.forEach((particle) => {
        const lifeProgress = 1 - particle.age / particle.life;
        if (lifeProgress <= 0) {
          return;
        }

        const alpha = config.enableFade
          ? Math.max(0, lifeProgress * 0.9)
          : Math.max(0.16, 0.72 * lifeProgress + 0.08);

        const widthScale = config.enableFade
          ? Math.max(0.2, lifeProgress)
          : 0.35 + lifeProgress * 0.75;

        context.strokeStyle = toRgba(particle.color, alpha);
        context.shadowColor = toRgba(particle.color, 0.3);
        context.shadowBlur = 12;
        context.lineWidth = Math.max(1, particle.width * widthScale);

        context.beginPath();
        context.moveTo(particle.px, particle.py);
        context.lineTo(particle.x, particle.y);
        context.stroke();
      });

      context.globalCompositeOperation = "source-over";
    };

    const render = (nowMs) => {
      const dt = Math.min(0.05, (nowMs - lastTime) / 1000);
      lastTime = nowMs;

      update(dt, nowMs);
      draw();

      frameId = window.requestAnimationFrame(render);
    };

    resize();
    frameId = window.requestAnimationFrame(render);

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerdown", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("pointercancel", handlePointerLeave);
    window.addEventListener("resize", resize);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerdown", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("pointercancel", handlePointerLeave);
      window.removeEventListener("resize", resize);
    };
  }, [config]);

  return <canvas ref={canvasRef} className={className} />;
}
