# SngVkus Backend

Backend API для фронтенда SngVkus. Подключается к существующей MySQL-схеме из `../database/sngvkus_schema.sql`.

## Запуск (локально)

1) Подними MySQL и создай схему:

- импортируй `database/sngvkus_schema.sql` (см. `database/INSTALL.md`)

2) Настрой переменные окружения:

- скопируй `backend/.env.example` → `backend/.env`
- укажи `DB_*` и `JWT_SECRET`

3) Установи зависимости и запусти:

```bash
cd backend
npm i
npm run dev
```

API будет доступен на `http://localhost:8000/api`.

## Эндпоинты

- `GET /api/health`
- `POST /api/auth/register` → `{ user, token }`
- `POST /api/auth/login` → `{ user, token }`
- `GET /api/auth/me` → `User`
- `GET /api/projects` → `Project[]`
- `GET /api/projects/:id` → `Project`
- `POST /api/projects` → `Project`
- `POST /api/analysis/upload` (multipart: `file`, `projectId`) → `AnalysisData`
- `GET /api/analysis/:id` → `AnalysisData`

### Premixes

- `GET /api/premixes`
- `GET /api/premix_composition`
- `GET /api/premixes/:id/composition`

### Recipes

- `GET /api/projects/:projectId/recipe`
- `PUT /api/projects/:projectId/recipe` (upsert)

### Packaging

- `GET /api/projects/:projectId/packaging`
- `PUT /api/projects/:projectId/packaging` (upsert)

### Presentations

- `GET /api/projects/:projectId/presentation`
- `PUT /api/projects/:projectId/presentation` (upsert)

### Comments

- `GET /api/projects/:projectId/comments`
- `POST /api/projects/:projectId/comments`

### Notifications

- `GET /api/notifications`
- `POST /api/notifications/:id/read`

### Admin (координатор)

- `GET /api/admin/users`
- `POST /api/admin/projects/:projectId/assign` (`expertId`, `coordinatorId`)
- `POST /api/admin/projects/:projectId/status` (`status`)

