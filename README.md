# 🏢 Plateforme Intelligente de Gestion pour Cabinet d'Expertise Comptable

An intelligent web platform that centralizes client and project management for accounting firms, integrated with AI/ML capabilities for business plan generation, recommendations, and risk prediction.

## 📋 Table of Contents

- [About](#about)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [AI Features](#ai-features)
- [Git Workflow](#git-workflow)
- [Contributing](#contributing)

## About

This platform is designed for accounting firms (_Cabinets d'Expertise Comptable_) to:

- **Manage clients** — CRUD operations, risk levels, sector tracking
- **Manage projects** — Track audits, consulting, creation & development projects
- **Upload documents** — Centralized file management per client/project
- **Dashboard & KPIs** — Real-time statistics and charts
- **AI-powered tools** — Business plan generation (LLM), smart recommendations, and ML-based risk prediction

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Angular 17+, Angular Material, Chart.js |
| **Backend** | Node.js, Express.js, Sequelize ORM |
| **Database** | MySQL |
| **Authentication** | JWT (jsonwebtoken), bcrypt |
| **AI / LLM** | OpenAI API (GPT-4) / Google Gemini |
| **Machine Learning** | Python, Scikit-learn |
| **CI/CD** | GitHub Actions |

## Architecture

```
┌──────────────────────────────────────────────────┐
│              FRONTEND (Angular 17+)              │
│   Dashboard │ Clients │ Projects │ AI Tools      │
│                  Port: 4200                      │
└──────────────────────┬───────────────────────────┘
                       │ HTTP REST API
                       ▼
┌──────────────────────────────────────────────────┐
│            BACKEND (Node.js + Express)           │
│  /api/auth • /api/clients • /api/projects        │
│  /api/documents • /api/dashboard • /api/ai       │
│                  Port: 3000                      │
└──────┬───────────────┬───────────────┬───────────┘
       ▼               ▼               ▼
   MySQL DB       Local Files      OpenAI API
  (Port 3306)     (uploads/)       (External)
```

## Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Angular CLI** >= 17.x (`npm install -g @angular/cli`)
- **MySQL** >= 8.0
- **Python** >= 3.9 (for ML features)

### 1. Clone the repository

```bash
git clone <repository-url>
cd pfe
```

### 2. Database Setup

```bash
# Create the database
mysql -u root -p < database/schema.sql
```

### 3. Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your database credentials and API keys

# Start the server
npm run dev
```

The API will be available at `http://localhost:3000`

### 4. Frontend Setup

```bash
cd frontend
npm install

# Start the dev server
ng serve
```

The app will be available at `http://localhost:4200`

### 5. ML Setup (Optional)

```bash
cd ml
pip install -r requirements.txt
python train_risk_model.py
```

## Project Structure

```
pfe/
├── frontend/              # Angular 17+ application
│   └── src/app/
│       ├── core/          # Guards, interceptors, auth service
│       ├── shared/        # Shared components, pipes
│       └── features/      # Feature modules
│           ├── auth/      # Login & register
│           ├── dashboard/ # Dashboard with charts
│           ├── clients/   # Client management
│           ├── projects/  # Project management
│           └── ai-tools/  # AI features UI
│
├── backend/               # Node.js + Express API
│   └── src/
│       ├── config/        # Database config
│       ├── middleware/     # Auth & error middleware
│       ├── models/        # Sequelize models
│       ├── routes/        # API routes
│       ├── controllers/   # Route handlers
│       └── services/      # Business logic & AI service
│
├── ml/                    # Python ML scripts
│   ├── models/            # Trained model files
│   ├── train_risk_model.py
│   └── predict.py
│
├── database/              # SQL schema
│   └── schema.sql
│
└── .github/workflows/     # CI pipeline
    └── ci.yml
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login & get JWT token |
| GET | `/api/auth/me` | Get current user profile |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get user by ID |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Clients
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clients` | List all clients |
| GET | `/api/clients/:id` | Get client by ID |
| POST | `/api/clients` | Create a client |
| PUT | `/api/clients/:id` | Update client |
| DELETE | `/api/clients/:id` | Delete client |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| GET | `/api/projects/:id` | Get project by ID |
| POST | `/api/projects` | Create a project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/upload` | Upload a document |
| GET | `/api/documents/:id/download` | Download a document |
| DELETE | `/api/documents/:id` | Delete a document |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Get dashboard statistics |

### AI Features
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/generate-business-plan` | Generate a business plan |
| POST | `/api/ai/recommendations` | Get AI recommendations |
| POST | `/api/ai/predict-risk` | Predict project risk (ML) |

## AI Features

### 1. Business Plan Generation (LLM)
Uses OpenAI GPT-4 to generate structured business plans based on client and project data.

### 2. Smart Recommendations
AI-powered suggestions for project management and client strategy.

### 3. Risk Prediction (ML)
Scikit-learn model that predicts project risk levels based on financial and sector data.

## Git Workflow

We follow a **feature-branch workflow**:

```
main (production-ready)
 └── develop (integration branch)
      ├── feature/auth-module
      ├── feature/client-management
      ├── feature/dashboard
      └── feature/ai-integration
```

### Branch Naming Convention

- `feature/<feature-name>` — New features
- `fix/<bug-description>` — Bug fixes
- `refactor/<description>` — Code refactoring

### Workflow Steps

1. **Always branch from `develop`**:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/my-feature
   ```

2. **Commit often** with clear messages:
   ```bash
   git commit -m "feat(clients): add client creation form"
   git commit -m "fix(auth): resolve token expiration issue"
   ```

3. **Push and create a Pull Request** to `develop`:
   ```bash
   git push origin feature/my-feature
   ```
   Then open a PR on GitHub targeting `develop`.

4. **Code review**: The supervisor reviews and approves the PR before merging.

5. **Never push directly to `main` or `develop`**.

## Contributing

1. Fork / clone the repository
2. Create your feature branch from `develop`
3. Commit your changes with descriptive messages
4. Push to the branch
5. Open a Pull Request targeting `develop`
6. Wait for code review and approval

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=plateforme_comptable
DB_USER=root
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

## License

This project is developed as part of a Bachelor's CS internship (PFE).
