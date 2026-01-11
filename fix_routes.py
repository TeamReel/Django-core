import pathlib

files = list(pathlib.Path(r"C:\Users\brian\Documents\django-core\demo\src").rglob("*.tsx"))
count = 0

for p in files:
    content = p.read_text(encoding="utf-8")
    original = content

    # Fix simple navigate calls
    content = content.replace("navigate('/organisations')", "navigate('/federations')")
    content = content.replace('navigate("/organisations")', 'navigate("/federations")')
    content = content.replace("to='/organisations'", "to='/federations'")
    content = content.replace('to="/organisations"', 'to="/federations"')

    # Fix import paths (revert clubs back to projects in file paths)
    content = content.replace("from '../clubs/", "from '../projects/")
    content = content.replace('from "../clubs/', 'from "../projects/')
    content = content.replace("from './clubs/", "from './projects/")
    content = content.replace('from "./clubs/', 'from "./projects/')
    content = content.replace("from '../../clubs/", "from '../../projects/")
    content = content.replace('from "../../clubs/', 'from "../../projects/')

    if content != original:
        p.write_text(content, encoding="utf-8")
        count += 1

print(f"Fixed {count} files")
