# BreatheCast

BreatheCast is a full-stack **Air Quality Index (AQI) prediction application**. It combines a trained machine learning model with a modern web application so users can provide environmental and weather-related information through a simple interface and receive an AQI prediction.

The project combines **Machine Learning + FastAPI + React + TypeScript + Redux Toolkit + PostgreSQL + SQLAlchemy + authentication + email OTP + Google OAuth + Docker** into one application.

---

## 🌍 What is BreatheCast?

BreatheCast turns an AQI machine learning model into a complete web application.

Instead of requiring users to run a Python notebook or machine learning script manually, the application provides a web interface where users can enter prediction data and receive the result through the browser.

### Application Flow

```text
User
  │
  ▼
React + TypeScript Frontend
  │
  │ HTTP / JSON
  ▼
FastAPI Backend
  │
  ├── Authentication
  │     ├── Regular Signup
  │     ├── Email OTP Verification
  │     └── Google Authentication
  │
  ├── Request Validation
  ├── Prediction Service
  └── Database Operations
  │
  ├──────────────► PostgreSQL
  │
  ▼
Trained AQI Machine Learning Model
  │
  ▼
AQI Prediction
  │
  ▼
Frontend
```

---

# ✨ Main Features

- AQI prediction using a trained machine learning model
- Machine learning model trained using environmental/weather data
- React frontend with TypeScript
- Redux Toolkit (RTK) for frontend state management
- FastAPI backend
- PostgreSQL database
- SQLAlchemy ORM
- Alembic database migrations
- JWT-based authentication
- Access and refresh token support
- Regular email/password signup
- Email OTP verification for regular signup
- Google authentication
- Email delivery through Brevo
- Docker and Docker Compose support
- Structured frontend and backend architecture
- Python 3.12 backend environment
- Python dependency versions maintained in `requirements.txt`

---

# 🛠️ Technology Stack

## Frontend

| Technology | Purpose |
|---|---|
| React | User interface |
| TypeScript | Type-safe frontend development |
| Redux Toolkit (RTK) | State management |
| Vite | Frontend development and build tooling |

## Backend

| Technology | Purpose |
|---|---|
| Python 3.12 | Backend programming language |
| FastAPI | REST API framework |
| Pydantic | Request and response validation |
| SQLAlchemy | Database ORM |
| Alembic | Database migrations |
| JWT | Authentication and session security |

## Database

| Technology | Purpose |
|---|---|
| PostgreSQL | Persistent data storage |

## Email & Authentication

| Technology | Purpose |
|---|---|
| Brevo | Email delivery |
| Google OAuth | Google authentication |
| OTP | Email verification during regular signup |

## Development

| Technology | Purpose |
|---|---|
| Docker | Containerization |
| Docker Compose | Running services together |
| Git | Source-code version control |

---

# 📁 Project Structure

A simplified structure looks like this:

```text
BreatheCast/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── ...
│   │
│   ├── alembic/
│   ├── .env.example
│   ├── requirements.txt
│   ├── Dockerfile
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── services/
│   │   └── ...
│   │
│   ├── .env.development
│   ├── package.json
│   └── ...
│
├── docker-compose.yaml
└── README.md
```

> The exact folder names can change as the project evolves. The important idea is that frontend, backend, database, and machine learning responsibilities remain separated.

---

# 🚀 Getting Started

## Prerequisites

Install the following before running BreatheCast:

- Git
- Docker Desktop
- Node.js and npm
- Python 3.12
- A Google OAuth Client ID if Google Sign-In is enabled
- A Brevo account/API key

Docker is the recommended way to run the complete application because the backend and PostgreSQL database can run together in a consistent environment.

---

# ⚙️ 1. Configure the Backend

Go into the backend directory:

```bash
cd backend
```

Find:

```text
.env.example
```

Create a new file:

```text
.env
```

Copy the configuration from `.env.example` into `.env`.

A typical development configuration is:

```env

SECRET_KEY=

GOOGLE_CLIENT_ID= # Your Google OAuth Client ID credentials

DATABASE_USER=postgres
DATABASE_PASSWORD= # your strong password
DATABASE_DB=breathecast
DATABASE_PORT=5432
DATABASE_HOST=db # or admin if you are running the database on your local machine

ACCESS_TOKEN_EXPIRY_MINUTES=30
REFRESH_TOKEN_EXPIRY_DAYS=7

DEBUG=False
ENVIRONMENT=development

ALLOWED_ORIGINS=

BREVO_API_KEY=
BREVO_SENDER_EMAIL=someone@gmail.com
```

---

# 🔐 Backend Environment Variables

## Required Configuration

These values are required and should be filled in.

### `SECRET_KEY`

