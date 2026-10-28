# Gitflow and PRs

Permanent branches are main (releases) and develop (integration). Feature branches normally start from develop. Release branches start from develop and hotfix branches from main. All changes to permanent branches require actual PRs.

The initial bootstrap used stacked feature branches:

- feature/navigable-prototype → develop
- feature/supabase-integration → feature/navigable-prototype

PR #1 was merged with a merge commit to retain its ancestry, then PR #2 was retargeted to develop. The resulting second PR contains only the integration changes, without replaying the prototype. Future independent features start from develop. Do not merge into develop or main locally and do not push them directly.

The remote is https://github.com/Gonzalo251104/garantia-track. PR #1 and PR #2 integrate into develop in that order. docs/pr-supabase.md records the integration review. Main stays unchanged until a separately reviewed release PR.

Use English Conventional Commits. Require lint, syntax checks, tests and build on every PR. The workflow includes feature targets and edited events so retargeting a PR reruns CI. Branch protection is not yet configured; require checks and resolved conversations without impossible self-approval rules for a solo author. Use merge commits for dependent feature chains and Gitflow integration; squash an independent feature only when no open branch depends on its commits.

This branch increments the working package version to 0.2.0. It is unreleased; create a semantic version tag only on main after release review.
