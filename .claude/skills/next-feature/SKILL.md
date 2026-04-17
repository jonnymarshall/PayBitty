---
name: next-feature
description: Start the next queued feature in the Paybitty roadmap. Use when user says "next feature", "move on", "what's next", or "continue". Reads development/ROADMAP.md, finds the first ⏳ section, and immediately begins TDD implementation.
---

Read `development/ROADMAP.md`. Find the first section marked ⏳ (queued). That is the current target.

Tell the user in one sentence which version we are starting and what it covers, then immediately invoke the `tdd` skill with the version name and checklist items as arguments and begin implementation — scaffold the branch using the branch name defined in the roadmap section, then work through the checklist items in order.

Mark each checklist item with `[x]` as it is completed. When all items in the section are done, change the section header emoji from ⏳ to ✅ and tell the user the version is complete and what comes next.
