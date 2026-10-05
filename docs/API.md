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
