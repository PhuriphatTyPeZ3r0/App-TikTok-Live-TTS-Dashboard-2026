/**
 * TikTok Live TTS Cloud Web Platform - Shared Client Engine
 * Provides Web Audio API queueing, WebSocket auto-reconnect, and UI helpers.
 */

// HTML entity escaping helper to prevent DOM XSS
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// Toast notification helper
function showToast(message, type = 'info') {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '10px';
    toast.style.color = '#fff';
    toast.style.zIndex = '9999';
    toast.style.fontWeight = '600';
    toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
    toast.style.transition = 'all 0.3s ease';
    document.body.appendChild(toast);
  }

  if (type === 'success') {
    toast.style.background = 'linear-gradient(135deg, #10b981, #059669)';
  } else if (type === 'error') {
    toast.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
  } else {
    toast.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
  }

  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
  }, 3000);
}

// Copy text to clipboard with fallback
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      showToast('คัดลอกลิงก์สำเร็จแล้ว! (Copied)', 'success');
    } else {
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showToast('คัดลอกลิงก์สำเร็จแล้ว! (Copied)', 'success');
    }
  } catch (err) {
    console.error('Copy failed:', err);
    showToast('ไม่สามารถคัดลอกได้ กรุณาคัดลอกด้วยตนเอง', 'error');
  }
}

// Web Audio API Queue Player Class
class AudioQueuePlayer {
  constructor() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = AudioContextClass ? new AudioContextClass() : null;
    this.queue = [];
    this.isPlaying = false;
    this.currentSource = null;
    this.onAlertStart = null;
    this.onAlertEnd = null;
  }

  ensureContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  enqueue(item) {
    this.ensureContext();
    this.queue.push(item);
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.currentSource = null;
      if (this.onAlertEnd) this.onAlertEnd();
      return;
    }

    this.isPlaying = true;
    const currentItem = this.queue.shift();

    if (this.onAlertStart) {
      this.onAlertStart(currentItem);
    }

    try {
      if (!this.ctx) {
        throw new Error('AudioContext not supported');
      }

      // Decode Base64 MP3 chunk into ArrayBuffer
      const binaryString = atob(currentItem.audio_base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await this.ctx.decodeAudioData(bytes.buffer.slice(0));
      const source = this.ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.ctx.destination);
      this.currentSource = source;

      source.onended = () => {
        this.currentSource = null;
        this.playNext();
      };

      source.start(0);
    } catch (err) {
      console.error('Audio playback error:', err);
      this.currentSource = null;
      this.playNext();
    }
  }

  flush() {
    this.queue = [];
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Ignored if already stopped
      }
      this.currentSource = null;
    }
    this.isPlaying = false;
    if (this.onAlertEnd) {
      this.onAlertEnd();
    }
  }
}
