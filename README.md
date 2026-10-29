# Cloud Student Management System — AWS RDS + Firebase only

This version intentionally includes only two services:
1. **AWS RDS MySQL** for relational student records.
2. **Firebase Realtime Database** for attendance records.

## Run locally

Requirements: Node.js 18+ and npm.

```powershell
npm install
copy .env.example .env
npm start
```

Open http://localhost:3000. Default `CLOUD_MODE=false` runs a demo with in-memory sample data; new data resets when the server restarts.

## Configure AWS RDS

1. Create a MySQL RDS instance.
2. Permit inbound TCP 3306 only from your current public IP; never use `0.0.0.0/0`.
3. Execute `schema.sql` in MySQL Workbench after connecting to the instance.
4. Set MySQL values in `.env`. Keep `MYSQL_SSL=true`.

## Configure Firebase

1. Create a Firebase project and enable Realtime Database.
2. Download a service-account JSON from Project Settings > Service accounts and save it in this folder as `firebase-service-account.json`.
3. Set `FIREBASE_SERVICE_ACCOUNT_PATH` and `FIREBASE_DATABASE_URL` in `.env`.
4. Keep database rules restricted; do not deploy this starter publicly without authentication and authorization.

After both services are configured, set `CLOUD_MODE=true` in `.env` and restart `npm start`. Check `/api/health` for cloud connection status.

## API

- `GET /api/health`
- `GET /api/students`
- `POST /api/students`
- `GET /api/attendance/:date`
- `PUT /api/attendance/:date/:studentId`

The dashboard polls attendance every five seconds; browser-side Firebase push subscriptions are not implemented in this starter.

Never commit `.env` or `firebase-service-account.json`. Cloud resources may incur charges. This is a learning demo, not a production-secure app.
