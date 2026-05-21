# Dev vs DevOps Roles in This Project

## Developer Responsibilities

- Implement application and feature code changes.
- Address AI review findings and WPCS lint issues.
- Review generated PHPUnit tests and refine where needed.
- Improve business logic and maintain code quality.

## DevOps Responsibilities

- Maintain event-driven GitHub workflow automation.
- Manage CI/CD execution, step reliability, and concurrency controls.
- Securely manage secrets and integration credentials.
- Maintain observability and evidence artifacts for audit and assessment.

## Shared Responsibilities

- Define quality gates and acceptable failure modes.
- Continuously improve automation accuracy and pipeline speed.
- Triage failures and perform structured debugging.
- Align delivery outputs with stakeholder needs.

## Security Expectations

- Store API keys only in secure secret stores.
- Do not hardcode sensitive values in code or docs.
- Restrict token scope to the minimum required permissions.
- Avoid writing secret values to logs or artifacts.
