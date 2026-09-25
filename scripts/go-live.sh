#!/bin/sh
# Put Genie's web app online, backed by the pipeline server on this Mac.
#
#   ./scripts/go-live.sh
#
# 1. starts the pipeline server (if it isn't already running),
# 2. opens a free Cloudflare quick tunnel to it (new address each time),
# 3. points the Vercel project at that address with the web token, and
# 4. redeploys the site so the new address is built in.
#
# Keep this terminal open during the demo: closing it closes the tunnel.
# Needs: cloudflared (~/.local/bin), the Vercel CLI (logged in and linked),
# and WEB_PIPELINE_TOKEN in .env. Web questions are capped per day by
# MAX_QUESTIONS_PER_DAY in .env.
set -e
cd "$(dirname "$0")/.."
CLOUDFLARED="${CLOUDFLARED:-$HOME/.local/bin/cloudflared}"
LOG_DIR=server/data
mkdir -p "$LOG_DIR"

WEB_TOKEN=$(grep '^WEB_PIPELINE_TOKEN=' .env | cut -d= -f2-)
[ -n "$WEB_TOKEN" ] || { echo "Add WEB_PIPELINE_TOKEN to .env first."; exit 1; }

# 1. Server
if curl -s -m 3 http://localhost:8787/health | grep -q ok; then
  echo "✓ Pipeline server already running"
else
  echo "… Starting the pipeline server"
  nohup node server/index.mjs > "$LOG_DIR/server.log" 2>&1 &
  until curl -s -m 3 http://localhost:8787/health | grep -q ok; do sleep 1; done
  echo "✓ Pipeline server running (log: $LOG_DIR/server.log)"
fi

# 2. Tunnel
TUNNEL_LOG="$LOG_DIR/tunnel.log"
: > "$TUNNEL_LOG"
"$CLOUDFLARED" tunnel --no-autoupdate --url http://localhost:8787 > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!
trap 'kill $TUNNEL_PID 2>/dev/null' EXIT INT TERM
until URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" | head -1) && [ -n "$URL" ]; do sleep 1; done
until curl -s -m 5 "$URL/health" | grep -q ok; do sleep 2; done
echo "✓ Tunnel open: $URL"

# 3. Vercel settings
for TARGET in production preview; do
  vercel env rm EXPO_PUBLIC_PIPELINE_URL "$TARGET" -y > /dev/null 2>&1 || true
  vercel env rm EXPO_PUBLIC_PIPELINE_TOKEN "$TARGET" -y > /dev/null 2>&1 || true
  printf '%s' "$URL" | vercel env add EXPO_PUBLIC_PIPELINE_URL "$TARGET" > /dev/null
  printf '%s' "$WEB_TOKEN" | vercel env add EXPO_PUBLIC_PIPELINE_TOKEN "$TARGET" > /dev/null
done
echo "✓ Vercel now points at the tunnel"

# 4. Redeploy the current production build with the new settings
LATEST=$(vercel ls --prod 2>/dev/null | grep -oE 'https://[a-z0-9-]+\.vercel\.app' | head -1)
vercel redeploy "$LATEST" --target production > /dev/null
echo "✓ Site redeployed — live in about a minute"
echo
echo "Genie is online. Keep this window open; press Ctrl+C to take it offline."
wait $TUNNEL_PID
