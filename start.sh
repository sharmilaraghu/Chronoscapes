#!/bin/bash
# ── Chronoscapes start script ─────────────────────────────────────────────────
# Starts the Python FastAPI backend and React frontend dev servers concurrently.

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "═══════════════════════════════════════"
echo "  Chronoscapes — Starting Servers"
echo "═══════════════════════════════════════"

# ── Kill any leftover processes on our ports ──────────────────────────────────
for PORT in 8000 5173 5174 5175 5176; do
  PIDS=$(lsof -ti tcp:$PORT 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "⚠  Killing stale process(es) on :$PORT — PIDs: $PIDS"
    echo "$PIDS" | xargs kill -9 2>/dev/null || true
  fi
done

# ── Backend (Python FastAPI) ──────────────────────────────────────────────────
BACKEND="$ROOT/backend_py"
if [ ! -f "$BACKEND/.env" ]; then
  echo "⚠  No .env found in backend_py/ — copying from .env.example"
  cp "$BACKEND/.env.example" "$BACKEND/.env"
  echo "⚠  Please edit backend_py/.env and add your API keys before continuing."
fi

echo ""
echo "▶  Starting Python backend on :8000 …"
cd "$BACKEND"
pip3 install --quiet -r requirements.txt 2>/dev/null || true
python3 -m uvicorn app.main:app --port 8000 &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 3

# ── Frontend (React/Vite) ────────────────────────────────────────────────────
FRONTEND="$ROOT/frontend"
echo ""
echo "▶  Starting frontend on :5173 …"
cd "$FRONTEND"
npm install --silent 2>/dev/null || true
npm run dev &
FRONTEND_PID=$!

echo ""
echo "═══════════════════════════════════════"
echo "  Backend:   http://localhost:8000"
echo "  Frontend:  http://localhost:5173"
echo "═══════════════════════════════════════"
echo ""
echo "Press Ctrl+C to stop both servers."

# ── Trap: kill process groups on exit ────────────────────────────────────────
cleanup() {
  echo ""
  echo "Stopping servers…"
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  pkill -P $BACKEND_PID 2>/dev/null || true
  pkill -P $FRONTEND_PID 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

wait