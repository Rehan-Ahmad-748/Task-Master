# TaskMaster Backend

This is the Node.js + Express backend for TaskMaster Iteration 3.

## Tech Stack

- Node.js + Express
- MySQL
- JWT authentication
- bcrypt password hashing

## Setup

1. Create MySQL database and tables:
   - Run `schema.sql` in MySQL.
2. Copy `.env.example` to `.env` and update values.
3. Install dependencies:
   - `npm install`
4. Start server:
   - `npm start`

Default base URL: `http://localhost:5000/api`

## API Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /courses`
- `POST /courses`
- `PUT /courses/:id`
- `DELETE /courses/:id`
- `GET /tasks`
- `POST /tasks`
- `PUT /tasks/:id`
- `PATCH /tasks/:id/status`
- `DELETE /tasks/:id`
- `PUT /profile`
- `PUT /profile/password`
- `GET /analytics/summary`
- `GET /notifications`

## Testing

Run:

- `npm test`

Includes boundary validation unit tests for:
- Password length
- Course code length
- Task title length
- Credit hour range
