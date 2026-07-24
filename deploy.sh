#!/bin/bash
# Load secrets from .env file (not committed to git)
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

npx wrangler pages deploy ./dist --project-name fashionableexpert --branch main
