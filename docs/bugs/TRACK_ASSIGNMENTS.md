# Bug Bash Track Assignments

Copy-paste the appropriate prompt to each Claude Code instance.

---

## Track A Prompt (Auth & Onboarding)

```
You are bug-bash-track-a. Your job is to test Features 1-5 (Authentication & Onboarding).

Read /Users/adrianstier/SB-SummerCamps-2026/docs/BUG_BASH_PLAN.md and execute Track A.

For each feature:
1. Open http://localhost:5173 in browser
2. Test all checklist items
3. Document any bugs found

When done, create your report at:
/Users/adrianstier/SB-SummerCamps-2026/docs/bugs/TRACK_A_REPORT.md

Use the bug template from the plan. Mark checklist items as [x] passed or document bugs.
```

---

## Track B Prompt (Camp Discovery & Details)

```
You are bug-bash-track-b. Your job is to test Features 6-16 (Camp Discovery & Details).

Read /Users/adrianstier/SB-SummerCamps-2026/docs/BUG_BASH_PLAN.md and execute Track B.

Prerequisites: User must be signed in (Track A complete).

For each feature:
1. Test all checklist items on http://localhost:5173
2. Test on both desktop and mobile viewport
3. Document any bugs found

When done, create your report at:
/Users/adrianstier/SB-SummerCamps-2026/docs/bugs/TRACK_B_REPORT.md
```

---

## Track C Prompt (Favorites & Children)

```
You are bug-bash-track-c. Your job is to test Features 17-24 (Favorites & Children Management).

Read /Users/adrianstier/SB-SummerCamps-2026/docs/BUG_BASH_PLAN.md and execute Track C.

Prerequisites: User must be signed in (Track A complete).

For each feature:
1. Test all checklist items on http://localhost:5173
2. Test data persistence (refresh page, sign out/in)
3. Document any bugs found

When done, create your report at:
/Users/adrianstier/SB-SummerCamps-2026/docs/bugs/TRACK_C_REPORT.md
```

---

## Track D Prompt (Schedule Planning)

```
You are bug-bash-track-d. Your job is to test Features 25-38 (Schedule Planning).

Read /Users/adrianstier/SB-SummerCamps-2026/docs/BUG_BASH_PLAN.md and execute Track D.

Prerequisites:
- User signed in (Track A)
- At least 1 child added (Track C)

For each feature:
1. Test all checklist items on http://localhost:5173
2. Test drag-and-drop on both desktop and touch
3. Verify cost calculations are accurate
4. Document any bugs found

When done, create your report at:
/Users/adrianstier/SB-SummerCamps-2026/docs/bugs/TRACK_D_REPORT.md
```

---

## Track E Prompt (Export, Recommendations, Dashboard)

```
You are bug-bash-track-e. Your job is to test Features 39-51 (Export, Recommendations, Dashboard).

Read /Users/adrianstier/SB-SummerCamps-2026/docs/BUG_BASH_PLAN.md and execute Track E.

Prerequisites:
- User signed in (Track A)
- At least 2-3 camps scheduled (Track D)

For each feature:
1. Test all checklist items on http://localhost:5173
2. Verify export files are valid (ics, etc.)
3. Check recommendation relevance
4. Document any bugs found

When done, create your report at:
/Users/adrianstier/SB-SummerCamps-2026/docs/bugs/TRACK_E_REPORT.md
```

---

## Track F Prompt (Gamification & Social)

```
You are bug-bash-track-f. Your job is to test Features 52-65 (Gamification & Social/Squads).

Read /Users/adrianstier/SB-SummerCamps-2026/docs/BUG_BASH_PLAN.md and execute Track F.

Prerequisites:
- User signed in (Track A)
- Some camps scheduled (for achievements)

For each feature:
1. Test all checklist items on http://localhost:5173
2. Verify achievements unlock correctly
3. Test squad creation and joining (may need 2nd account)
4. Document any bugs found

When done, create your report at:
/Users/adrianstier/SB-SummerCamps-2026/docs/bugs/TRACK_F_REPORT.md
```

---

## Track G Prompt (Family, Notifications, Settings)

```
You are bug-bash-track-g. Your job is to test Features 66-87 (Family Workspace, Notifications, Settings).

Read /Users/adrianstier/SB-SummerCamps-2026/docs/BUG_BASH_PLAN.md and execute Track G.

Prerequisites:
- User signed in (Track A)
- Second user account for collaboration testing

For each feature:
1. Test all checklist items on http://localhost:5173
2. Test real-time updates between users
3. Verify notification delivery
4. Document any bugs found

When done, create your report at:
/Users/adrianstier/SB-SummerCamps-2026/docs/bugs/TRACK_G_REPORT.md
```

---

## Track H Prompt (Admin, PWA, UX, Technical)

```
You are bug-bash-track-h. Your job is to test Features 88-111 (Admin, PWA, UX, Technical).

Read /Users/adrianstier/SB-SummerCamps-2026/docs/BUG_BASH_PLAN.md and execute Track H.

Prerequisites:
- Admin account for admin features
- Mobile device or emulator for PWA testing

For each feature:
1. Test all checklist items on http://localhost:5173
2. Test admin features with admin account
3. Test PWA on mobile (install, offline, etc.)
4. Security: try to access other users' data
5. Document any bugs found

When done, create your report at:
/Users/adrianstier/SB-SummerCamps-2026/docs/bugs/TRACK_H_REPORT.md
```

---

## Coordinator Prompt (Consolidation)

```
You are the bug-bash-coordinator. After all tracks complete:

1. Read all track reports in /Users/adrianstier/SB-SummerCamps-2026/docs/bugs/
2. Consolidate into /Users/adrianstier/SB-SummerCamps-2026/docs/bugs/CONSOLIDATED_REPORT.md
3. Sort bugs by severity (Critical > High > Medium > Low)
4. Create GitHub issues for Critical and High severity bugs
5. Update /Users/adrianstier/SB-SummerCamps-2026/docs/BUG_BASH_PLAN.md completion checklist
```

---

## Quick Start Commands

```bash
# Terminal 1: Start dev server
cd /Users/adrianstier/SB-SummerCamps-2026 && npm run dev

# Terminal 2-9: Start Claude Code instances for each track
# In separate terminals/windows:
claude  # Track A
claude  # Track B
claude  # Track C
# ... etc
```
