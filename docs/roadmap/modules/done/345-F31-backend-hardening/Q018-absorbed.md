# Q018 — Backend Test Coverage Uitbreiding

| | |
|---|---|
| Status | 📋 TODO |
| Bron | Code Review |
| Impact | 🟡 important |
| Effort | ~4 uur |

## Wat
15 Django apps hebben 0 test files. De belangrijkste business-apps (generative, video, content_generation, notifications) draaien in productie zonder test coverage. Dit maakt refactoring en upgrades risicovol.

## Apps zonder tests (gesorteerd op prioriteit)

### Hoog — Business critical
| App | Reden | Geschatte effort |
|-----|--------|------------------|
| `content_generation` | Templates, items, approval flow — kern van product | ~2 uur |
| `notifications` | Gebruikerscommunicatie, delivery pipeline | ~1 uur |
| `contextual_notifications` | Smart routing, quiet hours | ~1 uur |
| `workflows` | Business process orchestration | ~1 uur |

### Midden — Infrastructure
| App | Reden |
|-----|--------|
| `generative` | AI pipeline, 838-lijn model, complex state | ~2 uur |
| `video` | Video processing, FFmpeg integratie | ~2 uur |
| `permissions` | Autorisatie-logica, security relevant | ~1 uur |

### Laag — Utility/Config
| App | Reden |
|-----|--------|
| `sport_configuration` | Seed data, reference tables | ~30 min |
| `navigation` | UI navigation config | ~30 min |
| `i18n_preferences` | Language preferences | ~30 min |
| `observability` | Metrics, health checks | ~30 min |
| `audit` | Audit logging | ~30 min |
| `core` | Base models, mixins | ~30 min |
| `common` | Shared utilities | ~30 min |
| `scaffolding` | Development scaffolding | skip |

## Checklist
- [ ] content_generation: model + API tests
- [ ] notifications: model + delivery tests
- [ ] contextual_notifications: routing tests
- [ ] workflows: orchestration tests
- [ ] permissions: permission class tests
- [ ] Verify
