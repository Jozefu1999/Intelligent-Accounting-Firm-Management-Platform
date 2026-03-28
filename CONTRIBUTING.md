# Contributing Guide & Feature Development Rules

This document defines the rules and conventions every contributor must follow when working on this project.

---

## Git Workflow

### Branch Strategy

```
main          ← Production-ready, protected (requires PR + review)
└── develop   ← Integration branch, protected (requires PR + review)
     ├── feature/xxx
     ├── fix/xxx
     └── refactor/xxx
```

### Rules

1. **Never push directly to `main` or `develop`**
2. **Always create a feature branch from `develop`**
3. **One feature = one branch = one PR**
4. **Keep PRs small and focused** — avoid mixing unrelated changes
5. **Delete the branch after merge**

### Branch Naming

| Type | Format | Example |
|------|--------|---------|
| Feature | `feature/<module>-<description>` | `feature/client-create-form` |
| Bug fix | `fix/<module>-<description>` | `fix/auth-token-expiry` |
| Refactor | `refactor/<description>` | `refactor/clean-dashboard-service` |

### Commit Messages

Follow the **Conventional Commits** format:

```
<type>(<scope>): <short description>

[optional body]
```

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code restructuring (no behavior change) |
| `style` | CSS/UI changes (no logic change) |
| `docs` | Documentation changes |
| `chore` | Config, dependencies, tooling |
| `test` | Adding or updating tests |

**Examples:**
```
feat(clients): add client creation form with validation
fix(auth): handle expired JWT token redirect
style(dashboard): improve card spacing with Tailwind
chore(deps): update Angular Material to v21.3
```

---

## Project Structure Rules

### Backend (`backend/`)

When adding a new feature/module:

1. **Create the Sequelize model** in `backend/src/models/`
   - File name: `PascalCase.js` (e.g., `Invoice.js`)
   - Register it in `backend/src/models/index.js` with associations

2. **Create the controller** in `backend/src/controllers/`
   - File name: `<module>.controller.js` (e.g., `invoices.controller.js`)
   - Always use `try/catch` with `next(error)` for error handling
   - Never send raw error details in production responses

3. **Create the route** in `backend/src/routes/`
   - File name: `<module>.routes.js` (e.g., `invoices.routes.js`)
   - Apply `authMiddleware` to protected routes
   - Use `authorize('admin', 'expert')` for role-based access

4. **Register the route** in `backend/src/app.js`:
   ```javascript
   const invoicesRoutes = require('./routes/invoices.routes');
   app.use('/api/invoices', invoicesRoutes);
   ```

5. **Run lint before committing:**
   ```bash
   cd backend && npm run lint
   ```

### Frontend (`frontend/`)

When adding a new feature/module:

1. **Generate components using Angular CLI:**
   ```bash
   ng generate component features/<module>/<component-name> --skip-tests
   ```

2. **Follow the folder structure:**
   ```
   features/
   └── <module>/
       ├── <module>-list/       # List view
       ├── <module>-form/       # Create/Edit form
       └── <module>-detail/     # Detail view
   ```

3. **Add routes** in `frontend/src/app/app.routes.ts`:
   - Use lazy loading with `loadComponent`
   - Protect routes with `canActivate: [authGuard]`

4. **Create a service** for API calls:
   ```bash
   ng generate service core/services/<module> --skip-tests
   ```
   - Place in `core/services/`
   - Use `HttpClient` with typed responses
   - Use `environment.apiUrl` for the base URL

5. **Add interfaces** in `core/models/index.ts`

6. **Styling rules:**
   - Use **Tailwind CSS** utility classes for layouts and styling
   - Use **Angular Material** components for form inputs, buttons, icons, dialogs
   - Keep component `.scss` files minimal — prefer Tailwind in templates
   - Follow the existing card/table patterns from dashboard and client-list

7. **Build before committing:**
   ```bash
   cd frontend && npx ng build
   ```

---

## Coding Standards

### Backend (Node.js)

- Use `const` and `let`, never `var`
- Use `async/await` for async operations
- Always handle errors with `try/catch` and pass to `next(error)`
- Use Sequelize model methods, never raw SQL
- Validate input at the route level
- Never expose `password_hash` in API responses
- Keep controllers thin — put complex logic in services

### Frontend (Angular)

- Use **standalone components** (no NgModules)
- Use **lazy loading** for feature routes
- Use `OnInit` for data fetching, not constructors
- Use Angular's `FormsModule` or `ReactiveFormsModule` for forms
- Subscribe to observables in components, unsubscribe on destroy
- Use the `async` pipe in templates when possible
- Follow Angular naming conventions (kebab-case files, PascalCase classes)

---

## Checklist Before Creating a PR

- [ ] Branch created from latest `develop`
- [ ] Code follows the project structure rules above
- [ ] Backend: `npm run lint` passes with no errors
- [ ] Frontend: `npx ng build` passes with no errors
- [ ] Commit messages follow conventional commits format
- [ ] No `console.log` left in code (use proper error handling)
- [ ] No hardcoded values (use environment variables)
- [ ] `.env` file is NOT committed (use `.env.example` for reference)
- [ ] PR targets `develop` branch (not `main`)
- [ ] PR description explains what was done and why

---

## Environment Setup

### Database (MySQL)

- Host: `localhost`
- Port: `3306`
- User: `root`
- Password: _(empty)_
- Database: `plateforme_comptable`

Create the database:
```bash
mysql -u root < database/schema.sql
```

### Backend

```bash
cd backend
cp .env.example .env   # then edit if needed
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
ng serve
```

### Pre-commit Hooks

Husky runs automatically on `git commit`. It will:
1. Lint the backend (`eslint src/`)
2. Build the frontend (`ng build`)

If either fails, the commit is blocked. Fix the errors before committing.

To install hooks after cloning:
```bash
npm install   # at project root — this runs `husky` via prepare script
```

---

## Technology Stack Reference

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend Framework | Angular 21 | SPA framework |
| UI Components | Angular Material | Form controls, buttons, icons |
| Styling | Tailwind CSS | Utility-first CSS |
| Charts | Chart.js + ng2-charts | Dashboard visualizations |
| Backend | Node.js + Express | REST API |
| ORM | Sequelize | Database abstraction |
| Database | MySQL | Relational data storage |
| Auth | JWT + bcrypt | Token-based authentication |
| AI (later) | OpenAI API | Business plan generation |
| ML (later) | Python + Scikit-learn | Risk prediction |
| CI | GitHub Actions | Automated lint, test, build |
| Hooks | Husky | Pre-commit quality checks |
