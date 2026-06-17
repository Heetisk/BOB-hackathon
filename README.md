# TrustPulse — Identity Trust Engine

A continuous, risk-based identity trust engine for digital banking, built for the Bank of Baroda Hackathon.

## Overview

TrustPulse monitors user sessions in real-time, calculating dynamic trust scores using a dual-model ML pipeline (Isolation Forest + RandomForest + XGBoost) with SHAP-based explainability. The system detects fraud patterns like credential stuffing, account takeover, and mule accounts, triggering step-up verification when risk exceeds thresholds.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   React Frontend                        │
│  Dashboard │ Simulator │ Explainability │ Step-Up       │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
┌──────────────────────┴──────────────────────────────────┐
│                  FastAPI Backend                         │
│  /api/sessions  /api/score  /api/sessions/{id}/action   │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────┐
│                    ML Engine                             │
│  Isolation Forest  │  RandomForest  │  XGBoost  │ SHAP  │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────┐
│              SQLite / SQLAlchemy                         │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, Lucide Icons |
| Backend | Python 3.12, FastAPI, Uvicorn |
| ML | scikit-learn, XGBoost, SHAP, pandas, numpy |
| Database | SQLite (SQLAlchemy ORM) |
| Design | Dark OLED glassmorphism theme |

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend
pip install -r requirements.txt
python run.py
```

Server starts at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App starts at `http://localhost:5173`. Vite proxies `/api` requests to the backend.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sessions` | List all active sessions |
| `GET` | `/api/sessions/{id}` | Session detail with events and score history |
| `POST` | `/api/sessions/{id}/action` | Inject an event into a session |
| `POST` | `/api/sessions/{id}/resolve` | Resolve step-up or block session |
| `POST` | `/api/score` | Score raw telemetry events |
| `GET` | `/api/metrics` | Aggregate dashboard metrics |

## Persona Types

| Persona | Behavior | Risk Profile |
|---------|----------|-------------|
| Typical Customer | Normal login, standard transactions | Low |
| Credential Stuffer | Multiple failed logins, unknown device | High |
| Account Takeover | New device, phone change, high-risk beneficiary, large transfer | Critical |
| Mule Account | Rapid deposits followed by immediate outflows | High |

## Trust Score Logic

- **Score Range**: 0–100
- **Safe**: > 50 → Access allowed
- **Step-Up Required**: 20–50 → OTP/biometric verification triggered
- **Blocked**: ≤ 20 → Session frozen, analyst alerted

## Frontend Features

- **Metrics Bar**: Active sessions, flagged count, blocked count, average trust score
- **Session List**: Live-updating with trust bars, persona badges, glow effects on blocked sessions
- **Simulator**: Preset persona scenarios + manual action injection
- **Explainability View**: SHAP feature contribution bar charts, score timeline, model probability comparison
- **Step-Up Challenge**: OTP verification popup with verify/block actions

## Project Structure

```
TrustPulse/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py          # Environment settings
│   │   ├── database.py        # SQLAlchemy setup
│   │   ├── engine.py          # ML scoring engine
│   │   ├── generator.py       # Synthetic data generator
│   │   ├── main.py            # FastAPI routes
│   │   ├── models.py          # Database models
│   │   └── schemas.py         # Pydantic schemas
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ExplainabilityView.jsx
│   │   │   ├── SessionList.jsx
│   │   │   ├── Simulator.jsx
│   │   │   └── StepUpChallenge.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── .gitignore
└── README.md
```

## License

Built for Bank of Baroda Hackathon.
