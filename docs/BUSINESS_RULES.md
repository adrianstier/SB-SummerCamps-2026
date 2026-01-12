# Business Rules Documentation

**Last Updated**: January 11, 2026
**Purpose**: Document business logic, constraints, and decision rules for the SB Summer Camps application.

---

## Table of Contents

1. [Scheduling Rules](#1-scheduling-rules)
2. [Pricing & Cost Calculations](#2-pricing--cost-calculations)
3. [Age Handling](#3-age-handling)
4. [Status Workflows](#4-status-workflows)
5. [Coverage Gap Logic](#5-coverage-gap-logic)
6. [Notification Rules](#6-notification-rules)
7. [Data Validation](#7-data-validation)

---

## 1. Scheduling Rules

### 1.1 Schedule Conflict Detection

**Rule**: A child cannot be scheduled at two full-day camps during the same week.

**Exception**: Half-day camps (AM + PM) can overlap if user acknowledges conflict.

**Implementation**:
```
IF child has existing scheduled_camp for week W
AND new camp overlaps with same week W
THEN show ConflictWarningModal
  IF user clicks "These are half-day camps, allow it"
  THEN set conflict_acknowledged = true and save
  ELSE prevent save
```

**Conflict Check Query**:
```sql
SELECT * FROM scheduled_camps
WHERE child_id = :child_id
AND week_start = :week_start
AND status NOT IN ('cancelled')
AND conflict_acknowledged = false
```

### 1.2 Sibling Logistics Warning

**Rule**: Warn when siblings are scheduled at camps more than 10 miles apart in the same week.

**Threshold**: 10 miles (configurable)

**Implementation**:
```
ON scheduling camp for child C in week W:
  FOR each sibling S of C:
    IF S has camp scheduled in week W:
      distance = calculateDistance(C.camp.location, S.camp.location)
      IF distance > 10 miles:
        show SiblingLogisticsAlert with distance and drive time
```

### 1.3 Week Definition

**Rule**: A "week" runs Monday through Friday, aligned with standard camp schedules.

**Summer 2026 Weeks**:
| Week | Start Date | End Date |
|------|------------|----------|
| 1 | June 8, 2026 | June 12, 2026 |
| 2 | June 15, 2026 | June 19, 2026 |
| ... | ... | ... |
| 11 | August 17, 2026 | August 21, 2026 |

### 1.4 Block Types (Non-Camp Weeks)

Users can mark weeks as blocked for non-camp activities:
- **Vacation** - Family vacation, no care needed
- **Family Time** - Intentional family time, no care needed
- **Travel** - Out of town
- **Other Plans** - Custom reason

**Rule**: Blocked weeks do NOT count as coverage gaps.

---

## 2. Pricing & Cost Calculations

### 2.1 Base Cost Calculation

**Formula**:
```
Total Summer Cost = SUM(scheduled_camps.price) for all children
                  + SUM(extended_care_costs) if enabled
                  - SUM(discounts) if applicable
```

### 2.2 Extended Care Pricing

**Rule**: Extended care costs are added per-camp when user indicates need.

**Formula**:
```
Camp Total = base_price
           + (extended_care_am_price * 5 if needs_extended_care_am)
           + (extended_care_pm_price * 5 if needs_extended_care_pm)
```

**Note**: Extended care prices are typically daily rates, multiplied by 5 for weekly cost.

### 2.3 Sibling Discounts

**Current Implementation**: Manual indication only.

**Future**: Auto-calculate based on camp's sibling_discount field.

**Common Patterns**:
- 10% off second child
- 15% off third child
- Fixed amount (e.g., $25 off per sibling)

### 2.4 Multi-Week Discounts

**Current Implementation**: Not calculated, shown as text info.

**Common Patterns**:
- 5% off for 4+ weeks at same camp
- Free week with 8-week enrollment

### 2.5 FSA Eligibility

**Rule**: Camps are FSA-eligible if they provide dependent care while parent works.

**Criteria**:
- Camp hours overlap work hours
- Camp is for children under 13
- Parent is working or looking for work

**Display**:
```
FSA-Eligible Total: $X,XXX (Y camps)
Non-FSA Total: $X,XXX
```

### 2.6 Budget Tracking

**Formula**:
```
Remaining Budget = summer_budget - Total Summer Cost
Budget Status = "Under" if remaining > 0, "Over" if remaining < 0
```

---

## 3. Age Handling

### 3.1 Age Calculation

**Rule**: Use child's age as of June 1 of the summer year.

**Formula**:
```
age_as_of_summer = FLOOR((June 1, 2026 - birth_date) / 365.25)
```

**Stored in**: `children.age_as_of_summer`

### 3.2 Camp Age Range Matching

**Rule**: A child can attend a camp if their summer age falls within [min_age, max_age].

**Query**:
```sql
SELECT * FROM camps
WHERE min_age <= :child_age_as_of_summer
AND max_age >= :child_age_as_of_summer
```

### 3.3 Age Cutoff Flexibility

**Rule**: Display camps within 1 year of age range with indicator "Age may be flexible - contact camp".

**Implementation**:
- Strict match: No indicator
- Within 1 year: "Ages 6-10 (your child is 5 - contact camp)"

---

## 4. Status Workflows

### 4.1 Scheduled Camp Status

**Valid Statuses**:
| Status | Description | User Action |
|--------|-------------|-------------|
| `planned` | Considering, not registered | Default |
| `registered` | Registered, awaiting confirmation | After registration |
| `confirmed` | Spot confirmed | Camp confirms |
| `waitlisted` | On waitlist, not confirmed | If camp is full |
| `cancelled` | No longer attending | User or camp cancels |

**State Transitions**:
```
planned → registered (user registers)
registered → confirmed (camp confirms)
registered → waitlisted (camp full)
waitlisted → confirmed (spot opens)
* → cancelled (any status can be cancelled)
```

### 4.2 Cancellation Types

**Rule**: Distinguish user-initiated vs camp-initiated cancellations.

| `cancelled_by` | Description | Coverage Gap? |
|----------------|-------------|---------------|
| `user` | User chose to cancel | Yes, if no replacement |
| `camp` | Camp cancelled session | Yes, show "Find replacement" |

### 4.3 Payment Status

**Valid Statuses**:
| Status | Description |
|--------|-------------|
| `unpaid` | No payment made |
| `deposit_paid` | Deposit received |
| `full_paid` | Fully paid |

**Transitions**:
```
unpaid → deposit_paid (deposit made)
unpaid → full_paid (full payment, no deposit required)
deposit_paid → full_paid (balance paid)
```

---

## 5. Coverage Gap Logic

### 5.1 Gap Detection

**Rule**: A coverage gap exists for week W if:
1. Week W is within the user's required coverage period
2. No camp is scheduled for child C in week W
3. Week W is not blocked (vacation, family, etc.)

**Formula**:
```
coverage_period = [school_year_end, school_year_start]
gap_weeks = coverage_period
          - scheduled_weeks
          - blocked_weeks
```

### 5.2 School Date Integration

**Defaults**:
- Santa Barbara Unified: June 6, 2026 - August 12, 2026

**Override**: Users can set per-child school dates for:
- Private schools with different calendars
- Different grade levels

### 5.3 Gap Display

**Visual Indicators**:
- Covered week: Child color fill
- Gap week: Red/orange highlight with "No coverage"
- Blocked week: Gray with block type icon

---

## 6. Notification Rules

### 6.1 Registration Reminders

**Timing**:
| Days Before | Notification Type |
|-------------|-------------------|
| 7 days | "Registration opens next week" |
| 1 day | "Registration opens tomorrow" |
| 0 days (morning) | "Registration opens today at X:XX" |

**Targeting**: Send only for camps in user's wishlist or scheduled as "planned".

### 6.2 Payment Reminders

**Timing**:
| Days Before | Notification Type |
|-------------|-------------------|
| 7 days | "Payment due next week" |
| 3 days | "Payment due in 3 days" |
| 1 day | "Payment due tomorrow" |
| 0 days | "Payment due today" |
| -1 day | "Payment overdue" |

### 6.3 Camp Cancellation Alert

**Trigger**: When camp marks session as cancelled.

**Content**:
- Camp name, affected week
- "Find replacement" CTA
- Refund info if available

### 6.4 Waitlist Update

**Trigger**: When waitlist position changes or spot opens.

**Content**:
- Current position (if known)
- "Spot available" if cleared

---

## 7. Data Validation

### 7.1 Child Data

| Field | Validation |
|-------|------------|
| name | Required, 1-100 chars |
| birth_date | Required, must be in past |
| age_as_of_summer | Auto-calculated, 3-17 range |
| interests | Optional array |
| allergies | Optional text |
| special_needs | Optional text |

### 7.2 Scheduled Camp Data

| Field | Validation |
|-------|------------|
| camp_id | Required, must exist |
| child_id | Required, must belong to user |
| week_start | Required, must be valid summer week |
| status | Required, must be valid status |
| price | Auto-populated from camp, can be overridden |

### 7.3 Price Parsing

**Valid Formats**:
- "$350" → 350
- "$350/week" → 350
- "$1,200" → 1200
- "Free" → 0
- "TBD" → null (display "Price TBD")
- "$300-$450" → min: 300, max: 450

**Rule**: Use `min_price` for cost calculations, show range in UI.

### 7.4 Time Parsing

**Valid Formats**:
- "9:00 AM" → 09:00
- "9am" → 09:00
- "9:00am - 3:00pm" → drop_off: 09:00, pick_up: 15:00
- "9-3" → drop_off: 09:00, pick_up: 15:00

---

## Appendix: Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Jan 2026 | Use June 1 for age calculation | Industry standard for camp age cutoffs |
| Jan 2026 | 10-mile sibling warning threshold | Reasonable SB commute concern |
| Jan 2026 | Allow conflict override | Half-day camps are common |
| Jan 2026 | Extended care = daily rate × 5 | Standard weekly pricing model |

---

*This document should be updated as business rules evolve. Changes require Product Owner approval.*
