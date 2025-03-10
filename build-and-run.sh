#!/bin/bash

# Build and run the Azul game in production mode

echo "Building and starting Azul game server..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build client and server
echo "Building client and server..."
npm run build:all

# Start the server
echo "Starting server on port 3000..."
npm run start:server

# Print access instructions
echo ""
echo "Server is running!"
echo "Access the game at: http://localhost:3000"
echo ""
echo "For other devices on your network, use:"
echo "http://$(hostname -I | awk '{print $1}'):3000" 