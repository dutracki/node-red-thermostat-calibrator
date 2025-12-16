---
description: Full codebase analysis workflow - runs all 6 phases
---

# Analyze Codebase Workflow

Execute this workflow to perform complete codebase analysis.

## Prerequisites
- Access to target codebase directory
- Read permissions for all source files
- Write permissions for output artifacts

## Execution Steps

### Phase 1: File Discovery
// turbo
1. List all files recursively: `find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*'`
2. Categorize by extension into: source, config, docs, assets, tests
3. Identify entry points (main.*, index.*, app.*)
4. Create `project_structure.md` using template

### Phase 2: Dependency Analysis
// turbo
1. Locate package manifests: `find . -name "package.json" -o -name "go.mod" -o -name "requirements.txt"`
2. Parse dependencies and versions
3. Check for outdated packages
4. Check for known vulnerabilities via `npm audit` or equivalent
5. Create `dependency_map.md` using template

### Phase 3: Code Architecture
1. Read entry point files to understand bootstrap
2. Trace imports to map module relationships
3. Identify patterns: MVC, Clean Architecture, etc.
4. Document API routes and handlers
5. Create `architecture_overview.md`

### Phase 4: Code Quality Assessment
1. Check for linting configuration
2. Review code style consistency
3. Analyze test coverage if available
4. Identify code smells and anti-patterns
5. Create `code_quality_report.md`

### Phase 5: Security Audit
1. Scan for hardcoded secrets patterns
2. Review auth implementation
3. Check input validation
4. Verify secure configurations
5. Create `security_audit.md` using template

### Phase 6: Documentation Synthesis
1. Compile executive summary
2. List all artifacts created
3. Prioritize recommendations
4. Create `analysis_summary.md`

## Completion Criteria
- [ ] All 6 phases executed
- [ ] All artifacts created in `/home/grouppe/agent/` directory
- [ ] No critical security issues unaddressed
- [ ] Summary reviewed and approved

## Output Location
All artifacts saved to: `/home/grouppe/agent/`
