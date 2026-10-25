import { SANDBOX_INPUT_DIR, SANDBOX_OUTPUT_DIR } from '@/lib/execution/remote-sandbox/paths'

/**
 * What an agent is told about its Python interpreter tool (the Function block set to Python). It
 * replaces the general Function description, which also talks about JavaScript, Shell and
 * network calls the Python sandbox does not offer.
 */
export const PYTHON_INTERPRETER_TOOL_DESCRIPTION = `Run Python 3 code in an isolated sandbox with pandas, numpy, openpyxl and matplotlib. There is no network access and no package installation. Use it for exact calculations, data analysis and charts instead of computing in your head.
The code runs as a script: print() what you want to read back, or set __sim_result__ to a JSON-serializable value. Files attached to the conversation are mounted read-only under ${SANDBOX_INPUT_DIR} (list that directory to find their names; names are sanitized).
To give the user a file (chart, CSV, Excel workbook), save it under ${SANDBOX_OUTPUT_DIR}, for example plt.savefig("${SANDBOX_OUTPUT_DIR}/chart.png", dpi=150, bbox_inches="tight") after matplotlib.use("Agg"), or df.to_excel("${SANDBOX_OUTPUT_DIR}/result.xlsx"). Every file saved there is returned in the "files" output and shown to the user. Never claim a chart or total without running the code that produced it.`
