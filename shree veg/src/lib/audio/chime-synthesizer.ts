'use client';

/**
 * Web Audio API synthesized alert chime.
 * Loud, crisp, zero-latency, zero-dependency.
 * Does not rely on external audio files that could 404 or fail codecs on low-bandwidth highway 4G.
 */

let audioCtx: AudioContext | null = null;
let chimeIntervalId: any = null;
let isChimeActive = false;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
}

/**
 * Unlock audio context via user interaction to bypass autoplay restrictions.
 */
export async function unlockAudioContext(): Promise<boolean> {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    // Play a gentle unlock tone (523.25Hz C5)
    playTone(523.25, 0.15, 'sine', 0.2);
    return true;
  } catch (err) {
    console.warn('[Audio] Failed to unlock audio context:', err);
    return false;
  }
}

/**
 * Check if audio context is currently unlocked and allowed to play.
 */
export function isAudioUnlocked(): boolean {
  return !!audioCtx && audioCtx.state === 'running';
}

/**
 * Plays a single synthesized tone with ADSR gain envelope.
 */
function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.5,
  startTimeOffset = 0
) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime + startTimeOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    // Rapid attack, slow exponential release
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch (err) {
    console.warn('[Audio] Error playing tone:', err);
  }
}

/**
 * Plays a single burst of the distinct Shree Pure Veg restaurant booking chime.
 * Two-tone ascending chime (880Hz A5 + 1318.5Hz E6) with high harmonic warmth.
 */
export function playChimeBurst(volume = 0.8) {
  try {
    // Primary Tone 1
    playTone(880, 0.45, 'triangle', volume, 0);
    playTone(1760, 0.35, 'sine', volume * 0.4, 0);

    // Primary Tone 2 (Higher, urgent, pleasant)
    playTone(1318.51, 0.65, 'triangle', volume, 0.18);
    playTone(2637.02, 0.5, 'sine', volume * 0.3, 0.18);
  } catch (err) {
    console.warn('[Audio] Chime burst failed:', err);
  }
}

/**
 * Starts continuous looping chime until dismissed or muted.
 * Repeated every 2.4 seconds with slight pitch variation.
 */
export function startLoopingChime(volume = 0.85): void {
  if (isChimeActive) return;
  isChimeActive = true;

  // Immediate first burst
  playChimeBurst(volume);

  // Interval repeat
  chimeIntervalId = setInterval(() => {
    if (!isChimeActive) {
      clearInterval(chimeIntervalId);
      return;
    }
    playChimeBurst(volume);
  }, 2400);
}

/**
 * Stops looping chime.
 */
export function stopLoopingChime(): void {
  isChimeActive = false;
  if (chimeIntervalId) {
    clearInterval(chimeIntervalId);
    chimeIntervalId = null;
  }
}

export function isLoopingChimeActive(): boolean {
  return isChimeActive;
}
