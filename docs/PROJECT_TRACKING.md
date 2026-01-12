# Phase 1.5 Project Tracking Board

**Project Manager**: PM
**Start Date**: January 11, 2026
**Target Completion**: January 31, 2026 (20 working days)
**Last Updated**: January 11, 2026

---

## Quick Status

| Stream | Status | Progress | Blocker |
|--------|--------|----------|---------|
| A: Extended Care | 🔴 Not Started | 0% | None |
| B: Conflict Detection | 🔴 Not Started | 0% | None |
| C: Waitlist/Cancel | 🔴 Not Started | 0% | None |
| D: Payment Tracking | 🔴 Not Started | 0% | None |
| E: Sibling Logistics | 🔴 Not Started | 0% | None |
| F: Data Population | 🔴 Not Started | 0% | None |

**Legend**: 🔴 Not Started | 🟡 In Progress | 🟢 Complete | 🔵 Blocked

---

## Sprint Board

### Week 1 (Jan 13-17)

#### To Do

| Task ID | Task | Owner | Est | Priority |
|---------|------|-------|-----|----------|
| A1 | Extended care schema migration | Tech Lead | 1h | P0 |
| B1 | Conflict detection schema migration | Tech Lead | 0.5h | P0 |
| C1 | Waitlist/cancel schema migration | Tech Lead | 1h | P0 |
| D1 | Payment tracking schema migration | Tech Lead | 1h | P0 |
| F1 | Extended care pricing research (43 camps) | BA/Data | 6-8h | P0 |
| F2 | Payment deadline research (43 camps) | BA/Data | 6-8h | P1 |
| F3 | Camp ZIP code verification | BA/Data | 2h | P1 |

#### In Progress

| Task ID | Task | Owner | Started | Notes |
|---------|------|-------|---------|-------|
| - | - | - | - | - |

#### Done

| Task ID | Task | Owner | Completed | Notes |
|---------|------|-------|-----------|-------|
| - | - | - | - | - |

---

### Week 2 (Jan 20-24)

#### To Do

| Task ID | Task | Owner | Est | Priority | Depends On |
|---------|------|-------|-----|----------|------------|
| A2 | Populate extended care pricing data | BA/Data | 2h | P0 | A1, F1 |
| A3 | ExtendedCareToggle component | Frontend | 4h | P0 | A1 |
| A4 | CostDashboard integration | Frontend | 2h | P0 | A3 |
| B2 | ConflictWarningModal component | Frontend | 4h | P0 | B1 |
| B3 | Calendar conflict indicators | Frontend | 2h | P1 | B2 |
| C2 | WaitlistManager component | Frontend | 6h | P1 | C1 |

#### In Progress

| Task ID | Task | Owner | Started | Notes |
|---------|------|-------|---------|-------|
| - | - | - | - | - |

#### Done

| Task ID | Task | Owner | Completed | Notes |
|---------|------|-------|-----------|-------|
| - | - | - | - | - |

---

### Week 3 (Jan 27-31)

#### To Do

| Task ID | Task | Owner | Est | Priority | Depends On |
|---------|------|-------|-----|----------|------------|
| C3 | AlternativeCampSuggester component | Frontend | 4h | P1 | C1 |
| C4 | CampCancellationFlow component | Frontend | 4h | P1 | C1 |
| D2 | Populate payment deadline data | BA/Data | 2h | P1 | D1, F2 |
| D3 | PaymentTracker widget | Frontend | 4h | P1 | D1 |
| D4 | Payment status UI | Frontend | 2h | P2 | D3 |
| E1 | Distance calculation helper | Tech Lead | 3h | P2 | F3 |
| E2 | SiblingLogisticsAlert component | Frontend | 3h | P2 | E1 |
| E3 | Sibling filter integration | Frontend | 2h | P2 | E2 |
| INT | Integration testing | QA | 4h | P0 | All |

#### In Progress

| Task ID | Task | Owner | Started | Notes |
|---------|------|-------|---------|-------|
| - | - | - | - | - |

#### Done

| Task ID | Task | Owner | Completed | Notes |
|---------|------|-------|-----------|-------|
| - | - | - | - | - |

---

## Detailed Task Tracker

### Stream A: Extended Care Cost Tracking

