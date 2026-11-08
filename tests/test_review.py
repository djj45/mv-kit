"""Caption timing, offline review generation and provenance regressions."""
import contextlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import captions
import delivery
import review
import soundtrack
from mvproject import fingerprint


def fixture(root, ids=False):
    out = root / 'out'
    out.mkdir()
    cfg = dict(_dir=root, title='Review <offline>', audio='tone.wav', soundtrack='soundtrack.json')
    (root / 'project.js').write_text('window.MV_PROJECT = ' + json.dumps({k: v for k, v in cfg.items() if k != '_dir'}) + ';')
    (root / 'soundtrack.json').write_text(json.dumps({'tracks': [dict(id='voice', role='voice', file='tone.wav', at=1, duration=1)],
        'subtitles': [dict(start=1.1, end=2.2, text='字幕 <&>'), dict(start=1.4, end=2.0, text='第二条字幕')]}))
    delivery.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=4', str(root/'tone.wav')])
    raw, film = out / 'raw.mp4', out / 'film.mp4'
    delivery.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'color=gray:s=320x180:r=24:d=2',
                  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', str(raw)])
    info = dict(fps=24, width=320, height=180, audio='tone.wav', sceneSrc={}, subtitles=[],
                shots=[dict(name='First', scene='one', **{'from': 0, 'to': 2}), dict(name='Second', scene='two', **{'from': 2, 'to': 4})])
    if ids:
        for i, shot in enumerate(info['shots']):
            shot['id'] = f'review-shot-{i}'
    mix = soundtrack.plan(cfg, info, 1, 3)
    before = delivery.revision(cfg, info, film)
    soundtrack.mux(['-i', str(raw)], film, mix, out / '.audio-cache')
    delivery.write_receipt(film, cfg, dict(info, _soundtrack=mix), 1, 48, SimpleNamespace(noaudio=False), before, [])
    return cfg, film


class CaptionTests(unittest.TestCase):
    def check_cues(self, subs, start=0, end=10, policy=None):
        return captions.evaluate({'from': start, 'to': end, 'subtitles': subs}, 24, policy)

    def test_clipped_sample_uses_export_milliseconds_and_song_origin(self):
        result = self.check_cues([dict(start=9, end=10.4, text='片段'), dict(start=10.9996, end=12, text='下一句')], 10, 11.5)
        self.assertEqual(result['cues'], [dict(start=0, end=.4, text='片段'), dict(start=1, end=1.5, text='下一句')])
        row = next(r for r in result['checks'] if r['kind'] == 'short-caption')
        self.assertEqual(row['outputSeconds'], 0)
        self.assertEqual(row['songSeconds'], 10)

    def test_nested_overlaps_are_detected_but_adjacent_cues_are_not(self):
        result = self.check_cues([dict(start=0, end=5, text='长句'), dict(start=1, end=2, text='内层'),
                                 dict(start=3, end=4, text='内层二'), dict(start=5, end=6, text='相邻')])
        self.assertEqual([r['cue'] for r in result['checks'] if r['kind']=='caption-overlap'], [2, 3])

    def test_speed_width_and_lines(self):
        result = self.check_cues([dict(start=0, end=.5, text='汉'*23+'\nnext\nlast')])
        kinds = {r['kind'] for r in result['checks']}
        self.assertTrue({'reading-speed','caption-width','caption-lines','short-caption'} <= kinds)
        self.assertEqual(captions.line_width('汉A'), 3)
        self.assertEqual(len(captions.visible_chars('e\u0301 汉\n')), 2)

    def test_rounded_away_caption_is_reported(self):
        result = self.check_cues([dict(start=1.0001, end=1.0002, text='太短')])
        self.assertEqual(result['cues'], [])
        self.assertIn('caption-rounded-away', [r['kind'] for r in result['checks']])

    def test_empty_captions_are_explicit(self):
        result = self.check_cues([])
        self.assertEqual(result['checks'][0]['status'], 'info')
        self.assertEqual(result['status'], 'pass')

    def test_policy_validation(self):
        for policy in (False, {'maxCps':0}, {'maxCps':float('nan')}, {'maxLines':1.5}, {'maxLineWidth':True}, {'typo':1}):
            with self.subTest(policy=policy):
                self.assertEqual(self.check_cues([], policy=policy)['status'], 'fail')
        self.assertEqual(self.check_cues([dict(start=0, end=1, text='汉'*23)], policy={'maxCps':30,'maxLineWidth':50})['status'], 'pass')

    def test_invalid_cue_is_failure(self):
        for sub in ({'start':0,'end':0,'text':'x'}, {'start':0,'end':1,'text':' '}, {'start':float('nan'),'end':1,'text':'x'}):
            self.assertEqual(self.check_cues([sub])['status'], 'fail')


