import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service — StreamVox Live",
  description:
    "Terms of Service for StreamVox Live TikTok Text-to-Speech (TTS) Studio. Compliant with TikTok Developer Program Guidelines.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Navigation back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to StreamVox Live Console</span>
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Terms of Service
            </h1>
            <p className="text-xs text-muted-foreground">
              Last updated: November 8, 2026 • Effective Date: November 8, 2026
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="prose prose-invert max-w-none text-sm leading-relaxed space-y-6 text-foreground/90">
          <section className="p-5 rounded-2xl bg-card border border-border space-y-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>1. Acceptance of Terms</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              By accessing or using the StreamVox Live web dashboard, Open Broadcaster Software (OBS) browser overlays, or associated Application Programming Interface (API) endpoints, you agree to be bound by these Terms of Service and all applicable guidelines provided by TikTok and related streaming platforms.
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-card border border-border space-y-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary" />
              <span>2. Broadcaster Responsibilities &amp; Moderation</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              As a live broadcaster using StreamVox Live:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1.5">
              <li>You are solely responsible for all synthesized speech, audio streams, and visual content broadcast through your TikTok LIVE channel.</li>
              <li>You agree to enable automated safety filtering (PyThaiNLP profanity filtering and anti-spam controls) to prevent the broadcast of hate speech, harassment, explicit materials, or illegal statements.</li>
              <li>You shall not use StreamVox Live to simulate fraudulent impersonation or deceptive voice broadcasting.</li>
            </ul>
          </section>

          <section className="p-5 rounded-2xl bg-card border border-border space-y-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>3. Service Availability &amp; Disclaimer of Warranty</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              StreamVox Live is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of uninterrupted uptime. We do not guarantee continuous access during third-party cloud infrastructure maintenance (e.g. Render, Vercel, or TikTok LIVE server API changes).
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-card border border-border space-y-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span>4. Voice Attribution Notice</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Master Thai speech synthesis models in StreamVox Live are dedicated to professional Thai voice actor คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert). Unauthorized distribution, reverse engineering, or extraction of weights for commercial resale is strictly prohibited.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
