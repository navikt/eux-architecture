#!/usr/bin/env python3
"""
Tab-align columns for sedFlyt_NeessiRina output files.

Reads tab-separated rows from stdin, applies tab alignment,
inserts section separators, and writes to stdout.

Usage:
    python format-output.py < raw_rows.tsv > formatted_output.txt
    python format-output.py input.tsv output.txt
"""

import sys
import math
import re


TAB_SIZE = 8


def parse_indeks(indeks: str) -> tuple:
    """Parse hierarchical indeks like '1.1.7.1.4.2.' into a sortable tuple."""
    parts = [p for p in indeks.strip().rstrip(".").split(".") if p]
    try:
        return tuple(int(p) for p in parts)
    except ValueError:
        return ()


def first_section(indeks: str) -> str:
    """Extract first digit of indeks for section separator logic."""
    parts = [p for p in indeks.strip().rstrip(".").split(".") if p]
    return parts[0] if parts else ""


def compute_tab_aligned(rows: list[list[str]]) -> str:
    """Apply tab alignment to rows and return formatted output string."""
    if not rows:
        return ""

    num_cols = max(len(row) for row in rows)

    # Pad rows to uniform column count
    for row in rows:
        while len(row) < num_cols:
            row.append("")

    # Compute max width per column (excluding last column)
    max_widths = [0] * num_cols
    for row in rows:
        for col_idx in range(num_cols):
            max_widths[col_idx] = max(max_widths[col_idx], len(row[col_idx]))

    # Compute target width per column (tab-aligned)
    targets = []
    for col_idx in range(num_cols - 1):
        target = ((max_widths[col_idx] // TAB_SIZE) + 1) * TAB_SIZE
        targets.append(target)

    # Build output lines
    lines = []
    prev_section = None

    for row in rows:
        indeks = row[0] if row else ""
        current_section = first_section(indeks)

        # Insert blank line between sections
        if prev_section is not None and current_section and current_section != prev_section:
            lines.append("")
        if current_section:
            prev_section = current_section

        # Build tab-aligned line
        parts = []
        for col_idx in range(num_cols):
            cell = row[col_idx]
            if col_idx < num_cols - 1:
                target = targets[col_idx]
                tabs_needed = max(1, math.ceil((target - len(cell)) / TAB_SIZE))
                parts.append(cell + "\t" * tabs_needed)
            else:
                parts.append(cell)

        lines.append("".join(parts).rstrip())

    return "\n".join(lines) + "\n"


def main():
    if len(sys.argv) >= 2:
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            raw = f.read()
    else:
        raw = sys.stdin.read()

    rows = []
    for line in raw.splitlines():
        if line.strip():
            # Split on one or more tabs to handle both raw and pre-formatted input
            rows.append(re.split(r"\t+", line))

    result = compute_tab_aligned(rows)

    if len(sys.argv) >= 3:
        with open(sys.argv[2], "w", encoding="utf-8") as f:
            f.write(result)
        print(f"Wrote {len(result.splitlines())} lines to {sys.argv[2]}")
    else:
        sys.stdout.write(result)


if __name__ == "__main__":
    main()
