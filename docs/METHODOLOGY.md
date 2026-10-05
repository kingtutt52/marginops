# Financial methodology

## Objective and unit conventions

All money is USD. The optimizer maximizes total expected incremental EBITDA over the configured horizon (12 months in the UI; 1–36 in the engine/API). All upfront expense and capex are committed in month 1. Delivery capacity is the sum of estimated team-months; it is not a resource scheduling calendar. The exact search supports at most 20 initiatives and has O(n × 2^n) time complexity.

The engine does not round intermediate values. Presentation rounds to dollars or abbreviated thousands/millions/billions. For production accounting, convert controlled amounts to a decimal representation with an explicit rounding policy.

## Initiative economics

For initiative i in month t:

- Gross annual EBITDA benefit G = avoidable operating cost for a cost initiative.
- G = incremental revenue × contribution margin for a revenue initiative. Revenue assumptions should already include churn, cannibalization and volume effects; avoid deducting the same variable costs again in recurring opex.
- G = 0 for working-capital initiatives.
- Launch L = start month + scenario delay.
- Ramp R(t) = max(0, min(1, (t − L + 1) / ramp months)).
- Expected gross benefit B(t) = G / 12 × success probability × realization × R(t).
- Operating cost O(t) = annual recurring opex / 12 from launch onward, with no probability discount or ramp discount.
- Implementation expense E(t) is charged in month 1.
- Incremental EBITDA(t) = B(t) − O(t) − E(t).
- Modeled incremental cash(t) = EBITDA(t) − capex(t) + working-capital release(t).

A working-capital release occurs once at launch, weighted by probability and realization. This deliberately simplified cash proxy assumes operating accruals equal cash, and excludes tax, financing and other working-capital effects. It is not GAAP operating cash flow or a complete free cash flow measure.

Steady-state annual impact = G × probability × realization − annual opex. It excludes upfront implementation expense and is not an annual forecast. Payback is the first month with nonnegative cumulative modeled incremental cash when there is upfront investment. If later cash outflows occur, they can reverse that recovery; no discounted or sustained-payback claim is made.

Capex is excluded from EBITDA; depreciation and amortization are outside the model. Implementation expense reduces EBITDA rather than being silently added back. The model predicts incremental impact and does not compute or reconcile an entire company's EBITDA from GAAP net income.

## Selection and double counting

A feasible portfolio must satisfy:

1. Sum of implementation expense + capex ≤ investment budget.
2. Sum of delivery effort ≤ delivery capacity.
3. Every selected prerequisite is included and starts no later than its dependent.
4. No more than one initiative from each non-null exclusive benefit pool.

The optimizer considers the empty portfolio and prefers lower upfront investment on equal expected EBITDA. Other equal-value ties follow deterministic enumeration order. A prerequisite may destroy standalone value yet belong to the optimal combined portfolio.

Mutual exclusion is a conservative treatment of overlapping claims. This is not a general causal overlap allocator. Production models may need site-level cost-pool ceilings and partial overlap rules. Budget constrains committed upfront expense plus capex only; recurring opex is included in the objective but not in that budget.

## Uncertainty model

The deterministic forecast is the expected value under stated success probabilities. Each of 2,000 seeded runs samples an independent Bernoulli success for each selected initiative plus one common uniform realization multiplier on [0.8, 1.2]. The common multiplier creates correlated benefit magnitude. All selected expenses are retained. The simulation reports EBITDA, not cash distributions.

Dependencies are inclusion/delivery prerequisites; success does not propagate through the dependency graph. Probabilities must be interpreted as unconditional model inputs consistent with that simplification. The simulation omits conditional failure, heavy tails, correlated success events, cost overruns, timing risk beyond the fixed delay and external macro shocks. Quantiles are order statistics at floor((runs − 1) × p), and are not empirically calibrated guarantees or causal confidence intervals. A fixed seed makes review reproducible.

## Historical benefit recognition

