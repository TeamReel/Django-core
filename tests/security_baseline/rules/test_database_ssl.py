"""Unit tests for database SSL validation rule."""

from unittest.mock import Mock

from security_baseline.rules.database_ssl import DatabaseSSLValidationRule


class TestDatabaseSSLValidationRule:
    """Test DatabaseSSLValidationRule validation logic."""

    def test_postgresql_without_sslmode_fails(self):
        """Test that PostgreSQL without sslmode fails in production."""
        rule = DatabaseSSLValidationRule()
        settings = Mock(
            DATABASES={"default": {"ENGINE": "django.db.backends.postgresql", "OPTIONS": {}}}
        )
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert violation.rule_id == "SEC016-DATABASE-SSL"
        assert "PostgreSQL" in violation.message

    def test_postgresql_with_prefer_sslmode_fails(self):
        """Test that PostgreSQL with sslmode='prefer' fails."""
        rule = DatabaseSSLValidationRule()
        settings = Mock(
            DATABASES={
                "default": {
                    "ENGINE": "django.db.backends.postgresql",
                    "OPTIONS": {"sslmode": "prefer"},
                }
            }
        )
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None

    def test_postgresql_with_require_sslmode_passes(self):
        """Test that PostgreSQL with sslmode='require' passes."""
        rule = DatabaseSSLValidationRule()
        settings = Mock(
            DATABASES={
                "default": {
                    "ENGINE": "django.db.backends.postgresql",
                    "OPTIONS": {"sslmode": "require"},
                }
            }
        )
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_postgresql_with_verify_ca_passes(self):
        """Test that PostgreSQL with sslmode='verify-ca' passes."""
        rule = DatabaseSSLValidationRule()
        settings = Mock(
            DATABASES={
                "default": {
                    "ENGINE": "django.db.backends.postgresql",
                    "OPTIONS": {"sslmode": "verify-ca"},
                }
            }
        )
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_postgresql_with_verify_full_passes(self):
        """Test that PostgreSQL with sslmode='verify-full' passes."""
        rule = DatabaseSSLValidationRule()
        settings = Mock(
            DATABASES={
                "default": {
                    "ENGINE": "django.db.backends.postgresql",
                    "OPTIONS": {"sslmode": "verify-full"},
                }
            }
        )
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_psycopg_engine_detected(self):
        """Test that psycopg engine is detected as PostgreSQL."""
        rule = DatabaseSSLValidationRule()
        settings = Mock(
            DATABASES={"default": {"ENGINE": "django.db.backends.psycopg2", "OPTIONS": {}}}
        )
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert "PostgreSQL" in violation.message

    def test_mysql_without_ssl_fails(self):
        """Test that MySQL without SSL config fails in production."""
        rule = DatabaseSSLValidationRule()
        settings = Mock(
            DATABASES={"default": {"ENGINE": "django.db.backends.mysql", "OPTIONS": {}}}
        )
        context = {"settings": settings, "environment": "production"}

        violation = rule.validate(context)

        assert violation is not None
        assert "MySQL" in violation.message

    def test_mysql_with_ssl_ca_passes(self):
        """Test that MySQL with ssl_ca passes."""
        rule = DatabaseSSLValidationRule()
        settings = Mock(
            DATABASES={
                "default": {
                    "ENGINE": "django.db.backends.mysql",
                    "OPTIONS": {"ssl_ca": "/path/to/ca.pem"},
                }
            }
        )
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_mysql_with_ssl_dict_passes(self):
        """Test that MySQL with ssl dictionary passes."""
        rule = DatabaseSSLValidationRule()
        settings = Mock(
            DATABASES={
                "default": {
                    "ENGINE": "django.db.backends.mysql",
                    "OPTIONS": {"ssl": {"ca": "/path/to/ca.pem"}},
                }
            }
        )
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_sqlite_passes_without_ssl(self):
        """Test that SQLite passes without SSL config (file-based)."""
        rule = DatabaseSSLValidationRule()
        settings = Mock(
            DATABASES={"default": {"ENGINE": "django.db.backends.sqlite3", "OPTIONS": {}}}
        )
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_database_ssl_in_local_passes(self):
        """Test that database SSL check skipped in local environment."""
        rule = DatabaseSSLValidationRule()
        settings = Mock(
            DATABASES={"default": {"ENGINE": "django.db.backends.postgresql", "OPTIONS": {}}}
        )
        context = {"settings": settings, "environment": "local"}

        assert rule.validate(context) is None

    def test_missing_databases_config_passes(self):
        """Test that missing DATABASES config doesn't crash."""
        rule = DatabaseSSLValidationRule()
        settings = Mock(spec=[])
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None

    def test_empty_default_database_passes(self):
        """Test that empty default database config doesn't crash."""
        rule = DatabaseSSLValidationRule()
        settings = Mock(DATABASES={})
        context = {"settings": settings, "environment": "production"}

        assert rule.validate(context) is None
