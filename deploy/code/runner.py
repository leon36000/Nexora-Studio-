"""Runs one piece of code inside a Nexora sandbox: python3 -I runner.py <code file> <error file>.

The code runs as `__main__` with the sandbox's own environment. An uncaught exception is written as
{name, value, traceback} to the error file (the controller reads it back) and exits with 1; a
`SystemExit` keeps its own status. Matplotlib's font cache, built when the image was made, is copied
to the writable MPLCONFIGDIR so the first chart does not rebuild it.
"""

import json
import os
import shutil
import sys
import traceback

PREBUILT_MATPLOTLIB = "/opt/nexora-code/matplotlib"


def main() -> None:
    code_path, error_path = sys.argv[1], sys.argv[2]
    config_dir = os.environ.get("MPLCONFIGDIR")
    if config_dir and not os.path.isdir(config_dir) and os.path.isdir(PREBUILT_MATPLOTLIB):
        shutil.copytree(PREBUILT_MATPLOTLIB, config_dir)
    with open(code_path, encoding="utf-8") as handle:
        source = handle.read()
    os.unlink(code_path)
    namespace = {"__name__": "__main__", "__builtins__": __builtins__}
    try:
        exec(compile(source, "<code>", "exec"), namespace)
    except SystemExit:
        raise
    except BaseException as error:  # noqa: BLE001 - every failure of user code is reported
        report = {"name": type(error).__name__, "value": str(error), "traceback": traceback.format_exc()}
        with open(error_path, "w", encoding="utf-8") as handle:
            json.dump(report, handle)
        sys.stdout.flush()
        sys.exit(1)


if __name__ == "__main__":
    main()
