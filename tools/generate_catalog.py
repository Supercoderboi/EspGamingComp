name: Update Game Catalog

on:
  push:
    branches:
      - main
    paths:
      - 'games/**'
      - 'tools/generate_catalog.py'
      - '.github/workflows/update-catalog.yml'
  workflow_dispatch:

jobs:
  build-catalog:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.x'

      - name: Run Catalog Generator
        run: python tools/generate_catalog.py

      - name: Commit and Push Catalog Changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add games.json
          if git diff --staged --quiet; then
            echo "No changes to games.json"
          else
            git commit -m "auto: update games.json catalog"
            git push
          fi
