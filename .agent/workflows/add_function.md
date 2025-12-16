---
description: Add a new function or method to the codebase with safeguards
---

# Add Function Workflow

Use this workflow when adding a specific function, method, or small logical unit to an existing file.

## Prerequisites
- [ ] Target file identified
- [ ] Function signature and purpose defined
- [ ] Understanding of surrounding context (class/package)
- [ ] **Check `/home/grouppe/agent/notes/` for relevant constraints**

## Workflow Steps

### Step 1: Context Analysis
```
Before writing code:
- [ ] Check for existing similar functions (avoid duplication)
- [ ] check imports needed for new types/dependencies
- [ ] Review file conventions (error handling style, naming)
```

### Step 2: Test Design (TDD Recommended)
// turbo
1. Locate associated test file (create if missing)
2. Define test cases for:
    - Happy path
    - Edge cases (nil inputs, empty strings)
    - Error conditions

### Step 3: Implementation
1. Add function definition
2. Implement logic
3. Add docstrings/comments following project style

### Step 4: Verification
// turbo
1. Run local tests: `go test ./...` or `npm test`
2. Run linting checks

### Step 5: Integration Check
```
- [ ] Check if new function is exported? If so, is it used correctly?
- [ ] Does it break any interfaces?
```

## Success Criteria
- [ ] Function implemented
- [ ] Tests pass
- [ ] Linter passes
- [ ] No regressions
