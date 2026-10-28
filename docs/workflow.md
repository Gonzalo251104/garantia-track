# Gitflow and PRs

Permanent branches are main (releases) and develop (integration). Feature branches normally start from develop. Release branches start from develop and hotfix branches from main. All changes to permanent branches require actual PRs.

The first prototype is still unmerged. This integration therefore uses a stacked feature branch:

- feature/navigable-prototype → develop
- feature/supabase-integration → feature/navigable-prototype

After the prototype PR merges, retarget the integration PR to develop, rebasing if a squash merge changed its ancestry. Do not merge into develop or main locally and do not push them directly.

No remote is configured and no real PR has been opened. docs/pr-supabase.md contains the complete review description; it is not a substitute for a PR.

Use English Conventional Commits. Require lint, syntax checks, tests and build on every PR. The workflow includes feature targets for stacked PRs. Configure branch protection when the remote exists; use required checks and resolved conversations, without impossible self-approval rules for a solo author. Squash feature PRs and preserve merge commits for release synchronization.

This branch increments the working package version to 0.2.0. It is unreleased; create a semantic version tag only on main after release review.
