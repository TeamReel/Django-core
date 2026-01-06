# Search Functionaliteit Frontend Integratie

## ✅ Wat is toegevoegd

De volledige search functionaliteit is nu geïntegreerd in de React frontend (Demo Shell).

### Nieuwe Components

1. **useSearch Hook** (`src/hooks/useSearch.ts`)
   - API integratie met debouncing (300ms)
   - Grouped search (global)
   - Filtered search (paginated)
   - Error handling en loading states

2. **SearchBar Component** (`src/components/SearchBar.tsx`)
   - Search input met dropdown
   - Real-time zoekresultaten
   - Grouped results per categorie
   - "View All" buttons per categorie
   - Click outside om te sluiten
   - Navigatie naar detail pages

3. **SearchPage** (`src/pages/SearchPage.tsx`)
   - Volledige zoekresultaten pagina
   - Grouped view (alle categorieën)
   - Filtered view (1 categorie, gepagineerd)
   - Category filtering
   - Pagination controls
   - Highlighted search terms

### Locatie in UI

**SearchBar in TopNavbar**
- Rechts van de navigatie items
- Voor de theme toggle en language switcher
- 300px breed
- Altijd zichtbaar voor ingelogde users

**Search Page**
- Route: `/search`
- URL parameters:
  - `?q=query` - Search query
  - `&types=organisations` - Filter op categorie (optioneel)
  - `&page=2` - Paginanummer (alleen bij filtered search)

## 🎨 UX Flow

### 1. Quick Search (Dropdown)
```
User typt in SearchBar
  ↓ (debounce 300ms)
API call: /api/v1/search/?q=query
  ↓
Dropdown toont grouped results:
  - Organisations (max 5)
  - Projects (max 5)
  - Users (max 5)
  ↓
User klikt result → navigeert naar detail page
User klikt "View All" → navigeert naar /search?q=...&types=category
```

### 2. Full Search Page
```
User klikt in dropdown "View All"
OF
User drukt Enter in SearchBar
  ↓
Navigeert naar /search?q=query
  ↓
Shows grouped results with "View All" buttons
  ↓
User klikt "View All" voor categorie
  ↓
Filtered view: /search?q=...&types=category
  ↓
Paginated results met Previous/Next buttons
```

## 🔍 Features

### Search Highlights
- Backend stuurt `<b>` tags voor highlights
- Frontend rendert met `dangerouslySetInnerHTML`
- Visueel verschil tussen title/description/highlight

### Permission Filtering
- Automatisch via backend
- User ziet alleen toegankelijke results
- Superuser ziet alles

### Responsive Design
- SearchBar: 300px op desktop
- SearchPage: Max-width 1200px centered
- CSS variabelen voor theming

### Performance
- 300ms debounce voorkomt te veel API calls
- AbortController voor cancelled requests
- Geen loading indicators bij typed character

## 🚀 Deployment

### Frontend (Vercel/Netlify)

De frontend deployment gebeurt automatisch bij push naar main:

1. **Build wordt getriggerd**
   ```bash
   cd examples/demo-shell
   pnpm build
   ```

2. **Environment variabelen**
   ```
   VITE_API_BASE_URL=https://your-railway-app.up.railway.app
   ```

3. **Deploy succesvol** wanneer:
   - Build slaagt zonder TypeScript errors
   - Alle routes resolven
   - API calls gaan naar juiste backend

### Test na deployment

```bash
# Open frontend
https://your-frontend.vercel.app/

# Login
# Type in search bar: "premier"
# Verwacht: Dropdown met results

# Navigate to /search?q=premier
# Verwacht: Full page met grouped results

# Click "View All" bij Organisations
# Verwacht: Filtered view met pagination
```

## 📊 API Integration

### Endpoints gebruikt

**Global Search (Grouped)**
```
GET /api/v1/search/?q=query
Response: {
  "users": [SearchResult],
  "organisations": [SearchResult],
  "projects": [SearchResult]
}
```

**Filtered Search (Paginated)**
```
GET /api/v1/search/?q=query&types=organisations&page=1
Response: {
  "count": 10,
  "next": "...",
  "previous": null,
  "results": [SearchResult]
}
```

### SearchResult Type
```typescript
interface SearchResult {
  id: number;
  title: string;
  description: string;
  url: string;
  image_url: string | null;
  content_type: string;
  highlight: string;  // HTML with <b> tags
}
```

## 🎯 Volgende Stappen

### 1. Railway Backend Deployment
```bash
# Run migrations
railway run python manage.py migrate

# Build search index
railway run python manage.py rebuild_search_index
```

### 2. Vercel/Netlify Frontend Deploy
```bash
# Automatisch bij git push
git push origin main

# Of handmatig
cd examples/demo-shell
pnpm build
# Deploy dist/ naar Vercel/Netlify
```

### 3. Testen
- [ ] SearchBar werkt in navbar
- [ ] Dropdown toont results
- [ ] /search page render correct
- [ ] Filtering werkt
- [ ] Pagination werkt
- [ ] Highlights zijn zichtbaar
- [ ] Permission filtering werkt

### 4. Optimalisatie (optioneel)
- [ ] Add search shortcut (Cmd+K / Ctrl+K)
- [ ] Add recent searches
- [ ] Add search analytics
- [ ] Add autocomplete suggestions

## 🐛 Troubleshooting

### SearchBar toont geen results
**Probleem:** API call faalt of geen data
**Oplossing:**
```typescript
// Check console voor errors
// Verify API_BASE_URL in .env
// Test API direct: curl https://api.../search/?q=test
```

### CORS errors
**Probleem:** Frontend kan backend niet bereiken
**Oplossing:**
```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "https://your-frontend.vercel.app",
]
```

### Empty results
**Probleem:** Search index niet gevuld
**Oplossing:**
```bash
railway run python manage.py rebuild_search_index
```

### Highlights niet zichtbaar
**Probleem:** Backend stuurt plain text
**Oplossing:**
```python
# Verify SearchHeadline in backend
# Check API response heeft <b> tags
```

## 📚 Code References

- **Backend API**: `src/search/api/views.py`
- **Search Hook**: `examples/demo-shell/src/hooks/useSearch.ts`
- **SearchBar**: `examples/demo-shell/src/components/SearchBar.tsx`
- **Search Page**: `examples/demo-shell/src/pages/SearchPage.tsx`
- **API Client**: `packages/api-client/src/client.ts`

## ✨ Features Overzicht

| Feature | Status | Locatie |
|---------|--------|---------|
| SearchBar in Navbar | ✅ | TopNavbar.tsx |
| Dropdown Results | ✅ | SearchBar.tsx |
| Full Search Page | ✅ | SearchPage.tsx |
| Category Filtering | ✅ | SearchPage.tsx |
| Pagination | ✅ | SearchPage.tsx |
| Highlighting | ✅ | Backend + Frontend |
| Permission Filtering | ✅ | Backend |
| Debouncing | ✅ | useSearch.ts |
| Error Handling | ✅ | useSearch.ts |
| Responsive Design | ✅ | Inline styles |

De search functionaliteit is nu volledig geïntegreerd en klaar voor gebruik! 🎉
