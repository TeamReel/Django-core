# 322 — B54 — Social Media Publishing

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Backend (TeamReel Product Feature) |
| Impact | 🔴 critical |
| Effort | ~40 uur |

## Wat

Direct publishing naar sociale media platforms vanuit TeamReel. SocialAccount model met encrypted OAuth tokens per platform (Instagram, TikTok, X, Facebook, YouTube). Platform adapter pattern, multi-platform publishing service met platform-specifieke formatting, post analytics tracking, en content preview met character count en aspect ratio validatie.

## Waarom belangrijk

De core belofte van TeamReel is: "Content genereren en delen in minuten." Zonder directe social media publishing moet een clubvrijwilliger content downloaden, de juiste social media app openen, en handmatig posten. Dat is 3 extra stappen die adoptie verlagen. One-click publishing naar Instagram en TikTok is een gamechanger.

## Past in TeamReel / CoreApp

- **TeamReel**: Dit is een van de meest gevraagde features. Clubs willen hun wedstrijdgraphics, line-up video's en highlights direct op Instagram en TikTok zetten. Het businessplan noemt social media distribution als kernfunctionaliteit.
- **CoreApp**: Het adapter pattern (interface per platform) is herbruikbaar. OAuth flow, token management, en webhook handling zijn generiek. Maar de specifieke platform-integraties zijn TeamReel-specifiek.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=B54-social-media-publishing

We bouwen social media publishing in de Django 5 + DRF backend.

[feature summary]
Multi-platform social media publishing met OAuth integration, platform adapters, en analytics tracking.

[goals]
- SocialAccount model: platform, account_name, encrypted tokens, status (connected/expired/revoked)
- Platform adapters: Instagram (Feed, Stories, Reels), TikTok (Video), X (Posts, Media), Facebook, YouTube
- OAuth2 flow: connect account, token refresh, scope management
- Publishing service: single post → multiple platforms met platform-specifieke formatting
- Content preview: character count warnings, aspect ratio validatie per platform
- Post analytics: views, likes, shares (pull metrics from platform APIs)

[non-goals]
- Social listening/monitoring
- Automated content scheduling AI
- Influencer management
- Community management (comments/DMs)

[tech context]
- Backend: Django 5, DRF, PostgreSQL, Celery
- Media: FileAsset model (src/files/) voor video/image files
- Content: GenerationRequest + generated content (src/generative/)
- Encryption: django-fernet-fields of django-encrypted-fields voor tokens
- OAuth: requests-oauthlib of platform-specifieke SDKs
- Tests: pytest + factory_boy + responses (mock HTTP)
```

### Plan

```
/spec-kitty.plan feature=B54-social-media-publishing

[tech choices]
- Adapter pattern: BaseSocialAdapter abstract class, per-platform implementatie
- OAuth: requests-oauthlib voor standaard OAuth2 flow
- Token encryption: django-cryptography of Fernet voor access/refresh tokens
- Publishing: Celery task per platform (async, retry on failure)
- Analytics: Celery periodic task (dagelijks metrics ophalen)
- Media upload: platform-specifieke upload APIs (Instagram Container API, TikTok Direct Post)

[models]
- SocialAccount: org FK, platform (enum), account_name, access_token (encrypted), refresh_token (encrypted), scopes, status, connected_at
- SocialPost: social_account FK, content FK (GenericFK), platform_post_id, status, published_at
- SocialPostMetrics: post FK, views, likes, shares, comments, fetched_at

[api endpoints]
- GET /api/v1/social/accounts/ — connected accounts
- POST /api/v1/social/connect/{platform}/ — start OAuth flow
- GET /api/v1/social/callback/{platform}/ — OAuth callback
- DELETE /api/v1/social/accounts/{id}/ — disconnect
- POST /api/v1/social/publish/ — publish naar platform(s)
- GET /api/v1/social/posts/ — published posts
- GET /api/v1/social/posts/{id}/analytics/ — post metrics

[files to create]
- src/social/ — nieuwe Django app
- src/social/adapters/ — per platform adapter
- src/social/tasks.py — publish + analytics Celery tasks
- tests/test_social/
```

### Research

```
/spec-kitty.research feature=B54-social-media-publishing

Onderzoek de volgende punten:

1. Welke content formats genereert TeamReel? (afbeeldingen, video's, aspect ratios) Check src/video/ en src/generative/.
2. Welke social media API requirements zijn er per platform? (Instagram Graph API, TikTok Content Posting API)
3. Hoe worden secrets/tokens nu opgeslagen in de codebase? Is er al encryption?
4. Welke OAuth2 libraries worden er al gebruikt?
5. Wat zijn de rate limits per platform voor posting en analytics ophalen?
```
