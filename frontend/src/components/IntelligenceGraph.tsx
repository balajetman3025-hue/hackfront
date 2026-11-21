"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Database,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  Sliders,
  Volume2,
  VolumeX,
  Info,
  ChevronRight,
  Compass,
  X
} from "lucide-react";
import { soundFX } from "@/lib/audio";

export interface GraphNode {
  id: string;
  label: string;
  name: string;
  properties?: Record<string, any>;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

interface Props {
  data: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    connected: boolean;
    error?: string;
  };
  onRefresh?: () => void;
}

const COLOR_MAP: Record<string, { main: string; glow: string; text: string }> = {
  Application: { main: "#3B82F6", glow: "rgba(59, 130, 246, 0.6)", text: "#93C5FD" },
  Project: { main: "#2563EB", glow: "rgba(37, 99, 235, 0.6)", text: "#BFDBFE" },
  TestRun: { main: "#06B6D4", glow: "rgba(6, 182, 212, 0.6)", text: "#A5F3FC" },
  DeviceProfile: { main: "#8B5CF6", glow: "rgba(139, 92, 246, 0.6)", text: "#DDD6FE" },
  Failure: { main: "#EF4444", glow: "rgba(239, 68, 68, 0.7)", text: "#FECACA" },
  ErrorSignature: { main: "#F59E0B", glow: "rgba(245, 158, 11, 0.6)", text: "#FDE68A" },
  RootCause: { main: "#F97316", glow: "rgba(249, 115, 22, 0.6)", text: "#FED7AA" },
  Metric: { main: "#10B981", glow: "rgba(16, 185, 129, 0.6)", text: "#A7F3D0" },
  Recommendation: { main: "#EC4899", glow: "rgba(236, 72, 153, 0.6)", text: "#FBCFE8" },
  MarketSegment: { main: "#EAB308", glow: "rgba(234, 179, 8, 0.6)", text: "#FEF08A" },
  NetworkCohort: { main: "#14B8A6", glow: "rgba(20, 184, 166, 0.6)", text: "#99F6E4" },
};

// Rich default graph representing TierLens device intelligence architecture
const ARCHITECTURE_DEMO_NODES: GraphNode[] = [
  { id: "app-core", label: "Application", name: "TierLens Web Platform", properties: { framework: "Next.js 14", cloud: "Vercel" } },
  { id: "api-backend", label: "Project", name: "FastAPI Core Engine", properties: { host: "Render Cloud", runtime: "Python 3.11" } },
  { id: "profile-entry", label: "DeviceProfile", name: "Redmi 9A (2GB / 8x Throttle)", properties: { ram: "2048 MB", network: "Slow 3G", throttle: "8.0x" } },
  { id: "profile-budget", label: "DeviceProfile", name: "Galaxy A14 (4GB / 4x Throttle)", properties: { ram: "4096 MB", network: "Fast 3G", throttle: "4.0x" } },
  { id: "profile-flagship", label: "DeviceProfile", name: "Galaxy S24 (12GB / Full)", properties: { ram: "12288 MB", network: "5G", throttle: "1.0x" } },
  { id: "metric-lcp", label: "Metric", name: "LCP 4.2s (Threshold: 2.5s)", properties: { unit: "seconds", target: "< 2.5s" } },
  { id: "metric-inp", label: "Metric", name: "INP 380ms (Main Thread Choke)", properties: { unit: "milliseconds", status: "Poor" } },
  { id: "metric-ttfb", label: "Metric", name: "TTFB 820ms (Slow 3G RTT)", properties: { rtt: "400ms", bandwidth: "500kbps" } },
  { id: "fail-memory", label: "Failure", name: "Garbage Collection Spikes", properties: { severity: "CRITICAL", ramExceeded: true } },
  { id: "rca-js-parse", label: "RootCause", name: "Heavy JS Bundle (850KB uncompressed)", properties: { impact: "Blocks V8 Parser" } },
  { id: "rca-css-reflow", label: "RootCause", name: "Forced Synchronous Layouts", properties: { framesLost: 24 } },
  { id: "rec-codesplit", label: "Recommendation", name: "Enable Dynamic Imports & Split Chunks", properties: { potentialSaving: "65% initial parse time" } },
  { id: "rec-cdn-cache", label: "Recommendation", name: "Deploy Edge Cache Headers on Assets", properties: { ttfbReduction: "450ms" } },
];

