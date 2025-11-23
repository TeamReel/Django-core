"""WP14-T128: Vulnerable Python code fixture for CI testing.

This file contains deliberately vulnerable code patterns for testing
static analysis tools like Bandit. DO NOT use in production.
"""

import os
import pickle  # noqa: S403 - intentionally vulnerable for testing
import subprocess  # noqa: S404 - intentionally vulnerable for testing
from hashlib import md5  # noqa: S303,S324 - intentionally vulnerable for testing


def insecure_password_hash(password):
    """Use weak MD5 hashing - B303, B324."""
    return md5(password.encode()).hexdigest()  # noqa: S324


def hardcoded_password():
    """Hardcoded password - B105, B106."""
    password = "admin123"  # noqa: S105
    api_key = "sk-1234567890abcdef"  # noqa: S105
    return password, api_key


def insecure_random():
    """Use of insecure random - B311."""
    import random

    return random.random()  # noqa: S311


def sql_injection_risk(user_input):
    """SQL injection vulnerability - B608."""
    query = f"SELECT * FROM users WHERE name = '{user_input}'"  # noqa: S608
    return query


def command_injection(user_input):
    """Command injection vulnerability - B602, B605."""
    os.system(f"echo {user_input}")  # noqa: S605,S607
    subprocess.call(user_input, shell=True)  # noqa: S602


def insecure_deserialization(data):
    """Insecure pickle deserialization - B301."""
    return pickle.loads(data)  # noqa: S301


def path_traversal(filename):
    """Path traversal vulnerability - B107."""
    with open(f"/tmp/{filename}") as f:  # noqa: S108,S107
        return f.read()


def weak_cryptography():
    """Weak cryptographic algorithm - B303, B304, B305."""
    from Crypto.Cipher import DES  # noqa: S304

    key = b"8bytekey"
    cipher = DES.new(key, DES.MODE_ECB)  # noqa: S304
    return cipher


def insecure_ssl():
    """Insecure SSL/TLS configuration - B501."""
    import ssl

    context = ssl.SSLContext(ssl.PROTOCOL_SSLv2)  # noqa: S502
    context.check_hostname = False  # noqa: S503
    context.verify_mode = ssl.CERT_NONE  # noqa: S504
    return context


def yaml_unsafe_load(yaml_data):
    """Unsafe YAML loading - B506."""
    import yaml

    return yaml.load(yaml_data)  # noqa: S506


def assert_used():
    """Assert used in production code - B101."""
    x = 10
    assert x > 0  # noqa: S101
    return x


def try_except_pass():
    """Try-except-pass antipattern - B110."""
    try:
        risky_operation()
    except Exception:  # noqa: S110,B902
        pass


def risky_operation():
    """Placeholder for risky operation."""
    raise ValueError("Test error")


def chmod_permissions():
    """Insecure file permissions - B103."""
    os.chmod("/etc/passwd", 0o777)  # noqa: S103,S106


def eval_usage(user_input):
    """Use of eval() - B307."""
    return eval(user_input)  # noqa: S307


def exec_usage(user_code):
    """Use of exec() - B102."""
    exec(user_code)  # noqa: S102


# This file is intentionally vulnerable for testing purposes
# All Bandit warnings are expected and documented with noqa comments
