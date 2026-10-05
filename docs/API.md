# API contract

Start with `npm start`. The default address is `http://127.0.0.1:3000`.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Health and synthetic-demo designation |
| `/api/optimize` | POST | Optimize supplied scenario against bundled candidates |
| `/api/evaluate` | POST | Evaluate a custom selection against constraints |
| `/api/ledger` | GET | Reconciled synthetic historical evidence |
| `/data/initiatives.json` | GET | Full demo assumptions and operating guardrails |

## Scenario

```json
{
  "scenario": {
    "budget": 600000,
    "capacity": 24,
    "realization": 1,
    "delay": 0,
    "months": 12
  }
}
```

Fields shown are defaults. Budget and capacity must be finite nonnegative numbers. Realization is 0–1.5, delay is an integer from 0–12, and months is an integer from 1–36. API input uses fixed bundled candidates; to work with a custom candidate dataset, import the pure engine and call `optimize(items, scenario)` after its validation, or replace the synthetic JSON file locally.

## Evaluate a selection

```bash
curl -X POST http://localhost:3000/api/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"ids":["cloud","license"],"scenario":{"budget":100000,"capacity":5}}'
```

Returns `modelVersion`, `ids`, `feasible`, `issues`, monthly financial components, per-initiative forecasts, total `ebitda`, modeled `cash`, steady-state `runRate`, upfront `investment`, `effort`, first `paybackMonth`, and seeded `uncertainty` results. Optimization additionally reports the objective, combinations evaluated and feasible count.

`feasible: false` is a valid analysis response with HTTP 200; callers must inspect the issues before treating a selection as actionable. Unknown or duplicate IDs and invalid parameters return HTTP 400. Invalid JSON returns 400, request bodies above 64 KiB return 413, unknown paths return 404, and unsupported methods return 405.

All endpoints are local, stateless, and unauthenticated. They do not write to the ledger or launch business actions. Do not expose this prototype directly to the public internet as a production service.


## Enterprise profile (v2)

The UI and CLI default to the enterprise profile. For backward compatibility, API requests without `profile` keep the original mid-market behavior. Use `profile: "enterprise"` explicitly.

```json
{
  "profile": "enterprise",
  "enterprise": {
    "sites": 1000,
    "levers": {
      "global-cloud": {"rate": 0.12, "coverage": 0.8, "expenseConversion": 1}
    }
  },
  "scenario": {"budget": 900000000, "capacity": 1600, "realization": 1, "delay": 0, "months": 12}
}
```

POST this to `/api/optimize`. `/api/evaluate` accepts the same parameters plus `ids`. Locations are integer 50–5000. Rate is 0–0.5; coverage and expense conversion are 0–1. Unspecified lever fields use the synthetic defaults. Unknown lever IDs or override fields return 400; arbitrary dollar benefit overrides are not accepted. Costs and exposure scale together with location count. Scenario fields override the scaled defaults.

Enterprise responses add:

- `claimStatus: "synthetic-model-only"`.
- `enterprise`: footprint, revenue, baseline EBITDA, unique annual cost exposure.
- `underwriting`: expanded per-lever exposure, rate, coverage, expense conversion, probability and selection.
- `savings`: Year 1 net cost savings, recurring expected net cost savings, gross revenue contribution, all opex and implementation expense, capex, cash release and quarterly totals.
- `scenario`: the effective parameters after defaults and overrides.

GET `/api/enterprise` returns the expanded base-case candidate set and context. Static browser modules `/src/enterprise.mjs` and `/data/enterprise.json` are explicitly allowed. None of these routes persist scenario changes or establish actual savings.