| ID | Task | Status | Owner | Est | Actual | Notes |
|----|------|--------|-------|-----|--------|-------|
| A1 | Add `extended_care_am_price`, `extended_care_pm_price` to camps | 🔴 | Tech Lead | 1h | - | Migration ready in `phase1_5_critical_gaps.sql` |
| A1 | Add `needs_extended_care_am`, `needs_extended_care_pm` to scheduled_camps | 🔴 | Tech Lead | - | - | Part of A1 migration |
| A2 | Research extended care pricing for 43 camps | 🔴 | BA/Data | 6h | - | Check camp websites |
| A2 | Populate extended care data in Supabase | 🔴 | BA/Data | 2h | - | After research complete |
| A3 | Create ExtendedCareToggle component | 🔴 | Frontend | 4h | - | See COMPONENT_SPECS.md |
| A3 | Add to scheduled camp detail view | 🔴 | Frontend | - | - | Part of A3 |
| A4 | Update CostDashboard to include extended care | 🔴 | Frontend | 2h | - | Modify existing component |
| A4 | Update calendar block cost display | 🔴 | Frontend | - | - | Part of A4 |

### Stream B: Schedule Conflict Detection

| ID | Task | Status | Owner | Est | Actual | Notes |
|----|------|--------|-------|-----|--------|-------|
| B1 | Add `conflict_acknowledged` to scheduled_camps | 🔴 | Tech Lead | 0.5h | - | Migration ready |
| B1 | Create/update `check_schedule_conflict()` function | 🔴 | Tech Lead | - | - | Part of B1 migration |
| B2 | Create ConflictWarningModal component | 🔴 | Frontend | 4h | - | See COMPONENT_SPECS.md |
| B2 | Integrate with SchedulePlanner save flow | 🔴 | Frontend | - | - | Part of B2 |
| B3 | Add visual conflict indicator on calendar | 🔴 | Frontend | 2h | - | Red border/icon on conflicting blocks |

### Stream C: Waitlist & Cancellation Workflows

| ID | Task | Status | Owner | Est | Actual | Notes |
|----|------|--------|-------|-----|--------|-------|
| C1 | Add waitlist columns to scheduled_camps | 🔴 | Tech Lead | 0.5h | - | `waitlist_position` |
| C1 | Add cancellation columns to scheduled_camps | 🔴 | Tech Lead | 0.5h | - | `cancelled_by`, `cancellation_reason`, `expected_refund`, `refund_received` |
| C2 | Create WaitlistManager component | 🔴 | Frontend | 6h | - | See COMPONENT_SPECS.md |
| C2 | Add waitlist status to camp detail | 🔴 | Frontend | - | - | Part of C2 |
| C3 | Create AlternativeCampSuggester component | 🔴 | Frontend | 4h | - | Shared by waitlist and cancellation |
| C3 | Implement suggestion algorithm | 🔴 | Frontend | - | - | Same week, same age, available |
| C4 | Create CampCancellationFlow component | 🔴 | Frontend | 4h | - | See COMPONENT_SPECS.md |
| C4 | Distinguish user vs camp cancellation | 🔴 | Frontend | - | - | Part of C4 |

### Stream D: Payment Tracking

| ID | Task | Status | Owner | Est | Actual | Notes |
|----|------|--------|-------|-----|--------|-------|
| D1 | Add payment columns to camps | 🔴 | Tech Lead | 0.5h | - | `deposit_amount`, `deposit_due_date`, `payment_due_date` |
| D1 | Add `payment_status` to scheduled_camps | 🔴 | Tech Lead | 0.5h | - | Part of D1 migration |
| D2 | Research payment deadlines for 43 camps | 🔴 | BA/Data | 6h | - | Check camp websites/registration pages |
| D2 | Populate payment data in Supabase | 🔴 | BA/Data | 2h | - | After research complete |
| D3 | Create PaymentTracker dashboard widget | 🔴 | Frontend | 4h | - | See COMPONENT_SPECS.md |
| D3 | Add to Dashboard.jsx | 🔴 | Frontend | - | - | Part of D3 |
| D4 | Add payment status dropdown to camp detail | 🔴 | Frontend | 2h | - | In scheduled camp view |

