# Incident Response & Blameless Post-Mortems

## Core Philosophy

At Hearthstone, we believe that **systems fail, people don't**. When a production incident occurs, our goal is to understand _why_ the system allowed the failure to happen, not _who_ caused it.

We explicitly practice **Blameless Post-Mortems**. This means:

- We assume everyone involved was acting with good intentions, based on the information they had at the time.
- We focus on improving tooling, observability, and architecture, rather than punishing individuals.
- We view every incident as an unplanned investment in the system's resilience.

## Post-Mortem Template

Following any Sev-1 or Sev-2 incident, the Incident Commander should schedule a review meeting and fill out this document.

### 1. Summary

- **Date:**
- **Authors:**
- **Status:** (Draft / Under Review / Complete)
- **Impact:** (How many users were affected? What was the exact user experience during the failure?)

### 2. Timeline

_(Provide a detailed, chronological timeline of events leading up to, during, and after the incident. Include timezone.)_

- 10:00 UTC - Alert triggered for elevated 5xx errors.
- 10:05 UTC - Engineer A begins investigating database latency.
- ...

### 3. Root Cause Analysis (The 5 Whys)

_(Ask "Why?" recursively until you hit a fundamental system flaw, not a human error.)_

1.  **Why did the database latency spike?** Because connection pooling was exhausted.
2.  **Why was connection pooling exhausted?** Because a specific background job spawned too many concurrent connections.
3.  **Why did the job spawn too many connections?** Because it lacked a concurrency limit parameter.
4.  **Why was the parameter missing?** Because our deployment linter doesn't check for required job parameters.
5.  **Why doesn't the linter check for it?** Because we haven't built an AST parser for our queue definitions yet.

### 4. Action Items (Remediation)

_(These must be converted to GitHub Issues and prioritized in the next sprint.)_

| Task                                            | Owner     | Priority | Issue Link |
| :---------------------------------------------- | :-------- | :------- | :--------- |
| e.g., Implement strict queue concurrency limits | @username | High     | #123       |
| e.g., Add alerting for pool exhaustion          | @username | Medium   | #124       |

## "Chesterton's Fence" Reminder

Never remove an existing safety mechanism or process check "because it slows us down" without first understanding _why_ it was put there. Often, these checks are the result of previous post-mortems.
