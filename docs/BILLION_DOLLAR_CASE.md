# The billion-dollar case: a reproducible synthetic scenario

This is a worked planning example, not achieved savings, a benchmark, a forecast for any real company, or a promise that software produces savings. All exposure, adoption, pricing, success and expense-removal assumptions are invented. Finance must replace and verify them before decisions.

## Operating context
- Annual revenue: $200,000,000,000.
- Baseline EBITDA: $18,000,000,000 (bridge only).
- Unique addressable annual expense: $108,000,000,000.
- Comparable operating locations: 1000.
- Base implementation budget: $900,000,000.
- Delivery capacity: 1600 team-months; not a resource scheduling calendar.

## Reproducible model outputs
| Case | Year 1 net cost savings | Recurring expected net cost savings | Year 1 total EBITDA impact | Investment |
|---|---:|---:|---:|---:|
| Base | $5,026,627,833 | $6,614,036,000 | $5,082,894,500 | $795,000,000 |
| Downside | $1,895,337,708 | $3,722,441,000 | $1,895,337,708 | $495,000,000 |
| Upside | $5,599,657,283 | $7,304,039,600 | $5,670,883,950 | $795,000,000 |
| Half footprint | $2,513,313,917 | $3,307,018,000 | $2,541,447,250 | $397,500,000 |

## How the base case reconciles
- Gross probability-weighted ramped cost savings: $5,730,294,500.
- Gross incremental revenue contribution: $149,600,000 (not cost savings).
- Incremental recurring opex in Year 1: $297,000,000.
- Implementation expense: $500,000,000.
- Net incremental EBITDA: $5,082,894,500.
- Capex: $295,000,000 affects cash only.
- Net cost savings: $5,026,627,833 includes expense of all selected cost initiatives, including the enabling foundation. Revenue and working-capital initiative costs are included in total EBITDA, not this cost-only subtotal.

## Base-case underwriting
Annual gross cost benefit = annual spend × improvement rate × adoption × expense conversion. For revenue, the resulting earned revenue input is multiplied by contribution margin. Success probability and rollout are applied afterwards. Expenses are never probability-discounted.

| Initiative | Exposure | Rate | Adoption | Expense conversion | Selected |
|---|---:|---:|---:|---:|---|
| Cloud fleet utilization | $8,000,000,000 | 15% | 90% | 100% | Yes |
| Direct materials strategic sourcing | $40,000,000,000 | 6% | 85% | 100% | Yes |
| Indirect supplier consolidation | $15,000,000,000 | 7.000000000000001% | 80% | 100% | Yes |
| Network freight optimization | $12,000,000,000 | 8% | 85% | 95% | Yes |
| Energy demand optimization | $6,000,000,000 | 10% | 85% | 100% | Yes |
| Scrap and rework prevention | $4,000,000,000 | 18% | 80% | 90% | Yes |
| Paid overtime and agency reduction | $6,000,000,000 | 16% | 85% | 80% | Yes |
| Workflow automation alternative | $6,000,000,000 | 18% | 75% | 65% | No |
| Software contract rationalization | $3,000,000,000 | 18% | 90% | 100% | Yes |
| Payment and transaction fee optimization | $2,000,000,000 | 12% | 90% | 100% | Yes |
| Maintenance procurement and reliability | $8,000,000,000 | 7.5% | 80% | 90% | Yes |
| Inventory loss prevention | $4,000,000,000 | 12% | 85% | 100% | Yes |
| Enterprise data and value assurance | $0 | 0% | 100% | 100% | Yes |
| Earned revenue leakage prevention | $20,000,000,000 | 3% | 80% | 100% | Yes |
| Existing receivables cash release | $0 | 0% | 100% | 100% | No |

The $6B premium-labor expense pool appears in two alternatives but is counted once in total exposure. Mutual exclusion prevents claiming both. Software and cloud spend, and direct/indirect sourcing, have explicitly separate scope; that separation must be verified against actual ledger accounts.

## Rollout schedule
| Quarter | Expected incremental EBITDA | Modeled pre-tax cash |
|---|---:|---:|
| Q1 | $122,176,833 | $-172,823,167 |
| Q2 | $1,568,099,667 | $1,568,099,667 |
| Q3 | $1,696,309,000 | $1,696,309,000 |
| Q4 | $1,696,309,000 | $1,696,309,000 |

## Evidence required before recognition
Signed price changes, invoice-level expense reductions, constant-volume baselines, service-quality checks, finance-owned pool assignments, and authenticated approval are required. Time saved with unchanged payroll receives no EBITDA credit. Faster collection of already earned receivables changes cash only. The app does not connect to an ERP or execute savings actions.

## Reproduce
Run `npm run report` for the enterprise case; run `npm run report -- --midmarket` for the original smaller case. API: POST `/api/optimize` with `{"profile":"enterprise"}`. See `docs/API.md` for editable assumptions and scenarios.

## Model limitations
Scaling assumes identical unit economics and costs per site; it does not model regional mix, local contracts or scale economies. The bounded optimizer supports 20 candidates and cannot schedule thousands of work packages. Independent success draws plus a common ±20% magnitude shock are invented risk inputs, not empirical confidence intervals. Recurring savings are an annualized steady-state expectation, not a calendar-year forecast or verified recurring benefit. Historical synthetic ledger recognition is separate and never multiplied by enterprise scale.
