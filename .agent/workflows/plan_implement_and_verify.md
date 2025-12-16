---
description: End-to-end workflow for complex user requests (Plan -> Implement -> Verify)
---

# Plan, Implement, and Verify Workflow

Use this master workflow for complex coding tasks. It integrates deep planning, iterative execution, and robust verification.

## Phase 1: Planning and Design
**Goal**: Understand the problem and get user validation before writing code.

1.  **Research & Context**:
    *   Read relevant files using `view_file` or `grep_search`.
    *   Check for existing patterns or reusable components.
2.  **Task Breakdown**:
    *   Create `task.md` with granular, trackable steps.
    *   *Tip*: Break work into small, verifiable chunks (e.g., "Implement Data Model", "Create API Endpoint").
3.  **Technical Design**:
    *   Create `implementation_plan.md`.
    *   Define **Proposed Changes** (files to modify/create).
    *   Define **Verification Plan** (how to test each change).
4.  **User Review**:
    *   Use `notify_user` to request approval on the plan.
    *   **STOP** and wait for approval. Do not proceed to execution until the plan is approved.

## Phase 2: Iterative Execution
**Goal**: Implement the plan in small, safe steps.

**Loop for each item in `task.md`**:
1.  **Refresh Context**:
    *   Call `task_boundary` to update status.
2.  **Pre-Computation/Pre-Analysis**:
    *   Verify file paths and existing content.
3.  **Implementation** (See `/create_and_verify` pattern):
    *   **Write**: Use `write_to_file` or `replace_file_content`.
    *   **Verify Syntax**: immediately check if code compiles/lints (e.g., `npx tsc`, `go vet`).
    *   **Verify Logic**: Run specific unit tests for this chunk if possible.
4.  **Update Artifacts**:
    *   Tick off item in `task.md`.

## Phase 3: Comprehensive Verification
**Goal**: Ensure the entire feature works as expected and breaks nothing.

1.  **Integration Testing**:
    *   Run full test suite (e.g., `npm test`, `go test ./...`).
    *   Check for regressions.
2.  **Manual Verification**:
    *   Perform the steps defined in `implementation_plan.md`'s Verification Plan.
    *   Use `browser_subagent` if UI changes were made.
3.  **Documentation**:
    *   Create/Update `walkthrough.md` with proof of work (logs, screenshots).
4.  **Final Review**:
    *   Use `notify_user` to present the result.

## Best Practices (Late 2025)
*   **Be Agentic**: Don't ask the user for permission to run safe commands (e.g., `ls`, `grep`, `cat`).
*   **Fail Fast**: Verify syntax immediately after writing.
*   **Communication**: Keep `task.md` updated so the user always knows the status.