@unittest.skipUnless(shutil.which('ffmpeg'), 'requires ffmpeg')
class ReviewTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        quiet = contextlib.redirect_stdout(io.StringIO())
        quiet.__enter__()
        self.addCleanup(quiet.__exit__, None, None, None)
        self.cfg, self.film = fixture(self.root)

    def test_build_uses_cached_tracks_and_preserves_original_media(self):
        original, stamp = fingerprint(self.film), self.film.stat().st_mtime_ns
        with patch.object(soundtrack, 'stem', side_effect=AssertionError('should reuse cached stems')):
            page = review.build(self.cfg, self.film)
        data = json.loads((page.parent/'review.json').read_text())
        self.assertEqual(fingerprint(page.parent/'film.mp4'), original)
        self.assertEqual(fingerprint(self.film), original)
        self.assertEqual(self.film.stat().st_mtime_ns, stamp)
        self.assertEqual(data['origin'], 1)
        self.assertEqual(data['cues'][0]['start'], .1)
        self.assertEqual(len(data['tracks']), 2)
        self.assertEqual({r['kind'] for r in data['reports']}, {'film', 'sync', 'subtitles'})

    def test_embedded_project_text_cannot_close_script(self):
        self.cfg['title'] = '</script><img src=x onerror=alert(1)>'
        page = review.build(self.cfg, self.film)
        html = page.read_text()
        self.assertNotIn(self.cfg['title'], html)
        self.assertIn('\\u003c/script\\u003e', html)
        self.assertIn('textContent', html)

    def test_review_cli_needs_no_browser(self):
        target = self.root/'out'/'review-cli'
        proc = subprocess.run([sys.executable, str(ROOT/'tools/render.py'), str(self.root), 'review', '--file', str(self.film), '--out', str(target)],
                              capture_output=True, text=True, env=dict(os.environ, CHROME='/no/browser'))
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertTrue((target/'index.html').is_file())

    def test_subtitlecheck_warn_exit_zero_and_stale_receipt_exit_one(self):
        cmd = [sys.executable, str(ROOT/'tools/render.py'), str(self.root), 'subtitlecheck', '--file', str(self.film)]
        self.assertEqual(subprocess.run(cmd, capture_output=True).returncode, 0)
        (self.root/'soundtrack.json').write_text('{}')
        self.assertEqual(subprocess.run(cmd, capture_output=True).returncode, 1)
        with self.assertRaisesRegex(ValueError, 'current complete film'):
            review.build(self.cfg, self.film)

    def test_review_input_change_during_copy_is_not_published(self):
        original = soundtrack.mixdown
        def changing(*args, **kwargs):
            result = original(*args, **kwargs)
            (self.root/'soundtrack.json').write_text('{}')
            return result
        target = self.root/'out'/'should-not-publish'
        with patch.object(soundtrack, 'mixdown', side_effect=changing), self.assertRaisesRegex(ValueError, 'inputs changed'):
            review.build(self.cfg, self.film, target)
        self.assertFalse(target.exists())


if __name__ == '__main__':
    unittest.main()
