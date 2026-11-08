"""Actual ffmpeg regressions for multitrack exports, remix provenance and delivery."""
import contextlib
import io
import json
import os
import runpy
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import delivery
import handoff
import soundtrack
import publication
import clipcache
from mvproject import decode, fingerprint


@unittest.skipUnless(shutil.which('ffmpeg'), 'requires ffmpeg')
class SoundtrackTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.out = self.root / 'out'
        self.out.mkdir()
        self.cfg = {'_dir': self.root, 'title': 'fixture', 'audio': 'tone.wav', 'soundtrack': 'soundtrack.json'}
        (self.root / 'project.js').write_text('window.MV_PROJECT = ' + json.dumps({k: v for k, v in self.cfg.items() if k != '_dir'}) + ';')
        (self.root / 'scene.js').write_text('// picture\n')
        self.info = dict(fps=24, width=96, height=54, audio='tone.wav', sceneSrc={}, subtitles=[],
                         shots=[dict(name='镜头 / one', scene='one', **{'from': 0, 'to': 2.5}),
                                dict(name='镜头 / one', scene='two', fadeIn=0.5, **{'from': 2, 'to': 4})])
        self.args = SimpleNamespace(noaudio=False)
        self.config({})
        delivery.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=4', str(self.root / 'tone.wav')])
        self.quiet = contextlib.redirect_stdout(io.StringIO())
        self.quiet.__enter__()
        self.addCleanup(self.quiet.__exit__, None, None, None)

    def config(self, data):
        (self.root / 'soundtrack.json').write_text(json.dumps(data, ensure_ascii=False))

    def plan(self, start=0, end=4, noaudio=False):
        return soundtrack.plan(self.cfg, self.info, start, end, noaudio)

    def render(self):
        raw = self.out / 'picture.mp4'
        delivery.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'color=gray:s=96x54:r=24:d=4',
                      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', str(raw)])
        film = self.out / 'film.mp4'
        mix = self.plan()
        before = delivery.revision(self.cfg, self.info, film)
        visual = delivery.revision(self.cfg, self.info, film, visual=True)
        soundtrack.mux(['-i', str(raw)], film, mix)
        delivery.write_receipt(film, self.cfg, dict(self.info, _soundtrack=mix, _visualRevision=visual), 0, 96, self.args, before, [])
        return film

    def video_hash(self, path):
        return delivery.run(['ffmpeg', '-v', 'error', '-i', str(path), '-map', '0:v:0', '-c', 'copy', '-f', 'hash', '-']).stdout

    def test_gain_trim_and_range_alignment(self):
        self.config({'song': False, 'tracks': [{'id': 'voice', 'role': 'voice', 'file': 'tone.wav', 'at': 1.5,
                                               'trimStart': 1, 'duration': 2, 'gainDb': -6}]})
        mix = self.plan(1, 3)
        path = self.out / 'stem.wav'
        soundtrack.stem(mix['tracks'][0], mix, path)
        audio = decode(path, sr=48000)
        self.assertEqual(len(audio), 96000)
        self.assertLess(np.max(np.abs(audio[:24000])), 1e-5)
        self.assertAlmostEqual(np.max(np.abs(audio[30000:60000])), 0.125 * 10**(-6/20), delta=0.001)

    def test_loop_and_fades_are_preserved_when_pilot_starts_mid_cue(self):
        self.config({'song': False, 'tracks': [{'id': 'loop', 'role': 'bgm', 'file': 'tone.wav', 'at': 0,
                                               'duration': 10, 'loop': True, 'fadeIn': 2, 'fadeOut': 2}]})
        mix = self.plan(5, 9)
        path = self.out / 'stem.wav'
        soundtrack.stem(mix['tracks'][0], mix, path)
        audio = decode(path, sr=8000)
        self.assertEqual(len(audio), 32000)
        self.assertGreater(np.std(audio[8000:16000]), 0.08)
        self.assertLess(np.std(audio[-800:]), np.std(audio[:800]) * 0.6)

    def test_mixed_roles_and_no_primary(self):
        self.config({'song': False, 'tracks': [dict(id=role, role=role, file='tone.wav', at=0, gainDb=-12)
                                               for role in ('bgm', 'voice', 'sfx')]})
        mix = self.plan()
        path = soundtrack.mixdown(mix, self.out / 'audio')
        audio = decode(path, sr=8000)
        self.assertIsNone(mix['syncSource'])
        self.assertAlmostEqual(np.max(np.abs(audio[8000:16000])), 3 * 0.125 * 10**(-12/20), delta=0.002)
        self.assertEqual(len(list((self.out / 'audio').glob('*.wav'))), 4)

    def test_subtitle_unicode_clipping_and_rounding(self):
        self.config({'subtitles': [{'start': 1, 'end': 2.9996, 'text': '字幕 <&>\n第二行'},
                                   {'start': 2.9996, 'end': 4, 'text': '结束'}, {'start': 10, 'end': 11, 'text': '外部'}]})
        cues = soundtrack.subtitles(self.plan(2, 3.5), self.out)
        self.assertEqual(cues[0]['start'], 0)
        self.assertEqual(cues[0]['end'], 1)
        self.assertEqual(len(cues), 2)
        self.assertIn('00:00:00,000 --> 00:00:01,000', (self.out / 'subtitles.srt').read_text())
        self.assertIn('&lt;&amp;&gt;', (self.out / 'subtitles.vtt').read_text())

    def test_bad_track_definitions(self):
        base = dict(id='voice', role='voice', file='tone.wav', at=0)
        for patch in ({'duration': 9}, {'at': float('nan')}, {'id': '../escape'}, {'role': 'unknown'},
                      {'fadeIn': 20}, {'gainDb': 25}, {'trimStart': 4}, {'loop': 'yes'}, {'id': 'mix'}):
            with self.subTest(patch=patch), self.assertRaises(ValueError):
                self.config({'tracks': [dict(base, **patch)]})
                self.plan()

    def test_missing_audio_can_be_explicitly_silent(self):
        (self.root / 'tone.wav').unlink()
        self.assertFalse(self.plan(noaudio=True)['tracks'])
        with self.assertRaises(ValueError):
            self.plan()

    def test_sound_edit_changes_full_revision_only(self):
        film = self.out / 'film.mp4'
        full = delivery.revision(self.cfg, self.info, film)
        visual = delivery.revision(self.cfg, self.info, film, visual=True)
        self.config({'song': {'gainDb': -8}, 'subtitles': [{'start': 0, 'end': 1, 'text': '新字幕'}]})
        self.assertNotEqual(full, delivery.revision(self.cfg, self.info, film))
        self.assertEqual(visual, delivery.revision(self.cfg, self.info, film, visual=True))
        self.cfg['verifyInputs'] = ['soundtrack.json']
        self.assertNotEqual(visual, delivery.revision(self.cfg, self.info, film, visual=True))

    def test_chunk_cache_ignores_sound_edits_but_honors_explicit_dependencies(self):
        def keys():
            with patch.object(sys, 'argv', ['render.py', str(self.root), 'check']):
                mod = runpy.run_path(str(ROOT / 'tools/render.py'), run_name='render_test')
            return mod['input_keys'](self.info)
        before = keys()
        self.config({'song': {'gainDb': -10}})
        self.assertEqual(before, keys())
        p = self.root / 'project.js'
        data = {k: v for k, v in self.cfg.items() if k != '_dir'}
        data['verifyInputs'] = ['soundtrack.json']
        p.write_text('window.MV_PROJECT = ' + json.dumps(data) + ';')
        before = keys()
        self.config({'song': {'gainDb': -20}})
        self.assertNotEqual(before, keys())

    def test_replacing_audio_bytes_changes_full_revision_only(self):
        film = self.out / 'film.mp4'
        before = delivery.revision(self.cfg, self.info, film)
        visual = delivery.revision(self.cfg, self.info, film, visual=True)
        path = self.root / 'tone.wav'
        stat = path.stat()
        data = bytearray(path.read_bytes())
        data[-5] ^= 1
        path.write_bytes(data)
        os.utime(path, ns=(stat.st_atime_ns, stat.st_mtime_ns))
        self.assertNotEqual(before, delivery.revision(self.cfg, self.info, film))
        self.assertEqual(visual, delivery.revision(self.cfg, self.info, film, visual=True))

    def test_remix_copies_video_and_updates_audio_without_browser(self):
        film = self.render()
        before, audio = self.video_hash(film), decode(film)
        self.config({'song': {'gainDb': -12}})
        self.assertEqual(delivery.provenance(film, self.cfg)[1], 'fail')
        proc = subprocess.run([sys.executable, str(ROOT / 'tools/render.py'), str(self.root), 'remix', '--file', str(film)],
                              capture_output=True, text=True, env=dict(os.environ, CHROME='/no/browser'))
        self.assertEqual(proc.returncode, 0, proc.stderr + proc.stdout)
        self.assertEqual(before, self.video_hash(film))
        self.assertLess(np.std(decode(film)), np.std(audio)*0.3)
        self.assertEqual(delivery.provenance(film, self.cfg)[1], 'pass')

    def test_remix_rejects_picture_changes_and_preserves_film(self):
        film = self.render()
        before = fingerprint(film)
        (self.root / 'scene.js').write_text('// changed picture')
        with self.assertRaisesRegex(ValueError, 'picture inputs changed'):
            handoff.remix(self.cfg, film)
        self.assertEqual(before, fingerprint(film))

    def test_remix_rejects_modified_media(self):
        film = self.render()
        film.write_bytes(film.read_bytes() + b'changed')
        with self.assertRaisesRegex(ValueError, 'film bytes changed'):
            handoff.remix(self.cfg, film)

    def test_invalid_mix_preserves_previous_film(self):
        film = self.render()
        before = fingerprint(film)
        self.config({'tracks': [{'id': 'missing', 'role': 'sfx', 'file': 'missing.wav'}]})
        with self.assertRaises(ValueError):
            handoff.remix(self.cfg, film)
        self.assertEqual(before, fingerprint(film))

    def test_package_frames_stems_subtitles_and_qa(self):
        self.config({'subtitles': [{'start': 0.1, 'end': 1, 'text': '交付字幕'}]})
        film = self.render()
        result = handoff.package(self.cfg, film)
        manifest = json.loads((result / 'manifest.json').read_text())
        self.assertEqual(fingerprint(film), fingerprint(result / 'film.mp4'))
        self.assertEqual([s['startFrame'] for s in manifest['shots']], [0, 48])
        counts = [int(delivery.probe(result / s['file'])['streams'][0]['nb_frames']) for s in manifest['shots']]
        self.assertEqual(counts, [48, 48])
        self.assertEqual(len(decode(result / 'audio/song.wav', sr=8000)), 32000)
        self.assertTrue((result / 'filmcheck.json').is_file())
        self.assertTrue((result / 'subtitles.json').is_file())
        self.assertEqual(manifest['qa']['subtitles'], 'pass')
        self.assertEqual(manifest['qa']['sync'], 'unverified')
        self.assertIn('交付字幕', (result / 'subtitles.srt').read_text())
        with self.assertRaisesRegex(ValueError, 'already exists'):
            handoff.package(self.cfg, film)

    def test_shot_ranges_keep_gaps_and_fractional_cut(self):
        record = dict(self.info, frames=48, **{'from': 1, 'to': 3})
        record['shots'] = [dict(name='first', **{'from': 1.1, 'to': 1.4}), dict(name='last', **{'from': 1.33, 'to': 3})]
        rows = handoff.shot_ranges(record)
        self.assertIsNone(rows[0]['shotIndex'])
        self.assertEqual(rows[1]['startFrame'], 2)
        self.assertEqual(rows[2]['startFrame'], 8)
        self.assertEqual(sum(s['endFrame']-s['startFrame'] for s in rows), 48)

    def test_audio_cache_rebuilds_only_changed_track(self):
        data = {'tracks': [dict(id='voice', role='voice', file='tone.wav', at=1, duration=2)]}
        self.config(data)
        cache = self.out / '.audio-cache'
        with patch.object(soundtrack, 'stem', wraps=soundtrack.stem) as render:
            soundtrack.mixdown(self.plan(), self.out / 'a', cache)
            self.assertEqual(render.call_count, 2)
            render.reset_mock()
            soundtrack.mixdown(self.plan(), self.out / 'b', cache)
            self.assertEqual(render.call_count, 0)
            data['tracks'][0]['gainDb'] = -6
            self.config(data)
            soundtrack.mixdown(self.plan(), self.out / 'c', cache)
            self.assertEqual(render.call_count, 1)
            self.assertEqual(render.call_args.args[0]['id'], 'voice')

    def test_corrupted_cache_is_rebuilt_and_outputs_are_not_hardlinked(self):
        cache, mix = self.out / '.audio-cache', self.plan()
        soundtrack.mixdown(mix, self.out / 'a', cache)
        wav = cache / (soundtrack.track_key(mix['tracks'][0], mix) + '.wav')
        original = fingerprint(wav)
        (self.out / 'a/song.wav').write_bytes(b'edited by downstream editor')
        self.assertEqual(fingerprint(wav), original)
        wav.write_bytes(b'broken')
        with patch.object(soundtrack, 'stem', wraps=soundtrack.stem) as render:
            soundtrack.mixdown(mix, self.out / 'b', cache)
            self.assertEqual(render.call_count, 1)
        self.assertEqual(fingerprint(wav), original)

    def test_caption_update_preserves_mp4_bytes_mtime_and_audio(self):
        film = self.render()
        before, stamp = fingerprint(film), film.stat().st_mtime_ns
        self.config({'subtitles': [{'start': 1, 'end': 2, 'text': '只改字幕'}]})
        with patch.object(soundtrack, 'mux', side_effect=AssertionError('must not mux')), \
             patch.object(soundtrack, 'mixdown', side_effect=AssertionError('must not mix')):
            target = handoff.refresh_subtitles(self.cfg, film)
        self.assertEqual(fingerprint(film), before)
        self.assertEqual(film.stat().st_mtime_ns, stamp)
        self.assertIn('只改字幕', (target / 'subtitles.srt').read_text())
        self.assertEqual(delivery.provenance(film, self.cfg)[1], 'pass')

    def test_caption_update_rejects_audio_changes(self):
        film = self.render()
        expected = publication.snapshot(film)
        self.config({'song': {'gainDb': -6}, 'subtitles': [{'start': 1, 'end': 2, 'text': 'test'}]})
        with self.assertRaisesRegex(ValueError, 'audio changed'):
            handoff.refresh_subtitles(self.cfg, film)
        self.assertEqual(publication.snapshot(film), expected)

    def test_remix_automatically_skips_unchanged_audio(self):
        film = self.render()
        before = film.stat().st_mtime_ns
        self.config({'subtitles': [{'start': 1, 'end': 2, 'text': 'test'}]})
        with patch.object(soundtrack, 'mux', side_effect=AssertionError('must not mux')):
            handoff.remix(self.cfg, film)
        self.assertEqual(film.stat().st_mtime_ns, before)
        self.assertEqual(delivery.provenance(film, self.cfg)[1], 'pass')

    def test_caption_edit_creates_distinct_package_with_same_video(self):
        film = self.render()
        first = handoff.package(self.cfg, film)
        self.config({'subtitles': [{'start': 1, 'end': 2, 'text': '新版'}]})
        handoff.refresh_subtitles(self.cfg, film)
        second = handoff.package(self.cfg, film)
        self.assertNotEqual(first, second)
        self.assertEqual(fingerprint(first / 'film.mp4'), fingerprint(second / 'film.mp4'))
        self.assertNotEqual((first / 'subtitles.srt').read_text(), (second / 'subtitles.srt').read_text())
        self.assertEqual(json.loads((second/'manifest.json').read_text())['clipCache'], {'reused':2,'encoded':0})

    def test_remix_reuses_all_encoded_shots(self):
        film = self.render()
        first = handoff.package(self.cfg, film)
        self.config({'song': {'gainDb': -12}})
        handoff.remix(self.cfg, film)
        with patch.object(clipcache, 'encode', side_effect=AssertionError('must reuse encoded clips')):
            second = handoff.package(self.cfg, film)
        a, b = [json.loads((path/'manifest.json').read_text()) for path in (first, second)]
        self.assertNotEqual(a['sourceFilmSha256'], b['sourceFilmSha256'])
        self.assertEqual(a['videoRevision'], b['videoRevision'])
        self.assertEqual(b['clipCache'], {'reused':2,'encoded':0})
        for row in a['shots']:
            self.assertEqual(fingerprint(first/row['file']), fingerprint(second/row['file']))

    def test_bad_clip_cache_is_repaired_and_outputs_are_independent(self):
        film = self.render()
        record = json.loads(delivery.receipt_path(film).read_text())
        row = dict(startFrame=0, endFrame=48)
        identity = clipcache.video_identity(film)
        cache, output = self.out/'.clip-cache', self.out/'clip.mp4'
        key, hit = clipcache.export(film, row, record, identity, cache, output)
        self.assertFalse(hit)
        original = fingerprint(cache/(key+'.mp4'))
        output.write_bytes(b'downstream edit')
        self.assertEqual(fingerprint(cache/(key+'.mp4')), original)
        (cache/(key+'.mp4')).write_bytes(b'broken cache')
        with patch.object(clipcache, 'encode', wraps=clipcache.encode) as encode:
            _, hit = clipcache.export(film, row, record, identity, cache, output)
            self.assertFalse(hit)
            self.assertEqual(encode.call_count, 1)
        self.assertEqual(fingerprint(output), original)

    def test_frame_range_change_creates_new_clip(self):
        film = self.render()
        record = json.loads(delivery.receipt_path(film).read_text())
        identity = clipcache.video_identity(film)
        cache = self.out/'.clip-cache'
        first, _ = clipcache.export(film, dict(startFrame=0,endFrame=48), record, identity, cache, self.out/'a.mp4')
        second, hit = clipcache.export(film, dict(startFrame=1,endFrame=49), record, identity, cache, self.out/'b.mp4')
        self.assertFalse(hit)
        self.assertNotEqual(first, second)

    def test_changed_picture_invalidates_video_identity(self):
        film = self.render()
        changed = self.out/'changed.mp4'
        delivery.run(['ffmpeg','-v','error','-i',str(film),'-map','0:v:0','-an','-vf','eq=brightness=0.15',
                      '-c:v','libx264',str(changed)])
        self.assertNotEqual(clipcache.video_identity(film), clipcache.video_identity(changed))

    def test_bad_encoded_frame_count_is_not_cached(self):
        film = self.render()
        record = json.loads(delivery.receipt_path(film).read_text())
        cache = self.out/'.clip-cache'
        def wrong(_film, _start, _end, dest):
            shutil.copy2(self.out/'picture.mp4', dest)  # 96 frames instead of requested 48
        with patch.object(clipcache, 'encode', side_effect=wrong), self.assertRaisesRegex(ValueError, 'requested frames'):
            clipcache.export(film, dict(startFrame=0,endFrame=48), record, clipcache.video_identity(film), cache, self.out/'bad.mp4')
        self.assertFalse(list(cache.glob('*.mp4')))

    def test_input_change_during_clip_encoding_does_not_poison_cache(self):
        film = self.render()
        record = json.loads(delivery.receipt_path(film).read_text())
        cache = self.out/'.clip-cache'
        encode = clipcache.encode
        def changing(*args):
            encode(*args)
            film.write_bytes(film.read_bytes()+b'changed')
        with patch.object(clipcache, 'encode', side_effect=changing), self.assertRaisesRegex(ValueError, 'source film changed'):
            clipcache.export(film, dict(startFrame=0,endFrame=48), record, clipcache.video_identity(film), cache, self.out/'bad.mp4')
        self.assertFalse(list(cache.glob('*.mp4')))

    def test_input_change_during_remix_preserves_old_film_and_receipt(self):
        film = self.render()
        expected = publication.snapshot(film)
        self.config({'song': {'gainDb': -6}})
        mux = soundtrack.mux
        def changing(*args, **kwargs):
            mux(*args, **kwargs)
            self.config({'song': {'gainDb': -12}})
        with patch.object(soundtrack, 'mux', side_effect=changing), self.assertRaisesRegex(ValueError, 'incomplete|inputs changed'):
            handoff.remix(self.cfg, film)
        self.assertEqual(publication.snapshot(film), expected)

    def test_failed_receipt_publication_rolls_back_both_files(self):
        film = self.render()
        expected = publication.snapshot(film)
        self.config({'song': {'gainDb': -6}})
        replace = os.replace
        failed = False
        def failing(src, dst):
            nonlocal failed
            if Path(dst).resolve() == delivery.receipt_path(film).resolve() and not failed:
                failed = True
                raise OSError('simulated receipt replace failure')
            return replace(src, dst)
        with patch.object(publication.os, 'replace', side_effect=failing), self.assertRaises(OSError):
            handoff.remix(self.cfg, film)
        self.assertEqual(publication.snapshot(film), expected)
        self.assertFalse(publication.journal_path(film).exists())

    def test_killed_publisher_recovers_before_provenance_check(self):
        film = self.render()
        expected = publication.snapshot(film)
        staged = self.out / 'new.mp4'
        staged.write_bytes(film.read_bytes() + b'new version')
        record = json.loads(delivery.receipt_path(film).read_text())
        record['filmSha256'] = fingerprint(staged)['sha256']
        plan = self.out / 'new.json'
        plan.write_text(json.dumps(record))
        script = '''
import json, os, sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
import publication
film, staged, plan = map(Path, sys.argv[2:])
film = film.resolve()
replace = os.replace
def die(src, dst):
    replace(src, dst)
    if Path(dst) == film:
        os._exit(91)
publication.os.replace = die
publication.publish(film, staged, json.loads(plan.read_text()), publication.snapshot(film), lambda: None)
'''
        result = subprocess.run([sys.executable, '-c', script, str(ROOT/'tools'), str(film), str(staged), str(plan)], capture_output=True)
        self.assertEqual(result.returncode, 91, result.stderr)
        self.assertTrue(publication.journal_path(film).exists())
        self.assertEqual(delivery.provenance(film, self.cfg)[1], 'pass')
        self.assertEqual(publication.snapshot(film), expected)

    def test_second_writer_does_not_overwrite_newer_receipt(self):
        film = self.render()
        expected = publication.snapshot(film)
        record = json.loads(delivery.receipt_path(film).read_text())
        delivery.receipt_path(film).write_text(json.dumps(record) + ' ')
        latest = publication.snapshot(film)
        with self.assertRaisesRegex(ValueError, 'another process'):
            publication.publish(film, None, record, expected, lambda: None)
        self.assertEqual(publication.snapshot(film), latest)


if __name__ == '__main__':
    unittest.main()