const ARCHITECTURE_DEMO_EDGES: GraphEdge[] = [
  { id: "e1", source: "app-core", target: "api-backend", type: "COMMUNICATES_WITH" },
  { id: "e2", source: "app-core", target: "profile-entry", type: "BENCHMARKED_ON" },
  { id: "e3", source: "app-core", target: "profile-budget", type: "BENCHMARKED_ON" },
  { id: "e4", source: "app-core", target: "profile-flagship", type: "BENCHMARKED_ON" },
  { id: "e5", source: "profile-entry", target: "metric-lcp", type: "RECORDED_METRIC" },
  { id: "e6", source: "profile-entry", target: "metric-inp", type: "RECORDED_METRIC" },
  { id: "e7", source: "profile-entry", target: "metric-ttfb", type: "RECORDED_METRIC" },
  { id: "e8", source: "profile-entry", target: "fail-memory", type: "TRIGGERED_FAILURE" },
  { id: "e9", source: "fail-memory", target: "rca-js-parse", type: "CAUSED_BY" },
  { id: "e10", source: "metric-inp", target: "rca-css-reflow", type: "ATTRIBUTED_TO" },
  { id: "e11", source: "rca-js-parse", target: "rec-codesplit", type: "RESOLVED_BY" },
  { id: "e12", source: "metric-ttfb", target: "rec-cdn-cache", type: "OPTIMIZED_BY" },
];

