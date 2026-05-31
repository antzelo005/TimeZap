# Manual Testing Checklist

1. Health check
```bash
curl http://localhost:3000/api/health
```

2. Database health check
```bash
curl http://localhost:3000/api/db-health
```

3. Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"password\":\"password123\"}"
```

4. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"password\":\"password123\"}"
```

5. Get current user
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

6. Create task
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d "{\"title\":\"Finish report\",\"description\":\"Complete thesis section\",\"due_date\":\"2026-06-01\",\"due_time\":\"18:00\",\"is_all_day\":false,\"emoji\":\"📝\",\"color\":\"#7B61FF\"}"
```

7. Complete task
```bash
curl -X PATCH http://localhost:3000/api/tasks/1/complete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

8. Create habit
```bash
curl -X POST http://localhost:3000/api/habits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d "{\"title\":\"Read for 20 min\",\"description\":\"Daily reading habit\",\"start_date\":\"2026-06-01\",\"emoji\":\"📚\",\"color\":\"#7B61FF\",\"rule\":{\"recurrence_type\":\"daily\",\"interval_value\":1,\"target_count\":1,\"target_period\":null,\"week_start\":\"monday\",\"days\":[]}}"
```

9. Log habit
```bash
curl -X POST http://localhost:3000/api/habits/1/log \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d "{\"date\":\"2026-06-01\"}"
```

10. Get streak
```bash
curl http://localhost:3000/api/habits/1/streak \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

11. Get dashboard today
```bash
curl http://localhost:3000/api/dashboard/today \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
