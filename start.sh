#!/bin/bash
# ── Chronoscopes start script ─────────────────────────────────────────────────
# Starts both the backend (Hono) and frontend (Vite) dev servers concurrently.
# Requires: Node.js 18+, npm

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "═══════════════════════════════════════"
echo "  The Chronoscopes — Starting Servers"
echo "═══════════════════════════════════════"

# ── Kill any leftover processes on our ports ──────────────────────────────────
for PORT in 8000 5173 5174 5175 5176; do
  PIDS=$(lsof -ti tcp:$PORT 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "⚠  Killing stale process(es) on :$PORT — PIDs: $PIDS"
    echo "$PIDS" | xargs kill -9 2>/dev/null || true
  fi
done

# ── Backend ──────────────────────────────────────────────────────────────────
BACKEND="$ROOT/backend"
if [ ! -f "$BACKEND/.env" ]; then
  echo "⚠  No .env found in backend/ — copying from .env.example"
  cp "$BACKEND/.env.example" "$BACKEND/.env"
  echo "⚠  Please edit backend/.env and add your API keys before continuing."
fi

echo ""
echo "▶  Starting backend on :8000 …"
cd "$BACKEND"
npm install --silent 2>/dev/null || true
npm run dev &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 3

# ── Frontend ─────────────────────────────────────────────────────────────────
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
  # Also kill any children spawned by npm run dev
  pkill -P $BACKEND_PID 2>/dev/null || true
  pkill -P $FRONTEND_PID 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

wait
