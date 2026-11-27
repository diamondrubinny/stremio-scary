#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-2.0-only
# Installs web/ dependencies in a sandbox that may not download GitHub tarballs.
#
# web/pnpm-lock.yaml pins a few dependencies to https://codeload.github.com/<owner>/<repo>/tar.gz/<sha>.
# Some development sandboxes refuse those downloads but allow `git fetch` of public repositories. This script
# fetches the same commits with git and installs them through temporary pnpm overrides. The tracked
# pnpm-workspace.yaml and pnpm-lock.yaml are restored afterwards, so nothing here ever reaches a commit.
#
# CI and normal machines do not need this: run `pnpm install --frozen-lockfile` in web/ instead.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB="$ROOT/web"
CACHE="${SCARY_GIT_DEPS:-$ROOT/.cache/git-deps}"
mkdir -p "$CACHE"

restore() { git -C "$ROOT" checkout -- web/pnpm-workspace.yaml web/pnpm-lock.yaml; }
trap restore EXIT

overrides=""
# Lines look like:  langs@https://codeload.github.com/Stremio/nodejs-langs/tar.gz/<40 hex>:
while read -r name owner repo sha; do
    dir="$CACHE/$repo-$sha"
    if [ ! -f "$dir/package.json" ]; then
        rm -rf "$dir"
        git init -q "$dir"
        git -C "$dir" fetch -q --depth 1 "https://github.com/$owner/$repo" "$sha"
        git -C "$dir" checkout -q FETCH_HEAD
    fi
    overrides+="  '$name': 'file:$dir'"$'\n'
    echo "git dependency ready: $name ($owner/$repo@${sha:0:7})"
done < <(sed -nE "s#^ +'?([^@' ]+)@https://codeload\.github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)/tar\.gz/([0-9a-f]{40})'?:\$#\1 \2 \3 \4#p" "$WEB/pnpm-lock.yaml" | sort -u)

if [ -z "$overrides" ]; then
    echo "No git-hosted dependencies found in the lockfile; running a normal install."
    (cd "$WEB" && pnpm install --frozen-lockfile)
    exit 0
fi

# The temporary overrides join the ones the workspace file already has, if any.
if grep -q '^overrides:' "$WEB/pnpm-workspace.yaml"; then
    printf '%s' "$overrides" | sed -i '/^overrides:/r /dev/stdin' "$WEB/pnpm-workspace.yaml"
else
    printf '\noverrides:\n%s' "$overrides" >> "$WEB/pnpm-workspace.yaml"
fi
(cd "$WEB" && pnpm install --no-frozen-lockfile)
echo "Done. Run web/ scripts with: pnpm --config.verify-deps-before-run=false run <script>"
