"""Pilot selection must not silently export the opening, escape the film, or overwrite it."""
import json
import runpy
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import pilot


class PilotTests(unittest.TestCase):
    def setUp(self):
        self.info = {'from': 10, 'to': 20, 'fps': 24, 'width': 1920, 'height': 1080,
                     'shots': [{'name': 'a', 'scene': 'a', 'from': 10, 'to': 16},
                               {'name': 'b', 'scene': 'b', 'from': 15, 'to': 20, 'fadeIn': 1}]}
        self.cfg = {'pilot': {'from': 13, 'to': 18, 'reason': 'action and transition'}}

    def test_selection_keeps_both_sides_of_overlap_without_mutating_timeline(self):
        original = json.dumps(self.info)
        plan = pilot.select(self.cfg, self.info)
        self.assertEqual(plan['frames'], 120)
        self.assertEqual([s['scene'] for s in plan['shots']], ['a', 'b'])
        self.assertEqual(json.dumps(self.info), original)

    def test_no_implicit_opening_and_no_partial_override(self):
        for cfg, start, end in [({}, None, None), (self.cfg, 12, None), (self.cfg, None, 19)]:
            with self.subTest(start=start, end=end), self.assertRaises(ValueError):
                pilot.select(cfg, self.info, start, end)

    def test_explicit_pair_replaces_preset_and_does_not_reuse_its_reason(self):
        plan = pilot.select(self.cfg, self.info, 10, 12)
        self.assertEqual((plan['from'], plan['to'], plan['reason']), (10, 12, ''))
        self.assertEqual(len(plan['shots']), 1)

    def test_bad_ranges_fail_instead_of_silent_clamping(self):
        for start, end in [(9, 15), (15, 21), (15, 15), (16, 15), (float('nan'), 16),
                           (15, float('inf')), (True, 16), (15, 15.001)]:
            with self.subTest(start=start, end=end), self.assertRaises(ValueError):
                pilot.select({}, self.info, start, end)

    def test_frame_rounding_never_extends_past_project_end(self):
        plan = pilot.select({}, self.info, 17.013, 20)
        self.assertEqual(plan['frames'], 71)
        self.assertLessEqual(plan['to'], 20)
        self.assertAlmostEqual(plan['to'] - plan['from'], plan['frames'] / 24)
        self.assertEqual(plan['requestedTo'], 20)

    def test_fps_override_controls_plan(self):
        plan = pilot.select(self.cfg, dict(self.info, fps=60))
        self.assertEqual(plan['frames'], 300)

    def test_sample_output_is_separate_and_cannot_target_film(self):
        out = Path('/tmp/pilot-fixture/out')
        film = out / 'film.mp4'
        plan = pilot.select(self.cfg, self.info)
        self.assertEqual(pilot.output_path(out, plan, None, film).parent, out / 'pilots')
        with self.assertRaises(ValueError):
            pilot.output_path(out, plan, out / 'pilots/../film.mp4', film)
        with self.assertRaises(ValueError):
            pilot.output_path(out, plan, film, out / 'film-2160p.mp4', film)

    def test_receipt_is_rendered_not_approved(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'pilot.mp4'
            args = types.SimpleNamespace(samples=1, shutter=0.5, crf=18, preset='slow')
            receipt = pilot.write_receipt(path, pilot.select(self.cfg, self.info), self.info, args, None)
            report = json.loads(receipt.read_text())
            self.assertEqual(report['status'], 'rendered')
            self.assertTrue(report['review'].startswith('pending'))
            self.assertIsNone(report['audio'])

    def test_cli_pilot_routes_to_existing_video_renderer(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / 'project.js').write_text('window.MV_PROJECT = {"title":"fixture"};')
            with patch.object(sys, 'argv', ['render.py', tmp, 'pilot', '--from', '1', '--to', '5']):
                renderer = runpy.run_path(str(ROOT / 'tools/render.py'), run_name='pilot_test')
            called = []
            renderer['main'].__globals__['video'] = lambda: called.append('existing renderer')
            renderer['main']()
            self.assertEqual(called, ['existing renderer'])


if __name__ == '__main__':
    unittest.main()
