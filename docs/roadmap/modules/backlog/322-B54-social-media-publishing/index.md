# B54: Social Media Publishing

**Priority:** ⏳ Later
**Phase:** 14
**Status:** 📋 ROADMAP
**Module ID:** 322
**Category:** Backend (TeamReel Product Feature)

## Description

## 263. B54 – Social Media Publishing

**Doel**: Direct publishing naar sociale media platforms vanuit TeamReel.

**Waarom TeamReel**: Core feature - clubs willen content direct delen op hun kanalen.

**Wat moet er gebeuren**:
- **SocialAccount model**:
  - Fields: platform, account_name, access_token (encrypted), refresh_token
  - Platforms: Instagram, TikTok, X (Twitter), Facebook, YouTube
  - Owner: organisation or project
  - Status: connected, expired, revoked
- **Platform adapters**:
  - InstagramAdapter: Feed posts, Stories, Reels
  - TikTokAdapter: Video posts
  - XAdapter: Posts, threads, media
  - FacebookAdapter: Posts, Stories
  - YouTubeAdapter: Shorts, videos
- **OAuth flow**:
  - Connect account via OAuth2
  - Token refresh handling
  - Scope management per platform
- **Publishing service**:
  - Single post to multiple platforms
  - Platform-specific formatting
  - Media upload handling
  - Caption/description per platform
- **Scheduling integration** (B50):
  - Schedule posts for specific platforms
  - Optimal time suggestions (future)
- **Analytics integration**:
  - Post performance tracking (views, likes, shares)
  - Pull metrics from platform APIs
- **Content preview**:
  - Platform-specific preview
  - Character count warnings
  - Aspect ratio validation
- **Integration**: B22 (files), B50 (scheduling), B35 (media library)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `GET /api/v1/social/accounts/` - List connected accounts
- `POST /api/v1/social/connect/{platform}/` - Start OAuth flow
- `DELETE /api/v1/social/accounts/{id}/` - Disconnect account
- `POST /api/v1/social/publish/` - Publish to platforms
- `GET /api/v1/social/posts/` - List published posts
- `GET /api/v1/social/posts/{id}/analytics/` - Get post analytics

**Status**: 📋 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B54-social-media-publishing

[feature summary]
Direct publishing to social media platforms (Instagram, TikTok, X, Facebook, YouTube) with OAuth integration.

[goals]
- SocialAccount model with encrypted tokens per platform
- Platform adapter pattern for each social network
- OAuth2 flow for account connection with token refresh
- Multi-platform publishing service with platform-specific formatting
- Post analytics integration (views, likes, shares)
- Content preview with character count and aspect ratio validation

[non-goals]
- Social listening/monitoring
- Automated content generation for social
- Influencer management

[dependencies]
- B22 (file storage for media)
- B50 (scheduled publishing)
- B35 (media library)

[scope]
Backend only - Django app, REST API, pytest tests, README
No frontend/demo pages (downstream product responsibility)
```

## Notes
<!-- Add progress notes here -->

---

## Delivery Checklist

- [ ] **Migrations**: Applied to Railway (production-safe)
- [ ] **Seed Data**: Fixtures/factories created for testing
- [ ] **Admin**: Registered & configured in Django Admin
- [ ] **API**: Endpoints tested in Swagger/OpenAPI
- [ ] **Demo Integration**: Visible in demo app (if applicable)
- [ ] **Manual Test**: Test file completed in `documents/08-testing/manual-tests/`
- [ ] **Documentation**: README updated with usage examples
