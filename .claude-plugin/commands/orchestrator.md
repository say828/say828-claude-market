# /orchestrator

Open Claude Orchestrator - the multi-session management UI.

## Instructions

Execute this bash command to start the orchestrator:

```bash
if curl -s http://localhost:18700/api/stats &> /dev/null; then
  open "http://localhost:18700"
  echo "Orchestrator is already running. Opening browser..."
else
  claude-orchestrator &
  echo "Starting Claude Orchestrator..."
fi
```

This will:
1. Check if orchestrator server is already running
2. If running: just open the browser
3. If not running: start the server (which auto-opens browser)
