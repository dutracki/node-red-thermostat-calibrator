---
description: Workflow for fixing bugs and issues
---
# Bugfix Workflow

Use this workflow to systematic diagnose, plan, and fix errors or issues in the codebase.

## Phase 1: Diagnosis & Reproduction
**Goal**: Confirm the bug, reproduce it, and understand the root cause.

1.  **Analyze the Issue**:
    *   Read the error message / user report carefully.
    *   Locate relevant files using `grep_search` or `find_by_name`.
2.  **Reproduction**:
    *   Create a reproduction script or identified a reliable manual reproduction step.
    *   Confirm the issue exists in the current environment.
3.  **Root Cause Analysis**:
    *   Read code (`view_file`) to understand the logic.
    *   Use logging or debug tools if necessary.
    *   Formulate a hypothesis for the fix.

## Phase 2: Planning
**Goal**: Design a fix that resolves the issue without introducing regressions.

1.  **Task Breakdown**:
    *   Create `task.md` with granular steps:
        *   [ ] Reproduction
        *   [ ] Implementation of Fix
        *   [ ] Verification
2.  **Technical Design**:
    *   Create `implementation_plan.md`.
    *   **Diagnosis**: Briefly explain *why* it is broken.
    *   **Proposed Changes**: Files to modify.
    *   **Verification Plan**: How to prove it is fixed.
3.  **User Review**:
    *   Use `notify_user` to request approval on the plan.
    *   **STOP** and wait for approval.

## Phase 3: Execution
**Goal**: Apply the fix safely.

**Loop for each item in `task.md`**:
1.  **Refresh Context**:
    *   Call `task_boundary` to update status.
2.  **Apply Fix**:
    *   Use `replace_file_content` to modify code.
    *   **Verify Syntax**: Check compiles/lints immediately.
3.  **Update Artifacts**:
    *   Tick off item in `task.md`.

## Phase 4: Verification
**Goal**: Prove the bug is gone.

1.  **Test the Fix**:
    *   Run the reproduction script/steps from Phase 1.
    *   **Critical**: Ensure the result is now CORRECT.
2.  **Regression Testing**:
    *   Run related tests to ensure no side effects.
3.  **Documentation**:
    *   Update `walkthrough.md` with:
        *   The Error (Before)
        *   The Fix (Code change summary)
        *   The Result (After proof)
4.  **Final Review**:
    *   Use `notify_user` to confirm completion.

## Best Practices
*   **Don't Guess**: Verify the bug exists *before* fixing it.
*   **Minimal Changes**: Fix only what is broken; don't refactor unrelated code unless necessary.
*   **Proof**: Always show "Before" (fail) and "After" (pass) evidence.
