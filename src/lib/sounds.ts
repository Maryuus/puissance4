// Web Audio API sound effects - no external files needed

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContext;
  } catch {
    return null;
  }
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainValue: number = 0.3,
  decayTime?: number
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  gainNode.gain.setValueAtTime(gainValue, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.001,
    ctx.currentTime + (decayTime ?? duration)
  );

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

export function playDropSound(player: 1 | 2): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Different pitch for each player
  const baseFreq = player === 1 ? 440 : 550;

  // Quick descending tone (piece falling)
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(baseFreq, ctx.currentTime + 0.15);

  gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.2);

  // Landing thud
  const thud = ctx.createOscillator();
  const thudGain = ctx.createGain();
  thud.connect(thudGain);
  thudGain.connect(ctx.destination);

  thud.type = 'triangle';
  thud.frequency.setValueAtTime(120, ctx.currentTime + 0.15);
  thud.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.3);

  thudGain.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
  thudGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

  thud.start(ctx.currentTime + 0.15);
  thud.stop(ctx.currentTime + 0.3);
}

export function playWinSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Victory fanfare - ascending arpeggio
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, 0.3, 'sine', 0.25, 0.4);
    }, i * 100);
  });

  // Final chord
  setTimeout(() => {
    [523.25, 659.25, 783.99].forEach(freq => {
      playTone(freq, 0.6, 'sine', 0.15, 0.7);
    });
  }, 450);
}

export function playDrawSound(): void {
  // Descending minor tones
  const notes = [440, 392, 349.23, 329.63]; // A4, G4, F4, E4
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, 0.25, 'sine', 0.2, 0.3);
    }, i * 100);
  });
}

export function playHoverSound(): void {
  playTone(880, 0.05, 'sine', 0.05, 0.05);
}

export function playErrorSound(): void {
  playTone(200, 0.15, 'sawtooth', 0.1, 0.2);
}

export function resumeAudioContext(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
}
