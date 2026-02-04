# Quickstart: User Navigation State

## 1. Installation
Add `core.navigation` to `INSTALLED_APPS` not required (it's part of core).
Ensure `django.contrib.contenttypes` is installed.

Run migrations:
```bash
python manage.py migrate
```

## 2. Configuration (`settings.py`)
Control storage limits via B10 Feature Flags (or simple settings for now):
```python
# Default Limits
NAVIGATION_RECENTS_MAX_COUNT = 50
NAVIGATION_RECENTS_RETENTION_DAYS = 90
```

## 3. Usage (Frontend)

### Logging a Visit
Call this on `useEffect` when a page mounts:
```javascript
import { api } from '@/services/api';

function useLogVisit(entity) {
  useEffect(() => {
    if (entity) {
      api.post('/navigation/recents/', {
        path: window.location.pathname,
        label: entity.name,
        content_type_model: entity.type, // e.g., 'project'
        object_id: entity.id
      });
    }
  }, [entity]);
}
```

### Displaying Recents
```javascript
const { data: recents } = useSWR('/navigation/recents/');

return (
  <ul>
    {recents.map(item => (
      <li key={item.id} className={!item.is_accessible ? 'opacity-50' : ''}>
        {item.is_accessible ? (
          <Link to={item.path}>{item.label}</Link>
        ) : (
          <span>RESTRICTED ITEM</span>
        )}
      </li>
    ))}
  </ul>
);
```
