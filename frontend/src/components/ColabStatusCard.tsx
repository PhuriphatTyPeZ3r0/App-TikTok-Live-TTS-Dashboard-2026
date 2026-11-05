"use client";

/**
 * Apple visionOS Frosted Liquid Glass Google Colab GPU & Engine Status Card Component for Next.js 15.
 *
 * Visualizes Google Colab Tesla T4 GPU and Hugging Face ZeroGPU remote inference status,
 * active neural Text-to-Speech (TTS) voice engines, Cloudflare Quick Tunnel URI routing,
 * and allows dynamic reconfiguration of fallback policies and remote inference endpoints.
 * Operates in the Single-Page Application (SPA) dashboard communicating with the FastAPI
 * Asynchronous Server Gateway Interface (ASGI) backend server and coordinating with the
 * Web Audio Application Programming Interface (Web Audio API) pipeline and First-In, First-Out (FIFO) queue.
 *
 * Voice actor attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 */

import React, { useState } from "react";
import { Cpu, CloudLightning, ExternalLink, Settings2, Check, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ColabSettings } from "../types/dashboard";

export interface ColabStatusCardProps {
  /** Current Google Colab Cloudflare tunnel and fallback preferences. */
  colabSettings: ColabSettings;
  /** Active Text-to-Speech (TTS) synthesis engine description string. */
  activeEngine?: string;
  /** Async callback to persist and broadcast updated Colab tunnel settings. */
  onUpdateSettings: (settings: Partial<ColabSettings>) => Promise<void>;
}

export function ColabStatusCard({
  colabSettings,
  activeEngine = "Fish Speech v1.5 (พิพัฒน์ บุญสิทธิเลิศ)",
  onUpdateSettings,
}: ColabStatusCardProps) {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [tunnelUrlInput, setTunnelUrlInput] = useState<string>(
    colabSettings.colab_tunnel_url || ""
  );
  const [preferColab, setPreferColab] = useState<boolean>(
    colabSettings.prefer_colab_tts
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Sync internal state if props change from WebSocket broadcasts
  React.useEffect(() => {
    setTunnelUrlInput(colabSettings.colab_tunnel_url || "");
    setPreferColab(colabSettings.prefer_colab_tts);
  }, [colabSettings]);

  const hasActiveTunnel = Boolean(
    colabSettings.colab_tunnel_url && colabSettings.colab_tunnel_url.trim().length > 0
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await onUpdateSettings({
        colab_tunnel_url: tunnelUrlInput.trim() || null,
        prefer_colab_tts: preferColab,
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditing(false);
      }, 1500);
    } catch (err) {
      console.error("Failed to update Colab tunnel settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full liquid-glass specular-border rounded-2xl p-5 shadow-2xl backdrop-blur-2xl transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-white/10 border border-white/10 text-cyan-300">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-wide text-white">
              สถานะเซิร์ฟเวอร์ปัญญาประดิษฐ์ (AI GPU & Colab Status)
            </h2>
            <p className="text-xs text-white/50">
              Colab Tesla T4 GPU / Hugging Face ZeroGPU & Tunnel Controller
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-medium text-white/90 transition-colors"
        >
          <Settings2 className="w-3.5 h-3.5 text-cyan-300" />
          <span>{isEditing ? "ปิดการตั้งค่า" : "ตั้งค่า Tunnel"}</span>
        </button>
      </div>

      {/* Grid: GPU Status & Active Engine Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* Remote GPU Status Card */}
        <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                hasActiveTunnel
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-white/10 text-white/40 border border-white/10"
              }`}
            >
              <CloudLightning className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-white/50">สถานะการเชื่อมต่อ GPU</div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5 mt-0.5">
                {hasActiveTunnel ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-emerald-300">Tesla T4 GPU (Connected)</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    <span className="text-rose-300">Offline (Using Fallback)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70">
            {hasActiveTunnel ? "Remote ZeroGPU" : "Local Edge"}
          </span>
        </div>

        {/* Active Engine Badge */}
        <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-white/50">เอนจินสังเคราะห์เสียงหลัก</div>
              <div className="text-xs font-semibold text-cyan-200 mt-0.5 truncate max-w-[220px]">
                {activeEngine}
              </div>
            </div>
          </div>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
            Active
          </span>
        </div>
      </div>

      {/* Current Tunnel URL Bar */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <span className="text-white/40 shrink-0">Tunnel URI:</span>
          <span className="font-mono text-cyan-300/90 truncate">
            {colabSettings.colab_tunnel_url || "ยังไม่ได้กำหนด Tunnel URL (กำลังใช้โหมด Local/Edge-TTS)"}
          </span>
        </div>
        {colabSettings.colab_tunnel_url && (
          <a
            href={colabSettings.colab_tunnel_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 shrink-0"
          >
            <span>ทดสอบ URL</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Expandable In-Dashboard Modal / Form to edit tunnel URL and toggle */}
      <AnimatePresence>
        {isEditing && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSave}
            className="overflow-hidden mt-4 pt-4 border-t border-white/10 flex flex-col gap-3.5"
          >
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="colab_tunnel_url"
                className="text-xs font-medium text-white/80"
              >
                Google Colab Cloudflare Quick Tunnel URL (เช่น https://xyz.trycloudflare.com)
              </label>
              <input
                id="colab_tunnel_url"
                type="url"
                placeholder="https://your-tunnel-subdomain.trycloudflare.com"
                value={tunnelUrlInput}
                onChange={(e) => setTunnelUrlInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/20 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00f2fe]/40"
              />
            </div>

            {/* Prefer Colab Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/10">
              <div>
                <div className="text-xs font-medium text-white">
                  ให้ความสำคัญกับ Colab GPU ก่อน (prefer_colab_tts)
                </div>
                <div className="text-[10px] text-white/40">
                  ส่งคำขอสังเคราะห์เสียงไปยัง Colab Tesla T4 ก่อนสลับมาใช้ Edge-TTS เมื่อหมดเวลา
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreferColab(!preferColab)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                  preferColab ? "bg-cyan-500 justify-end" : "bg-white/20 justify-start"
                }`}
              >
                <motion.div
                  layout
                  className="w-4 h-4 rounded-full bg-white shadow-md"
                />
              </button>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                ยกเลิก
              </button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all duration-200 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>บันทึกสำเร็จ!</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>บันทึกการตั้งค่า</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
