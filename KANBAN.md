# Kanban Management Protocol (Vibe-Kanban)

This document defines the mandatory workflow for managing the Household Project board. All AI agents MUST adhere to these procedures to ensure consistency, prevent concurrency issues, and handle model limitations gracefully.

## 1. Board Information
- **URL:** `http://10.10.2.0:8089`
- **Project ID:** `d691614b-4566-41d1-8ba9-c6636354a120`

## 2. Technical Stack
Board management is handled via dedicated Node.js scripts in `scripts/kanban/`:
- `kanban_api.js`: Shared Axios client for the Vibe-Kanban API.
- `list.js`: CLI tool to view all tasks.
- `move.js`: CLI tool to transition task status.
- `supervisor.js`: Automated execution engine with retry/fallback logic.
- `monitor.js`: Automation script that maintains target concurrency.

## 3. Automation (PM2)
The board state is automatically managed by a PM2 process:
- **Process Name:** `kanban-monitor`
- **Config:** `kanban-monitor.config.js`
- **Function:** Ensures exactly 2 tasks are in the `inprogress` column by pulling from `todo`.

To view monitor logs:
```bash
pm2 logs kanban-monitor
```

### Step 1: Task Selection
Before starting any work, check the board:
```bash
node scripts/kanban/list.js
```
Identify a task in the `todo` column.

### Step 2: Task Initialization
Create a feature branch and move the task to `inprogress`:
```bash
./scripts/ops/start_task.sh [task-id]
node scripts/kanban/move.js [task-id] inprogress
```

### Step 3: Execution (The Supervisor)
Always run high-risk or complex AI commands through the `supervisor.js` to handle transient failures.
```bash
node scripts/kanban/supervisor.js --taskId [task-id] --cmd "[agent_command]"
```

### Step 4: Verification & Finish
1. Run smoke tests: `cd web && npx playwright test tests/smoke.spec.js`.
2. Merge and deploy: `./scripts/ops/finish_task.sh feature/[task-id] "Description"`
3. Move task to `done`:
```bash
node scripts/kanban/move.js [task-id] done
```

## 4. Supervisor Error Handling Logic (MANDATORY)

The `supervisor.js` script implements the following logic, which agents must be aware of:

| Error Type | Action | Fallback Model |
| :--- | :--- | :--- |
| **Token Exhaustion / Quota (429)** | Retry with Flash | `gemini-3-flash-preview` |
| **Invalid Argument (400)** | **Duplicate Task** & Restart | `gemini-3-pro-preview` |
| **Generic Failure** | Retry up to 5 times | Current Model |
| **Max Retries Reached** | Move to `cancelled` | N/A |

### Why Duplicate on 400?
400 errors often indicate a corrupted or oversized context window. By duplicating the task and starting fresh, we clear the execution history and provide a clean slate for the model to work from.

## 5. Maintenance
If the board URL or Project ID changes, this file MUST be updated immediately.
