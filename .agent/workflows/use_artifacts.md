---
description: Configure custom artifacts directory
---
# Custom Artifacts Directory

// turbo-all

When creating artifacts (task.md, implementation_plan.md, walkthrough.md, or any other artifact files), always use this path:

**/home/grouppe/agent/**

Do NOT use the default ~/.gemini/antigravity/brain/ directory.

## Directory Structure
```
/home/grouppe/agent/
├── task.md                  # Task checklist
├── implementation_plan.md   # Implementation plans  
├── walkthrough.md           # Walkthroughs
├── templates/               # Template files
│   ├── code_summary.md
│   ├── dependency_map.md
│   └── security_audit.md
└── workflows/               # Workflow files (copy to .agent/workflows/)
    ├── analyze_codebase.md
    └── create_and_verify.md
```

## Notes
- Templates in `/home/grouppe/agent/templates/` should be used when creating analysis artifacts
- Workflows are registered in `/home/grouppe/.agent/workflows/` for slash command access
