// Original 120 BPM exercise score; the same grid drives make_audio.py. No song or lyrics required.
window.MV_DATA = {
  audio: { bpm: 120, duration: 24, fps: 100, meter: 4,
    beats: Array.from({ length: 48 }, (_, i) => i / 2),
    downbeats: Array.from({ length: 12 }, (_, i) => i * 2),
    sections: [], env: {}, onsets: {} },
  lyrics: { lines: [] },
};
