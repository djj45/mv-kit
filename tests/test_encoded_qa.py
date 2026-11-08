"""Encoded-media regressions: actual H.264/AAC positive and deliberately broken films.

Requires local ffmpeg/ffprobe; no browser, network, private song or external media.
"""
import contextlib
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import types
import unittest
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import delivery
import filmqa
import syncqa


@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'encoded QA requires ffmpeg/ffprobe')
class EncodedTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.out = self.root / 'out'
        self.out.mkdir()
        (self.root / 'project.js').write_text('window.MV_PROJECT = {"title":"fixture"};')
        (self.root / 'scene.js').write_text('// deterministic test scene\n')
        self.cfg = {'_dir': self.root, 'audio': 'source.wav', 'scripts': ['scene.js']}
        self.args = types.SimpleNamespace(samples=1, shutter=0.5, crf=12, preset='ultrafast', scale=1, noaudio=False)
        rate = 24000
        rng = np.random.default_rng(32)
        samples = rng.normal(0, 0.003, 5 * rate)
        for at in (1, 3):
            n = int(0.16 * rate)
            samples[at * rate:at * rate + n] += rng.normal(0, 0.18, n) * np.exp(-np.arange(n) / rate * 20)
        with wave.open(str(self.root / 'source.wav'), 'wb') as wav:
            wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(rate)
            wav.writeframes((samples * 32767).astype('<i2').tobytes())
        quiet = contextlib.redirect_stdout(io.StringIO())
        quiet.__enter__()
        self.addCleanup(quiet.__exit__, None, None, None)

    def film(self, name='film', fps=24, delay=0, audio=True, audio_delay=0, black=False, start=0.5, end=4.5, events=True):
        count = round((end - start) * fps)
        frames = np.full((count, 54, 96), 40, np.uint8)
        for at in (1, 3):
            i = round((at - start) * fps) + delay
            if 0 <= i < count:
                frames[i] = 210
        if black:
            frames[fps:fps * 2] = 0
        film = self.out / (name + '.mp4')
        cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', '96x54', '-r', str(fps), '-i', '-']
        if audio:
            cmd += ['-ss', str(start), '-i', str(self.root / 'source.wav'), '-map', '0:v', '-map', '1:a', '-c:a', 'aac']
            if audio_delay:
                cmd += ['-af', f'adelay={audio_delay / fps * 1000}:all=1']
        cmd += ['-t', str(count / fps), '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '12', '-pix_fmt', 'yuv420p', str(film)]
        subprocess.run(cmd, input=frames.tobytes(), check=True, capture_output=True)
        sync = [{'id': f'hit-{at}', 'at': at, 'type': 'action', 'visual': {'metric': 'brightness', 'roi': [0, 0, 1, 1]}}
                for at in (1, 3)] if events else []
        info = {'from': 0, 'to': 5, 'fps': fps, 'width': 96, 'height': 54, 'audio': 'source.wav',
                'sceneSrc': {}, 'shots': [{'name': 'fixture', 'scene': 'fixture', 'from': 0, 'to': 5, 'fadeIn': 0, 'sync': sync}]}
        rev = delivery.revision(self.cfg, info, film)
        delivery.write_receipt(film, self.cfg, info, start, count, self.args, rev, [])
        return film

    def test_matching_encoded_events_pass_at_24_and_60_fps_with_trim(self):
        for fps in (24, 60):
            with self.subTest(fps=fps):
                report = syncqa.inspect(self.cfg, self.film(name=str(fps), fps=fps))
                self.assertEqual(report['status'], 'pass', report)
                hits = [c for c in report['checks'] if 'id' in c]
                self.assertEqual(len(hits), 2)
                self.assertTrue(all(abs(c['errorFrames']) < 0.2 for c in hits))

    def test_picture_delayed_four_frames_fails(self):
        report = syncqa.inspect(self.cfg, self.film(delay=4))
        self.assertEqual(report['status'], 'fail', report)
        self.assertTrue(all(c['errorFrames'] > 3.8 for c in report['checks'] if 'id' in c))

    def test_audio_delayed_four_frames_fails(self):
        report = syncqa.inspect(self.cfg, self.film(audio_delay=4))
        self.assertEqual(report['status'], 'fail', report)
        self.assertTrue(all(c['errorFrames'] < -3.8 for c in report['checks'] if 'id' in c))

    def test_no_observable_peak_is_unverified(self):
        report = syncqa.inspect(self.cfg, self.film(delay=12))
        self.assertEqual(report['status'], 'unverified', report)
        self.assertEqual(delivery.exit_code(report), 2)

    def test_silent_and_repeated_audio_do_not_match(self):
        self.assertIsNone(syncqa.match_audio(np.zeros(32000), np.zeros(32000), 1, 1))
        tone = np.sin(np.arange(32000) * 2 * np.pi * 200 / 8000)
        self.assertIsNone(syncqa.match_audio(tone, tone, 1, 1))

    def test_plateau_is_not_a_precise_visual_landing(self):
        frames = np.full((15, 54, 96), 100, dtype=np.uint8)
        self.assertIsNone(syncqa.visual_peak(frames, 0, {'metric': 'brightness'}))

    def test_old_or_changed_input_cannot_pass(self):
        film = self.film()
        (self.root / 'scene.js').write_text('// changed after rendering\n')
        self.assertEqual(syncqa.inspect(self.cfg, film)['status'], 'fail')
        self.assertEqual(filmqa.inspect(self.cfg, film)['status'], 'fail')

    def test_replaced_film_cannot_pass(self):
        film = self.film()
        film.write_bytes(film.read_bytes() + b'changed')
        self.assertEqual(syncqa.inspect(self.cfg, film)['status'], 'fail')

    def test_changed_audio_bytes_with_same_size_and_mtime_invalidate_receipt(self):
        film = self.film()
        audio = self.root / 'source.wav'
        old = audio.stat()
        data = bytearray(audio.read_bytes())
        data[-1] ^= 1
        audio.write_bytes(data)
        os.utime(audio, ns=(old.st_atime_ns, old.st_mtime_ns))
        self.assertEqual(syncqa.inspect(self.cfg, film)['status'], 'fail')

    def test_check_cli_does_not_launch_browser_and_keeps_unverified_exit_code(self):
        film = self.film(events=False)
        env = dict(os.environ, CHROME='/no-such-browser')
        command = [sys.executable, str(ROOT / 'tools/render.py'), str(self.root)]
        result = subprocess.run(command + ['sync', '--file', str(film)], env=env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertIn('sync: unverified', result.stdout)
        result = subprocess.run(command + ['filmcheck', '--file', str(film)], env=env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_render_errors_are_not_certified(self):
        film = self.film()
        path = delivery.receipt_path(film)
        record = json.loads(path.read_text())
        record.update(complete=False, errors=['scene failed'])
        path.write_text(json.dumps(record))
        self.assertEqual(syncqa.inspect(self.cfg, film)['status'], 'fail')

    def test_missing_receipt_and_missing_events_remain_unverified(self):
        film = self.film(events=False)
        self.assertEqual(syncqa.inspect(self.cfg, film)['status'], 'unverified')
        delivery.receipt_path(film).unlink()
        self.assertEqual(syncqa.inspect(self.cfg, film)['status'], 'unverified')
        self.assertEqual(filmqa.inspect(self.cfg, film)['status'], 'unverified')

    def test_pilot_only_verifies_events_inside_its_range(self):
        report = syncqa.inspect(self.cfg, self.film(start=2.5, end=4.5))
        self.assertEqual(report['status'], 'pass', report)
        self.assertEqual(report['skippedOutsideRange'], ['hit-1'])

    def test_black_and_missing_audio_are_failures(self):
        report = filmqa.inspect(self.cfg, self.film(black=True, audio=False))
        failed = {c['kind'] for c in report['checks'] if c['status'] == 'fail'}
        self.assertIn('black', failed)
        self.assertIn('audio-track', failed)

    def test_declared_black_is_acknowledged_in_song_time(self):
        film = self.film(black=True)
        self.cfg['filmQa'] = {'allow': [{'kind': 'black', 'from': 1.49, 'to': 2.51, 'reason': 'intentional interlude'}]}
        report = filmqa.inspect(self.cfg, film)
        black = next(c for c in report['checks'] if c['kind'] == 'black')
        self.assertEqual(black['status'], 'info')
        self.assertAlmostEqual(black['songSeconds'], 1.5, places=3)
        self.assertEqual(black['shots'], ['fixture'])

    def test_decoded_frame_count_and_duration_use_receipt(self):
        film = self.film()
        path = delivery.receipt_path(film)
        record = json.loads(path.read_text())
        record['frames'] += 12
        path.write_text(json.dumps(record))
        report = filmqa.inspect(self.cfg, film)
        failed = {c['kind'] for c in report['checks'] if c['status'] == 'fail'}
        self.assertTrue({'frames', 'duration'} <= failed)

    def test_invalid_event_roi_rejected(self):
        info = {'shots': [{'name': 'shot', 'from': 0, 'to': 2, 'sync': [
            {'id': 'x', 'at': 1, 'type': 'action', 'visual': {'roi': [0.8, 0, 0.4, 1]}}]}]}
        with self.assertRaises(ValueError):
            delivery.events_of(info)


if __name__ == '__main__':
    unittest.main()
