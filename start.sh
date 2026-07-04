#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Paths to frontend and backend
FRONTEND_DIR="$SCRIPT_DIR/umsy-frontend"
BACKEND_DIR="$SCRIPT_DIR/umsy-backend"

echo -e "${BLUE}Starting UMSY Servers...${NC}\n"

# Function to cleanup background processes on exit
cleanup() {
    echo -e "\n${RED}Shutting down servers...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit
}

# Trap SIGINT (Ctrl+C) and call cleanup
trap cleanup SIGINT SIGTERM

# Check if directories exist
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Error: Frontend directory not found at $FRONTEND_DIR${NC}"
    exit 1
fi

if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}Error: Backend directory not found at $BACKEND_DIR${NC}"
    exit 1
fi

# Start backend server
echo -e "${GREEN}Starting Backend Server...${NC}"
cd "$BACKEND_DIR" && npm run server &
BACKEND_PID=$!

# Start frontend server
echo -e "${GREEN}Starting Frontend Server...${NC}"
cd "$FRONTEND_DIR" && npm run dev &
FRONTEND_PID=$!

echo -e "\n${GREEN}✓ Both servers are running!${NC}"
echo -e "${BLUE}Frontend PID: $FRONTEND_PID${NC}"
echo -e "${BLUE}Backend PID: $BACKEND_PID${NC}"
echo -e "\n${BLUE}Press Ctrl+C to stop all servers${NC}\n"

# Wait for all background processes
wait
