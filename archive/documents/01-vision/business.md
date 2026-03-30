# Business Context — TeamReel

> Last updated: 2026-03-30

## What TeamReel Is

TeamReel is an AI-powered content platform for amateur sports clubs. It generates branded videos, visuals, line-ups, and match graphics automatically — no design skills required.

**Core promise:** Professional club content. In five minutes. In your club's style.

---

## The Problem

Amateur sports clubs want to be visible and professional on social media, but lack the resources:

| Barrier | Impact |
|---------|--------|
| **No design skills** | Members can't create attractive visuals |
| **No time** | Coaches and volunteers have minutes, not hours |
| **No continuity** | One active member leaves → content stops |

The combination leads to inconsistent communication. Clubs miss visibility, member engagement, and professional appeal to sponsors.

---

## Market Opportunity

### Target Market

The Netherlands has **3,000+ amateur football clubs** with over 1 million members. These clubs are active on social media but underserved by existing tools.

**Three converging trends:**
1. **Clubs as media channels** — fans expect regular Instagram/WhatsApp/YouTube updates
2. **Generative AI is accessible** — professional output without designers is now possible
3. **Club style becomes brand value** — consistent content strengthens identity

### Primary Audience

| Attribute | Description |
|-----------|-------------|
| **Club type** | Amateur football (phase 1), expandable to hockey, handball, volleyball |
| **User role** | Team members who already share content on social media |
| **Motivation** | Quick professional content without technical barriers |
| **Digital skills** | Medium to high — familiar with stories, templates, social media |

### Persona

> **Samira** — Captain, Women's 1st Team
> Wants to share a lineup every week without opening Photoshop.
> Frustrated by searching templates, dragging logos, doing everything manually.
> TeamReel fits because it's fast, recognizable, and automatically in club style.

### Secondary Audiences

| Segment | Use case |
|---------|----------|
| **Board / communications** | Uniform external appearance, sponsor value |
| **Coaches** | Line-ups, results, team updates without extra work |
| **Youth teams & parents** | Shareable visuals within family networks |

---

## Competitive Positioning

| Player | Type | Weakness |
|--------|------|----------|
| **Canva** | Design platform | No sport-specific templates, no club data integration |
| **Scoreboard** | Sports data SaaS | Statistics focus, not storytelling |
| **Club-assistent.nl** | Club CMS | Limited visual capabilities, no AI |
| **Socialclubs.nl** | Marketing agency | Not scalable, manual work |

**TeamReel's differentiation:**

| Aspect | What sets it apart |
|--------|-------------------|
| **Full automation** | AI turns team data into ready-to-publish visuals |
| **Club identity** | Output automatically follows club colors, logo, kits |
| **Self-service SaaS** | No agency needed — the club controls everything |
| **Modular expansion** | New content types are easy to add |

---

## Revenue Model

Hybrid model: subscription + credits per AI generation.

| Component | Description |
|-----------|-------------|
| **Team/club subscription** | Monthly or annual access to core features |
| **Credits per output** | AI-generated videos and visuals cost credits based on complexity |
| **Club license** | Unlimited users within one organisation |
| **Upgrades** | Premium templates, longer videos, higher quality exports |

**Indicative pricing:**

| Product | Price |
|---------|-------|
| Starter package | ~€19/month (includes base credits) |
| Credit bundle | 25 credits for ~€12 |
| Club license | ~€149/year (unlimited users) |

> **Current status:** Credit system and transaction ledger are built (`credits` app). Pricing not yet finalized for market launch.

---

## Growth Strategy

### Phase 1 — Foundation (current)
Build the complete content generation pipeline. Validate with pilot clubs in Dutch amateur football.

### Phase 2 — Multi-sport
Expand to hockey, handball, volleyball. The architecture is sport-agnostic (Organisation → Project → Member → Activity), so new sports require only content template additions.

### Phase 3 — Scale
International pilots (EN/DE), optimized hosting, self-service onboarding.

### Future Modules
- Newsletter generator — automated match reports
- Coach of the Year — performance-based content
- Statistics dashboards — usage and reach insights

---

## Key Numbers

| Metric | Value | Source |
|--------|-------|--------|
| Amateur football clubs (NL) | 3,000+ | KNVB |
| Members in amateur football (NL) | 1,000,000+ | KNVB |
| Content types built | 25+ subtypes | `content_templates` app |
| AI providers integrated | 4 (OpenAI, Gemini, MiniMax, Runway) | `generative` app |
| Video export formats | 9:16 (Reels), 16:9 (YouTube), 1:1 (Feed) | `video` app |
