# TaskMaster — Student Task Management System

A full-stack web application that helps university students manage their academic life in one place — courses, assignments, exams, deadlines, and progress tracking. Built with a Node.js/Express backend, MySQL database, and JWT-secured authentication.

Run `TaskMaster.html` on a live server to see the frontend.

---

## What It Does

- Add and manage courses, assignments, and exams in one dashboard
- Track deadlines with a calendar view and get notifications before due dates
- Analytics summary showing academic progress and task completion rates
- Secure login and registration with JWT authentication and bcrypt password hashing
- Update profile and change password from within the app

---

## Tech Stack

`Node.js` `Express` `MySQL` `JWT` `bcrypt` `HTML5` `CSS3` `Bootstrap` `REST APIs`

---

## Project Structure

```
project/
├── TaskMaster.html      → frontend entry point (open with live server)
├── schema.sql           → database schema — run this first in MySQL
├── .env.example         → environment variable template
├── server.js            → main Express server
├── routes/              → API route handlers
└── tests/               → unit tests for boundary validation
```

---

## Setup & Run

**1. Set up the database**
```bash
# Run schema.sql in your MySQL client
mysql -u root -p < schema.sql
```

**2. Configure environment**
```bash
cp .env.example .env
# Edit .env with your MySQL credentials and JWT secret
```

**3. Install dependencies**
```bash
npm install
```

**4. Start the server**
```bash
npm start
```

Server runs at: `http://localhost:5000/api`

**5. Open the frontend**

Open `TaskMaster.html` with **Live Server** in VS Code.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login and get token |
| GET | `/auth/me` | Get current user |
| GET/POST | `/courses` | Get or add courses |
| PUT/DELETE | `/courses/:id` | Update or delete course |
| GET/POST | `/tasks` | Get or add tasks |
| PUT/PATCH/DELETE | `/tasks/:id` | Update, change status, or delete task |
| PUT | `/profile` | Update profile info |
| PUT | `/profile/password` | Change password |
| GET | `/analytics/summary` | Get academic progress summary |
| GET | `/notifications` | Get upcoming deadline notifications |

---

## Testing

```bash
npm test
```

Unit tests cover boundary validation for password length, course code length, task title length, and credit hour range.

---

*Built as part of Database Management Systems coursework at FAST-NUCES Islamabad.*