### Stream E: Sibling Logistics

| ID | Task | Status | Owner | Est | Actual | Notes |
|----|------|--------|-------|-----|--------|-------|
| E1 | Add `zip_code` to camps table | 🔴 | Tech Lead | 0.5h | - | Part of main migration |
| E1 | Create `zip_code_coords` reference table | 🔴 | Tech Lead | 0.5h | - | SB area ZIPs with lat/long |
| E1 | Create `calculate_zip_distance()` function | 🔴 | Tech Lead | 2h | - | Haversine formula |
| E2 | Create SiblingLogisticsAlert component | 🔴 | Frontend | 3h | - | See COMPONENT_SPECS.md |
| E2 | Integrate alert trigger in SchedulePlanner | 🔴 | Frontend | - | - | After sibling scheduling |
| E3 | Add "near sibling's camp" filter | 🔴 | Frontend | 2h | - | In camp discovery |

### Stream F: Data Population (Parallel Track)

| ID | Task | Status | Owner | Est | Actual | Notes |
|----|------|--------|-------|-----|--------|-------|
| F1 | Research extended care pricing | 🔴 | BA/Data | 6-8h | - | Check all 43 camp websites |
| F2 | Research payment deadlines | 🔴 | BA/Data | 6-8h | - | Deposit amounts, due dates |
| F3 | Verify/populate camp ZIP codes | 🔴 | BA/Data | 2h | - | From address field |

---

## Blockers & Risks Log

| Date | Issue | Impact | Status | Resolution |
|------|-------|--------|--------|------------|
| - | - | - | - | - |

---

## Decision Log

| Date | Decision | Rationale | Decided By |
|------|----------|-----------|------------|
| Jan 11 | Use ZIP-based distance (not geocoding) for sibling logistics | Avoid API costs and complexity; geocoding planned for Phase 3 | PM |
| Jan 11 | Include sibling logistics in Phase 1.5 | User research showed this is a significant pain point | PM + PO |
| Jan 11 | Allow manual extended care price entry | Some camps may not publish pricing | PM |

---

## Daily Standups

### January 11, 2026

**Progress**:
- Project planning complete
- Migration script created
- Component specs documented
- Tracking board initialized

**Today's Focus**:
- Review deliverables with stakeholders
- Tech Lead to review migration script
- UX Engineer to review component specs

**Blockers**:
- None

---

### [Template for Future Standups]

### [Date]

**Progress**:
-

**Today's Focus**:
-

**Blockers**:
-

---

## Metrics & KPIs

### Development Velocity

| Week | Planned Tasks | Completed | Velocity |
|------|--------------|-----------|----------|
| Week 1 | 7 | - | - |
| Week 2 | 6 | - | - |
| Week 3 | 9 | - | - |

### Quality Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| PRs merged without revision | 70% | - |
| Bugs found in QA | < 5 | - |
| Accessibility issues | 0 | - |
| Mobile responsiveness issues | 0 | - |

---

## Handoff Checklist

### For Tech Lead

- [x] Migration script ready: `backend/migrations/phase1_5_critical_gaps.sql`
- [ ] Review migration script
- [ ] Test in development environment
- [ ] Create rollback plan
- [ ] Deploy to staging

### For UX Engineer

- [x] Component specs ready: `docs/COMPONENT_SPECS.md`
- [ ] Review component specs
- [ ] Create wireframes/mockups
- [ ] Review with PM for approval
- [ ] Begin implementation

### For BA/Data Team

- [ ] Extended care research template created
- [ ] Payment deadline research template created
- [ ] ZIP code verification started
- [ ] Research shared in team folder

---

## Resources

| Document | Location | Purpose |
|----------|----------|---------|
| Product Plan | [PRODUCT_PLAN.md](./PRODUCT_PLAN.md) | Full requirements |
| Business Rules | [BUSINESS_RULES.md](./BUSINESS_RULES.md) | Logic documentation |
| Component Specs | [COMPONENT_SPECS.md](./COMPONENT_SPECS.md) | UI specifications |
| Migration Script | `backend/migrations/phase1_5_critical_gaps.sql` | Database changes |
| Implementation Checklist | [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) | Dev checklist |

---

*This board should be updated daily during active development.*
