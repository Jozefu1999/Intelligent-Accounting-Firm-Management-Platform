"""
Shared constants for all ML scripts.
"""

# Sector name -> numeric code mapping (0-10)
SECTOR_MAP = {
    'agriculture': 0,
    'construction': 1,
    'manufacturing': 2,
    'retail': 3,
    'transport': 4,
    'hospitality': 5,
    'information technology': 6,
    'it': 6,
    'technology': 6,
    'finance': 7,
    'banking': 7,
    'healthcare': 8,
    'real estate': 9,
    'consulting': 10,
    'services': 10,
    'other': 5,
}

SECTOR_LABELS = [
    'Agriculture',
    'Construction',
    'Manufacturing',
    'Retail',
    'Transport',
    'Hospitality',
    'Information Technology',
    'Finance',
    'Healthcare',
    'Real Estate',
    'Consulting',
]

# Risk label maps
RISK_LABELS = {0: 'low', 1: 'medium', 2: 'high'}
RISK_CODES = {'low': 0, 'medium': 1, 'high': 2}

# Project type label maps
PROJECT_TYPE_LABELS = {0: 'creation', 1: 'development', 2: 'audit', 3: 'consulting', 4: 'other'}
PROJECT_TYPE_CODES = {'creation': 0, 'development': 1, 'audit': 2, 'consulting': 3, 'other': 4}

# Priority maps
PRIORITY_CODES = {'low': 0, 'medium': 1, 'high': 2}


def sector_name_to_code(name: str) -> int:
    """Convert a sector name string to its numeric code."""
    if isinstance(name, (int, float)):
        return int(name)
    normalized = str(name).strip().lower()
    return SECTOR_MAP.get(normalized, 5)  # default: hospitality/other = 5
