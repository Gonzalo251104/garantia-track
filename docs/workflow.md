# Gitflow and PRs

Permanent branches are main (releases) and develop (integration). Feature branches normally start from develop. Release branches start from develop and hotfix branches from main. All changes to permanent branches require actual PRs.

The first prototype is still unmerged. This integration therefore uses a stacked feature branch:

- feature/navigable-prototype → develop
- feature/supabase-integration → feature/navigable-prototype

After the prototype PR merges, retarget the integration PR to develop, rebasing if a squash merge changed its ancestry. Do not merge into develop or main locally and do not push them directly.

The remote is https://github.com/Gonzalo251104/garantia-track. PR #1 targets develop; draft PR #2 is stacked onto feature/navigable-prototype. Both are open and neither is merged. docs/pr-supabase.md records the review description. Remote permanent branches were initialized with an empty marker, and all application code is proposed through PRs.

Use English Conventional Commits. Require lint, syntax checks, tests and build on every PR. The workflow includes feature targets for stacked PRs. Branch protection is not yet configured; require checks and resolved conversations without impossible self-approval rules for a solo author. Squash feature PRs and preserve merge commits for release synchronization.

This branch increments the working package version to 0.2.0. It is unreleased; create a semantic version tag only on main after release review.
