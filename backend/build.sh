#!/bin/bash
# Build script for Render deployment

echo "Starting build process..."

# Upgrade pip
pip install --upgrade pip

# Install requirements
pip install -r requirements.txt

echo "Build completed successfully!"
