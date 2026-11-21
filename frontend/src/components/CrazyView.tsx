"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  Cpu,
  Radio,
  Zap,
  Activity,
  Maximize2,
  Minimize2,
  RefreshCw,
  Volume2,
  VolumeX,
  Play,
  Flame,
  ShieldAlert,
  Sliders,
  Sparkles,
  Layers,
  ArrowRight,
  Gauge,
  Wifi,
  ExternalLink
} from "lucide-react";
import { soundFX } from "@/lib/audio";

interface CrazyViewProps {
  onRunTestWithUrl?: (url: string, tier: string) => void;
  onNavigateToTab?: (tab: string) => void;
  backendOnline: boolean;
}

export default function CrazyView({
  onRunTestWithUrl,
  onNavigateToTab,
  backendOnline
}: CrazyViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Hologram 3D state
  const [rotX, setRotX] = useState<number>(0.2);
  const [rotY, setRotY] = useState<number>(-0.3);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Simulated hardware metrics
  const [selectedTier, setSelectedTier] = useState<"ENTRY" | "BUDGET" | "FLAGSHIP">("ENTRY");
  const [cpuStress, setCpuStress] = useState<boolean>(false);
  const [memoryStress, setMemoryStress] = useState<boolean>(false);
  const [networkLatencyMs, setNetworkLatencyMs] = useState<number>(200);
  const [testUrlInput, setTestUrlInput] = useState<string>("https://hackfront-plum.vercel.app");

  // Telemetry real-time values
  const [fps, setFps] = useState<number>(59);
  const [cpuLoad, setCpuLoad] = useState<number[]>([15, 20, 10, 8]);
  const [ramUsedMb, setRamUsedMb] = useState<number>(1420);
  const maxRamMb = selectedTier === "ENTRY" ? 2048 : selectedTier === "BUDGET" ? 4096 : 12288;

  // Sound toggle handler
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFX.enabled = next;
    if (next) soundFX.playPing();
  };

  // Stress toggles with sound and visual feedback
  const triggerCpuSpike = () => {
    soundFX.playAlert();
    setCpuStress(true);
    setCpuLoad([98, 95, 99, 94]);
    setTimeout(() => {
      setCpuStress(false);
      setCpuLoad([25, 30, 20, 18]);
    }, 3800);
  };

  const triggerMemoryFlood = () => {
    soundFX.playAlert();
    setMemoryStress(true);
    setRamUsedMb(Math.floor(maxRamMb * 0.94));
    setTimeout(() => {
      setMemoryStress(false);
      setRamUsedMb(selectedTier === "ENTRY" ? 1420 : selectedTier === "BUDGET" ? 2100 : 3800);
    }, 4000);
  };

  const resetHardwareState = () => {
    soundFX.playClick();
    setCpuStress(false);
    setMemoryStress(false);
    setCpuLoad([18, 22, 14, 12]);
    setRamUsedMb(selectedTier === "ENTRY" ? 1350 : selectedTier === "BUDGET" ? 2050 : 3600);
  };

  // Switch tier
  const handleTierSwitch = (tier: "ENTRY" | "BUDGET" | "FLAGSHIP") => {
    soundFX.playPing();
    setSelectedTier(tier);
    if (tier === "ENTRY") {
      setNetworkLatencyMs(200);
      setRamUsedMb(1420);
    } else if (tier === "BUDGET") {
      setNetworkLatencyMs(60);
      setRamUsedMb(2200);
    } else {
      setNetworkLatencyMs(15);
      setRamUsedMb(3900);
    }
  };

  // Launch quick test
  const handleRunQuickTest = () => {
    soundFX.playSuccess();
    if (onRunTestWithUrl) {
      onRunTestWithUrl(testUrlInput, selectedTier === "ENTRY" ? "ENTRY_LEVEL" : "GOOD_BUDGET");
    } else if (onNavigateToTab) {
      onNavigateToTab("web_test");
    }
  };

  // 3D Canvas Rendering Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let angle = rotY;
    let lastTime = performance.now();
    let frameCount = 0;

    // Particles representing incoming network packets & CPU cycles
    const particles: Array<{
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      color: string;
      size: number;
      life: number;
    }> = [];

    const numParticles = 75;
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400,
        z: (Math.random() - 0.5) * 400,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        vz: (Math.random() - 0.5) * 2,
        color: i % 2 === 0 ? "#38bdf8" : "#818cf8",
        size: Math.random() * 2.5 + 1,
        life: Math.random() * 100,
      });
    }

    // 3D Box Vertices (Hologram phone frame)
    const phoneWidth = 140;
    const phoneHeight = 270;
    const phoneDepth = 22;

    const vertices = [
      // Front face
      { x: -phoneWidth / 2, y: -phoneHeight / 2, z: phoneDepth / 2 },
      { x: phoneWidth / 2, y: -phoneHeight / 2, z: phoneDepth / 2 },
      { x: phoneWidth / 2, y: phoneHeight / 2, z: phoneDepth / 2 },
      { x: -phoneWidth / 2, y: phoneHeight / 2, z: phoneDepth / 2 },
      // Back face
      { x: -phoneWidth / 2, y: -phoneHeight / 2, z: -phoneDepth / 2 },
      { x: phoneWidth / 2, y: -phoneHeight / 2, z: -phoneDepth / 2 },
      { x: phoneWidth / 2, y: phoneHeight / 2, z: -phoneDepth / 2 },
      { x: -phoneWidth / 2, y: phoneHeight / 2, z: -phoneDepth / 2 },
    ];

    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0], // Front
      [4, 5], [5, 6], [6, 7], [7, 4], // Back
      [0, 4], [1, 5], [2, 6], [3, 7], // Connectors
    ];

    // Screen bezel inset
    const screenInset = 12;
    const screenVertices = [
      { x: -phoneWidth / 2 + screenInset, y: -phoneHeight / 2 + screenInset + 10, z: phoneDepth / 2 + 1 },
      { x: phoneWidth / 2 - screenInset, y: -phoneHeight / 2 + screenInset + 10, z: phoneDepth / 2 + 1 },
      { x: phoneWidth / 2 - screenInset, y: phoneHeight / 2 - screenInset - 10, z: phoneDepth / 2 + 1 },
      { x: -phoneWidth / 2 + screenInset, y: phoneHeight / 2 - screenInset - 10, z: phoneDepth / 2 + 1 },
    ];

    const render = (time: number) => {
      const dt = time - lastTime;
      frameCount++;
      if (dt >= 1000) {
        setFps(Math.round((frameCount * 1000) / dt));
        frameCount = 0;
        lastTime = time;
      }

      // Resize canvas to parent
      const width = canvas.clientWidth || 800;
      const height = canvas.clientHeight || 520;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      // Auto-rotation
      if (autoRotate) {
        angle += 0.008;
      } else {
        angle = rotY;
      }

      const currentRotX = rotX;
      const fov = 450;
      const cx = width / 2;
      const cy = height / 2;

      // Project 3D to 2D function
      const project = (p: { x: number; y: number; z: number }) => {
        // Rotate Y
        const cosY = Math.cos(angle);
        const sinY = Math.sin(angle);
        const x1 = p.x * cosY + p.z * sinY;
        const z1 = -p.x * sinY + p.z * cosY;

        // Rotate X
        const cosX = Math.cos(currentRotX);
        const sinX = Math.sin(currentRotX);
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX + 500;

        const scale = fov / Math.max(z2, 1);
        return {
          x: cx + x1 * scale,
          y: cy + y2 * scale,
          scale,
          z: z2,
        };
      };

      // Draw background ambient grid lines
      ctx.save();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.07)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // Draw and update dynamic packet particles
      ctx.save();
      const packetSpeedMultiplier =
        selectedTier === "ENTRY" ? 0.6 : selectedTier === "BUDGET" ? 1.2 : 2.5;

      particles.forEach((p) => {
        p.x += p.vx * packetSpeedMultiplier;
        p.y += p.vy * packetSpeedMultiplier;
        p.z += p.vz * packetSpeedMultiplier;

        if (p.x > 220) p.x = -220;
        if (p.x < -220) p.x = 220;
        if (p.y > 220) p.y = -220;
        if (p.y < -220) p.y = 220;
        if (p.z > 220) p.z = -220;
        if (p.z < -220) p.z = 220;

        const proj = project(p);
        if (proj.scale > 0) {
          ctx.beginPath();
          const particleColor = cpuStress
            ? "rgba(244, 63, 94, 0.7)"
            : memoryStress
            ? "rgba(245, 158, 11, 0.7)"
            : p.color;
          ctx.fillStyle = particleColor;
          ctx.arc(proj.x, proj.y, Math.max(1, p.size * proj.scale * 1.5), 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();

      // Projected phone vertices
      const projVertices = vertices.map(project);
      const projScreen = screenVertices.map(project);

      // Draw holographic device glow / chassis
      const isStressed = cpuStress || memoryStress;
      const glowColor = cpuStress
        ? "#f43f5e"
        : memoryStress
        ? "#f59e0b"
        : selectedTier === "ENTRY"
        ? "#38bdf8"
        : selectedTier === "BUDGET"
        ? "#818cf8"
        : "#a855f7";

      // Draw 3D Edges
      ctx.save();
      ctx.strokeStyle = glowColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = isStressed ? 25 : 14;
      ctx.lineWidth = isStressed ? 2.5 : 1.8;

      edges.forEach(([i, j]) => {
        const p1 = projVertices[i];
        const p2 = projVertices[j];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // Draw Screen Bezel
      ctx.fillStyle = isStressed
        ? "rgba(244, 63, 94, 0.08)"
        : "rgba(15, 23, 42, 0.55)";
      ctx.beginPath();
      ctx.moveTo(projScreen[0].x, projScreen[0].y);
      ctx.lineTo(projScreen[1].x, projScreen[1].y);
      ctx.lineTo(projScreen[2].x, projScreen[2].y);
      ctx.lineTo(projScreen[3].x, projScreen[3].y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Screen Holographic UI Wave (Simulating live telemetry on the phone display)
      const centerScreen = {
        x: (projScreen[0].x + projScreen[2].x) / 2,
        y: (projScreen[0].y + projScreen[2].y) / 2,
      };

      // Wave inside the screen
      ctx.beginPath();
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 1.5;
      const screenWidthProj = Math.abs(projScreen[1].x - projScreen[0].x);
      for (let s = -screenWidthProj * 0.4; s < screenWidthProj * 0.4; s += 4) {
        const waveY =
          centerScreen.y +
          Math.sin((s * 0.08) + time * 0.005) * (isStressed ? 18 : 8);
        if (s === -screenWidthProj * 0.4) {
          ctx.moveTo(centerScreen.x + s, waveY);
        } else {
          ctx.lineTo(centerScreen.x + s, waveY);
        }
      }
      ctx.stroke();

      // Device Tier Label floating inside hologram
      ctx.fillStyle = "white";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        isStressed ? "⚠️ THERMAL THROTTLE" : `TIER: ${selectedTier}`,
        centerScreen.x,
        centerScreen.y - 45
      );
      ctx.font = "10px monospace";
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.fillText(
        `RAM: ${ramUsedMb}MB / ${maxRamMb}MB`,
        centerScreen.x,
        centerScreen.y + 40
      );

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [rotX, rotY, autoRotate, selectedTier, cpuStress, memoryStress, ramUsedMb, maxRamMb]);

  // Mouse drag to rotate hologram
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    setAutoRotate(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    setRotY((prev) => prev + dx * 0.01);
    setRotX((prev) => Math.max(-1.2, Math.min(1.2, prev - dy * 0.01)));
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      ref={containerRef}
      className={`relative rounded-2xl overflow-hidden bg-slate-950 border border-cyan-500/30 shadow-2xl transition-all ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : "min-h-[700px] mb-8"
      }`}
    >
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Cockpit Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 p-5 border-b border-cyan-500/20 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 animate-pulse">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-wide">
                HOLOGRAPHIC DEVICE COCKPIT
              </h2>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                3D LIVE VIEW
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive physical emulation: real-time CPU throttling, memory buffers & network stream
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          {/* Sound FX Toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? "Mute Sci-Fi Audio" : "Unmute Sci-Fi Audio"}
            className={`p-2 rounded-lg border transition-all ${
              soundEnabled
                ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Auto-rotation toggle */}
          <button
            onClick={() => {
              soundFX.playClick();
              setAutoRotate(!autoRotate);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
              autoRotate
                ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRotate ? "animate-spin" : ""}`} />
            {autoRotate ? "Orbit On" : "Manual Tilt"}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => {
              soundFX.playClick();
              setIsFullscreen(!isFullscreen);
            }}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all"
            title="Toggle Cockpit Viewport"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        {/* Left Telemetry HUD Panel (Cols 3) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Hardware Tier Selector */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/20 backdrop-blur-md">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" /> Emulated Hardware Tier
            </h3>
            <div className="grid grid-cols-3 gap-1.5">
              {(["ENTRY", "BUDGET", "FLAGSHIP"] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => handleTierSwitch(tier)}
                  className={`py-2 px-1 text-xs font-bold rounded-lg transition-all text-center ${
                    selectedTier === tier
                      ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30 scale-105"
                      : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700"
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>

            {/* Hardware specifications overview */}
            <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">RAM Limit:</span>
                <span className="font-mono text-cyan-300">{maxRamMb} MB</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">CPU Throttle:</span>
                <span className="font-mono text-cyan-300">
                  {selectedTier === "ENTRY" ? "8x Slowdown" : selectedTier === "BUDGET" ? "4x Slowdown" : "1x (Full)"}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Network Bandwidth:</span>
                <span className="font-mono text-cyan-300">
                  {selectedTier === "ENTRY" ? "Slow 3G (500 Kbps)" : selectedTier === "BUDGET" ? "Fast 3G (1.6 Mbps)" : "5G (30 Mbps)"}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Network Latency:</span>
                <span className="font-mono text-cyan-300">{networkLatencyMs} ms</span>
              </div>
            </div>
          </div>

          {/* Real-time CPU Core Load Bars */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/20 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" /> Multi-Core Workload
              </h3>
              <span className="text-[10px] font-mono text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                {fps} FPS
              </span>
            </div>

            <div className="space-y-2">
              {cpuLoad.map((load, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 font-mono">Core #{idx + 1}</span>
                    <span
                      className={`font-mono font-bold ${
                        load > 80 ? "text-rose-400" : load > 50 ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {load}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        load > 80 ? "bg-rose-500" : load > 50 ? "bg-amber-400" : "bg-cyan-400"
                      }`}
                      style={{ width: `${load}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Hardware Stress Injections */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/20 backdrop-blur-md space-y-2.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-rose-400" /> Stress Injections
            </h3>
            <p className="text-[11px] text-slate-400">
              Inject hardware pressure directly into the active 3D hologram simulator:
            </p>

            <button
              onClick={triggerCpuSpike}
              className={`w-full py-2 px-3 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-2 ${
                cpuStress
                  ? "bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-500/30 animate-pulse"
                  : "bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-900/50"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              {cpuStress ? "CPU Spike Active (99%)" : "Inject CPU Spike"}
            </button>

            <button
              onClick={triggerMemoryFlood}
              className={`w-full py-2 px-3 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-2 ${
                memoryStress
                  ? "bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-500/30 animate-pulse"
                  : "bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/50"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {memoryStress ? "OOM Pressure Active" : "Flood RAM Buffer"}
            </button>

            <button
              onClick={resetHardwareState}
              className="w-full py-1.5 px-3 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" /> Reset Baseline
            </button>
          </div>
        </div>

        {/* Center 3D Hologram Canvas (Cols 6) */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center relative min-h-[460px] rounded-xl border border-cyan-500/20 bg-slate-900/40 backdrop-blur-sm cursor-grab active:cursor-grabbing select-none overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-full block"
          />

          {/* Interactive Help Hint Overlay */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] text-cyan-400/80 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-cyan-500/20 backdrop-blur-md pointer-events-none">
            <span>💡 Click and drag to inspect in 3D</span>
            <span className="font-mono">Render: Canvas 3D Matrix</span>
          </div>
        </div>

        {/* Right Cockpit Actions & Live Launcher (Cols 3) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Quick Benchmark Launcher */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/20 backdrop-blur-md space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Play className="w-4 h-4 text-cyan-400" /> Test Runner Cockpit
            </h3>
            <p className="text-[11px] text-slate-400">
              Run automated website audit through this exact emulated device hardware:
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Target URL</label>
              <input
                type="url"
                value={testUrlInput}
                onChange={(e) => setTestUrlInput(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <button
              onClick={handleRunQuickTest}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 group"
            >
              <span>RUN BENCHMARK NOW</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Live System Connectivity Card */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/20 backdrop-blur-md space-y-2.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" /> Platform Connections
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Frontend (Vercel)</div>
                  <div className="text-[10px] text-slate-400">hackfront-plum.vercel.app</div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
              </div>

              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Backend API (Render)</div>
                  <div className="text-[10px] text-slate-400">hackfront-ckpg.onrender.com</div>
                </div>
                <span
                  className={`w-2 h-2 rounded-full ${
                    backendOnline ? "bg-emerald-400 shadow-sm shadow-emerald-400" : "bg-amber-400"
                  }`}
                />
              </div>

              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">GitHub Source</div>
                  <div className="text-[10px] text-slate-400">balajetman3025-hue/hackfront</div>
                </div>
                <a
                  href="https://github.com/balajetman3025-hue/hackfront"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
