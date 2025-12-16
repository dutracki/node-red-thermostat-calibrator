---
description: High-level workflow for broader project modifications and refactors
---

# Modify Project Workflow

Use this workflow for tasks that involve multiple files, architectural changes, or significant refactoring.

## Prerequisites
- [ ] Clear goal/requirement statement
- [ ] "Safety check" performed (backup or clean git state)

## Workflow Steps

### Phase 1: Impact Analysis
1. Identify all affected components
2. Check dependency graph (`dependency_map.md`)
3. **Review Research Notes**: Check `/home/grouppe/agent/notes/` for architectural decisions.
4. List files to modify, create, or delete
5. Update `implementation_plan.md` if complex

### Phase 2: Execution Strategy
1. **Deprecate**: If removing code, mark deprecated first if public API.
2. **Add**: Create new components/interfaces (`/create_and_verify`).
3. **Migrate**: Switch dependent code to new implementation.
4. **Cleanup**: Remove old code.

### Phase 3: Verification Loop
// turbo
1. Build project: `go build ./...` or `npm run build`
2. Run full test suite
3. verifying "Critical Paths" (e.g. Auth, Payments)

### Phase 4: Documentation Update
```
- [ ] Update `architecture_overview.md` if structural changes occurred
- [ ] Update `project_structure.md` if files moved
- [ ] Update `dependency_map.md` if libs added/removed
- [ ] Update API docs if endpoints changed
```

## Completion Criteria
- [ ] Changes implemented
- [ ] Build successful
- [ ] All tests pass
- [ ] Documentation artifacts synced
