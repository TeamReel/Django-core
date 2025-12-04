"""
Quick manual test for template rendering.
Run this to verify the rendering engine works before full pytest.
"""

import sys
from pathlib import Path
import tempfile

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from scaffolding.rendering.engine import (
    TemplateRenderer,
    create_jinja_env,
    get_builtin_variables,
)


def test_builtin_variables():
    """Test built-in variables."""
    print("Testing built-in variables...")
    vars = get_builtin_variables()
    assert "timestamp" in vars
    assert "author" in vars
    assert "python_version" in vars
    assert "core_version" in vars
    assert "year" in vars
    print(f"✓ Built-in variables: {list(vars.keys())}")


def test_jinja_env():
    """Test Jinja2 environment creation."""
    print("\nTesting Jinja2 environment...")
    with tempfile.TemporaryDirectory() as tmpdir:
        template_dir = Path(tmpdir)
        env = create_jinja_env(template_dir)
        assert env.autoescape is False
        assert "snake_case" in env.filters
        assert "pascal_case" in env.filters
        print("✓ Jinja2 environment configured correctly")


def test_simple_render():
    """Test simple template rendering."""
    print("\nTesting simple rendering...")
    with tempfile.TemporaryDirectory() as tmpdir:
        template_dir = Path(tmpdir)
        (template_dir / "test.py.j2").write_text('app = "{{ app_name }}"')
        
        renderer = TemplateRenderer(template_dir, {"app_name": "payments"})
        output = renderer.render("test.py.j2")
        
        assert output == 'app = "payments"'
        print(f"✓ Rendered: {output}")


def test_directory_render():
    """Test directory rendering with .j2 files."""
    print("\nTesting directory rendering...")
    with tempfile.TemporaryDirectory() as tmpdir:
        template_dir = Path(tmpdir)
        output_dir = Path(tmpdir) / "output"
        output_dir.mkdir()
        
        (template_dir / "models.py.j2").write_text("# {{ app_name }} models")
        (template_dir / "views.py.j2").write_text("# {{ app_name }} views")
        
        renderer = TemplateRenderer(template_dir, {"app_name": "payments"})
        created_files = renderer.render_directory(output_dir)
        
        assert len(created_files) == 2
        assert (output_dir / "models.py").exists()
        assert (output_dir / "views.py").exists()
        assert (output_dir / "models.py").read_text() == "# payments models"
        print(f"✓ Rendered {len(created_files)} files")


if __name__ == "__main__":
    print("=" * 60)
    print("Manual Rendering Engine Test")
    print("=" * 60)
    
    try:
        test_builtin_variables()
        test_jinja_env()
        test_simple_render()
        test_directory_render()
        
        print("\n" + "=" * 60)
        print("✓ ALL TESTS PASSED")
        print("=" * 60)
        sys.exit(0)
    except Exception as e:
        print(f"\n✗ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
