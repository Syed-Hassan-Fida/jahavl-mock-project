# Live delivery

Messages, ticket updates, and notifications are pushed to anyone who has the workspace open. The record is written first. Redis only wakes the open stream. If Redis is down, the stream falls back to reading the database every half second, and the phone app still receives the same rows from `GET /api/v1/live/events`.

## Idempotency

`POST /api/v1/messages`, `POST /api/v1/tickets`, and `POST /api/v1/tickets/{id}/events` require an `Idempotency-Key` header. The key is 8 to 80 characters. The same user, key, and body returns the original response and does not create a second message, ticket, reply, notification, or live event. The same key with a different body returns 409. Keys expire after 24 hours. A failed request is not stored, so a retry with the same key can still succeed.

## Stream

`GET /api/v1/live?after={id}` keeps a Server-Sent Events connection open for 25 seconds, then the browser reconnects. Each frame has an `id`. The client stores that id and ignores an event it has already applied.

Run the stream on its own PHP process so it does not occupy the API worker:

```
PHP_CLI_SERVER_WORKERS=8 php artisan serve --host=127.0.0.1 --port=8002 --no-reload
```

The website reads `NEXT_PUBLIC_LIVE_URL`, which defaults to `http://127.0.0.1:8002`. The API stays on port 8000. Behind a proxy, disable response buffering for this route (`X-Accel-Buffering: no` is already set).

The phone app polls `GET /api/v1/live/events?after={id}` every 1.5 seconds. React Native does not read a streaming body, and a long poll on port 8000 would block the single API worker.

Events are kept per user for two days. Each recipient has their own row, so one user's cursor cannot skip another user's event.
