#!/bin/bash

# Find the process ID listening on port 3000
PID=$(lsof -t -i:3000)

if [ -z "$PID" ]; then
    echo "No server is currently running on port 3000. All quiet on the western front!"
else
    echo "Stopping the server on port 3000 (PID: $PID)..."
    kill -9 $PID
    echo "Server stopped. Have a nice day!"
fi
