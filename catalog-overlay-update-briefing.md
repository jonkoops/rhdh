# Briefing: Update plugin catalog overlay to emit OCI refs

## Objective

Update the `redhat-developer/rhdh-plugin-export-overlays` repo so that the generated `dynamic-plugins.default.yaml` uses OCI `package` values instead of `./dynamic-plugins/dist/` local paths. This is required for the RHDH wrapper removal effort.

## JIRA issues

- **RHIDP-13226** — Remove all the GA plugin wrappers from RHDH repo; regenerate catalog index and verify we only have oci refs
- **RHIDP-13227** — Remove all the TP plugin wrappers from RHDH repo; regenerate catalog index and verify we only have oci refs
- **RHIDP-9422** — [Docs] Replace local file wrapper paths with oci:// references in dynamic-plugins.default.yaml and catalog-entities

## How the generation pipeline works

1. **`default.packages.yaml`** lists all plugins (enabled/disabled) by npm package name and support tier. No changes needed here.

2. **Per-plugin metadata** lives at `workspaces/<workspace>/metadata/<plugin>.yaml`. Each file is a `Package` entity with a `spec.dynamicArtifact` field. Example (current state):

   ```yaml
   spec:
     packageName: "@backstage-community/plugin-analytics-provider-segment"
     dynamicArtifact: ./dynamic-plugins/dist/backstage-community-plugin-analytics-provider-segment
     version: 1.27.0
     backstage:
       role: frontend-plugin
       supportedVersions: 1.49.4
   ```

3. **`scripts/generateDynamicPluginsDefaultYaml.sh`** reads `default.packages.yaml`, looks up each package's metadata YAML via `spec.packageName`, extracts `spec.dynamicArtifact` as the `package` value and `spec.appConfigExamples[0].content` as `pluginConfig`, then writes `dynamic-plugins.default.yaml`.

4. **`scripts/generateCatalogIndex.py`** runs after the shell script. It currently injects commented-out OCI alternatives alongside the `./dynamic-plugins/dist/` lines, with instructions like:

   ```yaml
     # - package: oci://ghcr.io/redhat-developer/rhdh-plugin-registry/backstage-community-plugin-analytics-provider-segment:1.27.0-bs_1.49.4
     # new approach using oci images: to switch to the new approach, uncomment
     # the 'package' line above and remove the next two lines, keeping the pluginConfig.
     # enabled: false
     - package: ./dynamic-plugins/dist/backstage-community-plugin-analytics-provider-segment
   ```

5. **`Dockerfile.catalog-index`** (`FROM scratch`) copies the output into `quay.io/rhdh/plugin-catalog-index`.

## What to change

### Primary: Update `dynamicArtifact` in metadata YAML files

For every plugin metadata file under `workspaces/*/metadata/*.yaml`, change `spec.dynamicArtifact` from:

```yaml
dynamicArtifact: ./dynamic-plugins/dist/<plugin-name>
```

to the OCI reference:

```yaml
dynamicArtifact: oci://ghcr.io/redhat-developer/rhdh-plugin-registry/<plugin-name>:<version-tag>
```

The correct OCI tag for each plugin can be derived from `generateCatalogIndex.py`'s existing logic — it already knows the mapping. Alternatively, look at the `plugin_builds/` directory or the commented-out OCI lines it currently injects.

### Secondary: Clean up `generateCatalogIndex.py`

Once metadata files use OCI refs directly, the logic in `generateCatalogIndex.py` that injects commented-out OCI alternatives becomes dead code. Consider:

- Removing or simplifying the block that pattern-matches `./dynamic-plugins/dist/` lines and injects commented OCI refs
- The script may still need to inject tag comments — review before removing entirely

### No changes needed to

- `default.packages.yaml` — plugin list and support tiers are unchanged
- `Dockerfile.catalog-index` — it just copies the output
- `scripts/generateDynamicPluginsDefaultYaml.sh` — it reads `dynamicArtifact` generically, so OCI refs will flow through unchanged

## Why this matters

In RHDH's Helm values, the `package` field is a **literal string merge key**. When a user (or CI) provides:

```yaml
global:
  dynamic:
    plugins:
      - package: ./dynamic-plugins/dist/some-plugin
        disabled: false
```

This only overrides an entry in `dynamic-plugins.default.yaml` if the `package` value matches **exactly**. Currently, the default YAML uses `./dynamic-plugins/dist/` paths, so CI values files in `redhat-developer/rhdh` that reference OCI paths create **duplicate** entries instead of overrides — losing inherited `pluginConfig` and potentially double-loading plugins.

Once the catalog index uses OCI refs as `package` values, CI values files using the same OCI refs will correctly override the defaults.

## OCI artifact registry

Plugins are published at:

```
ghcr.io/redhat-developer/rhdh-plugin-registry/<plugin-name>:<tag>
```

Tags follow the pattern: `<plugin-version>-bs_<backstage-version>` (e.g., `1.27.0-bs_1.49.4` or `1.27.0-bs_1.52.0`).

To list available tags for a plugin:

```bash
# Get auth token
TOKEN=$(curl -s "https://ghcr.io/token?scope=repository:redhat-developer/rhdh-plugin-registry/<plugin-name>:pull&service=ghcr.io" | jq -r '.token')

# List tags
curl -s -H "Authorization: Bearer $TOKEN" "https://ghcr.io/v2/redhat-developer/rhdh-plugin-registry/<plugin-name>/tags/list" | jq '.tags'
```

## Known gaps: plugins without bs_1.52.0 OCI artifacts

These plugins do not yet have OCI artifacts tagged for Backstage 1.52.0 (the current target):

| Plugin | Latest available OCI tag |
|--------|-------------------------|
| `backstage-community-plugin-catalog-backend-module-keycloak` | `bs_1.49.4__3.19.2` |
| `roadiehq-scaffolder-backend-module-http-request` | `bs_1.49.4__5.6.0` |
| `roadiehq-backstage-plugin-github-pull-requests` | `bs_1.49.4__3.7.0` |
| `red-hat-developer-hub-backstage-plugin-dynamic-home-page` | `bs_1.49.4__1.13.1` |
| `backstage-community-plugin-ocm-backend` | `bs_1.45.3__5.12.2` |
| `backstage-community-plugin-ocm` | `bs_1.45.3__5.11.1` |

For these, use the latest available tag until newer builds are published.

## Validation

After making changes:

1. Run the generation pipeline locally and verify `dynamic-plugins.default.yaml` contains `oci://` package values instead of `./dynamic-plugins/dist/` paths
2. Verify `pluginConfig` blocks are preserved unchanged
3. Verify enabled/disabled states are preserved
4. Check that the total plugin count matches before and after