export default function IntelligenceGraph({ data, onRefresh }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // View mode: 3D Spatial Galaxy vs 2D Schematic
  const [viewMode, setViewMode] = useState<"3D" | "2D">("3D");
  const [useDemoData, setUseDemoData] = useState<boolean>(!data.connected || (data.nodes && data.nodes.length === 0));
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // 3D Camera Angles & Transform
  const [rotX, setRotX] = useState<number>(0.25);
  const [rotY, setRotY] = useState<number>(-0.4);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Mouse interaction state
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Graph state references
  const nodes3DRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);

  // Toggle sound
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFX.enabled = next;
    if (next) soundFX.playPing();
  };

  // Sync active dataset (Real Neo4j or Architecture Demo Graph)
  useEffect(() => {
    const activeNodes = (useDemoData || !data.connected || data.nodes.length === 0)
      ? ARCHITECTURE_DEMO_NODES
      : data.nodes;

    const activeEdges = (useDemoData || !data.connected || data.nodes.length === 0)
      ? ARCHITECTURE_DEMO_EDGES
      : data.edges;

    // Distribute nodes organically in 3D sphere / ellipsoid space
    const count = activeNodes.length;
    const radius = 240;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    const projectedNodes = activeNodes.map((n, i) => {
      // Fibonacci sphere distribution for harmonious 3D layout
      const theta = 2 * Math.PI * i / goldenRatio;
      const phi = Math.acos(1 - 2 * (i + 0.5) / count);
      const r = radius * (0.75 + (i % 3) * 0.25);

      return {
        ...n,
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta) * 0.75,
        z: r * Math.cos(phi),
        vx: 0,
        vy: 0,
        vz: 0,
      };
    });

    nodes3DRef.current = projectedNodes;
    edgesRef.current = activeEdges;
  }, [data, useDemoData]);

  // Main 3D Canvas Rendering & Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let angleY = rotY;

    // 3D photon pulses that travel along graph edges
    const pulses: Array<{ edgeIndex: number; progress: number; speed: number; color: string }> = [];
    for (let p = 0; p < 18; p++) {
      pulses.push({
        edgeIndex: p % Math.max(1, edgesRef.current.length),
        progress: Math.random(),
        speed: 0.006 + Math.random() * 0.008,
        color: p % 2 === 0 ? "#38BDF8" : "#818CF8",
      });
    }

    // 3D Ambient stardust particles floating around the galaxy
    const starField: Array<{ x: number; y: number; z: number; size: number; alpha: number }> = [];
    for (let s = 0; s < 60; s++) {
      starField.push({
        x: (Math.random() - 0.5) * 700,
        y: (Math.random() - 0.5) * 500,
        z: (Math.random() - 0.5) * 700,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    const render = (time: number) => {
      const width = canvas.clientWidth || 800;
      const height = canvas.clientHeight || 550;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      // Deep space gradient background
      const bgGrad = ctx.createRadialGradient(
        width / 2, height / 2, 80,
        width / 2, height / 2, Math.max(width, height)
      );
      bgGrad.addColorStop(0, "#090D16");
      bgGrad.addColorStop(0.5, "#05070D");
      bgGrad.addColorStop(1, "#020408");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Auto-rotation in 3D mode
      if (viewMode === "3D" && autoRotate) {
        angleY += 0.003;
      } else {
        angleY = rotY;
      }

      const currentRotX = viewMode === "3D" ? rotX : 0;
      const fov = 500 * zoom;
      const cx = width / 2 + pan.x;
      const cy = height / 2 + pan.y;

      // 3D Perspective Projection helper
      const project = (p: { x: number; y: number; z: number }) => {
        if (viewMode === "2D") {
          return {
            x: cx + p.x * zoom,
            y: cy + p.y * zoom,
            scale: zoom,
            z: p.z,
          };
        }

        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);
        const x1 = p.x * cosY + p.z * sinY;
        const z1 = -p.x * sinY + p.z * cosY;

        const cosX = Math.cos(currentRotX);
        const sinX = Math.sin(currentRotX);
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX + 600;

        const scale = fov / Math.max(z2, 10);
        return {
          x: cx + x1 * scale,
          y: cy + y2 * scale,
          scale,
          z: z2,
        };
      };

      // Draw subtle 3D space dust particles
      ctx.save();
      starField.forEach((star) => {
        const proj = project(star);
        if (proj.scale > 0) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(148, 163, 184, ${star.alpha * Math.min(1, proj.scale)})`;
          ctx.arc(proj.x, proj.y, star.size * Math.max(0.6, proj.scale * 0.8), 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();

      const nodes = nodes3DRef.current;
      const edges = edgesRef.current;
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      // Project all nodes to screen
      const projectedNodes = nodes.map((n) => ({
        node: n,
        proj: project({ x: n.x || 0, y: n.y || 0, z: n.z || 0 }),
      }));

      // Sort by depth (Z-order) for proper 3D rendering
      projectedNodes.sort((a, b) => b.proj.z - a.proj.z);

      const projMap = new Map(projectedNodes.map((pn) => [pn.node.id, pn]));

      // Draw 3D Edges (Laser Beams)
      ctx.save();
      edges.forEach((edge) => {
        const p1 = projMap.get(edge.source);
        const p2 = projMap.get(edge.target);
        if (p1 && p2 && p1.proj.scale > 0 && p2.proj.scale > 0) {
          const isRelatedToSelected =
            selectedNode &&
            (edge.source === selectedNode.id || edge.target === selectedNode.id);

          const depthAlpha = Math.max(0.12, Math.min(0.85, (p1.proj.scale + p2.proj.scale) * 0.35));

          ctx.beginPath();
          ctx.moveTo(p1.proj.x, p1.proj.y);
          ctx.lineTo(p2.proj.x, p2.proj.y);

          if (isRelatedToSelected) {
            ctx.strokeStyle = "#38BDF8";
            ctx.lineWidth = 2.5;
            ctx.shadowColor = "#38BDF8";
            ctx.shadowBlur = 12;
          } else {
            ctx.strokeStyle = `rgba(100, 116, 139, ${depthAlpha * 0.5})`;
            ctx.lineWidth = Math.max(1, 1.4 * ((p1.proj.scale + p2.proj.scale) / 2));
            ctx.shadowBlur = 0;
          }
          ctx.stroke();

          // Edge Relationship Label (if zoomed in or selected)
          if (isRelatedToSelected || zoom > 1.2) {
            const midX = (p1.proj.x + p2.proj.x) / 2;
            const midY = (p1.proj.y + p2.proj.y) / 2;
            ctx.font = "9px monospace";
            ctx.fillStyle = isRelatedToSelected ? "#38BDF8" : "rgba(148, 163, 184, 0.7)";
            ctx.textAlign = "center";
            ctx.fillText(edge.type, midX, midY - 4);
          }
        }
      });
      ctx.restore();

      // Draw animated 3D photon pulses along edges
      ctx.save();
      pulses.forEach((pulse) => {
        if (pulse.edgeIndex >= edges.length) pulse.edgeIndex = 0;
        const edge = edges[pulse.edgeIndex];
        if (!edge) return;
        const p1 = projMap.get(edge.source);
        const p2 = projMap.get(edge.target);
        if (p1 && p2) {
          pulse.progress += pulse.speed;
          if (pulse.progress > 1) {
            pulse.progress = 0;
            pulse.edgeIndex = (pulse.edgeIndex + 1) % edges.length;
          }

          const pulseX = p1.proj.x + (p2.proj.x - p1.proj.x) * pulse.progress;
          const pulseY = p1.proj.y + (p2.proj.y - p1.proj.y) * pulse.progress;
          const pulseScale = (p1.proj.scale + p2.proj.scale) / 2;

          ctx.beginPath();
          ctx.fillStyle = pulse.color;
          ctx.shadowColor = pulse.color;
          ctx.shadowBlur = 8;
          ctx.arc(pulseX, pulseY, Math.max(1.5, 2.8 * pulseScale), 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();

      // Draw 3D Nodes (Spheres with dynamic radial shading)
      projectedNodes.forEach(({ node, proj }) => {
        if (proj.scale <= 0) return;

        const colorCfg = COLOR_MAP[node.label] || { main: "#3B82F6", glow: "rgba(59, 130, 246, 0.6)", text: "#93C5FD" };
        const isSelected = selectedNode?.id === node.id;
        const baseRadius = node.label === "Application" ? 16 : node.label === "Failure" ? 14 : 11;
        const r = Math.max(4, baseRadius * proj.scale);

        ctx.save();

        // Outer glow
        ctx.shadowColor = colorCfg.glow;
        ctx.shadowBlur = isSelected ? 24 : 12;

        // 3D Spherical Radial Gradient (Simulating light source from top-left)
        const lightX = proj.x - r * 0.35;
        const lightY = proj.y - r * 0.35;
        const sphereGrad = ctx.createRadialGradient(
          lightX, lightY, r * 0.1,
          proj.x, proj.y, r
        );
        sphereGrad.addColorStop(0, "#FFFFFF");
        sphereGrad.addColorStop(0.3, colorCfg.main);
        sphereGrad.addColorStop(1, "#0B1120");

        ctx.beginPath();
        ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2);
        ctx.fillStyle = sphereGrad;
        ctx.fill();

        // Orbital ring around important or selected nodes
        if (isSelected || node.label === "Application" || node.label === "Failure") {
          ctx.beginPath();
          const ringRadius = r * 1.55;
          const ringTilt = viewMode === "3D" ? 0.35 : 0;
          ctx.ellipse(
            proj.x, proj.y,
            ringRadius, ringRadius * (0.6 + ringTilt),
            time * 0.001 + (node.x || 0), 0, Math.PI * 2
          );
          ctx.strokeStyle = isSelected ? "#38BDF8" : colorCfg.main;
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.stroke();
        }

        // Selection Target Bracket
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, r + 7, 0, Math.PI * 2);
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }

        // Node Title Tag (scaled with 3D depth)
        const fontSize = Math.max(9, Math.round(11 * Math.min(1.4, proj.scale)));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = isSelected ? "#FFFFFF" : colorCfg.text;
        ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
        ctx.shadowBlur = 4;
        ctx.fillText(node.name, proj.x, proj.y + r + fontSize + 2);

        // Subtitle category badge
        if (proj.scale > 0.8) {
          ctx.font = "8px monospace";
          ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
          ctx.fillText(`[${node.label.toUpperCase()}]`, proj.x, proj.y + r + fontSize + 13);
        }

        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [rotX, rotY, zoom, pan, autoRotate, viewMode, selectedNode]);

  // Mouse Drag Camera Rotation in 3D
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check hit test for node selection
    const fov = 500 * zoom;
    const cx = canvas.width / 2 + pan.x;
    const cy = canvas.height / 2 + pan.y;

    let clickedNode: GraphNode | null = null;
    let closestDist = Infinity;

    nodes3DRef.current.forEach((n) => {
      let screenX = 0;
      let screenY = 0;

      if (viewMode === "2D") {
        screenX = cx + (n.x || 0) * zoom;
        screenY = cy + (n.y || 0) * zoom;
      } else {
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const x1 = (n.x || 0) * cosY + (n.z || 0) * sinY;
        const z1 = -(n.x || 0) * sinY + (n.z || 0) * cosY;
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        const y2 = (n.y || 0) * cosX - z1 * sinX;
        const z2 = (n.y || 0) * sinX + z1 * cosX + 600;
        const scale = fov / Math.max(z2, 10);
        screenX = cx + x1 * scale;
        screenY = cy + y2 * scale;
      }

      const dist = Math.sqrt((mouseX - screenX) ** 2 + (mouseY - screenY) ** 2);
      if (dist < 26 && dist < closestDist) {
        closestDist = dist;
        clickedNode = n;
      }
    });

    if (clickedNode) {
      soundFX.playPing();
      setSelectedNode(clickedNode);
    } else {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      setAutoRotate(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;

    if (viewMode === "3D") {
      setRotY((prev) => prev + dx * 0.008);
      setRotX((prev) => Math.max(-1.4, Math.min(1.4, prev - dy * 0.008)));
    } else {
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    }
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.max(0.4, Math.min(2.8, prev * zoomFactor)));
  };

  const resetCamera = () => {
    soundFX.playClick();
    setRotX(0.25);
    setRotY(-0.4);
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setAutoRotate(true);
    setSelectedNode(null);
  };

  return (
    <div
      ref={containerRef}
      className={`relative rounded-2xl overflow-hidden bg-slate-950 border border-blue-500/30 shadow-2xl transition-all ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : "min-h-[640px]"
      }`}
    >
      {/* Top Cockpit Header Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 p-4 border-b border-blue-500/20 bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Database className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-wide">
                3D VISUAL INTELLIGENCE GRAPH
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {viewMode} SPATIAL MATRIX
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Causal graph mapping hardware constraints, web performance metrics, and automated RCA recommendations
            </p>
          </div>
        </div>

        {/* View Controls & Toggles */}
        <div className="flex items-center gap-2">
          {/* 3D vs 2D Switcher */}
          <div className="bg-slate-800 p-0.5 rounded-lg border border-slate-700 flex items-center">
            <button
              onClick={() => {
                soundFX.playClick();
                setViewMode("3D");
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                viewMode === "3D"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🌌 3D Space
            </button>
            <button
              onClick={() => {
                soundFX.playClick();
                setViewMode("2D");
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                viewMode === "2D"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📐 2D Planar
            </button>
          </div>

          {/* Dataset Source Toggle */}
          <button
            onClick={() => {
              soundFX.playClick();
              setUseDemoData(!useDemoData);
            }}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
              useDemoData
                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
            }`}
            title="Toggle between Live Connected Neo4j and Architectural Topology Graph"
          >
            {useDemoData ? "Architecture Topology" : "Live Neo4j"}
          </button>

          {/* Auto Rotate Toggle */}
          {viewMode === "3D" && (
            <button
              onClick={() => {
                soundFX.playClick();
                setAutoRotate(!autoRotate);
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1 ${
                autoRotate
                  ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${autoRotate ? "animate-spin" : ""}`} />
              {autoRotate ? "Orbit" : "Free"}
            </button>
          )}

          {/* Zoom controls */}
          <button
            onClick={() => {
              soundFX.playClick();
              setZoom((z) => Math.min(2.8, z * 1.15));
            }}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              soundFX.playClick();
              setZoom((z) => Math.max(0.4, z * 0.85));
            }}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Reset Camera */}
          <button
            onClick={resetCamera}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
            title="Reset 3D Perspective"
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`p-1.5 rounded-lg border transition-all ${
              soundEnabled
                ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
            title="Toggle Micro-Interaction Sound Effects"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => {
              soundFX.playClick();
              setIsFullscreen(!isFullscreen);
            }}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
            title="Toggle Fullscreen 3D Stage"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Stage */}
      <div className="relative w-full h-[540px] cursor-grab active:cursor-grabbing select-none overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full block"
        />

        {/* Floating Hint Overlay */}
        <div className="absolute bottom-3 left-4 flex items-center gap-3 text-[11px] text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 backdrop-blur-md pointer-events-none">
          <span>🖱️ Click & Drag to Rotate in 3D</span>
          <span>•</span>
          <span>🔍 Scroll to Zoom</span>
          <span>•</span>
          <span>👆 Click Nodes to Inspect</span>
        </div>

        {/* Selected Node 3D Inspector HUD */}
        {selectedNode && (
          <div className="absolute top-4 right-4 z-20 w-80 p-4 rounded-xl bg-slate-900/90 border border-blue-500/40 shadow-2xl backdrop-blur-md text-white animate-in fade-in slide-in-from-right-4 duration-150">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <span
                  className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${COLOR_MAP[selectedNode.label]?.main || "#3B82F6"}25`,
                    color: COLOR_MAP[selectedNode.label]?.main || "#3B82F6",
                    border: `1px solid ${COLOR_MAP[selectedNode.label]?.main || "#3B82F6"}50`,
                  }}
                >
                  {selectedNode.label}
                </span>
                <h3 className="font-bold text-sm text-white mt-1.5">{selectedNode.name}</h3>
              </div>
              <button
                onClick={() => {
                  soundFX.playClick();
                  setSelectedNode(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-1.5 text-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Node Properties
                </div>
                {Object.entries(selectedNode.properties).map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 capitalize">{k.replace(/_/g, " ")}:</span>
                    <span className="font-mono text-cyan-300 font-semibold">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-2.5 border-t border-slate-800 text-[10px] text-slate-500">
              Node ID: <code className="font-mono text-slate-400">{selectedNode.id}</code>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Category Legend */}
      <div className="p-3 border-t border-blue-500/20 bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center gap-3 text-xs overflow-x-auto">
        <span className="text-[11px] font-bold text-slate-400 uppercase">3D Nodes:</span>
        {Object.entries(COLOR_MAP).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shadow-sm"
              style={{ backgroundColor: color.main, boxShadow: `0 0 8px ${color.glow}` }}
            />
            <span className="text-[11px] text-slate-300">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
