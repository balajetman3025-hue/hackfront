"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Zap,
  Minimize2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Cpu,
  ArrowRight
} from "lucide-react";
import { soundFX } from "@/lib/audio";
import { ApiClient } from "@/lib/api";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  action?: {
    type: "navigate" | "run_test" | "check_health";
    payload?: any;
    label: string;
  };
  timestamp: string;
}

interface ChatBotProps {
  onNavigateToTab?: (tab: string) => void;
  onRunTestWithUrl?: (url: string, tier: string) => void;
  backendOnline: boolean;
}

const DEFAULT_PROMPTS = [
  "🚀 Test https://hackfront-plum.vercel.app",
  "📱 Why do budget phones fail on heavy JavaScript?",
  "⚡ How to improve LCP & TTFB on Slow 3G?",
  "🔮 Switch to Crazy 3D Holographic View",
  "🛠️ How does CPU throttling emulation work?",
  "🩺 Check live backend health & latency",
];

export default function ChatBot({
  onNavigateToTab,
  onRunTestWithUrl,
  backendOnline,
}: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "👋 Hi there! I'm your **TierLens AI Assistant**.\n\nI can help you diagnose device performance bottlenecks, explain metrics (LCP, TTFB, INP), simulate hardware constraints, or trigger automated audits across your frontend and backend.",
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim()) return;

    soundFX.playClick();

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!messageText) setInput("");
    setIsTyping(true);

    // Formulate AI response
    setTimeout(async () => {
      const lower = textToSend.toLowerCase();
      let replyText = "";
      let action: Message["action"] | undefined = undefined;

      if (lower.includes("3d") || lower.includes("crazy") || lower.includes("hologram")) {
        replyText = "🔮 **Opening the Holographic Cockpit!**\n\nThe Crazy 3D View visualizes real-time hardware emulation, including 8-core CPU workloads, RAM exhaustion simulations, and live particle network streams.";
        action = {
          type: "navigate",
          payload: "crazy_view",
          label: "✨ Launch Holographic 3D View",
        };
      } else if (lower.includes("test https://hackfront-plum.vercel.app") || lower.includes("run test") || lower.includes("benchmark")) {
        const urlMatch = textToSend.match(/https?:\/\/[^\s]+/);
        const targetUrl = urlMatch ? urlMatch[0] : "https://hackfront-plum.vercel.app";
        replyText = `⚡ **Ready to Benchmark:** \`${targetUrl}\`\n\nI'll initiate a web audit using Chrome DevTools Protocol to measure:\n- First Contentful Paint (FCP)\n- Largest Contentful Paint (LCP)\n- Total Blocking Time (TBT)\n- Memory pressure under 2GB RAM / Slow 3G`;
        action = {
          type: "run_test",
          payload: { url: targetUrl, tier: "ENTRY_LEVEL" },
          label: `🚀 Benchmark ${targetUrl.replace(/^https?:\/\//, "")}`,
        };
      } else if (lower.includes("budget") || lower.includes("javascript") || lower.includes("slow")) {
        replyText = "📱 **Budget Hardware Bottlenecks:**\n\nLow-end devices ($70–$150, 2GB RAM) suffer from:\n1. **High Main-Thread Execution Time**: V8 compilation and parsing take 4x–8x longer on Cortex-A53 cores.\n2. **Garbage Collection Choke**: Limited RAM triggers aggressive scavenges and marks, freezing animations.\n3. **Network Serialization Delay**: Large script bundles block the parser over 3G.\n\n*Recommendation*: Code-split entry chunks under 50KB and defer non-critical hydrations.";
        action = {
          type: "navigate",
          payload: "optimizations",
          label: "💡 View Recommended Fixes",
        };
      } else if (lower.includes("lcp") || lower.includes("ttfb") || lower.includes("3g")) {
        replyText = "⚡ **Improving LCP & TTFB on Slow 3G:**\n\n- **TTFB (Time to First Byte)**: Ensure edge CDN caching is enabled on Vercel and backend responses compress with gzip/brotli.\n- **LCP (Largest Contentful Paint)**: Preload your hero image using `<link rel=\"preload\" as=\"image\">` and avoid client-rendered image components without explicit width/height dimensions.\n- **Network Profiles**: On Slow 3G (500 Kbps down, 200ms latency), round-trips take 400ms each, so reduce initial HTTP requests to fewer than 15.";
      } else if (lower.includes("health") || lower.includes("latency") || lower.includes("backend") || lower.includes("render")) {
        try {
          const pingResult = await ApiClient.ping();
          replyText = `🩺 **Backend Diagnostics:**\n\n- **Target Server**: \`${pingResult.base}\`\n- **Status**: ${pingResult.ok ? "🟢 Healthy & Connected" : "🔴 Offline / Cold Sleep"}\n- **Response Latency**: **${pingResult.latencyMs} ms**\n- **Database**: SQLite Fallback / PostgreSQL ready\n- **Deployment**: Render Free Tier (Frankfurt/US)`;
        } catch (e: any) {
          replyText = `🩺 **Backend Status**: Checking connection to \`https://hackfront-ckpg.onrender.com\`... Render backend is currently waking up from cold sleep (takes ~15-25 seconds).`;
        }
      } else if (lower.includes("throttling") || lower.includes("cpu") || lower.includes("emulate")) {
        replyText = "🛠️ **How Hardware Emulation Works:**\n\nTierLens connects directly to Chrome's DevTools Protocol (`CDPSession`):\n- **Emulation.setCPUThrottlingRate**: Slows down the JavaScript virtual machine by an exact multiplier (e.g., 4x or 8x).\n- **Network.emulateNetworkConditions**: Throttles download throughput (kbps), upload, and adds physical RTT latency (ms).\n- **Emulation.setDeviceMetricsOverride**: Simulates exact viewport dimensions, pixel density, and touch events.";
      } else {
        replyText = `💡 **AI Insight:**\n\nI understand your question regarding *"${textToSend}"*.\n\nTierLens links your **Vercel frontend**, **Render backend**, and **GitHub codebase** to help you uncover performance regressions before your users on low-end hardware do. Would you like me to run an automated audit or inspect device profiles?`;
        action = {
          type: "navigate",
          payload: "web_test",
          label: "🧪 Open Web Testing Lab",
        };
      }

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: replyText,
        action,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      soundFX.playPing();
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleActionClick = (action: Message["action"]) => {
    if (!action) return;
    soundFX.playClick();
    if (action.type === "navigate" && onNavigateToTab) {
      onNavigateToTab(action.payload);
      setIsOpen(false);
    } else if (action.type === "run_test" && onRunTestWithUrl) {
      onRunTestWithUrl(action.payload.url, action.payload.tier);
      setIsOpen(false);
    } else if (action.type === "navigate" && action.payload === "crazy_view" && onNavigateToTab) {
      onNavigateToTab("crazy_view");
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => {
              soundFX.playPing();
              setIsOpen(true);
            }}
            className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 active:scale-95 transition-all"
          >
            {/* Glowing ring animation */}
            <span className="absolute -inset-0.5 rounded-full bg-cyan-400 opacity-40 blur group-hover:opacity-75 animate-pulse" />
            <div className="relative flex items-center gap-2">
              <Bot className="w-5 h-5 text-cyan-200" />
              <span>Ask AI Copilot</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Expandable Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[420px] h-[600px] max-h-[85vh] flex flex-col rounded-2xl bg-slate-950 border border-cyan-500/40 shadow-2xl overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom-6 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-cyan-500/20 bg-slate-900/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-sm">TierLens AI Copilot</h3>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Live
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {backendOnline ? "Connected to Render API" : "Connecting to backend..."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  soundFX.playClick();
                  setMessages([
                    {
                      id: "welcome-reset",
                      sender: "bot",
                      text: "Chat cleared. What can I help you test or diagnose today?",
                      timestamp: "Just now",
                    },
                  ]);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Clear Chat History"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  soundFX.playClick();
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "bot" && (
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-br-none"
                      : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none"
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.text}</div>

                  {/* Interactive Action Button */}
                  {msg.action && (
                    <div className="mt-3 pt-2.5 border-t border-slate-700/50">
                      <button
                        onClick={() => handleActionClick(msg.action)}
                        className="w-full py-2 px-3 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-colors flex items-center justify-center gap-1.5 text-xs shadow-md shadow-cyan-500/20"
                      >
                        <span>{msg.action.label}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="mt-1 text-[9px] text-right opacity-60">{msg.timestamp}</div>
                </div>

                {msg.sender === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs pl-9">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
                </div>
                <span>Copilot is formulating advice...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel */}
          <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-900/50 overflow-x-auto flex gap-1.5 scrollbar-none">
            {DEFAULT_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-slate-800/90 hover:bg-cyan-500/20 hover:text-cyan-300 hover:border-cyan-500/40 border border-slate-700 text-slate-300 transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-cyan-500/20 bg-slate-900 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or request a benchmark..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:from-cyan-400 hover:to-blue-500 transition-all shadow-md shadow-cyan-500/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
