# Kanban Management Scripts

These scripts allow managing the Vibe Kanban board from the CLI and provide a supervisor for AI task execution.

## Commands

### List Tasks
Shows the current state of the board.
```bash
node scripts/kanban/list.js
```

### Move Task
Manually change a task status.
```bash
node scripts/kanban/move.js <task-id> <status>
# Statuses: todo, inprogress, inreview, done, cancelled
```

### Supervisor (AI Task Execution)
Runs a command with automatic retry and error handling logic.
```bash
node scripts/kanban/supervisor.js --taskId <ID> --cmd "<agent_command>"
```

#### Supervisor Logic:
1. **Model Fallback:** If `gemini-1.5-pro` hits a quota/token limit, it switches to `gemini-1.5-flash`.
2. **400 Error Handling:** If a "400 Invalid Argument" occurs, it cancels the current task, creates a duplicate, and starts fresh.
3. **Retry Policy:** Retries up to 5 times for generic failures before moving the task to `cancelled`.
