# Admin KPI Refresh PRD

## Status
- Draft
- Date: 2026-04-23
- Owner: Product / Admin Workflow

## Summary
Refresh the Admin KPI section into a simple, aging-first dashboard focused on one operational goal:

Reduce approval wait time and prevent quotes from sitting unclaimed or unresolved.

The new experience should prioritize:
- Open quote age visibility
- Ownership clarity
- Unclaimed queue pressure
- Reviewer throughput
- Fast drilldown into stale cases

This should replace the current KPI emphasis on broad averages and multi-tab reporting with a more action-oriented control tower for the approval workflow.

## Problem
The current KPI dashboard is informative, but it is not optimized for the most important operational question:

Which quotes are aging right now, who owns them, and who is closing work?

Current gaps:
- Too much emphasis on averages and historical summaries
- Not enough focus on open-case aging
- No strong visual for unclaimed queue pressure
- Per-user performance exists, but not in a simple "taken vs closed" operational board
- No clear view that ties age buckets to either sales owner or queue owner
- The dashboard does not feel like a live queue management tool

## Goal
Create a simple admin KPI dashboard that helps the team:
- See how many quotes are still open
- See how old those quotes are
- See whether they are claimed or unclaimed
- See who is owning the work
- See who is closing work
- Quickly identify stale approvals before they become customer response problems

## Non-Goals
- Full BI reporting replacement
- Complex forecasting
- Margin analytics redesign
- Revenue-weighted executive reporting
- Multi-page analytics experience

## Primary Users
- Admin reviewers
- Finance reviewers
- Master users
- Secondary viewer: leadership checking queue health

## Product Principles
- Action over analysis
- Open work first, history second
- Aging is cumulative until final decision
- Ownership must always be obvious
- Unclaimed work must be highly visible
- Mobile should remain readable, but desktop is the primary experience

## Core Definitions

### Approval Age
- Approval age starts when the quote enters approval.
- Use `submitted_at` as the primary start timestamp.
- If `submitted_at` is missing, fall back to `created_at`.
- Approval age continues increasing while the quote remains open.
- Approval age stops only when the quote is finally `approved` or `rejected`.

### Current Queue Owner
- For normal approval flow:
  - `admin_reviewer_id` if claimed
  - otherwise `Unclaimed Admin Queue`
- For finance-required flow:
  - `finance_reviewer_id` if finance has claimed it
  - otherwise `Unclaimed Finance Queue`

### Sales Owner
- The requestor / opportunity owner / submitter view
- Use the existing submitter identity fields already shown in approval screens

### Taken
- Number of quotes claimed by a reviewer within the selected time range

### Closed
- Number of quotes finalized by that reviewer within the selected time range
- Finalized means `approved` or `rejected`

### Released To Finance
- Number of quotes an admin reviewed and routed to finance because margin fell below the guardrail

## Dashboard Outcome
The refreshed dashboard should answer these questions within 10 seconds:
- How many approval cases are open right now?
- How many are over SLA?
- How many are unclaimed?
- Which age buckets are growing?
- Who currently owns the queue?
- Which reviewers are taking cases but not closing them?
- Which cases need attention now?

## Proposed Information Architecture

### Top Row: Action KPIs
Show 5 to 6 compact cards:
- Open approvals
- Over SLA
- Unclaimed admin queue
- Unclaimed finance queue
- Median open age
- Oldest open case

Notes:
- Prefer median over average for open age
- Use strong color states:
  - green = healthy
  - amber = approaching SLA
  - red = overdue

### Main Left: Open Quotes by Age Bucket
Primary chart on the page.

Chart behavior:
- Stacked bar chart
- X-axis = age buckets
- Y-axis = number of open quotes
- Stack color = selected ownership mode

Ownership modes:
- Sales owner
- Queue owner
- Lane owner

Default mode:
- Queue owner

Required bucket set for MVP:
- 0-1 day
- 1-2 days
- 2-4 days
- 4-7 days
- 7-14 days
- 14-30 days
- 30+ days

Visual behavior:
- Modern, high-contrast, colorful
- Rounded bars
- Strong hover state
- Clear legend
- Smooth animation on filter changes
- Red emphasis for oldest buckets

Why this matters:
- It immediately shows where aging is accumulating
- It makes unclaimed queues impossible to ignore
- It supports the user’s reference chart pattern while improving readability

