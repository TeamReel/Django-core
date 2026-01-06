# User & Organisation i18n Preferences

**Feature**: B12 - Personalised Internationalisation
**Audience**: End users, organisation administrators
**Last Updated**: 2025-11-29

---

## Overview

Django-core supports personalised internationalisation (i18n) preferences, allowing each user and organisation to set their preferred language, locale, and timezone. These preferences automatically apply across the platform, ensuring content displays in the right language and times show in the user's local timezone.

**Key Benefits**:
- 🌍 **Personalised Experience**: Each user sees content in their preferred language
- 🕒 **Local Time Display**: All times shown in user's timezone
- 🏢 **Organisation Defaults**: Teams share consistent locale settings
- 🔄 **Automatic Activation**: Preferences apply automatically via middleware
- 📱 **API Support**: Change preferences through REST API

---

## Understanding Preference Precedence

Preferences follow a three-tier precedence model: **User > Organisation > Global**.

### How It Works

1. **User Preferences** (Highest Priority): If you set a preference, it always applies
2. **Organisation Defaults** (Middle Priority): If you haven't set a preference, your organisation's default applies
3. **Global Defaults** (Fallback): If neither you nor your organisation has set a preference, the platform default applies

### Independent Fallback

Each preference field (language, locale, timezone) falls back independently:

**Example**:
```
User Preferences:     language=nl, locale=(not set), timezone=Europe/Amsterdam
Organisation Defaults: language=en, locale=en-GB, timezone=UTC
Global Defaults:      language=en, locale=en-US, timezone=UTC

Result:
  Language: nl (from user)
  Locale:   en-GB (from organisation)
  Timezone: Europe/Amsterdam (from user)
```

---

## Setting Your Preferences

### Via Profile Page

1. Navigate to **Profile → Preferences**
2. Select your preferred language, locale, and timezone
3. Click **Save**
4. Refresh the page to see changes

### Via API

Use the REST API to update your preferences programmatically:

```bash
# Get your current preferences
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.example.com/api/v1/preferences/me/

# Update your preferences
curl -X PATCH \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "nl",
    "locale": "nl-NL",
    "timezone": "Europe/Amsterdam"
  }' \
  https://api.example.com/api/v1/preferences/me/
```

**Response**:
```json
{
  "language": "nl",
  "locale": "nl-NL",
  "timezone": "Europe/Amsterdam",
  "updated_at": "2025-11-29T12:00:00Z"
}
```

### Partial Updates

You can update individual fields without affecting others:

```bash
# Update only timezone
curl -X PATCH \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"timezone": "America/New_York"}' \
  https://api.example.com/api/v1/preferences/me/
```

---

## Organisation Defaults

Organisation administrators can set default preferences for all members.

### Setting Organisation Defaults

```bash
# Requires organisation admin role
curl -X PUT \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "en",
    "locale": "en-GB",
    "timezone": "Europe/London"
  }' \
  https://api.example.com/api/v1/organisations/{org_id}/preferences/
```

### Who Can Manage

- **Organisation Administrators**: Can set organisation-wide defaults
- **Platform Administrators**: Can view all preferences for debugging

Regular users cannot modify organisation defaults but can override them with personal preferences.

---

## Viewing Effective Preferences

To see your actual preferences after precedence resolution:

### Via API

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.example.com/api/v1/preferences/effective/
```

**Response**:
```json
{
  "language": "nl",
  "language_source": "user",
  "locale": "nl-NL",
  "locale_source": "user",
  "timezone": "Europe/Amsterdam",
  "timezone_source": "user"
}
```

The `*_source` fields show where each preference came from:
- `"user"`: From your personal preferences
- `"organisation"`: From your organisation's defaults
- `"global"`: From platform defaults

### Via Django Admin

Platform administrators can view effective preferences in the Django admin:

1. Navigate to **Users → [User]**
2. Scroll to **i18n Preferences** section
3. View **Effective Preferences** panel showing resolution details

---

## Supported Values

### Languages

Currently supported languages:
- `en` - English
- `nl` - Dutch
- `de` - German
- `fr` - French
- `es` - Spanish

*See `LANGUAGES` in Django settings for complete list*

### Locales

Common locales:
- `en-US` - English (United States)
- `en-GB` - English (United Kingdom)
- `nl-NL` - Dutch (Netherlands)
- `de-DE` - German (Germany)
- `fr-FR` - French (France)
- `es-ES` - Spanish (Spain)

### Timezones

Any valid IANA timezone name, e.g.:
- `UTC` - Coordinated Universal Time
- `Europe/London` - United Kingdom
- `Europe/Amsterdam` - Netherlands
- `America/New_York` - US Eastern
- `Asia/Tokyo` - Japan

*See [IANA Time Zone Database](https://www.iana.org/time-zones) for complete list*

---

## Troubleshooting

### My Preference Isn't Applying

**Symptoms**: You've set a preference but content still displays in the wrong language/timezone.

**Solutions**:
1. **Refresh the page**: Preferences apply on next request
2. **Check effective preferences**: Use `/api/v1/preferences/effective/` to see actual values
3. **Verify middleware**: Ensure `I18nPreferenceMiddleware` is enabled in settings
4. **Check middleware order**: Must come after `AuthenticationMiddleware`

### Validation Errors

**Symptoms**: API returns `400 Bad Request` when setting preferences.

**Common Issues**:

**Invalid language code**:
```json
{
  "language": ["Language code 'xx' is not supported. Choose from: en, nl, de, fr, es"]
}
```
Solution: Use a language from the supported list.

**Invalid timezone**:
```json
{
  "timezone": ["Invalid timezone 'Europe/Amsterdamm'. Must be a valid IANA timezone."]
}
```
Solution: Check timezone spelling (typo: "Amsterdamm" → "Amsterdam").

### Times Still Wrong After Setting Timezone

**Cause**: Browser timezone may override server-side timezone in JavaScript-heavy pages.

**Solution**: Ensure your frontend application respects the `X-Timezone` header or fetches effective preferences via API.

### Organisation Defaults Not Working

**Symptoms**: Users see global defaults instead of organisation defaults.

**Check**:
1. Organisation defaults are set: `GET /api/v1/organisations/{org_id}/preferences/`
2. User is member of the organisation
3. User hasn't set conflicting personal preferences

---

## Best Practices

### For Users

1. **Set your timezone**: Even if you keep language defaults, set your timezone for accurate time display
2. **Review effective preferences**: Check `/effective/` endpoint to understand what you'll see
3. **Update when traveling**: Change timezone when traveling long-term

### For Organisation Administrators

1. **Set organisation defaults early**: New members inherit these defaults
2. **Document timezone policy**: Clarify whether team should use company HQ timezone or personal timezones
3. **Review regularly**: Audit preferences when team composition changes

### For Developers

1. **Test with multiple locales**: Verify UI works in all supported languages
2. **Use effective preferences in background jobs**: See Developer Guide for `user_locale_context()`
3. **Handle missing preferences gracefully**: Always provide sensible defaults

---

## Related Documentation

- **Developer Guide**: [`docs/i18n-integration.md`](./i18n-integration.md) - Integration patterns for developers
- **API Reference**: `/api/v1/schema/` - Complete API documentation
- **Architecture Decision Record**: [`docs/adr/012-b10-preference-storage.md`](./adr/012-b10-preference-storage.md) - Design rationale

---

## Support

For issues or questions:
- **Platform Administrators**: Open ticket in admin portal
- **Developers**: See Developer Guide for integration help
- **Bug Reports**: File issue in project repository
