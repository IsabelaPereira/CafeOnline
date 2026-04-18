#!/usr/bin/env bash
set -euo pipefail

# Deploy all Supabase Edge Functions
# Usage: ./scripts/deploy-functions.sh

FUNCTIONS_DIR="supabase/functions"

if [ ! -d "$FUNCTIONS_DIR" ]; then
  echo "No functions directory found. Skipping."
  exit 0
fi

for dir in "$FUNCTIONS_DIR"/*/; do
  fn=$(basename "$dir")
  echo "Deploying function: $fn"
  supabase functions deploy "$fn" --no-verify-jwt
done

echo "All functions deployed."
