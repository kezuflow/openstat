from __future__ import annotations

import argparse
from collections.abc import Sequence

from .scaffold import scaffold_project


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="openstat",
        description="OpenStat SDK project tools.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser(
        "init",
        help="Add OpenStat starter files to a Python project.",
    )
    init_parser.add_argument(
        "--path",
        default=".",
        help="Project directory to scaffold. Defaults to the current directory.",
    )
    init_parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing OpenStat starter files.",
    )

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = create_parser().parse_args(argv)

    if args.command == "init":
        result = scaffold_project(args.path, force=args.force)
        for path in result.created:
            print(f"created {path}")
        for path in result.skipped:
            print(f"skipped {path} (already exists)")

        if result.created:
            print("OpenStat starter files are ready.")
        else:
            print("OpenStat starter files already exist. Use --force to overwrite them.")
        return 0

    raise AssertionError(f"Unhandled command: {args.command}")