Application security key used for JWT-related security operations.

```env
SECRET_KEY=your-secret-key
```

Use a long, unpredictable value and keep it private.

**Never commit your real secret key to GitHub.**

### `GOOGLE_CLIENT_ID`

Google OAuth Client ID used for Google Sign-In.

```env
GOOGLE_CLIENT_ID=your-google-client-id
```

The frontend should use the matching Google Client ID.

---

# 🗄️ Database Configuration

### `DATABASE_USER`

PostgreSQL username:

```env
DATABASE_USER=postgres
```

### `DATABASE_PASSWORD`

PostgreSQL password:

```env
DATABASE_PASSWORD=your-password
```

### `DATABASE_DB`

Database name:

```env
DATABASE_DB=breathecast
```

### `DATABASE_PORT`

PostgreSQL port:

```env
DATABASE_PORT=5432
```

### `DATABASE_HOST`

PostgreSQL hostname:

```env
DATABASE_HOST=db
```

When PostgreSQL is running through Docker Compose, `db` is normally the database service name.

When PostgreSQL is running outside Docker, this can instead be:

```env
DATABASE_HOST=localhost
```

or another appropriate hostname.

---

# 🔑 Token Expiration

### `ACCESS_TOKEN_EXPIRY_MINUTES`

Controls how long an access token remains valid.

```env
ACCESS_TOKEN_EXPIRY_MINUTES=30
```

### `REFRESH_TOKEN_EXPIRY_DAYS`

Controls how long a refresh token remains valid.

```env
REFRESH_TOKEN_EXPIRY_DAYS=7
```

The shorter-lived access token is used for authenticated requests, while the refresh token can help maintain the user's session.

---

# 🌐 Environment Configuration

### `DEBUG`

Controls debug mode:

```env
DEBUG=False
```

Keeping debug mode disabled is recommended for normal usage and production.

### `ENVIRONMENT`

For local development:

```env
ENVIRONMENT=development
```

Use the production value expected by your deployment configuration when deploying publicly.

---

# 🌍 CORS Configuration

### `ALLOWED_ORIGINS`

Specifies which frontend origins can communicate with the backend.

For a Vite development server, an example is:

```env
ALLOWED_ORIGINS=["http://localhost:5173"]
```

If multiple origins are supported by the backend configuration, they can be supplied in the expected comma-separated format:

```env
ALLOWED_ORIGINS=["http://localhost:5173,http://localhost:3000"]
```

Make sure the configured origin matches the URL used by the frontend.

---

# 📧 Email OTP Configuration

BreatheCast supports regular signup with **email OTP verification**.

The signup flow is:

```text
User enters signup details
          │
          ▼
Backend starts verification
          │
          ▼
OTP is sent through Brevo
          │
          ▼
User enters OTP
          │
          ▼
Backend verifies OTP
          │
          ▼
Verified account
```

### `BREVO_API_KEY`

API key used to send emails through Brevo:

```env
BREVO_API_KEY=your-brevo-api-key
```

### `BREVO_SENDER_EMAIL`

Email address used as the sender:

```env
BREVO_SENDER_EMAIL=someone@gmail.com
```

The sender should be configured correctly in your Brevo account.

> Never commit your real Brevo API key to the repository.

---

# 🌐 2. Configure the Frontend

Go into the frontend directory:

```bash
cd frontend
```

Create:

```text
.env.development
```

Add:

```env
VITE_BACKEND_API=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

## Frontend Environment Variables

### `VITE_BACKEND_API`

Base URL of the FastAPI backend.

For local development:

```env
VITE_BACKEND_API=http://localhost:8000
```

If the frontend code already appends `/api/v1`, do not add `/api/v1` to this variable.

### `VITE_GOOGLE_CLIENT_ID`

Google OAuth Client ID:

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

It should match:

```env
GOOGLE_CLIENT_ID=your-google-client-id
```

in the backend.

---

# 🐳 3. Run BreatheCast with Docker

From the **project**, first run:

```bash
cd backend
```
then
```bash
docker compose up --build
```

This builds the required containers and starts the application.

The logs will remain attached to the terminal.

---

## Run in Background

To run the application without keeping the terminal attached to logs:

```bash
docker compose up --build -d
```

View logs later with:

```bash
docker compose logs -f
```

Stop the application with:

```bash
docker compose down
```

---

# 🗃️ 4. Database Migrations

BreatheCast uses **Alembic** to manage changes to the PostgreSQL database schema.

Migrations are important when you change things such as:

- table names
- columns
- relationships
- constraints
- indexes
- other database structure

After a database-related change, apply the latest migration:

```bash
docker compose exec backend alembic upgrade head
```

This upgrades the database to the latest migration available in the project.

### Migration Workflow

After making database model/schema changes:

```bash
docker compose exec backend alembic upgrade head
```

If the project requires creating a new migration before applying it, create the migration according to the configured Alembic workflow and then run:

```bash
docker compose exec backend alembic upgrade head
```

Using Alembic keeps database changes organized and reproducible.

---

# 🔐 Authentication

BreatheCast supports both regular account authentication and Google authentication.

## Regular Signup + Email OTP

The regular signup process includes email verification:

```text
Signup
  │
  ▼
