# H2 — Backend avatar sync

| | |
|---|---|
| Status | TODO |
| Effort | ~1 uur |
| Bestanden | `src/accounts/signals.py` (nieuw of edit), `src/projects/` (metadata update) |

## Doel

Wanneer `User.avatar` wordt geüpload, automatisch `membership.metadata.teamreel_assets.media.profile.url` synchroniseren. Dit elimineert de noodzaak voor de frontend om twee bronnen te checken.

## Context

- **Upload flow**: POST `/admin/users/{userId}/avatar/` → schrijft naar `User.avatar`
- **Probleem**: `media.profile.url` in membership metadata wordt niet bijgewerkt
- **Huidige workaround**: Frontend leest `user.avatar_url` als fallback (commit `855098c8`)
- Na deze fase kan de frontend fallback vereenvoudigd worden (maar hoeft niet — backward compatible)

## Taken

### 1. Signal of post-save hook

Na succesvolle avatar upload:

```python
# Pseudo-code
def sync_avatar_to_memberships(user):
    """Sync User.avatar URL naar alle actieve membership metadata."""
    from src.projects.models import Membership
    avatar_url = get_avatar_url(user.avatar)

    memberships = Membership.objects.filter(
        user=user,
        is_active=True,
    )
    for m in memberships:
        if m.metadata and 'teamreel_assets' in m.metadata:
            m.metadata['teamreel_assets'].setdefault('media', {})
            m.metadata['teamreel_assets']['media'].setdefault('profile', {})
            m.metadata['teamreel_assets']['media']['profile']['url'] = avatar_url
            m.save(update_fields=['metadata'])
```

### 2. Locatie bepalen

Onderzoek waar de avatar upload handler zit:
- `src/accounts/api/views.py` — avatar upload endpoint
- Keuze: post_save signal op User.avatar OF direct in de view na succesvolle upload

★ Aanbeveling: direct in de view — explicieter, minder magisch dan signals.

### 3. Management command voor eenmalige sync

Voor bestaande leden die al een avatar hebben maar geen `media.profile.url`:

```bash
python manage.py sync_avatar_to_memberships --dry-run
python manage.py sync_avatar_to_memberships
```

## Verificatie

- [ ] Upload nieuwe avatar → `media.profile.url` wordt bijgewerkt
- [ ] Bestaande leden gesynchroniseerd via management command
- [ ] `pytest` — geen regressies
- [ ] Harold's `media.profile.url` is niet meer leeg na sync
