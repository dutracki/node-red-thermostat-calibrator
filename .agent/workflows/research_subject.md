---
description: Research a topic and save findings to notes for future context
---

# Research Subject Workflow

Use this workflow to research a specific topic, technology, or requirement and persist the findings for future coding tasks.

## Prerequisites
- [ ] Topic clearly defined
- [ ] Internet access (if external research needed) or Codebase access

## Workflow Steps

### Step 1: Research
1.  **Search Web**: If external info needed (e.g., "latest Stripe API features").
2.  **Search Codebase**: If internal info needed (e.g., "how is auth handled").
3.  **Synthesize**: Summarize key constraints, patterns, and decisions.

### Step 2: Documentation
1.  Create/Update note file: `/home/grouppe/agent/notes/[topic_slug].md`
2.  Format:
    ```markdown
    # [Topic Name]
    **Date**: [YYYY-MM-DD]
    **Status**: [Draft/Final]

    ## Key Findings
    - ...

    ## Constraints for Code
    - ...
    
    ## Implementation Guide
    - ...
    ```

### Step 3: Context Update
1.  Notify user that note is created.
2.  (Implicit) Future workflows should check this folder.

## Success Criteria
- [ ] Note file created in `/home/grouppe/agent/notes/`
- [ ] Findings are actionable
