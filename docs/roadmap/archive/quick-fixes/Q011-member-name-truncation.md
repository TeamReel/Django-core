# Q011 — Ledennamen truncatie in Selectie lijst

| | |
|---|---|
| Status | 📋 TODO |
| Bron | UI Review F27 iteratie 2 — Playwright 24-03-2026 |
| Impact | 🟡 important |
| Effort | ~1 uur |

## Wat

In de Selectie-lijstweergave op 375px worden langere namen afgekapt of onhandig gewrapt:

- "Diederik Hulshof" → wordt over meerdere regels gewrapt en dan afgekapt
- "Aman Gbtsawi..." → truncated zonder duidelijke ellipsis

Namen zouden in 1 regel moeten passen met ellipsis, of het layout moet meer ruimte geven aan de naam.

## Oplossing

```css
.memberName {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
```

Of: herschik de member-row zodat de naam meer ruimte krijgt ten koste van de progress-indicator.

## Checklist
- [ ] Ledennamen: 1 regel met ellipsis bij overflow
- [ ] Volledige naam zichtbaar bij tap/hover (title attribute of tooltip)
- [ ] Layout balans: naam vs. progress/status indicatoren
- [ ] Verify met lange namen (20+ tekens) op 375px
