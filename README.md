# Policy Intelligence Workbench POC

This proof of concept demonstrates how written health care policy content can be converted into structured, auditable claim guidance.

## Features

- Compares current and proposed policy text.
- Summarizes operationally meaningful changes.
- Extracts CPT, ICD-10, age, ASA, prior authorization, comorbidity, and documentation signals.
- Evaluates a sample claim against the proposed policy.
- Produces a JSON audit trail with extracted rules and claim checks.

## Run locally

No install is required.

```bash
python3 -m http.server 8000
```

Open:

```text
http://127.0.0.1:8000
```

You can also open `index.html` directly in a browser.

## Demo path

1. Show the current and proposed policy text.
2. Click **Run demo**.
3. Point out the change summary.
4. Show the extracted rules.
5. Show the sample claim decision.
6. End on the audit trail to emphasize traceability.

## Production extension

A production-grade version would add NLP/LLM extraction, expert review, policy version control, FHIR/clinical reasoning mappings, regression tests, and governance controls for privacy, accuracy, and model risk.
