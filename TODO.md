# Wrapper Removal — Follow-up TODOs

## Update the plugin catalog overlay (separate PR)

- [ ] Update `dynamicArtifact` in per-plugin metadata YAML files to use OCI references
  - This was called out in [kadel's review comment on PR #4909](https://github.com/redhat-developer/rhdh/pull/4909)
  - **Source repo:** [`redhat-developer/rhdh-plugin-export-overlays`](https://github.com/redhat-developer/rhdh-plugin-export-overlays)
  - **What to change:** Each plugin's metadata YAML at `workspaces/<workspace>/metadata/<plugin>.yaml` has a `spec.dynamicArtifact` field currently set to `./dynamic-plugins/dist/<name>`. Update these to the corresponding OCI reference, e.g. `oci://ghcr.io/redhat-developer/rhdh-plugin-registry/<name>:<tag>`
  - **Generator script:** `scripts/generateDynamicPluginsDefaultYaml.sh` reads `dynamicArtifact` from metadata and emits it as the `package` value in `dynamic-plugins.default.yaml`
  - **Post-generation:** `scripts/generateCatalogIndex.py` already has logic to inject `oci://` references as commented-out alternatives alongside the `./dynamic-plugins/dist/` lines — once the metadata is updated, this comment injection becomes unnecessary
  - **Input file:** `default.packages.yaml` lists all enabled/disabled plugins; no changes needed there
  - **Output:** The generated `dynamic-plugins.default.yaml` is baked into `quay.io/rhdh/plugin-catalog-index` via `Dockerfile.catalog-index`
  - **Impact on RHDH:** Once the catalog index image uses OCI refs as `package` values, the CI values files in this repo (`.ci/pipelines/value_files/`) will correctly override (not duplicate) entries by matching on the same `package` key
  - Needs to happen before/alongside the wrapper removal landing

## OCI artifacts not yet published for Backstage 1.52

- [ ] `backstage-community-plugin-catalog-backend-module-keycloak` — latest is `bs_1.49.4__3.19.2`
- [ ] `roadiehq-scaffolder-backend-module-http-request` — latest is `bs_1.49.4__5.6.0`
- [ ] `roadiehq-backstage-plugin-github-pull-requests` — latest is `bs_1.49.4__3.7.0`
- [ ] `red-hat-developer-hub-backstage-plugin-dynamic-home-page` — latest is `bs_1.49.4__1.13.1` (wrapper was 1.13.4, no matching OCI artifact)
- [ ] `backstage-community-plugin-ocm-backend` — latest is `bs_1.45.3__5.12.2`
- [ ] `backstage-community-plugin-ocm` — latest is `bs_1.45.3__5.11.1`

## Documentation: local development plugin installation

- [ ] Update `docs/index.md` "Running Locally with the Optional Plugins" section
  - Step 4 is vague — doesn't explain how to actually install plugins into `dynamic-plugins-root/` locally
  - Document using `populate.sh` or the `install-dynamic-plugins` CLI + skopeo
  - Add prerequisite notes for optional plugins (e.g., Home Page)

## Documentation: "deprecated wrapper syntax" references

- [ ] Audit downstream/official docs for "deprecated wrapper syntax" references
  - The bare package name syntax (e.g., `package: 'plugin-name'`) is **not** a wrapper feature — it resolves against `dynamic-plugins.default.yaml` includes and is still valid
  - `docs/index.md` had several "or using the deprecated wrapper syntax" blocks that conflated this with wrappers — removed in this PR
  - Check if similar language exists in official Red Hat docs (docs.redhat.com)

## EOL release branch cleanup

- [ ] Delete EOL release branches (`release-1.6`, `release-1.7`, `release-1.8`)
- [ ] Remove `.github/workflows/pr-1.8.yaml` (comment in the file says: delete once 1.10 is live)
- [ ] Audit and clean up any other workflow files or configs tied to EOL releases

## Close Nick's PR

- [ ] Close [PR #4909](https://github.com/redhat-developer/rhdh/pull/4909) once our replacement PR is merged
