#!/bin/bash

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install it from https://nodejs.org/ first."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🛠️ Building the app..."
npm run build

echo "✅ Done! Run ./start.sh to begin."
