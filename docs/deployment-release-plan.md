# Deployment and Release Plan

## Objective

Provide a repeatable release process for the reusable DevOps Intelligence workflow and evidence for final submission.

## Release Strategy

1. Stabilize main branch
- Ensure workflow and scripts pass syntax checks.
- Validate one end-to-end PR run in a caller repository.

2. Create version tag
- Create semantic version tags (for example v1.0.0).
- Move stable consumer references from main to a version tag.
- Trigger tagged release publication workflow.

3. Consumer rollout
- Update caller workflows to use tagged workflow reference.
- Keep a change log entry per release.

## Operational Verification Checklist

- PR trigger executes reusable workflow.
- WPCS step runs and records results.
- AI review and AI test generation outputs are present.
- ClickUp parent task and subtasks sync successfully.
- PR comment includes all pipeline sections.
- Evidence artifact bundle uploads successfully.

## Rollback Plan

- Revert caller workflow reference to previous stable tag.
- Disable strict lint gate if production noise causes false blocks.
- Use previous script revision from tagged release.

## Submission Evidence

- Tag and release notes screenshot
- Example PR run log screenshot
- Uploaded artifact bundle screenshot
- Final report section mapping deployment evidence to K2/S10/B3

## Implemented Automation for Week 9

- .github/workflows/release-evidence.yml
	- Manual workflow to validate scripts and publish evidence bundle artifacts.
- .github/workflows/release-on-tag.yml
	- Tag-triggered workflow to publish GitHub Releases with evidence docs attached.
