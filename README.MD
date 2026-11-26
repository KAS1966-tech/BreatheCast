# 🌍 BreatheCast

**BreatheCast is a full-stack Air Quality Index (AQI) prediction web application that combines machine learning with a modern web stack.**

It allows authenticated users to enter environmental and weather-related information, receive an AQI prediction from an XGBoost regression model, save prediction history, and perform batch predictions using CSV files.

---

## ✨ Features

### 🤖 Machine Learning
- AQI prediction using an **XGBoost Regressor**
- Yeo–Johnson transformation of the regression target
- Feature-specific preprocessing
- One-hot encoding for categorical inputs
- Quantile transformation for selected environmental features
- Joblib model artifact
- Backend-side model inference
- Pydantic input validation
- Individual and batch prediction support

### 🔐 Authentication
- Email/password signup
- Email OTP verification
- Google OAuth authentication
- JWT access and refresh tokens
- HTTP-only authentication cookies
- Refresh-token persistence and rotation
- Password hashing with `pwdlib`
- OTP hashing, expiration, and attempt limits

### 👤 User Management
- User profiles
- Update full name
- Update username
- Set password
- Change password
- Delete account

### 📊 Prediction & History
- Individual AQI predictions
- User-specific prediction history
- History deletion
- History CSV download
- CSV batch prediction
- Uploaded-file history
- File-history management

### 🗄️ Backend & Database
- FastAPI REST API
- PostgreSQL
- SQLAlchemy ORM
- Alembic migrations
- Versioned API under `/api/v1`
- Structured validation and service layers

### 🐳 Development
- Docker
- Docker Compose
- Python 3.12
- React
- TypeScript
- Vite
- Axios
- Tailwind CSS
- ESLint

---

# 📑 Table of Contents

