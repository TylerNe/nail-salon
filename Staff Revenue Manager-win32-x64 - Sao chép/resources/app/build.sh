#!/bin/bash

echo "========================================"
echo "   Staff Revenue Manager - Build Script"
echo "========================================"
echo

echo "[1/4] Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

echo
echo "[2/4] Testing app..."
npm start &
APP_PID=$!
sleep 5
kill $APP_PID 2>/dev/null

echo
echo "[3/4] Building application..."
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Build failed"
    exit 1
fi

echo
echo "[4/4] Build completed successfully!"
echo
echo "Files created in dist/ folder:"
ls -la dist/
echo
echo "You can now distribute these files."
echo