### Main Right: Reviewer Ownership Board
Persistent board on the right side of desktop layout.

Purpose:
- Show how many cases each admin or finance reviewer took and closed
- Surface who is overloaded, who is active, and who is leaving work to age

Default columns:
- Reviewer
- Open owned
- Taken
- Closed
- Approved
- Rejected
- Released to finance
- Median close age
- Over-SLA open cases

Default sorting:
- `Open owned` descending for live queue mode

Optional alternate sorting:
- `Closed` descending for performance review mode

Special rows:
- Unclaimed Admin Queue
- Unclaimed Finance Queue

## Supporting Section

### Bottom Section: Cases Needing Attention
Simple table showing the most urgent open quotes.

Default columns:
- Quote ID
- Customer
- Sales owner
- Current queue owner
- Current lane
- Current age
- Margin status
- Claim status

Default sort:
- Oldest first

Interaction:
- Clicking a row should open the quote detail / approval page

This is important because a dashboard without a direct path to action will still create delay.

## Filters
Keep filters simple and task-oriented.

### Time Range
- Today
- Last 7 days
- Last 30 days
- Month to date
- Custom range

Use cases:
- Open aging chart should always show current open queue state
- Reviewer board should respect the selected range for taken/closed counts

### Lane
- All
- Admin
- Finance

### Ownership Mode
- Queue owner
- Sales owner
- Lane owner

### Status Scope
- Open only
- Open + closed

Default:
- Open only

## Data Model Rules

### Open Aging Chart
- Include only quotes that are not yet finally approved or rejected
- Age continues from `submitted_at` through claim and through finance escalation
- For finance-routed quotes, the total approval age still starts at the original approval entry timestamp

### Queue-Specific Aging
Use this as a secondary measure, not the primary headline:
- Admin queue age starts at `submitted_at`
- Finance queue age starts at `finance_required_at`

Recommendation:
- Keep total approval age as the primary KPI
- Show queue-specific aging as a secondary tooltip or secondary badge

### Owner Attribution Logic

#### Queue Owner Mode
- Open admin case claimed: show `admin_reviewer_id`
- Open admin case unclaimed: `Unclaimed Admin Queue`
- Open finance case claimed: show `finance_reviewer_id`
- Open finance case unclaimed: `Unclaimed Finance Queue`

#### Sales Owner Mode
- Attribute by submitter / opportunity owner

#### Reviewer Board
- `Taken` = claim event in selected range
- `Closed` = final decision in selected range
- `Open owned` = currently open and currently assigned to that reviewer
- `Released to finance` = admin decision `requires_finance`

## UX Requirements
- Desktop layout:
  - left = age chart
  - right = reviewer board
- Mobile layout:
  - cards first
  - chart second
  - board stacked below
- No more than 2 primary charts on the page
- The page should feel like a queue control center, not a reporting portal

## Visual Direction
- Dark-theme compatible
- Brighter accent palette than current KPI page
- Use a modern stacked chart style with bold saturation and subtle gradients
- High readability first, but not plain
- Aging buckets should visually intensify as risk increases

Recommended color logic:
- 0-2d family: blue / teal
- 2-7d family: yellow / amber
- 7-14d family: orange
- 14+d family: red
- 30+d family: deep red / magenta accent

## Functional Requirements

### Must Have
- Open aging KPI cards
- Stacked age bucket chart
- Ownership mode toggle
- Reviewer board on right side
- Time filters including custom range
- Lane filter
- Unclaimed queue visibility
- Oldest cases table

### Should Have
- Drilldown when clicking chart segment
- Tooltip with quote count and impacted owners
- Export current filtered dataset
- Persist filter state in URL or local storage

### Could Have
- Value-weighted toggle
- Product line filter
- Department / region filter
- Daily email digest of aging backlog

## Suggested Improvements Beyond Current Request
These are the most valuable additions if we want this dashboard to actually drive behavior:

### 1. Median Age Over Average Age
Averages hide outliers. Median makes open queue health more trustworthy.

### 2. Unclaimed Queues As First-Class Entities
Do not bury unclaimed items inside reviewer metrics. Show them as named queue owners.

### 3. Oldest 10 Cases Panel
This creates daily execution pressure and gives the team an obvious place to work from.

