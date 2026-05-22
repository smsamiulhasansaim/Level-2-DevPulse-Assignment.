# DevPulse — Issue Tracking API

A collaborative backend system for software teams to report bugs, suggest features, and coordinate resolutions. Built as part of the **Next Level AI-Driven Software Engineering Bootcamp** by S M Samiul Hasan.

**Live Base URL:** `https://your-live-url.com`

---

## Features

- User registration and login with role-based access (`contributor` / `maintainer`)
- JWT authentication on all protected routes
- Create, view, update, and delete issues
- Filter issues by `type` and `status`; sort by `newest` or `oldest`
- Reporter details enriched on every issue response (no SQL JOINs)
- System metrics dashboard for maintainers
- Centralized error handling with PostgreSQL duplicate-key support
- Passwords never exposed in any response

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js (LTS) | Runtime |
| TypeScript | Type safety |
| Express.js | HTTP framework |
| PostgreSQL | Relational database |
| `pg` (native driver) | Raw SQL queries via `pool.query()` |
| `bcrypt` | Password hashing (salt rounds: 10) |
| `jsonwebtoken` | JWT generation & verification |
| `http-status-codes` | Consistent HTTP status references |
| `dotenv` | Environment variable management |

---

## Project Structure

```
src/
├── config/
│   └── db.ts                 # PostgreSQL pool connection
├── controllers/
│   ├── authController.ts     # signup, login
│   └── issueController.ts    # CRUD + metrics
├── middleware/
│   ├── authMiddleware.ts     # authenticate, authorizeRoles
│   └── errorHandler.ts       # centralized error handler
├── routes/
│   ├── authRoutes.ts
│   └── issueRoutes.ts
├── utils/
│   └── responseHelper.ts     # sendSuccess, sendError
└── server.ts                 # app entry point
```

---

## Database Schema

### Table: `users`

| Column | Type | Constraints |
|---|---|---|
| `id` | SERIAL | PRIMARY KEY |
| `name` | VARCHAR | NOT NULL |
| `email` | VARCHAR | NOT NULL, UNIQUE |
| `password` | VARCHAR | NOT NULL |
| `role` | VARCHAR | DEFAULT `'contributor'`, CHECK IN (`contributor`, `maintainer`) |
| `created_at` | TIMESTAMP | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | DEFAULT NOW() |

### Table: `issues`

| Column | Type | Constraints |
|---|---|---|
| `id` | SERIAL | PRIMARY KEY |
| `title` | VARCHAR(150) | NOT NULL |
| `description` | TEXT | NOT NULL |
| `type` | VARCHAR | CHECK IN (`bug`, `feature_request`) |
| `status` | VARCHAR | DEFAULT `'open'`, CHECK IN (`open`, `in_progress`, `resolved`) |
| `reporter_id` | INTEGER | References `users.id` (app-level validation only) |
| `created_at` | TIMESTAMP | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | DEFAULT NOW() |

### SQL Setup

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL UNIQUE,
  password VARCHAR NOT NULL,
  role VARCHAR DEFAULT 'contributor' CHECK (role IN ('contributor', 'maintainer')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE issues (
  id SERIAL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR CHECK (type IN ('bug', 'feature_request')),
  status VARCHAR DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  reporter_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Local Setup

### Prerequisites

- Node.js LTS (v24.x or higher)
- PostgreSQL running locally or a remote connection string

### Steps

1. **Clone the repository**

```bash
git clone https://github.com/your-username/devpulse-api.git
cd devpulse-api
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root:

```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/devpulse
JWT_SECRET=your_super_secret_key
```

4. **Run the SQL schema**

Connect to your PostgreSQL instance and run the SQL from the Database Schema section above.

5. **Start the development server**

```bash
npm run dev
```

The server will start on `http://localhost:5000`.

---

## API Endpoints

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login and receive JWT |

### Issues

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/issues` | Public | Get all issues (supports filtering & sorting) |
| GET | `/api/issues/:id` | Public | Get a single issue by ID |
| GET | `/api/issues/metrics` | Maintainer | Get system-wide issue metrics |
| POST | `/api/issues` | Authenticated | Create a new issue |
| PATCH | `/api/issues/:id` | Authenticated | Update an issue |
| DELETE | `/api/issues/:id` | Maintainer | Delete an issue |

---

## Authentication

All protected routes require the JWT token in the `Authorization` header:

```
Authorization: <your_jwt_token>
```

---

## Query Parameters — GET /api/issues

| Param | Values | Default | Description |
|---|---|---|---|
| `sort` | `newest`, `oldest` | `newest` | Sort order by creation date |
| `type` | `bug`, `feature_request` | — | Filter by issue type |
| `status` | `open`, `in_progress`, `resolved` | — | Filter by workflow status |

**Example:**
```
GET /api/issues?sort=oldest&type=bug&status=open
```

---

## Role Permissions

| Action | Contributor | Maintainer |
|---|---|---|
| Register / Login | ✅ | ✅ |
| View all issues | ✅ | ✅ |
| Create issue | ✅ | ✅ |
| Edit own issue (only if `open`) | ✅ | ✅ |
| Edit any issue + change status | ❌ | ✅ |
| Delete any issue | ❌ | ✅ |
| View system metrics | ❌ | ✅ |

---

## Response Format

**Success**
```json
{
  "success": true,
  "message": "Operation description",
  "data": {}
}
```

**Error**
```json
{
  "success": false,
  "message": "Error description",
  "errors": "Error details"
}
```

---

## HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | OK — successful GET, PATCH, DELETE |
| 201 | Created — successful POST |
| 400 | Bad Request — validation error or duplicate resource |
| 401 | Unauthorized — missing or invalid JWT |
| 403 | Forbidden — insufficient role permissions |
| 404 | Not Found — resource does not exist |
| 409 | Conflict — business logic violation (e.g. editing a non-open issue) |
| 500 | Internal Server Error — unexpected server error |

---

## Developer

**S M Samiul Hasan** — Full-Stack Web & App Developer  
Next Level AI-Driven Software Engineering Bootcamp  
[GitHub](https://github.com/your-username) · [Portfolio](https://samiul.dev)