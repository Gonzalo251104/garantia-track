# Gitflow and review

- `main`: released versions only.
- `develop`: integration branch.
- `feature/*`: branch from and propose PRs into `develop`.
- `release/*`: branch from `develop`, PR into `main`, then synchronize into `develop` through a PR.
- `hotfix/*`: branch from `main`, PR into `main`, then synchronize into `develop` through a PR.

Never push directly to `main` or `develop` after repository initialization. Do not merge this prototype locally to simulate a PR. Connect a GitHub repository, push the feature branch and open a real PR first.

Use English Conventional Commits. Example: `feat(prototype): add intake and customer tracking flows`.

Suggested first PR title: `feat(prototype): add responsive repair intake and tracking`.

The PR description should summarize demo-only persistence, list automated checks and browser QA, and explicitly state that authentication, secure tracking and production storage remain out of scope.

Require the CI check, resolved conversations and disabled force pushes on the permanent branches. Do not require self-approval for a solo contributor. Use squash merges for features and merge commits for release synchronization. Use semantic version tags only on released commits in `main`.