### 4. Released-To-Finance Tracking
This helps separate admin bottlenecks from finance bottlenecks.

### 5. Claim-to-Close Conversion
Useful follow-up metric:
- cases taken
- cases closed
- open owned

This reveals whether claims are actually resulting in throughput.

### 6. Aging Heat State
Each reviewer row should visually signal risk:
- green = low aging
- amber = moderate aging
- red = too many over-SLA open cases

### 7. Default To Open Queue
Do not default to historical reporting. This page should open into "what needs action now."

## Recommended MVP Scope

### Phase 1: Aging Control Tower
- Replace current KPI overview with new top cards
- Add open aging stacked bar chart
- Add reviewer board
- Add oldest cases table
- Add filters: lane, ownership mode, time range

### Phase 2: Drilldown + Productivity Detail
- Click-through filtering from chart and board
- Add released-to-finance metric
- Add per-reviewer detail drawer
- Add export

### Phase 3: Alerts + Management Enhancements
- Daily stale queue digest
- Aging threshold notifications
- Compare current period vs previous period
- Optional workload balancing indicators

## Backend / Data Contract Recommendation
The current KPI stack already has useful data in:
- `quotes`
- `quote_events`
- `quote_kpi_facts`
- `get_quote_kpi`

Recommendation:
- Keep the existing KPI service for historical metrics
- Add a new focused payload for the aging dashboard instead of stretching the current structure too far

Suggested payload shape:

```ts
type AgingDashboardPayload = {
  summary: {
    openCases: number;
    overSla: number;
    unclaimedAdmin: number;
    unclaimedFinance: number;
    medianOpenAgeSeconds: number | null;
    oldestOpenAgeSeconds: number | null;
  };
  ageDistribution: Array<{
    bucketKey: string;
    bucketLabel: string;
    total: number;
    segments: Array<{
      ownerKey: string;
      ownerLabel: string;
      count: number;
    }>;
  }>;
  ownerBoard: Array<{
    ownerKey: string;
    ownerLabel: string;
    ownerType: 'reviewer' | 'unclaimed_admin' | 'unclaimed_finance';
    openOwned: number;
    taken: number;
    closed: number;
    approved: number;
    rejected: number;
    releasedToFinance: number;
    medianCloseAgeSeconds: number | null;
    overSlaOpen: number;
  }>;
  oldestOpenCases: Array<{
    quoteId: string;
    customerName: string;
    salesOwner: string | null;
    queueOwner: string | null;
    lane: 'admin' | 'finance';
    ageSeconds: number;
    isClaimed: boolean;
    requiresFinanceApproval: boolean;
  }>;
};
```

## Frontend Recommendation
Update the current KPI page in:
- [src/components/admin/kpi/AdminKpiDashboard.tsx](/Users/carlosdeligi/Desktop/Git%20Projects/powerquotepro/src/components/admin/kpi/AdminKpiDashboard.tsx:1)

Recommended approach:
- Replace the current multi-tab KPI-heavy layout with a single-page operational dashboard
- Keep at most one secondary section below the fold
- Use `recharts` stacked bars for the first version
- Add a compact board layout rather than a wide leaderboard table

## Acceptance Criteria
- Admin opens KPI page and sees open queue health immediately
- User can switch grouping between sales owner and queue owner
- Unclaimed admin and finance queues are visible without drilldown
- Reviewer board shows taken and closed counts for selected period
- Open age continues until final approval or rejection
- Finance-routed quotes do not reset the main approval age
- Clicking a stale bucket or owner filters to actionable cases

## Success Metrics
- Decrease count of open quotes over SLA
- Decrease count of unclaimed quotes over 1 day old
- Increase same-period close rate
- Reduce median approval age
- Increase percentage of open cases with active owner

## Open Questions
- Should sales owner use submitter, opportunity owner, or both when available?
- Should master users appear in the same reviewer board as admins and finance?
- Should the right-side board support both admin-only and finance-only ranking modes?
- Do we want value-based overlays later, or keep this dashboard count-based only?

## Recommendation
Proceed with a focused MVP centered on:
- open age
- owner visibility
- unclaimed queues
- taken vs closed board

That gives the team a cleaner operational dashboard and keeps the page aligned with the real business objective:

Get quotes reviewed faster and do not let them sit aging without response.
