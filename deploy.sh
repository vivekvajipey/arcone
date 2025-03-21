#!/bin/bash

# Build the project
echo "Building the project..."
npm run build

# Navigate to the build output directory
cd dist

# Create a .nojekyll file to bypass Jekyll processing
touch .nojekyll

# Commit and push to GitHub Pages branch
git init
git checkout -b gh-pages
git add .
git commit -m "Deploy to GitHub Pages"
git push --force git@github.com:vivekvajipey/arcone.git gh-pages

# Go back to the project root
cd ..

echo "Deployed to GitHub Pages!" 