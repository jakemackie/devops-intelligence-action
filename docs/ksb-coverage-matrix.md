# KSB Coverage Matrix

## Design and Paradigm

- K11, S11, S12, B2
  - Evidence:
    - Event-driven workflow trigger and orchestration
    - Architecture and data flow documentation
  - Artifacts:
    - .github/workflows/pr-review.yml
    - docs/architecture-data-flow.md

## Development and Algorithms

- K9, S1, S16
  - Evidence:
    - PR diff parsing
    - Structured AI issue extraction
    - Sorting/filtering of review themes in dashboard analytics
    - JSON-driven data flow between stages
  - Artifacts:
    - scripts/ai-review.js
    - scripts/generate-tests.js
    - pr-dashboard analytics components

## Testing and Debugging

- S4, S6, S7
  - Evidence:
    - Automated PHPUnit generation and execution
    - Coverage extraction and reporting
    - Structured debugging process and QA scenarios
  - Artifacts:
    - .github/workflows/pr-review.yml
    - docs/testing-qa-debug-plan.md

## DevOps and Environment

- K2, S10, B3
  - Evidence:
    - CI/CD automation in GitHub Actions
    - WPCS lint integration with strict/soft gate option
    - Secret-driven API integrations
    - Concurrency control and idempotent ClickUp synchronization
    - Run-summary JSON artifact for auditable workflow evidence
  - Artifacts:
    - .github/workflows/pr-review.yml
    - php-test-repo/.github/workflows/use-ai-review.yml
    - scripts/sync-clickup.js

## Remaining Evidence to Complete

- Add deployment/versioning evidence for reusable workflow release process.
- Add final project report section linking each KSB to screenshots and run logs.
