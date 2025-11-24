# Instructions to Push Files to GitHub

## Quick Method (Recommended)

Run the automated script:

```bash
cd /h/u5/c3/07/asnounsa/newasnounsa/csc309/T11
./push_to_github.sh
```

---

## Manual Method

If you prefer to run commands manually, execute these in order:

```bash
cd /h/u5/c3/07/asnounsa/newasnounsa/csc309/T11

# 1. Initialize git (if not already done)
git init

# 2. Add remote repository
git remote add origin https://github.com/samyasnoun/CSC309-T11.git

# If you get "remote origin already exists" error, run this first:
# git remote remove origin
# git remote add origin https://github.com/samyasnoun/CSC309-T11.git

# 3. Add all files (node_modules, logs, dist will be excluded by .gitignore)
git add .

# 4. Check what will be committed
git status

# 5. Commit the files
git commit -m "Implement Task 1 (CORS) and Task 2 (Frontend Authentication)"

# 6. Set branch to main
git branch -M main

# 7. Push to GitHub
git push -u origin main
```

---

## Files That Will Be Pushed

### ✅ Included Files:

**Backend:**
- `backend/index.js` - CORS configuration (Task 1)
- `backend/server.js` - Server entry point
- `backend/routes.js` - API routes
- `backend/controllers/user.js` - User controllers
- `backend/middleware/auth.js` - Authentication middleware
- `backend/services/user.js` - User services
- `backend/package.json` - Dependencies

**Frontend:**
- `frontend/index.html` - HTML template
- `frontend/vite.config.js` - Vite configuration
- `frontend/package.json` - Dependencies
- `frontend/public/vite.svg` - Favicon
- `frontend/src/App.jsx` - Main app component
- `frontend/src/main.jsx` - Entry point
- `frontend/src/index.css` - Global styles
- `frontend/src/contexts/AuthContext.jsx` - Authentication context (Task 2)
- `frontend/src/components/Layout.jsx` - Layout component
- `frontend/src/components/Layout.css` - Layout styles
- `frontend/src/pages/Home.jsx` - Home page
- `frontend/src/pages/Login.jsx` - Login page
- `frontend/src/pages/Register.jsx` - Register page
- `frontend/src/pages/Success.jsx` - Success page
- `frontend/src/pages/Profile.jsx` - Profile page
- `frontend/src/pages/form.css` - Form styles
- `frontend/src/pages/main.css` - Page styles
- `frontend/README.md` - Frontend README

**Root:**
- `Makefile` - Build commands
- `WEBSITE` - Deployment URL file (empty, to be filled later)
- `package.json` - Root package file
- `user.js` - User model/utility
- `.gitignore` - Git ignore rules

### ❌ Excluded Files (by .gitignore):

- `node_modules/` - Dependencies (will be installed via npm install)
- `package-lock.json` - Lock files
- `*.log` - Log files (backend.log, backend_debug.log)
- `.env` - Environment variables
- `dist/` - Build output directories

---

## Key Implementation Files

### Task 1: CORS Configuration
**File:** `backend/index.js`
- Lines 9-14 contain the CORS configuration
- Uses environment variable `FRONTEND_URL`
- Defaults to `http://localhost:5173`

### Task 2: Frontend Authentication
**File:** `frontend/src/contexts/AuthContext.jsx`
- Complete authentication implementation
- `useEffect` hook for token persistence
- `login()` function with token storage
- `register()` function
- `logout()` function

---

## Troubleshooting

### Error: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/samyasnoun/CSC309-T11.git
```

### Error: "nothing to commit"
Make sure you're in the correct directory:
```bash
pwd
# Should show: /h/u5/c3/07/asnounsa/newasnounsa/csc309/T11
```

### Error: Authentication failed
If you have 2FA enabled on GitHub:
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate a new token with `repo` scope
3. Use the token as your password when prompted

### Error: "! [rejected] main -> main"
If the remote has different commits:
```bash
git push -u origin main --force
```
⚠️ **Warning:** This will overwrite the remote repository. Only use if you're sure.

---

## Verification

After pushing, verify on GitHub:
1. Go to: https://github.com/samyasnoun/CSC309-T11
2. Check that you see:
   - ✅ `backend/` directory with source files
   - ✅ `frontend/` directory with source files
   - ✅ `Makefile`
   - ✅ `WEBSITE`
   - ✅ `.gitignore`
3. Verify NO `node_modules/` directories
4. Verify NO log files
5. Verify NO `dist/` directories

---

## After Pushing

Once files are pushed, you can:
1. Clone the repository on another machine
2. Run `npm install` in both `backend/` and `frontend/` directories
3. Start the servers as usual

---

## Need Help?

If commands aren't working:
1. Check you're in the correct directory
2. Verify git is installed: `git --version`
3. Check git status: `git status`
4. View git log: `git log --oneline`
5. Check remote: `git remote -v`

