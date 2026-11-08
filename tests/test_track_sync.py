"""Track-specific AV tests using real encoded media, without the original song."""
import contextlib
import copy
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
import wave

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'tools'))
import delivery
import soundtrack
import syncqa


@unittest.skipUnless(shutil.which('ffmpeg'), 'requires ffmpeg')
class TrackSyncTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.out = self.root/'out'
        self.out.mkdir()
        self.cfg = dict(_dir=self.root, title='track-sync', soundtrack='soundtrack.json')
        (self.root/'project.js').write_text('window.MV_PROJECT = {"title":"track-sync","soundtrack":"soundtrack.json"};')
        rng = np.random.default_rng(71)
        samples = rng.normal(0, .06, 48000)
        with wave.open(str(self.root/'voice.wav'), 'wb') as wav:
            wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(24000)
            wav.writeframes((samples*32767).astype('<i2').tobytes())
        quiet = contextlib.redirect_stdout(io.StringIO())
        quiet.__enter__()
        self.addCleanup(quiet.__exit__, None, None, None)

    def film(self, *, fps=24, start=10, end=13, loop=False, cycle=0, source_at=.7,
             event_at=11, role='voice', reference='voice', audio_delay=0, visual_delay=0, gain=0, duplicate=False, silent=False):
        track = dict(id='voice', role=role, file='voice.wav', at=10.5, trimStart=.2,
                     duration=5 if loop else 1.5, loop=loop, gainDb=gain, fadeIn=.1, fadeOut=.1)
        tracks = [track]
        if duplicate:
            tracks.append(dict(track, id='duplicate'))
        (self.root/'soundtrack.json').write_text(json.dumps(dict(song=False, tracks=tracks)))
        count = round((end-start)*fps)
        pixels = np.full((count, 54, 96), 45, dtype=np.uint8)
        at = round((event_at-start)*fps) + visual_delay
        if 0 <= at < count:
            pixels[at] = 225
        raw, film = self.out/'raw.mp4', self.out/'film.mp4'
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', '96x54',
                        '-r', str(fps), '-i', '-', '-c:v', 'libx264', '-crf', '12', '-preset', 'ultrafast',
                        '-pix_fmt', 'yuv420p', str(raw)], input=pixels.tobytes(), capture_output=True, check=True)
        event = dict(id='spoken-word', type='action', at=event_at,
                     visual=dict(metric='brightness', roi=[0, 0, 1, 1]),
                     audio=dict(track=reference, sourceAt=source_at, cycle=cycle))
        info = dict(fps=fps, width=96, height=54, sceneSrc={}, shots=[dict(name='flash', scene='flash', sync=[event], **{'from': start, 'to': end})])
        mix = soundtrack.plan(self.cfg, info, start, end, silent)
        actual = copy.deepcopy(mix)
        for cue in actual['tracks']:
            cue['at'] += audio_delay/fps
        before = delivery.revision(self.cfg, info, film)
        soundtrack.mux(['-i', str(raw)], film, actual)
        delivery.write_receipt(film, self.cfg, dict(info, _soundtrack=mix), start, count, SimpleNamespace(noaudio=silent), before, [])
        return film

    def test_voice_without_song_passes_with_trim_and_nonzero_origin(self):
        report = syncqa.inspect(self.cfg, self.film())
        self.assertEqual(report['status'], 'pass', report)
        row = report['checks'][-1]
        self.assertEqual(row['audioReference']['track'], 'voice')
        self.assertAlmostEqual(row['audioReference']['expectedOutputSeconds'], 1)
        self.assertLess(abs(row['errorFrames']), .1)

    def test_60fps_track_reference(self):
        report = syncqa.inspect(self.cfg, self.film(fps=60))
        self.assertEqual(report['status'], 'pass', report)

    def test_delayed_encoded_audio_fails(self):
        report = syncqa.inspect(self.cfg, self.film(audio_delay=4))
        self.assertEqual(report['status'], 'fail', report)
        self.assertAlmostEqual(report['checks'][-1]['errorFrames'], -4, delta=.2)

    def test_delayed_picture_fails(self):
        report = syncqa.inspect(self.cfg, self.film(visual_delay=4))
        self.assertEqual(report['status'], 'fail', report)
        self.assertAlmostEqual(report['checks'][-1]['errorFrames'], 4, delta=.2)

    def test_looped_sfx_second_cycle_in_pilot(self):
        report = syncqa.inspect(self.cfg, self.film(loop=True, cycle=1, event_at=13, start=12.5, end=14.5, role='sfx'))
        self.assertEqual(report['status'], 'pass', report)
        self.assertEqual(report['checks'][-1]['audioReference']['cycle'], 1)
        self.assertAlmostEqual(report['checks'][-1]['audioReference']['expectedOutputSeconds'], .5)

    def test_unknown_track_and_trimmed_out_source_fail(self):
        for kwargs in (dict(reference='missing'), dict(source_at=.1), dict(cycle=1), dict(source_at=9)):
            with self.subTest(kwargs=kwargs):
                report = syncqa.inspect(self.cfg, self.film(**kwargs))
                self.assertEqual(report['status'], 'fail', report)
                self.assertEqual(report['checks'][-1]['kind'], 'audio-reference')

    def test_silent_and_masked_references_remain_unverified(self):
        for kwargs in (dict(silent=True), dict(gain=-96), dict(duplicate=True)):
            with self.subTest(kwargs=kwargs):
                report = syncqa.inspect(self.cfg, self.film(**kwargs))
                self.assertEqual(report['status'], 'unverified', report)

    def test_anchor_outside_pilot_remains_unverified(self):
        report = syncqa.inspect(self.cfg, self.film(loop=True, cycle=0, event_at=13, start=12.5, end=14.5))
        self.assertEqual(report['status'], 'unverified', report)
        self.assertIn('outside this export', report['checks'][-1]['message'])

    def test_track_template_at_cue_boundary_remains_unverified(self):
        report = syncqa.inspect(self.cfg, self.film(source_at=.21))
        self.assertEqual(report['status'], 'unverified', report)

    def test_bad_audio_reference_schema(self):
        for audio in (None, {}, {'track':'voice'}, {'track':'voice','sourceAt':True}, {'track':'voice','sourceAt':float('nan')},
                      {'track':'voice','sourceAt':0,'cycle':1.5}, {'track':'voice','sourceAt':0,'cycle':-1},
                      {'track':'voice','sourceAt':0,'typo':1}):
            info = {'shots':[{'name':'one', 'from':0,'to':2,'sync':[dict(id='x',at=1,type='action',audio=audio)]}]}
            with self.subTest(audio=audio), self.assertRaises(ValueError):
                delivery.events_of(info)


if __name__ == '__main__':
    unittest.main()
