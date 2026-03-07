#!/bin/bash
# ============================================================
# VistOS GitHub Setup Script
# Sets secrets and creates the 'production' environment
# via the GitHub CLI (gh) binary already at /tmp/gh_2.45.0_linux_amd64/bin/gh
# ============================================================
set -e

GH="/tmp/gh_2.45.0_linux_amd64/bin/gh"
REPO="herbertavetisyan/vist0s"
SSH_KEY_PATH="${HOME}/.ssh/id_rsa"

# ── 1. Check token ─────────────────────────────────────────
if [ -z "$GITHUB_TOKEN" ]; then
    echo "Usage: GITHUB_TOKEN=ghp_xxxx bash setup-github.sh"
    exit 1
fi

export GH_TOKEN="$GITHUB_TOKEN"

echo "→ Logged in as: $($GH api user -q .login)"

# ── 2. Set PROD_HOST ──────────────────────────────────────
echo "→ Setting PROD_HOST..."
$GH secret set PROD_HOST \
    --repo "$REPO" \
    --body "89.167.61.188"

# ── 3. Set PROD_USER ──────────────────────────────────────
echo "→ Setting PROD_USER..."
$GH secret set PROD_USER \
    --repo "$REPO" \
    --body "root"

# ── 4. Set PROD_SSH_KEY ───────────────────────────────────
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo "ERROR: SSH key not found at $SSH_KEY_PATH"
    exit 1
fi

echo "→ Setting PROD_SSH_KEY..."
$GH secret set PROD_SSH_KEY \
    --repo "$REPO" \
    --body "$(cat $SSH_KEY_PATH)"

# ── 5. Create/ensure 'production' environment ─────────────
echo "→ Creating 'production' environment..."
$GH api \
    --method PUT \
    -H "Accept: application/vnd.github+json" \
    "/repos/$REPO/environments/production" \
    --input - <<'EOF'
{
  "wait_timer": 0,
  "reviewers": [],
  "deployment_branch_policy": null
}
EOF

echo ""
echo "✅ All done! Secrets and environment configured for: $REPO"
echo ""
echo "Configured secrets:"
$GH secret list --repo "$REPO"
