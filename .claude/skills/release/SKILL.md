---
name: release
description: Publish the website by pushing main, which GitHub Pages deploys to https://coderemoteapp.github.io/web/. Restamps asset hashes first. Use only when the user runs /release or explicitly asks to release, publish or deploy the website.
disable-model-invocation: true
---

# Release the website

GitHub Pages serves `main` as is: pushing `main` is the release. There are no tags or version
numbers. Invoking this skill is the user's go-ahead to push, so don't ask for confirmation
unless a check below fails or something looks off.

## 1. Preflight

All of these must hold; otherwise stop and report what to fix:

- The current branch is `main`.
- The working tree is clean (`git status --porcelain` prints nothing). Don't commit the user's
  uncommitted work for them.
- `main` isn't behind the remote: `git fetch origin main` then
  `git merge-base --is-ancestor origin/main HEAD`.

## 2. Restamp asset hashes and check translations

```sh
scripts/version-assets.sh
node scripts/build-i18n.mjs
node scripts/check-i18n.mjs --built
```

If `git status --porcelain` now shows changed pages, the stamps or generated language pages were
stale: commit them on `main` (only those files):

```sh
git commit -am "chore: Restamp asset hashes and rebuild languages"
```

`check-i18n` also lists untranslated or outdated segments. Those don't block a release (they show in
English), but mention how many are left in the report.

## 3. Push

If `git rev-parse HEAD` equals `git rev-parse origin/main`, there's nothing to release: say so
and stop. Otherwise list what goes out (`git log --oneline origin/main..HEAD`) and push:

```sh
git push origin main
```

## 4. Report and stop

Don't wait for the Pages deploy. One short summary: the commits that went out, and where to
follow the deploy (`https://github.com/CodeRemoteApp/web/actions`); the site updates at
https://coderemoteapp.github.io/web/ within a few minutes, and visitors may see cached pages for
up to 10 more.
