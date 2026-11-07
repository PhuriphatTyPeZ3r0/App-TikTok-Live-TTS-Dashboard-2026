import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, Eye, Trash2, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — StreamVox Live",
  description:
    "Privacy Policy for StreamVox Live TikTok Text-to-Speech (TTS) Studio. Compliant with TikTok Developer Terms of Service and Login Kit specification.",
};

export default function PrivacyPolicyPage() {
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
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Privacy Policy
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
              <Eye className="w-4 h-4 text-primary" />
              <span>1. Overview &amp; Scope</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              StreamVox Live (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) provides real-time Text-to-Speech (TTS) speech synthesis and live broadcast telemetry tools for TikTok content creators and live streamers. This Privacy Policy outlines how we collect, handle, protect, and process user credentials and profile data when you interact with StreamVox Live, including authentication via TikTok Login Kit and Google Single Sign-On (SSO).
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-card border border-border space-y-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <span>2. Data We Collect Through TikTok Login Kit</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              When you authenticate with StreamVox Live using TikTok Login Kit, we request explicit user authorization for the following scopes under the Open Authorization (OAuth) 2.0 Proof Key for Code Exchange (PKCE) protocol:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1.5">
              <li>
                <strong className="text-foreground">user.info.basic:</strong> Unique OpenID (an anonymized creator identifier), public display moniker (name), and profile avatar image URL.
              </li>
              <li>
                <strong className="text-foreground">Technical Identifiers:</strong> Session UUID, temporary authorization codes, and cryptographically signed session JSON Web Tokens (JWT).
              </li>
            </ul>
            <p className="text-xs sm:text-sm text-muted-foreground">
              We <strong className="text-foreground">NEVER</strong> access your private direct messages, your account password, or personal financial details.
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-card border border-border space-y-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>3. How We Use and Protect Your Data</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Collected information is exclusively utilized to:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1.5">
              <li>Authenticate your identity as a broadcaster on the StreamVox Live control console.</li>
              <li>Associate your personal voice tuning parameters (pitch, speed, volume) with your creator profile in our Render PostgreSQL database.</li>
              <li>Authorize Open Broadcaster Software (OBS) Studio browser source overlays via secure token verification.</li>
            </ul>
            <p className="text-xs sm:text-sm text-muted-foreground">
              We do <strong className="text-foreground">NOT</strong> sell, lease, monetize, or redistribute your personal data to advertisers or third-party brokers under any circumstance.
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-card border border-border space-y-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-destructive" />
              <span>4. Data Retention &amp; Account Deletion</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              You maintain total control over your data. You may revoke StreamVox Live access at any time through TikTok&apos;s native security settings at{" "}
              <a
                href="https://www.tiktok.com/setting/security"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline hover:text-primary/80"
              >
                https://www.tiktok.com/setting/security
              </a>
              . Upon revoking authorization or requesting account deletion, all cached tokens and profile associations stored in Render PostgreSQL will be permanently purged within 30 days.
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-card border border-border space-y-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <span>5. Contact &amp; Developer Inquiries</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              For privacy inquiries, technical compliance verification, or immediate account data removal requests, contact our developer operations team:
            </p>
            <div className="text-xs font-mono text-foreground bg-muted p-3 rounded-lg border border-border">
              StreamVox Live Engineering Operations<br />
              Electronic Mail: phuriphathem@gmail.com<br />
              Platform: StreamVox Live Console (FastAPI ASGI on Render Cloud)
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
