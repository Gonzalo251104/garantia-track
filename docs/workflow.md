# Gitflow and pull requests

1. Start product and documentation work from `develop` on a `feature/*` branch. Open a PR into `develop`.
2. Start a release from `develop` on a `release/*` branch. Prepare version metadata and release notes, then open a PR into `main`.
3. The main release workflow verifies the commit and publishes an immutable tag and GitHub Release. Publish the approved frontend separately using the [deployment guide](deployment.md).
4. Backmerge `main` into `develop` through a PR. Urgent fixes start from `main` on `hotfix/*` and return through PRs to both permanent branches.

Use English Conventional Commits, the PR checklist and CI results for the current head. Keep merge ancestry when a branch has dependents or when integrating a release. All updates to `main` and `develop` go through PRs.

Before removing a merged remote branch, verify its current head is reachable from `develop` and that no open PR uses it. Keep release tags and the Git history.
