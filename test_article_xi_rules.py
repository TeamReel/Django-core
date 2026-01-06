"""Test script for Article XI constitutional rules."""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from constitution_engine.core.models import RepositoryContext
from constitution_engine.modules.python.builtin.module_readme_rule import (
    ModuleReadmeExistsRule,
)
from constitution_engine.modules.python.builtin.readme_structure_rule import (
    ReadmeStructureRule,
)
from constitution_engine.modules.python.builtin.required_docs_rule import RequiredDocsRule

print("Testing Article XI Constitutional Rules")
print("=" * 60)

# Create context
repo_root = Path(".")
ctx = RepositoryContext(root_path=repo_root)

# Test 1: Module README Exists
print("\n1. Testing module-readme-exists rule...")
rule1 = ModuleReadmeExistsRule()
result1 = rule1.check(ctx)
print(f"   Status: {result1.status.value}")
print(f"   Message: {result1.message}")
if result1.affected_paths:
    print(f"   Missing READMEs: {len(result1.affected_paths)}")
    for path in result1.affected_paths[:5]:
        print(f"     - {path}")
    if len(result1.affected_paths) > 5:
        print(f"     ... and {len(result1.affected_paths) - 5} more")

# Test 2: README Structure
print("\n2. Testing readme-structure-valid rule...")
rule2 = ReadmeStructureRule()
result2 = rule2.check(ctx)
print(f"   Status: {result2.status.value}")
print(f"   Message: {result2.message}")
if result2.affected_paths:
    print(f"   Invalid READMEs: {len(result2.affected_paths)}")
    for path in result2.affected_paths[:3]:
        print(f"     - {path}")

# Test 3: Required Docs
print("\n3. Testing required-docs-exist rule...")
rule3 = RequiredDocsRule()
result3 = rule3.check(ctx)
print(f"   Status: {result3.status.value}")
print(f"   Message: {result3.message}")
if result3.affected_paths:
    print(f"   Missing docs: {result3.affected_paths}")

print("\n" + "=" * 60)
print(f"Summary: {result1.status.value}, {result2.status.value}, {result3.status.value}")

# Exit with error if any rule failed
if any(r.status.value == "fail" for r in [result1, result2, result3]):
    sys.exit(1)
