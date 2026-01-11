# Development Roles

This directory contains detailed role descriptions for the SB Summer Camps development pipeline. Each role has specific responsibilities, deliverables, and handoff requirements.

## Pipeline Sequence

```
1. Business Analyst     → Requirements & User Research
2. Project Manager      → Planning & Coordination
3. UX Engineer          → Design & Prototyping
4. Tech Lead            → Architecture & Specs
5. Database Engineer    → Schema & Data Layer
6. Frontend Engineer    → User Interface
7. Backend Engineer     → Server-Side Logic
8. Code Reviewer        → Quality Validation
9. Security Reviewer    → Security Assessment
```

## Role Files

| # | Role | File | Focus |
|---|------|------|-------|
| 1 | [Business Analyst](01-business-analyst.md) | WHAT/WHY | Requirements, user stories, process analysis |
| 2 | [Project Manager](02-project-manager.md) | HOW/WHEN | Planning, coordination, risk management |
| 3 | [UX Engineer](03-ux-engineer.md) | USER EXPERIENCE | Design system, wireframes, prototypes |
| 4 | [Tech Lead](04-tech-lead.md) | ARCHITECTURE | Technical decisions, API design, standards |
| 5 | [Database Engineer](05-database-engineer.md) | DATA LAYER | Schema, optimization, security |
| 6 | [Frontend Engineer](06-frontend-engineer.md) | CLIENT-SIDE | React components, UI, performance |
| 7 | [Backend Engineer](07-backend-engineer.md) | SERVER-SIDE | APIs, business logic, integrations |
| 8 | [Code Reviewer](08-code-reviewer.md) | QUALITY | Code standards, testing, documentation |
| 9 | [Security Reviewer](09-security-reviewer.md) | SECURITY | Vulnerabilities, compliance, risk |

## How to Use These Roles

### For New Features
Follow the full pipeline sequence:
1. BA defines requirements
2. PM plans execution
3. UX designs experience
4. Tech Lead architects solution
5. DB Engineer creates schema
6. Engineers implement
7. Code Reviewer validates quality
8. Security Reviewer approves for production

### For Bug Fixes
Skip to relevant phase:
1. Engineer implements fix
2. Code Reviewer validates
3. Security Reviewer spot-checks
4. Deploy

### For This Project (Single Developer)
When Claude operates on this codebase, it should:
1. Identify which role is appropriate for the current task
2. Follow that role's guidelines and constraints
3. Produce that role's expected deliverables
4. Respect role boundaries (don't do PM work when acting as Engineer)

## Role Activation

To activate a specific role, reference it in your prompt:

```
"Acting as Business Analyst, analyze the requirements for [feature]"
"As Code Reviewer, review the changes in [file]"
"Switch to Security Reviewer mode and assess [component]"
```

## Quality Gates

Each phase has a quality gate that must pass before proceeding:

| Gate | Owner | Criteria |
|------|-------|----------|
| Requirements Complete | BA | BRD approved, stories prioritized |
| Design Approved | UX | Designs validated, accessibility verified |
| Architecture Approved | Tech Lead | Specs complete, feasibility confirmed |
| Implementation Complete | Engineers | Features working, tests passing |
| Quality Validated | Code Reviewer | Standards met, no blockers |
| Security Approved | Security Reviewer | Vulnerabilities resolved, compliance met |

## Related Documentation

- [DEVELOPMENT_WORKFLOW.md](../DEVELOPMENT_WORKFLOW.md) - Full pipeline process
- [PRODUCT_PLAN.md](../PRODUCT_PLAN.md) - Feature roadmap and requirements
- [CLAUDE.md](../../CLAUDE.md) - Project context and brand voice
