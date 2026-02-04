# B59: Multi-Format Export

**Phase:** 14
**Status:** 📋 ROADMAP
**Module ID:** 268
**Category:** Backend (TeamReel Product Feature)

## Description

## 268. B59 – Multi-Format Export

**Doel**: Platform-specifieke export formats voor social media (Stories, Posts, Reels).

**Waarom TeamReel**: Core feature - one content, multiple platform-optimized versions.

**Wat moet er gebeuren**:
- **FormatPreset model**:
  - Fields: name, platform, content_type, dimensions
  - Dimensions: width, height, aspect_ratio
  - Settings: quality, codec, bitrate
- **Platform presets** (built-in):
  - **Instagram**:
    - Feed Post: 1080x1080 (1:1), 1080x1350 (4:5)
    - Story/Reel: 1080x1920 (9:16)
    - Carousel: 1080x1080 (up to 10 slides)
  - **TikTok**:
    - Video: 1080x1920 (9:16)
  - **X (Twitter)**:
    - Image: 1200x675 (16:9)
    - Video: 1280x720 (16:9)
  - **Facebook**:
    - Post: 1200x630
    - Story: 1080x1920
  - **YouTube**:
    - Thumbnail: 1280x720
    - Shorts: 1080x1920
- **Multi-export service**:
  - Input: single source content
  - Output: multiple format versions
  - Queue-based processing (B15)
- **Smart cropping**:
  - Face detection for portraits
  - Focus point selection
  - Safe zones for text/graphics
- **Template adaptation**:
  - Template layout adjustment per format
  - Text size scaling
  - Logo position adjustment
- **Batch export**:
  - Export all formats at once
  - Zip download option
  - Direct platform upload (T01)
- **Integration**: T01 (publishing), T02 (video), B35 (media library)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `GET /api/v1/formats/` - List available format presets
- `GET /api/v1/formats/platforms/` - List platforms with their formats
- `POST /api/v1/export/` - Export content to format(s)
- `POST /api/v1/export/batch/` - Batch export to multiple formats
- `GET /api/v1/export/{id}/` - Get export job status
- `GET /api/v1/export/{id}/download/` - Download exported files

**Status**: 📋 ROADMAP

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
