import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import subjectqa


class SubjectQATests(unittest.TestCase):
    def test_sampling_includes_word_insert_and_transition_boundaries(self):
        shots = [dict(i=0, **{'from': 0, 'to': 3}, fadeIn=.5,
                      insert=dict(at=.3, dur=.7), reads=[dict(at=1.7)], sync=[dict(at=2.2)])]
        times = subjectqa.sample_times(shots, [dict(start=.105)], 24, .1, 2.5)
        for frame in (3, 4, 11, 12, 13, 23, 24, 25, 41, 53):
            self.assertIn(frame/24, times)
        self.assertTrue(all(.1 <= t < 2.5 for t in times))

    def test_warning_error_and_unverified_are_distinct(self):
        r = dict(status='measured', name='eye', severity='error', overlap=.2, maxOverlap=.01,
                 coveredPixels=10, box=[0,0,20,20], obstructionBox=[2,2,5,5])
        self.assertEqual(subjectqa.finding(r)['sev'], 'error')
        self.assertEqual(subjectqa.finding(dict(r, severity='warn'))['sev'], 'warn')
        self.assertIsNone(subjectqa.finding(dict(r, overlap=0)))
        u = subjectqa.finding(dict(r, status='unverified', reason='warp'))
        self.assertEqual((u['kind'],u['sev']), ('subject-unverified','warn'))

    def test_no_declarations_does_not_claim_coverage(self):
        shots = [dict(i=0, **{'from':0,'to':2}),dict(i=1, **{'from':2,'to':4})]
        report = subjectqa.coverage([], shots, 0, 4)
        self.assertEqual(report['status'], 'unverified')
        result = [dict(subjects=[dict(entry=0,status='measured')])]
        self.assertEqual(subjectqa.coverage(result, shots, 0, 4)['status'], 'partial')
        self.assertEqual(subjectqa.coverage(result, shots, 0, 2)['status'], 'sampled')
        self.assertEqual(subjectqa.coverage(result, shots, 0, 2, disabled=True)['status'], 'disabled')
