"""Optional persistent timeline identities; absent IDs preserve legacy matching."""
import re

PATTERN = re.compile(r'[A-Za-z0-9][A-Za-z0-9._:-]{0,127}')


def validate(shots):
    seen = set()
    for shot in shots:
        if 'id' not in shot:
            continue
        value = shot['id']
        if not isinstance(value, str) or not PATTERN.fullmatch(value) or value in seen:
            raise ValueError('shot.id must be a unique 1–128 character identifier (letters, digits, . _ : -)')
        seen.add(value)
