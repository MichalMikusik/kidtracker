"""
check_action_versions.py

Scans all .github/workflows/ files for `uses: owner/repo@version` references.
Detects cross-pipeline version inconsistencies and checks each action against
the latest GitHub release/tag via the `gh` CLI.

Writes to $GITHUB_OUTPUT:
  has_findings  - "true" if any outdated or inconsistent entries exist
  report        - Markdown text ready for embedding in an issue body
"""

import os
import re
import subprocess
import sys
from collections import defaultdict

WORKFLOWS_DIR = ".github/workflows"


# ── 1. Parse all workflow files ──────────────────────────────────────────────
# action_versions : { "owner/repo" -> { "v1", "v2", ... } }
# action_files    : { ("owner/repo", "v1") -> ["file1.yml", ...] }
action_versions: dict[str, set[str]] = defaultdict(set)
action_files: dict[tuple[str, str], list[str]] = defaultdict(list)

for fname in sorted(os.listdir(WORKFLOWS_DIR)):
    if not fname.endswith((".yml", ".yaml")):
        continue
    with open(os.path.join(WORKFLOWS_DIR, fname)) as fh:
        for line in fh:
            stripped = line.lstrip()
            # Skip commented-out lines
            if stripped.startswith("#"):
                continue
            m = re.search(
                r'uses:\s+([a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+)@([a-zA-Z0-9._-]+)',
                line,
            )
            if m:
                action, ver = m.group(1), m.group(2)
                action_versions[action].add(ver)
                if fname not in action_files[(action, ver)]:
                    action_files[(action, ver)].append(fname)


# ── 2. Per-action: fetch latest release or tag from GitHub API ───────────────
def latest_version(action: str) -> str:
    for endpoint in [
        f"repos/{action}/releases/latest",
        f"repos/{action}/tags",
    ]:
        try:
            jq = ".tag_name" if "releases" in endpoint else ".[0].name"
            r = subprocess.run(
                ["gh", "api", endpoint, "--jq", jq],
                capture_output=True, text=True, timeout=15,
            )
            v = r.stdout.strip()
            if v and v != "null" and r.returncode == 0:
                return v
        except Exception:
            pass
    return "unknown"


# ── 3. Build Markdown report ─────────────────────────────────────────────────
lines: list[str] = []
has_findings = False

# Section A: cross-pipeline inconsistencies
lines.append("### Version Inconsistencies Across Pipelines")
lines.append("_Same action pinned at different versions in different workflow files_")
lines.append("")
inconsistencies_found = False

for action in sorted(action_versions):
    vers = sorted(action_versions[action])
    if len(vers) > 1:
        inconsistencies_found = True
        has_findings = True
        lines.append(f"- **{action}**: `{'`, `'.join(vers)}`")
        for v in vers:
            files_using_v = action_files.get((action, v), [])
            lines.append(f"  - `{v}` → {', '.join(sorted(files_using_v))}")

if not inconsistencies_found:
    lines.append("_No inconsistencies found._")
lines.append("")

# Section B: staleness table
lines.append("### Staleness Check")
lines.append("")
lines.append("| Action | Used | Latest | Status | Pipelines |")
lines.append("|--------|------|--------|--------|-----------|")

for action in sorted(action_versions):
    latest = latest_version(action)
    for ver in sorted(action_versions[action]):
        if latest == "unknown":
            status = "unknown"
        elif ver == latest:
            status = "OK"
        else:
            status = "UPDATE AVAILABLE"
            has_findings = True
        pipelines = ", ".join(action_files.get((action, ver), []))
        lines.append(f"| {action} | `{ver}` | `{latest}` | {status} | {pipelines} |")

report = "\n".join(lines)


# ── 4. Write report.md and issue_body.md, signal has_findings to GITHUB_OUTPUT ──────
import datetime

generated = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
run_url = os.environ.get("RUN_URL", "(local run)")

header = f"""## GitHub Actions Version Staleness Report

**Generated:** {generated}
**Run:** {run_url}

---

"""

footer = """
---

### Remediation

Edit the `uses:` lines in affected files under `.github/workflows/`.
Align all pipelines to the same version of each action.
Re-run affected pipelines after updating to confirm compatibility.
"""

with open("report.md", "w") as rf:
    rf.write(report + "\n")

with open("issue_body.md", "w") as bf:
    bf.write(header + report + footer)

github_output = os.environ.get("GITHUB_OUTPUT")
if not github_output:
    print(report)
    sys.exit(0)

with open(github_output, "a") as out:
    out.write(f"has_findings={'true' if has_findings else 'false'}\n")