OTP sent to email
  │
  ▼
User enters OTP
  │
  ▼
Email verified
  │
  ▼
Account completed
  │
  ▼
Login
```

This provides an additional verification step for regular email/password accounts.

## Google Authentication

Users can also sign in using Google OAuth.

The backend uses:

```env
GOOGLE_CLIENT_ID=...
```

while the frontend uses:

```env
VITE_GOOGLE_CLIENT_ID=...
```

These values should correspond to the same Google OAuth application.

---

# 🤖 AQI Prediction Workflow

BreatheCast's prediction process is:

```text
User Input
    │
    ▼
Frontend Validation
    │
    ▼
FastAPI Prediction Endpoint
    │
    ▼
Backend Validation / Preprocessing
    │
    ▼
Trained AQI Model
    │
    ▼
AQI Prediction
    │
    ▼
API Response
    │
    ▼
React UI
```

This keeps model inference inside the backend and allows the frontend to focus on the user experience.

---

# 🔌 Backend API

BreatheCast uses FastAPI to provide REST APIs.

The API is versioned under:

```text
/api/v1
```

During local development, the backend is commonly available at:

```text
http://localhost:8000
```

FastAPI's interactive API documentation is available at:

```text
http://localhost:8000/docs
```

The Swagger UI can be used to inspect and test available endpoints.

A health endpoint is also available under the versioned API route.

---

# 🗄️ PostgreSQL + SQLAlchemy

BreatheCast uses PostgreSQL for persistent application data.

SQLAlchemy provides the ORM layer between Python and PostgreSQL.

The relationship is:

```text
FastAPI
   │
   ▼
SQLAlchemy
   │
   ▼
PostgreSQL
```

SQLAlchemy models define the application's database structure, while Alembic manages schema migrations.

---

# 🎨 Frontend

The frontend uses:

- React
- TypeScript
- Redux Toolkit
- Vite

The frontend handles:

- AQI prediction input
- prediction result display
- user authentication
- signup and OTP verification
- Google Sign-In
- application state
- communication with the FastAPI backend

The backend handles the core business logic, secure authentication, database operations, validation, and model inference.

---

# 📦 Python Dependencies

The backend Python dependencies are listed in:

```text
backend/requirements.txt
```

The file contains the Python packages required by the backend and machine learning components, along with their versions.

For local Python development using Python 3.12:

```bash
pip install -r requirements.txt
```

When running with Docker, the Docker configuration handles the Python environment inside the container.

---

# 🧠 Why Docker?

Without Docker, you may need to manually configure:

```text
Python
PostgreSQL
Python packages
Database connection
Environment variables
```

Docker Compose allows the main services to run together in a predictable environment:

```text
┌──────────────────────────────┐
│        Docker Compose        │
│                              │
│  ┌───────────┐ ┌──────────┐ │
│  │  Backend  │ │ Database │ │
│  │  FastAPI  │ │PostgreSQL│ │
│  └───────────┘ └──────────┘ │
└──────────────────────────────┘
```

This makes BreatheCast easier to set up and reproduce on different machines.

---

# 🧪 Recommended Development Workflow

### 1. Clone the repository

```bash
git clone https://github.com/KAS1966-tech/BreatheCast.git
cd BreatheCast
```

### 2. Configure the backend

Create:

```text
backend/.env
```

using:

```text
backend/.env.example
```

Fill in the important credentials:

```env
SECRET_KEY=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
DATABASE_PASSWORD=your-database-password
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=someone@gmail.com
```

### 3. Configure the frontend

Create:

```text
frontend/.env.development
```

and add:

```env
VITE_BACKEND_API=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 4. Start the application

From the project root:

```bash
docker compose up --build
```

Or:

```bash
docker compose up --build -d
```

### 5. Apply database migrations when needed

```bash
docker compose exec backend alembic upgrade head
```

### 6. Open the application

The frontend is commonly available at:

```text
http://localhost:5173
```

The backend is commonly available at:

```text
http://localhost:8000
```

FastAPI documentation:

```text
http://localhost:8000/docs
```

---

# 🧯 Common Issues

## Backend cannot connect to PostgreSQL

When PostgreSQL is running inside Docker Compose, check that:

```env
DATABASE_HOST=db
```

and verify:

```env
DATABASE_USER=postgres
DATABASE_PASSWORD=...
DATABASE_DB=breathecast
DATABASE_PORT=5432
```

If PostgreSQL is outside Docker, use the correct external hostname such as `localhost`.

---

## Frontend cannot communicate with backend

Check:

```env
VITE_BACKEND_API=http://localhost:8000
```

Also make sure the frontend origin is allowed by:

```env
ALLOWED_ORIGINS=["http://localhost:5173"]
```

The frontend URL and backend CORS configuration must match.

---

## Google Sign-In is not working

Verify that:

```env
GOOGLE_CLIENT_ID=...
```

and:

```env
VITE_GOOGLE_CLIENT_ID=...
```

contain the same Google Client ID.

Also verify that the frontend URL is configured correctly in Google OAuth settings.

---

## OTP email is not being received

Check:

```env
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=someone@gmail.com
```

Verify the sender configuration in Brevo.

Then inspect the backend logs:

```bash
docker compose logs -f backend
```

---

## Database changes are not visible

Run:

```bash
docker compose exec backend alembic upgrade head
```

---

## Containers are running but the application is not responding

Check service status:

```bash
docker compose ps
```

Then inspect logs:

```bash
docker compose logs -f
```

For backend-specific logs:

```bash
docker compose logs -f backend
```

---

# 🔒 Security Notes

Do not commit sensitive credentials to GitHub.

Keep values such as these private:

```text
SECRET_KEY
DATABASE_PASSWORD
BREVO_API_KEY
```

The repository should contain:

```text
.env.example
```

instead of the real `.env`.

Also note that frontend variables beginning with `VITE_` are exposed to the browser. They should never contain secrets that are intended to remain private.

---

# 🏭 Production Considerations

The project supports Docker-based development, but production deployments should use appropriate security and infrastructure settings.

Before deploying publicly, review:

- `DEBUG`
- `ENVIRONMENT`
- `SECRET_KEY`
- database credentials
- `ALLOWED_ORIGINS`
- Google OAuth configuration
- Brevo credentials
- HTTPS
- PostgreSQL security
- database backups
- secret management
- logging
- monitoring
- container security

Never use development credentials as production credentials.

---

# 📜 Useful Docker Commands

### Build and start

```bash
docker compose up --build
```

### Build and start in background

```bash
docker compose up --build -d
```

### Stop containers

```bash
docker compose down
```

### View logs

```bash
docker compose logs -f
```

### View service status

```bash
docker compose ps
```

### View backend logs

```bash
docker compose logs -f backend
```

### Apply Alembic migrations

```bash
docker compose exec backend alembic upgrade head
```

---

# 🧭 Architecture at a Glance

```text
                         ┌─────────────────────┐
                         │        User         │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ React + TypeScript  │
                         │ Redux Toolkit + Vite│
                         └──────────┬──────────┘
                                    │
                              HTTP / JSON
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │       FastAPI       │
                         │       /api/v1       │
                         └──────┬──────┬───────┘
                                │      │
                    ┌───────────┘      └─────────────┐
                    ▼                                ▼
          ┌──────────────────┐             ┌──────────────────┐
          │ SQLAlchemy       │             │ AQI Prediction   │
          │ Database Layer   │             │ Service / Model  │
          └────────┬─────────┘             └──────────────────┘
                   │
                   ▼
          ┌──────────────────┐
          │   PostgreSQL     │
          │     Database     │
          └──────────────────┘

       Authentication Services
       ├── JWT Access Tokens
       ├── Refresh Tokens
       ├── Email OTP
       └── Google OAuth
```

---

# ✅ Quick Start

For the fastest setup:

### Backend

Create:

```text
backend/.env
```

from:

```text
backend/.env.example
```

Fill in the required values:

```env
SECRET_KEY=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
DATABASE_PASSWORD=your-database-password
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=someone@gmail.com
```

### Frontend

Create:

```text
frontend/.env.development
```

with:

```env
VITE_BACKEND_API=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### Start

From the project root:

```bash
docker compose up --build
```

Or:

```bash
docker compose up --build -d
```

### Apply migrations

```bash
docker compose exec backend alembic upgrade head
```

Then open the frontend, commonly at:

```text
http://localhost:5173
```

---

# 🌱 Project Purpose

BreatheCast demonstrates how an environmental machine learning model can be transformed into a complete software product.

It brings together:

**Machine Learning + FastAPI + React + TypeScript + Redux Toolkit + PostgreSQL + SQLAlchemy + JWT Authentication + Email OTP + Google OAuth + Docker**

into a single application designed to make AQI prediction accessible through a user-friendly web interface.