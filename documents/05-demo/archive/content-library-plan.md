# Content Library & AI Studio Unification Plan

> **Last Updated:** 2026-02-13
> **Status:** ✅ IMPLEMENTED
> **Related:** media-architecture.md, B31 Content Templates, B22 MediaLib

---

## 🎯 Doel

Unificeer de **Content Library** en **AI Studio** tot één samenhangende content hub waar gebruikers:

1. **Gegenereerde content** kunnen browsen en beheren (flyers, lineups, goal celebrations, etc.)
2. **Templates** kunnen bekijken en selecteren
3. **Content** direct kunnen genereren
4. **Timeline/Gallery** view hebben van alle output
5. **Filteren** op basis van hierarchie (Org → Club → Team → Season → Match)

---

## 📊 Huidige Situatie

### Wat er al is:

| Pagina | Route | Functie | Status |
|--------|-------|---------|--------|
| **Media Library** | `/medialib` | Brand assets (logos, kits) + file uploads | ✅ Werkt |
| **Content Library** | `/contentlib` | Gegenereerde content (MediaItems) | ⚠️ Bestaat, maar 0 items |
| **AI Studio** | `/studio` | Templates browser + history + quick actions | ✅ Werkt |
| **Content Templates** | `/content-templates` | Template CRUD management | ✅ Werkt |

### Architectuur verschil:

```
Media Library                Content Library (NIEUW)
─────────────────           ────────────────────────
= Uploads + Assets          = Generated Output

✓ FileAsset (S3 files)      ✓ MediaItem (generated content)
✓ BrandAsset (logo/kit)     ✓ ContentItem (generation status)
✓ Support content           ✓ Social media ready

Bron: User uploads          Bron: AI/Template output
```

### Panel B Tab Structuur (al geïmplementeerd):

```
Content Library (/contentlib)
├── [Tab] Match
│   └── [Sub-tab] Alles | Pre-match | During | Post-match
├── [Tab] Season
│   └── [Sub-tab] Alles | Season Content
├── [Tab] Member
│   └── [Sub-tab] Alles | Intro | Celebration | In Tenue
├── [Tab] Team
│   └── [Sub-tab] Alles
└── [Tab] Club
    └── [Sub-tab] Alles
```

---

## 🏗️ Voorstel: Unified Content Hub

### Route Structuur

**Optie A: Extend AI Studio met Content Library tab (Aanbevolen)**

```
/studio                     → AI Content Hub
├── ?tab=library            → Content Library (gegenereerde content)
├── ?tab=templates          → Template Browser
├── ?tab=history            → Generation History
└── ?tab=actions            → Quick Actions

/studio/videos              → Video Queue (bestaand)
```

**Sidebar Panel B (wanneer op /studio?tab=library):**

```
AI Content Hub
├── Library        ← NIEUW: Content Library integratie
├── Templates      ← Bestaand
├── History        ← Bestaand
└── Quick Actions  ← Bestaand

Wanneer tab=library actief, toon level sub-tabs:
├── Match | Season | Member | Team | Club
```

### Optie B: Vervang AI Studio door Content Hub

Minder ingrijpend alternatief:

```
/content                    → Content Hub (vervangt /studio)
├── ?tab=library            → Browse generated content
├── ?tab=generate           → Template browser + generate
├── ?tab=history            → Generation history
└── ?tab=queue              → Video/processing queue
```

---

## 🔧 Implementatie Plan

### Fase 1: Data Pipeline Fix (Backend)

**Probleem:** ContentLibraryPage toont 0 items omdat MediaItems niet worden aangemaakt.

**Fix:** Zorg dat content generation output correct saved wordt:

```python
# Bij succesvolle content generation:
1. FileAsset aanmaken (S3 opslag)
2. MediaItem aanmaken met:
   - file → FileAsset
   - project → Team/Club
   - activity → Match (indien van toepassing)
   - extraction_metadata → { asset_type: 'lineup', ... }
   - generation_request → GenerationRequest (optioneel)
```

### Fase 2: Frontend Unificatie

**Stap 1:** ContentLibraryPage verplaatsen naar AIStudioPage als tab

```tsx
// AIStudioPage.tsx
type Tab = 'library' | 'templates' | 'history' | 'actions';

// Tab bar:
tabs={[
  { id: 'library', label: 'Content Library', icon: Film },
  { id: 'templates', label: 'Templates', icon: Library },
  { id: 'history', label: 'History', icon: Timer },
  { id: 'actions', label: 'Quick Actions', icon: Sparkles },
]}
```

**Stap 2:** Library tab met level sub-tabs:

```tsx
{activeTab === 'library' && (
  <ContentLibraryView
    // Embed de bestaande ContentLibraryPage logic
    // Met level tabs: Match, Season, Member, Team, Club
  />
)}
```

**Stap 3:** Sidebar Panel B update:

```tsx
// Sidebar.tsx - getPanelBItems()
} else if (path === '/studio' || path.startsWith('/studio?')) {
  const tabParam = new URLSearchParams(path.split('?')[1] || '').get('tab');

  if (tabParam === 'library') {
    // Toon level tabs zoals bij /contentlib
    title = 'Content Library';
    items = [
      { label: 'Match', path: '/studio?tab=library&level=match', icon: Trophy },
      { label: 'Season', path: '/studio?tab=library&level=season', icon: Calendar },
      { label: 'Member', path: '/studio?tab=library&level=member', icon: UserCircle },
      { label: 'Team', path: '/studio?tab=library&level=team', icon: Shirt },
      { label: 'Club', path: '/studio?tab=library&level=club', icon: Shield },
    ];
  } else {
    // Bestaande AI Studio tabs
    title = 'AI Studio';
    items = [
      { label: 'Library', path: '/studio?tab=library', icon: Film },
      { label: 'Templates', path: '/studio?tab=templates', icon: Library },
      { label: 'History', path: '/studio?tab=history', icon: Timer },
      { label: 'Quick Actions', path: '/studio?tab=actions', icon: Sparkles },
    ];
  }
}
```

### Fase 3: UX Verbeteringen

1. **Timeline/Gallery Toggle:**
   ```
   [Grid View] [Timeline View]
   ```

2. **Quick Actions op content cards:**
   - 📥 Download
   - 📋 Copy to clipboard
   - 🔄 Regenerate
   - ❌ Delete

3. **Filter chips voor content types:**
   ```
   [Flyer] [Lineup] [Goal] [End Score] [Highlights] ...
   ```

4. **Context breadcrumbs:**
   ```
   KNVB > Ajax > Ajax 1 > Season 2024/25 > vs PEC Zwolle
   ```

---

## 📐 Data Model Check

### Content wordt opgeslagen in:

```
┌─────────────────────────────────────────────────────────────┐
│  Content Generation Flow                                    │
│                                                             │
│  Template Execute                                           │
│       │                                                     │
│       ▼                                                     │
│  GenerationRequest (B34)  ─┬─►  FileAsset (S3)             │
│       │                    │                                │
│       ▼                    │                                │
│  GenerationOutput (B34)    │    MediaItem                  │
│       │                    ├─►  - project: FK              │
│       ▼                    │    - activity: FK             │
│  SUCCESS                   │    - extraction_metadata      │
│                            │                                │
│                            └─►  ContentItem (legacy)        │
│                                 - template: FK              │
│                                 - status: approved          │
│                                 - output_file: FK           │
└─────────────────────────────────────────────────────────────┘
```

### Hierarchy Filtering:

```sql
-- Match content:
SELECT * FROM medialib_mediaitem
WHERE activity_id = '{match_uuid}';

-- Season content:
SELECT * FROM medialib_mediaitem
WHERE project_id = '{team_uuid}'
  AND extraction_metadata->>'content_phase' = 'season';

-- Team content:
SELECT * FROM medialib_mediaitem
WHERE project_id = '{team_uuid}';

-- Club content:
SELECT * FROM medialib_mediaitem m
JOIN projects_project p ON m.project_id = p.id
WHERE p.parent_project_id = '{club_uuid}'
   OR m.project_id = '{club_uuid}';
```

---

## ✅ Acceptance Criteria

### Must Have:
- [ ] Content Library toont daadwerkelijke gegenereerde content
- [ ] Filtering op Org/Club/Team/Season/Match werkt
- [ ] Content types sub-tabs (Pre-match, During, Post-match, etc.)
- [ ] Gallery grid met thumbnails
- [ ] Preview modal (image/video)
- [ ] Download functionaliteit

### Should Have:
- [ ] Unified met AI Studio (1 pagina, meerdere tabs)
- [ ] Timeline view optie
- [ ] Quick regenerate actie
- [ ] Breadcrumb context indicator

### Nice to Have:
- [ ] Bulk download
- [ ] Social media direct share
- [ ] AI tagging/search
- [ ] Favorites/collections

---

## 🗓️ Tijdlijn

| Fase | Taak | Schatting |
|------|------|-----------|
| 1 | Backend: MediaItem creation fix | 2-4 uur |
| 2 | Frontend: Tab unificatie | 3-4 uur |
| 3 | Sidebar: Panel B updates | 1-2 uur |
| 4 | UX: Timeline view + actions | 2-3 uur |
| **Total** | | **8-13 uur** |

---

## 📝 Notities

### Waarom unificeren?

1. **Minder navigatie:** User hoeft niet tussen /contentlib en /studio te switchen
2. **Consistente UX:** Zelfde tab pattern als entity detail pages
3. **Contextueel:** Wanneer je in AI Studio bent, wil je ook je output zien

### Waarom NIET /contentlib verwijderen?

De route `/contentlib` kan blijven bestaan als redirect naar `/studio?tab=library` voor backwards compatibility.

### Hierarchy respect:

```
Content item altijd gelinkt aan:
- Organisation (via project.organisation)
- Project (club of team)
- Activity (optioneel, voor match-specifiek)
- Period (optioneel, voor season-specifiek)
```

Dit zorgt dat filtering op elk niveau correct werkt.