- [Machine Learning](#-machine-learning)
- [Training Dataset](#-training-dataset)
- [Prediction Features](#-prediction-features)
- [Model Performance](#-model-performance)
- [Architecture](#-architecture)
- [Tech Stack](#️-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Third-Party Credentials Setup](#-third-party-credentials-setup)
- [Environment Variables](#-environment-variables)
- [Authentication](#-authentication)
- [API](#-api)
- [Database](#-database)
- [Docker](#-docker)
- [Testing](#-testing)
- [Deployment Status](#-deployment-status)
- [Limitations](#️-current-limitations)
- [Roadmap](#️-roadmap)

---

# 🧠 Machine Learning

BreatheCast uses an **XGBoost regression model** to predict a numerical AQI value.

The cleaned training notebook is `notebook/main.ipynb`.

## Training workflow

```text
AQI Dataset
    │
    ▼
Select model features
    │
    ▼
Convert day/month to categorical values
    │
    ▼
80/20 train-test split
    │
    ▼
Feature-specific preprocessing
    │
    ├── Power Transform
    │      ├── Temperature_C
    │      └── WindSpeed_kmh
    │
    ├── No distribution transform
    │      ├── Rainfall_mm
    │      ├── SolarRadiation_Wm2
    │      ├── Pressure_hPa
    │      ├── Humidity_pct
    │      └── WindDirection_deg
    │
    ├── Quantile Transform
    │      ├── TrafficDensityIndex
    │      └── ProximityIndustrialZone_km
    │
    └── One-Hot Encoding
           ├── DayOfWeek
           ├── Month
           └── IsWeekend
    │
    ▼
Yeo–Johnson transformed target
    │
    ▼
XGBoost Regressor
    │
    ▼
Evaluation
    │
    ▼
Joblib Artifact
```

## Model configuration

| Parameter | Value |
|---|---:|
| Algorithm | XGBoost Regressor |
| Task | Regression |
| `n_estimators` | 500 |
| `learning_rate` | 0.05 |
| `max_depth` | 6 |
| `subsample` | 0.8 |
| `colsample_bytree` | 0.8 |
| Objective | `reg:squarederror` |
| Random state | 42 |
| Parallel jobs | `-1` |
| Target transformation | Yeo–Johnson |
| Train/test split | 80/20 |

The final trained pipeline is stored as:

```text
backend/app/models/aqi_artifact.pkl
```

The notebook exports an artifact containing:

```python
{
    "model": pipeline,
    "metadata": {
        "task": "Regression",
        "features": [...],
        "target": "AQI_Value",
        "metrics": {...},
        "model_name": "XGBRegressor"
    }
}
```

---

# 📥 Prediction Features

The final model expects 12 input features:

| Feature | Description |
|---|---|
| `DayOfWeek` | Day of the week |
| `Month` | Month |
| `IsWeekend` | Derived weekend indicator |
| `Temperature_C` | Temperature in °C |
| `Humidity_pct` | Relative humidity |
| `WindSpeed_kmh` | Wind speed |
| `WindDirection_deg` | Wind direction |
| `Pressure_hPa` | Atmospheric pressure |
| `SolarRadiation_Wm2` | Solar radiation |
| `Rainfall_mm` | Rainfall |
| `TrafficDensityIndex` | Traffic density index |
| `ProximityIndustrialZone_km` | Distance from an industrial zone |

`IsWeekend` is calculated from `DayOfWeek` by the BreatheCast backend.

---


---

# 🧪 Training Dataset

The dataset used to train the BreatheCast model is published on Kaggle:

**Dataset:** [Synthetic AQI Prediction Dataset](https://www.kaggle.com/datasets/khawajazainali/synthetic-aqi-prediction-dataset)  
**Kaggle dataset ID:** `khawajazainali/synthetic-aqi-prediction-dataset`  
**CSV file:** `weather_aqi_data.csv`

The dataset is **synthetic / fictional data generated with AI assistance** and shared through Kaggle for machine-learning experiments and project development. Kaggle is the distribution and download source; the data should not be mistaken for observations collected from real-world air-quality monitoring stations.

## Download the dataset with Python

Install the required packages if they are not already installed:

```bash
pip install kagglehub pandas
```

Then download the dataset and load the CSV:

```python
import os
import kagglehub
import pandas as pd

path = kagglehub.dataset_download(
    "khawajazainali/synthetic-aqi-prediction-dataset"
)

dataset = pd.read_csv(os.path.join(path, "weather_aqi_data.csv"))
```

`kagglehub.dataset_download()` downloads the dataset and returns the local directory containing its files. The code above reads `weather_aqi_data.csv` into a pandas DataFrame named `dataset`.

### Important note about synthetic data

This dataset is **not a collection of real-world AQI measurements**.

- It is intended for machine-learning practice, application development, and demonstration.
- The model metrics below describe performance on this synthetic dataset.
- These metrics should **not** be interpreted as proof of real-world AQI forecasting accuracy.
- A production-quality system should be trained and validated on reliable real-world measurements from an appropriate source.

# 📈 Model Performance

The original final training run produced the following **held-out test-set** results:

| Metric | Score |
|---|---:|
| MAE | **6.0728** |
| MSE | **66.0523** |
| RMSE | **8.1273** |
| R² | **0.9677** |

### 5-fold cross-validation on the training split

| Metric | Score |
|---|---:|
| MAE | 6.0673 |
| MSE | 65.9577 |
| RMSE | 8.1214 |

### Training-set result

| Metric | Score |
|---|---:|
| MAE | 5.9884 |
| MSE | 64.2839 |
| RMSE | 8.0177 |

These results describe the model produced by the current training notebook. Performance can change if the dataset, dependency versions, preprocessing, or model configuration changes.

---

# 🏗️ Architecture

```text
                         ┌───────────────────┐
                         │       User        │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ React + TypeScript│
                         │      + Vite       │
                         └─────────┬─────────┘
                                   │
                              HTTP / JSON
                                   │
                                   ▼
                         ┌───────────────────┐
                         │      FastAPI      │
                         │      /api/v1      │
                         └──────┬──────┬─────┘
                                │      │
                    ┌───────────┘      └────────────┐
                    ▼                               ▼
          ┌──────────────────┐            ┌──────────────────┐
          │ Authentication   │            │ Prediction       │
          │ & User Services  │            │ Service          │
          └────────┬─────────┘            └────────┬─────────┘
                   │                               │
                   ▼                               ▼
          ┌──────────────────┐            ┌──────────────────┐
          │    PostgreSQL    │            │ XGBoost Model    │
          │   + SQLAlchemy   │            │ + Joblib Artifact│
          └──────────────────┘            └──────────────────┘
```

## External services

- **Google OAuth** — authentication
- **Brevo** — OTP email delivery
- **PostgreSQL** — persistent application storage

---

# 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Language | TypeScript |
| Build tool | Vite |
| HTTP client | Axios |
| Routing | React Router |
| Styling | Tailwind CSS |
| Backend | FastAPI |
| Validation | Pydantic |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| Authentication | JWT + HTTP-only Cookies |
| OAuth | Google OAuth |
| Email | Brevo |
| ML | XGBoost |
| Model serialization | Joblib |
| Containers | Docker + Docker Compose |

---

# 📁 Project Structure

```text
BreatheCast/
│
├── .gitignore
├── LICENSE
├── README.MD
├── main_clean.ipynb
│
├── backend/
│   ├── .dockerignore
│   ├── .env.example
│   ├── .gitignore
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── requirements.txt
│   ├── start.sh
│   ├── alembic.ini
│   │
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │
│   └── app/
│       ├── api/
│       │   ├── health.py
│       │   └── routes.py
│       ├── core/
│       │   ├── artifact.py
│       │   ├── config.py
│       │   └── logger.py
│       ├── database/
│       │   ├── connection.py
│       │   ├── crud_db.py
│       │   └── database.py
│       ├── models/
│       ├── schemas/
│       │   ├── input_schemas.py
│       │   └── output_schemas.py
│       ├── services/
│       │   ├── email_service.py
│       │   ├── otp.py
│       │   ├── predictor.py
│       │   └── security.py
│       └── main.py
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── package-lock.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── eslint.config.js
    ├── index.html
    └── src/
        ├── api/
        ├── app/
        ├── components/
        ├── constants/
        ├── core/
        ├── hooks/
        ├── pages/
        ├── utils/
        ├── App.tsx
        ├── main.tsx
        └── index.css
```

---

# 🚀 Getting Started

BreatheCast can be run in **two ways**:

| Method | Best for |
|---|---|
| 🧑‍💻 Manual Development | Development, debugging, and working directly with the frontend/backend |
| 🐳 Docker Compose | Running the backend and PostgreSQL in containers with a simpler setup |

> **Frontend:** React + Vite  
> **Backend:** FastAPI  
> **Database:** PostgreSQL  
> **Python:** 3.12

---

## Prerequisites

### Required for both methods

- Git
- Node.js and npm
- Google OAuth client credentials
- Brevo API key and sender email
- The trained model artifact at `backend/app/models/aqi_artifact.pkl`

### Additional for Manual Development

- Python 3.12
- PostgreSQL installed and running locally, or an accessible PostgreSQL server

### Additional for Docker

- Docker Desktop
- Docker Compose
- **Docker Desktop must be running before starting the containers**

---

# 🧑‍💻 Method 1 — Manual Development

Manual mode runs the FastAPI backend and React frontend directly on your machine.

## 1. Clone the repository

```bash
git clone https://github.com/KAS1966-tech/BreatheCast.git
cd BreatheCast
```

---

## 2. Choose a running method

BreatheCast can be started in **two ways**:

- **Manual Development** — install and run the backend/frontend directly on your machine.
- **Docker Compose** — run the backend and PostgreSQL in containers.

> **Recommendation:** Docker Compose is usually the easier first-time setup because it reduces the number of local dependencies you need to configure. Manual development gives you more direct control for development and debugging.

---

## 3. Configure the backend

Move into the backend:

```bash
cd backend
```

Create `.env` from `.env.example`.

### Bash / Git Bash / WSL

```bash
cat .env.example > .env
```

### PowerShell

```powershell
Get-Content .env.example | Set-Content .env
```

### Windows Command Prompt

```cmd
type .env.example > .env
```

Then edit `.env` and configure your PostgreSQL, Google OAuth, Brevo, JWT, and CORS values.

For a manually running PostgreSQL server, the database host is typically:

```env
DATABASE_HOST=localhost
```

---

## 4. Create the Python virtual environment

From the `backend/` directory:

> **Important:** You must activate the virtual environment before installing packages and running the backend manually. If you open a new terminal later, activate `.venv` again before using the backend.


```powershell
py -3.12 -m venv .venv
```

Activate it on Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

Or in Command Prompt:

```cmd
.venv\Scripts\activate
```

After activation, your terminal should show `(.venv)`.

---

## 5. Install backend dependencies

You can use **uv** or regular **pip**.

### Option A — With uv

Install `uv` first if it is not already installed, then:

```bash
uv pip install -r requirements.txt
```

Run the backend with:

```bash
uvicorn app.main:app --reload
```

### Option B — Without uv

```bash
py -3.12 -m pip install -r requirements.txt
```

Run the backend with:

```bash
uvicorn app.main:app --reload
```

Keep this terminal running.

The backend will normally be available at:

```text
http://localhost:8000
```

FastAPI documentation:

```text
http://localhost:8000/docs
```

---

## 6. Run database migrations

Make sure PostgreSQL is running and your `DATABASE_*` settings in `backend/.env` are correct.

Then, from `backend/`:

```bash
alembic upgrade head
```

> If your local setup requires a different PostgreSQL configuration, update `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, and `DATABASE_DB` accordingly.

---

## 7. Configure the frontend

Open a **second terminal**.

From the project root:

```bash
cd frontend
```

Create `.env.development`.

If a frontend `.env.example` exists in your working copy:

### Bash / Git Bash / WSL

```bash
cat .env.example > .env.development
```

### PowerShell

```powershell
Get-Content .env.example | Set-Content .env.development
```

### Windows Command Prompt

```cmd
type .env.example > .env.development
```

The current repository does not contain a committed frontend `.env.example`. In that case, create:

```text
frontend/.env.development
```

with:

```env
VITE_BACKEND_API=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## 8. Install frontend dependencies

```bash
npm install
```

---

## 9. Start the frontend

```bash
npm run dev
```

The Vite development server will normally be available at:

```text
http://localhost:5173
```

At this point you should have:

```text
Terminal 1 → FastAPI backend → http://localhost:8000
Terminal 2 → React frontend  → http://localhost:5173
PostgreSQL → Running locally / externally
```

---

# 🐳 Method 2 — Docker Compose

Docker mode runs the containerized backend and PostgreSQL services together.

## 1. Start Docker Desktop

Make sure **Docker Desktop is open and running** before executing Docker commands.

---

## 3. Configure the backend

From the project root:

```bash
cd backend
```

Create `.env` from `.env.example`.

### Bash / Git Bash / WSL

```bash
cat .env.example > .env
```

### PowerShell

```powershell
Get-Content .env.example | Set-Content .env
```

### Windows Command Prompt

```cmd
type .env.example > .env
```

Fill in the required credentials and configuration.

> When PostgreSQL is running through Docker Compose, `DATABASE_HOST` is normally the Compose database service name, such as `db`, rather than `localhost`.

---

## 3. Start the application

From `backend/`:

```bash
docker compose up --build
```

This keeps the containers attached to the terminal so you can see logs.

### Run in the background

```bash
docker compose up --build -d
```

When using `-d`, Docker runs the containers in the background.

---

## 4. Apply database migrations

After the backend container is running:

```bash
docker compose exec backend alembic upgrade head
```

---

## 5. Frontend environment

The frontend still needs:

```text
frontend/.env.development
```

with:

```env
VITE_BACKEND_API=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

For a Docker-based frontend setup, use the frontend configuration expected by the included Dockerfile/build process.

---

## 6. Useful Docker commands

### Stop containers

```bash
docker compose down
```

### View all logs

```bash
docker compose logs -f
```

### View backend logs

```bash
docker compose logs -f backend
```

### View running services

```bash
docker compose ps
```

---

## 📝 Manual Development vs Docker

The **manual method can sometimes require additional troubleshooting** depending on your operating system, Python installation, PostgreSQL configuration, PATH settings, package versions, environment variables, or other local configuration.

If something does not work on the first attempt, you may need to use an AI assistant to help debug the specific error. Manual development is excellent when you are comfortable debugging and have some patience while setting up the environment.

If you prefer a simpler first-run experience, **Docker Compose is recommended**. With Docker Desktop running and the environment values filled in correctly, the project can run in containers with fewer local configuration differences. This is one of the main reasons Docker is useful for making development environments more consistent across different machines.

> Docker reduces environment-related problems, but it cannot prevent every possible error. Correct `.env` configuration is still required.

---

## 🌐 Open the BreatheCast Web App

After the application starts successfully, open the frontend in your browser:

```text
http://localhost:5173
```

This is the **BreatheCast web application** where you can interact with the UI, create/login to an account, enter AQI prediction data, view results, and use the available application features.

The backend API is normally available at:

```text
http://localhost:8000
```

FastAPI interactive documentation:

```text
http://localhost:8000/docs
```

> **After successful startup, open `http://localhost:5173` in your browser to view and interact with the BreatheCast web application.**

---

## 🔀 Which method should I use?

### Choose Manual Development when you want to:

- Debug backend code directly
- Debug frontend code directly
- Work inside a Python `.venv`
- Quickly restart only one part of the application
- Develop with `uvicorn --reload` and Vite hot reload

### Choose Docker Compose when you want to:

- Start backend + PostgreSQL together
- Avoid manually installing PostgreSQL
- Keep the backend environment containerized
- Reproduce the project's containerized development environment

---

## ✅ Quick Command Summary

### Manual

**Backend**

```bash
cd backend
py -3.12 -m venv .venv
```

Activate the virtual environment, then choose:

```bash
uv pip install -r requirements.txt
uvicorn app.main:app --reload
```

or:

```bash
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend — second terminal**

```bash
cd frontend
npm install
npm run dev
```

**Database**

```bash
cd backend
alembic upgrade head
```

---

### Docker

**Backend + PostgreSQL**

```bash
cd backend
docker compose up --build
```

or:

```bash
docker compose up --build -d
```

**Migration**

```bash
docker compose exec backend alembic upgrade head
```

> For Docker mode, make sure Docker Desktop is running first.

---

# 🔑 Third-Party Credentials Setup

> ⚠️ **Important: provider setup instructions can change over time.**
>
> Google Cloud Console and Brevo may change their dashboard layout, menu names, URLs, verification requirements, or credential-creation process. The instructions below are based on the current provider interfaces, but they may look different in the future.
>
> If you cannot find an option mentioned in this README, or the steps no longer match what you see:
>
> 1. Check the latest **official Google or Brevo documentation**.
> 2. Search for the current setup process for the specific credential you need.
> 3. You can also ask an AI assistant to search the web for the **latest official instructions** and guide you through the updated interface.
>
> Do not assume BreatheCast is broken simply because a provider changed its dashboard. The important part is obtaining the required credential and placing it in the correct environment variable.


BreatheCast uses **Google OAuth** for Google Sign-In and **Brevo** for sending signup OTP emails.

You need to create these credentials before the corresponding authentication/email features can work.

---

## 🔵 Google OAuth — Get `GOOGLE_CLIENT_ID`

Google currently manages OAuth applications through the **Google Auth Platform** in Google Cloud Console. The exact menu names can change over time, but the flow is generally:

### 1. Open Google Cloud Console

Go to:

**https://console.cloud.google.com/**

Sign in with your Google account.

### 2. Create a Google Cloud project

From the project selector:

1. Click **New Project**.
2. Give the project a name, for example:

```text
BreatheCast
```

3. Create the project.
4. Make sure the new BreatheCast project is selected.

### 3. Open Google Auth Platform

In Google Cloud Console, open:

```text
Google Auth Platform
```

Then use **Get Started** if the application has not been configured yet.

Google may ask you to configure the application's branding and audience before creating an OAuth client. See the [Google Auth Platform setup guide](https://support.google.com/cloud/answer/15544987).

### 4. Configure the application

Provide the requested application information, including:

- **App name:** `BreatheCast`
- **User support email:** an email address you can monitor
- **Audience:** normally **External** for an application that should allow users outside your Google organization

For a development project using an External audience, Google can keep the application in testing and allow you to add specific test users. See [Google's audience documentation](https://support.google.com/cloud/answer/15549945).

### 5. Create the OAuth Client

Go to:

```text
Google Auth Platform → Clients
```

Then:

1. Click **Create Client**.
2. Select **Web application**.
3. Give the client a name, for example:

```text
BreatheCast Web Client
```

4. Under **Authorized JavaScript origins**, add:

```text
http://localhost:5173
```

This is the local frontend origin used by BreatheCast during Vite development.

Browser-based applications must register their JavaScript origins, and localhost is supported for local development. See [Google's OAuth client documentation](https://support.google.com/cloud/answer/15549257).

5. Create the client.

Google will provide a **Client ID** that looks similar to:

```text
1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

See [Google's current OAuth client documentation](https://support.google.com/cloud/answer/15549257) for the Web application client flow.

### 6. Add the Client ID to BreatheCast

Use the same client ID in both places:

**Backend**

```env
GOOGLE_CLIENT_ID=your-google-client-id
```

**Frontend**

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 7. Development testing users

If your Google app is configured as an External app and remains in testing, add the Google accounts you want to use for development/testing to the app's **test users** configuration. External apps in testing can be limited to listed test users. See [Google's audience documentation](https://support.google.com/cloud/answer/15549945).

### Google credential security

The BreatheCast frontend needs the client ID, so `VITE_GOOGLE_CLIENT_ID` is intentionally public.

Do **not** put private credentials or API keys in frontend `VITE_*` variables.

For this BreatheCast flow, the backend verifies the Google credential received from the frontend using the configured client ID.

---

## ✉️ Brevo — Get `BREVO_API_KEY`

BreatheCast uses Brevo to send signup OTP emails.

### 1. Create a Brevo account

Go to:

**https://www.brevo.com/**

Create an account and sign in.

### 2. Open API key settings

In Brevo, go to your account settings and open:

```text
SMTP & API → API Keys
```

Brevo's current documentation uses the **SMTP & API settings** area for API key management. See [Brevo API key authentication](https://developers.brevo.com/docs/api-key-authentication).

### 3. Generate the API key

Under the **API Keys** tab:

1. Click **Generate a new API key**.
2. Give it a descriptive name, for example:

```text
BreatheCast Development
```

3. Generate the key.
4. **Copy it immediately and store it securely.**

Brevo shows the full API key when it is generated, so copy it at that time. Treat it like a password and never commit it to source control. See [Brevo API key authentication](https://developers.brevo.com/docs/api-key-authentication).

Add it to:

```env
BREVO_API_KEY=your-brevo-api-key
```

### 4. Configure the sender email

BreatheCast also uses:

```env
BREVO_SENDER_EMAIL=your-sender@example.com
```

In Brevo, create and verify the sender you want to use:

```text
Settings → Senders, Domains, IPs → Senders
```

Then:

1. Click **Add a sender**.
2. Enter the sender name.
3. Enter the sender email address.
4. Save it.
5. Complete Brevo's email verification step if requested.

The sender used for transactional email must be registered/verified. See [Brevo's sender setup guide](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email).

For better deliverability, Brevo recommends authenticating your sending domain. See [Brevo's sender/domain guidance](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email).

Then configure:

```env
BREVO_SENDER_EMAIL=the-verified-sender@example.com
```

### Brevo setup summary

```env
BREVO_API_KEY=your-generated-api-key
BREVO_SENDER_EMAIL=your-verified-sender@example.com
```

---

## 🔐 Generate the BreatheCast `SECRET_KEY`

You can generate a strong 64-character URL-safe secret with Python.

From a Python terminal:

```python
import secrets

secret_key = secrets.token_urlsafe(48)
print(secret_key)
```

`48` random bytes produce a 64-character URL-safe value.

Copy the generated value into:

```env
SECRET_KEY=your-generated-secret-key
```

Example:

```env
SECRET_KEY=PASTE_THE_GENERATED_VALUE_HERE
```

> Never commit the real `SECRET_KEY` to GitHub.

---

### 🔎 When provider instructions change

Provider websites are external to BreatheCast and can change independently of this project. Menu names, OAuth setup screens, API-key pages, verification requirements, and URLs may be different in the future.

When that happens, use the latest official documentation rather than relying on an old screenshot or third-party tutorial. You can search for:

- **Google:** `Google Auth Platform OAuth client ID`
- **Brevo:** `Brevo API key` and `Brevo sender verification`

You can also give the exact screen/error you are seeing to an AI assistant and ask it to search the current official documentation.

---

# 🔑 Environment Variables

## Backend

```env
SECRET_KEY=
GOOGLE_CLIENT_ID=

DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_DB=
DATABASE_PORT=5432
DATABASE_HOST=

ACCESS_TOKEN_EXPIRY_MINUTES=30
REFRESH_TOKEN_EXPIRY_DAYS=7

DEBUG=False
ENVIRONMENT=production

ALLOWED_ORIGINS=

BREVO_API_KEY=
BREVO_SENDER_EMAIL=

OTP_EXPIRE_MINUTES=5
OTP_MAX_ATTEMPTS=5
MAX_UPLOAD_SIZE_MB=10
```

Application defaults also include:

```text
API_VERSION
API_TITLE
APP_NAME
```

### Security

Never commit real credentials.

Keep these private:

```text
SECRET_KEY
DATABASE_PASSWORD
BREVO_API_KEY
```

Frontend variables beginning with `VITE_` are exposed to the browser and must not contain private secrets.

---

# 🔐 Authentication

BreatheCast supports email/password authentication and Google OAuth.

## Signup + OTP

```text
Signup
  │
  ▼
Validate signup
  │
  ▼
Pending signup created
  │
  ▼
6-digit OTP generated
  │
  ▼
OTP hashed and stored
  │
  ▼
Brevo sends OTP
  │
  ▼
User verifies OTP
  │
  ▼
Account created
  │
  ▼
Access + refresh cookies issued
```

### Authentication security

- Passwords are hashed with `pwdlib`
- OTPs are hashed before storage
- OTP expiration is configurable
- OTP attempts are limited to 5 by default
- Access tokens expire after 30 minutes by default
- Refresh tokens expire after 7 days by default
- Tokens use HTTP-only cookies
- Refresh tokens are persisted in the database
- Protected routes validate the access token
- User history is scoped to the authenticated user
- Production cookies use secure settings
- CORS is controlled through `ALLOWED_ORIGINS`

---

# 🔌 API

The API is versioned under:

```text
/api/v1
```

## Health

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Health check |

## Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/signup` | Start signup and send OTP |
| POST | `/api/v1/auth/verify-signup-otp` | Verify signup OTP |
| POST | `/api/v1/auth/google` | Google authentication |
| POST | `/api/v1/login` | Email/password login |
| POST | `/api/v1/refresh` | Refresh access token |
| POST | `/api/v1/logout` | Logout |

## User & Profile

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/me` | Get current user |
| DELETE | `/api/v1/me` | Delete account |
| GET | `/api/v1/profile` | Get profile summary |
| PATCH | `/api/v1/profile/name` | Update full name |
| PATCH | `/api/v1/profile/username` | Update username |
| POST | `/api/v1/password/set` | Set password |
| PATCH | `/api/v1/password/change` | Change password |

## Prediction & History

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/predict` | Make AQI prediction |
| GET | `/api/v1/metrics` | Return model metadata/metrics |
| GET | `/api/v1/history` | Retrieve prediction history |
| DELETE | `/api/v1/history` | Clear prediction history |
| GET | `/api/v1/history/download` | Download history |
| DELETE | `/api/v1/history/all` | Delete prediction and file history |

## Batch Files

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/fileupload` | Upload CSV and run batch prediction |
| GET | `/api/v1/filehistory` | Retrieve upload history |
| DELETE | `/api/v1/filehistory/{file_id}` | Delete an uploaded-file record |
| GET | `/api/v1/files/download` | Download file metadata |
| DELETE | `/api/v1/file-history` | Clear file history |

---

# 📡 Prediction Example

### Request

```http
POST /api/v1/predict
```

```json
{
  "Temperature_C": 28.4,
  "Humidity_pct": 56.0,
  "WindSpeed_kmh": 18.5,
  "WindDirection_deg": 120.0,
  "Pressure_hPa": 1012.3,
  "SolarRadiation_Wm2": 340.0,
  "Rainfall_mm": 0.2,
  "TrafficDensityIndex": 48.1,
  "ProximityIndustrialZone_km": 5.0,
  "DayOfWeek": "Monday",
  "Month": "June"
}
```

`IsWeekend` is derived by the backend.

### Response

```json
{
  "prediction": 126
}
```

The current backend returns the numerical prediction as a rounded value.

The current implementation does not map the result to categories such as `Good`, `Moderate`, or `Unhealthy`.

---

# 🗄️ Database

BreatheCast uses PostgreSQL with SQLAlchemy.

## Models

- `Authentication`
- `History`
- `UploadedFile`
- `RefreshToken`
- `EmailOTP`
- `PendingSignup`

## Tables

```text
accounts
aqi_history
refresh_tokens
uploaded_files
email_otps
pending_signups
```

Alembic manages schema migrations.

---

# 🐳 Docker

## Start

From `backend/`:

```bash
docker compose up --build
```

## Start in background

```bash
docker compose up --build -d
```

## Stop

```bash
docker compose down
```

## Logs

```bash
docker compose logs -f
```

## Backend logs

```bash
docker compose logs -f backend
```

## Migrations

```bash
docker compose exec backend alembic upgrade head
```

---

# 🧪 Testing

The repository currently does not contain a dedicated automated test suite.

No verified test suite currently covers:

- Authentication
- OTP verification
- Google OAuth
- Prediction
- Batch CSV prediction
- Database constraints
- CI validation

Adding automated tests is a planned improvement.

---

# 🚢 Deployment Status

The repository currently supports Docker-based local/containerized development.

A complete production deployment configuration is not included.

Before public deployment, review:

- production environment variables
- HTTPS
- PostgreSQL security and backups
- exact CORS origins
- secure cookies
- Google OAuth production settings
- Brevo credentials
- authentication rate limiting
- logging and monitoring
- automated tests
- CI/CD

---

# ⚠️ Current Limitations

The repository does not currently include:

- Automated ML training pipeline beyond the notebook
- Production deployment configuration
- Automated test suite
- CI/CD workflow
- AQI category mapping
- Real-time AQI sensor/feed integration
- Model explainability or feature-importance documentation

The README documents the Kaggle dataset source and download method, as well as the dataset's synthetic nature. The training notebook documents the preprocessing and model configuration used to create the current artifact.

---

# 🛣️ Roadmap

- [x] AQI prediction
- [x] XGBoost regression model
- [x] Email/password authentication
- [x] Email OTP verification
- [x] Google OAuth
- [x] Prediction history
- [x] Batch CSV prediction
- [x] PostgreSQL persistence
- [x] Docker support
- [x] Clean ML training notebook
- [ ] Add automated backend tests
- [ ] Add frontend tests
- [ ] Add GitHub Actions CI
- [x] Document dataset source and synthetic-data limitations
- [ ] Add model explainability
- [ ] Add AQI category mapping
- [ ] Add production deployment configuration
- [ ] Add real-time AQI data integration

---

# 📜 License

This project includes a `LICENSE` file.

See `LICENSE` for the applicable terms.

---

## 👨‍💻 BreatheCast

BreatheCast demonstrates how a machine learning regression model can be integrated into a complete web application using:

**XGBoost + Python + FastAPI + React + TypeScript + PostgreSQL + SQLAlchemy + JWT + Google OAuth + Email OTP + Docker**