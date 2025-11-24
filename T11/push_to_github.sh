#!/bin/bash

# Script to push T11 files to GitHub
# Run this script from the T11 directory

echo "=========================================="
echo "Pushing T11 Files to GitHub"
echo "=========================================="
echo ""

# Navigate to script directory
cd "$(dirname "$0")"

# Check if .gitignore exists
if [ ! -f ".gitignore" ]; then
    echo "Creating .gitignore..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
package-lock.json

# Logs
*.log

# Environment variables
.env

# Build outputs
dist/

# OS files
.DS_Store
EOF
fi

# Initialize git if needed
if [ ! -d ".git" ]; then
    echo "Initializing git repository..."
    git init
fi

# Add remote (remove if exists first to avoid errors)
echo "Setting up remote..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/samyasnoun/CSC309-T11.git

# Add all files
echo "Adding files..."
git add .

# Show what will be committed
echo ""
echo "Files to be committed:"
git status --short

# Commit
echo ""
echo "Committing files..."
git commit -m "Implement Task 1 (CORS) and Task 2 (Frontend Authentication)"

# Set branch to main
echo "Setting branch to main..."
git branch -M main

# Push to GitHub
echo ""
echo "Pushing to GitHub..."
echo "You may be prompted for GitHub credentials..."
git push -u origin main

echo ""
echo "=========================================="
echo "Done! Check: https://github.com/samyasnoun/CSC309-T11"
echo "=========================================="

