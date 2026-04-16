# Review Service DB Scripts

- `001_create_reviews.sql`: Creates `reviews` table and indexes used by review-service.

Run manually (example):

```bash
psql "$DB_URL" -f scripts/001_create_reviews.sql
```
