"""Tests for main module."""

from src.main import Calculator, hello_world


def test_hello_world():
    """Test hello_world function."""
    result = hello_world()
    assert result == "Hello, World!"


class TestCalculator:
    """Tests for Calculator class."""

    def test_add(self):
        """Test addition."""
        calc = Calculator()
        result = calc.add(2, 3)
        assert result == 5

    def test_multiply(self):
        """Test multiplication."""
        calc = Calculator()
        result = calc.multiply(4, 5)
        assert result == 20
