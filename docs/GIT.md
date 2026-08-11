# Git setup (P0-01)

Goal: repo is pushable, secrets stay out of git, `main` is protected.

## 1) Initialize (once)

From the repo root:

```powershell
git init
git add .
git status   # confirm .env / .env.local are NOT listed
git commit -m "Initial commit: Dink MVP skeleton + Phase 0 foundation"
```

## 2) Secrets must never be committed

Already ignored via `.gitignore`:

- `.env`
- `.env.local`
- `.env.*.local`
- `.run/`
- `apps/api/.meteor/local`
- `apps/web/.next`

Before every push:

```powershell
git status
git check-ignore -v .env .env.local apps/web/.env.local
```

If a secret was ever committed, rotate it and purge history before sharing the remote.

## 3) Create remote + push

GitHub example:

```powershell
gh repo create dink --private --source=. --remote=origin --push
```

Or manually:

```powershell
git remote add origin git@github.com:YOUR_ORG/dink.git
git branch -M main
git push -u origin main
```

## 4) Protect `main`

In GitHub → **Settings → Branches → Add branch protection rule** for `main`:

- Require a pull request before merging
- Require status checks to pass: **Web lint + build**, **API smoke (seed policy + files)**
- Restrict force pushes
- Restrict deletions

Optional but recommended:

- Require linear history
- Require conversation resolution

## 5) Day-to-day

```powershell
git checkout -b feat/short-name
# ... work ...
git push -u origin HEAD
gh pr create
```

CI is defined in `.github/workflows/ci.yml` (P0-08).
