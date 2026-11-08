"""Generate the original exercise pulse (120 BPM, 24 seconds); no external media or dependencies."""
import math
import random
import struct
import wave
from pathlib import Path


def main():
    path = Path(__file__).resolve().parent / 'audio' / 'pulse.wav'
    path.parent.mkdir(exist_ok=True)
    rate = 24000
    data = bytearray()
    for i in range(24 * rate):
        t = i / rate
        beat = int(t * 2)
        dt = t - beat / 2
        hz = 220 if beat % 4 == 0 else 440
        pulse = 0.35 * math.sin(math.tau * hz * dt) * math.exp(-dt * 32) * min(1, dt * 1000)
        data.extend(struct.pack('<h', round(pulse * 32767)))
    with wave.open(str(path), 'wb') as wav:
        wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(rate); wav.writeframes(data)
    print(path)
    # Technical fixtures for the voice slot and transition sound; this is not speech/TTS.
    rng = random.Random(73)
    for name, seconds in [('voice-guide', 2.4), ('portal-sfx', 0.45), ('value-sfx', 0.6)]:
        data = bytearray()
        for i in range(round(seconds * rate)):
            t = i / rate
            if name == 'voice-guide':
                value = 0.12 * math.sin(math.tau * 330 * t) * (0.5 + 0.5 * math.sin(math.tau * 3 * t))
            elif name == 'portal-sfx':
                value = 0.18 * math.sin(math.tau * (500 * t + 900 * t * t)) * math.sin(math.pi * t / seconds)
            else:
                # A repeatable noise accent with a distinct source anchor at 0.2 s.
                value = rng.uniform(-1, 1) * 0.6 * math.exp(-((t - 0.2) / 0.1) ** 2)
            data.extend(struct.pack('<h', round(value * 32767)))
        fixture = path.with_name(name + '.wav')
        with wave.open(str(fixture), 'wb') as wav:
            wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(rate); wav.writeframes(data)
        print(fixture)


if __name__ == '__main__':
    main()