Recognized benefit = observed benefit − counterfactual benefit − incremental opex − implementation expense, only for approved rows. Negative results remain negative. “Counterfactual benefit” is the improvement expected without the initiative; this is an explicit input, not a causal estimate produced by the application.

Every approved row requires an evidence reference, reviewer and approval date. Each period / benefit-pool pair can appear only once, including pending/rejected claims. In production, use explicit revision/reversal workflows, source-document verification and authenticated approvals. The demonstration validates metadata; it does not prove the evidence exists or the reviewer authorized it.

The synthetic September ledger is independent of the forward portfolio. Its recognized $139,000 is not added to projected results. The ledger demonstrates financial control logic, not actual savings.

## Operational value recognition examples

| Change | Treatment |
|---|---|
| Cancel a billed unused software seat | Avoidable cost, from effective cancellation |
| Save 10,000 staff hours with no spend change | Capacity; no recognized EBITDA yet |
| Reduce paid overtime at equivalent service levels | Cost benefit, subject to evidence |
| Generate $1M of net new revenue at 40% contribution margin | $400K gross EBITDA benefit before incremental fixed opex |
| Collect a previously booked receivable faster | Working-capital cash release only |
| Buy $100K of equipment | Cash outflow; not an EBITDA expense |
| Spend $100K implementing an initiative | EBITDA expense and modeled cash outflow |

## Reference

[SEC Non-GAAP Financial Measures C&DIs](https://www.sec.gov/rules-regulations/staff-guidance/corporation-finance-interpretations/non-gaap-financial-measures), especially Questions 100.01 and 103.01–103.02, discuss non-GAAP presentation and reconciliation. This planning prototype is not a substitute for finance-approved reporting or a GAAP reconciliation.


## Enterprise underwriting and savings classification (v2)

The global profile is a synthetic 1,000-location group, with $200B revenue and $108B distinct annual cost exposure. These are invented parameters, not market benchmarks. No software capability, customer outcome or actual saving is inferred from the displayed magnitude.

Annual gross cost input = annual addressable expense × reduction rate × adoption coverage × expense conversion. Expense conversion is the fraction of operational improvements translated into removable operating costs; capacity without expense removal has conversion zero. Probability and rollout apply subsequently through the shared forecast engine. For revenue exposure, the bottom-up input is earned incremental revenue and the engine applies contribution margin.

The premium-labor pool is shared by scheduling and automation alternatives. It contributes once to unique exposure; the builder rejects inconsistent shared-pool baselines or lack of mutual exclusion. Other expense pools are assumed disjoint by scope. Production integration must verify that separation at invoice/account/site level; a named pool is not proof of a non-overlapping baseline.

Year 1 net cost savings sums expected EBITDA for selected cost-kind initiatives, including enabling cost initiatives with zero direct benefit. Recurring expected net cost savings sums their annualized steady-state net benefits. Neither includes revenue-kind benefit, revenue-program costs, cash release, or working-capital-program costs; those program costs still reduce total portfolio EBITDA. The bridge separately sums all expected gross cost benefit and revenue contribution, then deducts all recurring opex and implementation expense. Quarterly totals reconcile to the modeled horizon.

Footprint scaling uses locations / 1,000, multiplying exposure, implementation expense, capex, recurring opex, cash-release assumptions and effort by the same factor. Rates, success probabilities and ramp schedules stay fixed. Budget and delivery capacity defaults scale too. This is a comparable-location scenario assumption, not a model of geography, mix, diminishing returns or economies of scale. Existing historical ledger data is never scaled.

Editable rates are capped at 50% of their addressable exposure. This is an input sanity boundary, not a claim that rates below it are feasible. All reductions must preserve service, quality and compliance requirements and be backed by finance-approved counterfactuals and source records.

See [the worked enterprise case](BILLION_DOLLAR_CASE.md) for full assumptions, scenario outputs and the reconciliation.
