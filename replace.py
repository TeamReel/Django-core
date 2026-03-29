import re
from pathlib import Path

def apply_replacements(filepath):
    print(f"Processing {filepath}...")
    content = Path(filepath).read_text(encoding='utf-8')
    
    # We want to replace carefully. Let's make sure 'logger' is imported if we use logger.exception.
    if 'import logging' not in content and 'import logger' not in content and 'from logging import logger' not in content and 'logger = logging.getLogger' not in content and 'from celery.utils.log import get_task_logger' not in content:
        # Check if 'logger' is actually imported
        if 'logger' not in content:
            print(f"Warning: logger not imported in {filepath}!")
            
    # Replace except Exception:\n [spaces] pass
    new_content = re.sub(
        r'except Exception:\s*(?:#.*?)?\n(\s+)pass\b.*',
        r'except Exception:\n\g<1>logger.exception("Silent exception caught")',
        content
    )
    
    Path(filepath).write_text(new_content, encoding='utf-8')
    print("Done.\n")

files = [
    "src/video/services/video_service.py",
    "src/video/services/processors/then_vs_now.py",
    "src/generative/_asset_helpers.py",
    "src/accounts/api/views_admin_detail.py"
]

for f in files:
    apply_replacements(f)
