/**
 * DBMS Learn & Run: Core Client-Side Logic
 * Handles interactive SQL execution, results rendering, and connection testing.
 */

document.addEventListener("DOMContentLoaded", () => {
    initQueryRunner();
    initConnectionTester();
    initQuickTableLoaders();
    initHeaderConnectionStatus();
});

/**
 * Initializes the SQL Query Execution panel
 */
function initQueryRunner() {
    const runBtn = document.getElementById("btn-run-query");
    const clearBtn = document.getElementById("btn-clear-query");
    const resetBtn = document.getElementById("btn-reset-query");
    const loadExampleBtn = document.getElementById("btn-load-example");
    const queryInput = document.getElementById("sql-query-input");
    const resultsContainer = document.getElementById("query-results-container");
    const statusAlert = document.getElementById("query-status-alert");
    const executionStats = document.getElementById("execution-stats");

    if (!runBtn || !queryInput) return;

    // Cache original sample query for Reset button
    const defaultQuery = queryInput.getAttribute("data-default-query") || queryInput.value;

    // 1. Run Query Handler
    runBtn.addEventListener("click", () => {
        const sql = queryInput.value.trim();
        if (!sql) {
            showAlert("Please enter a SQL statement to execute.", "warning");
            return;
        }

        runBtn.disabled = true;
        runBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Executing...`;
        
        fetch("/api/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: sql })
        })
        .then(res => res.json())
        .then(data => {
            runBtn.disabled = false;
            runBtn.innerHTML = `<i class="bi bi-play-fill me-1"></i> Run Query`;
            renderQueryResults(data);
        })
        .catch(err => {
            runBtn.disabled = false;
            runBtn.innerHTML = `<i class="bi bi-play-fill me-1"></i> Run Query`;
            showAlert(`Network or server error: ${err.message}`, "danger");
        });
    });

    // 2. Clear Query Handler
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            queryInput.value = "";
            queryInput.focus();
        });
    }

    // 3. Reset Query Handler
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            queryInput.value = defaultQuery;
            queryInput.focus();
        });
    }

    // 4. Load Example Handler
    if (loadExampleBtn) {
        loadExampleBtn.addEventListener("click", (e) => {
            const exampleQuery = e.target.getAttribute("data-example") || defaultQuery;
            queryInput.value = exampleQuery;
            queryInput.focus();
        });
    }

    // Helper: Show status message alert
    function showAlert(message, type = "info") {
        if (!statusAlert) return;
        statusAlert.className = `alert alert-${type} py-2 px-3 mb-3 d-flex align-items-center justify-content-between`;
        statusAlert.innerHTML = `<span><i class="bi bi-info-circle me-2"></i>${escapeHtml(message)}</span>`;
        statusAlert.classList.remove("d-none");
    }

    // Helper: Render table output or modification feedback
    function renderQueryResults(response) {
        if (!resultsContainer) return;

        if (!response.success) {
            showAlert(response.error || "Query execution failed.", "danger");
            resultsContainer.innerHTML = `
                <div class="text-center text-muted p-4 border rounded bg-white">
                    <i class="bi bi-exclamation-triangle text-danger fs-2 d-block mb-2"></i>
                    <span class="text-danger fw-semibold">${escapeHtml(response.error || "An error occurred")}</span>
                </div>`;
            if (executionStats) executionStats.textContent = `Execution failed (${response.execution_time_ms || 0} ms)`;
            return;
        }

        showAlert(response.message, "success");
        if (executionStats) {
            executionStats.textContent = `${response.row_count || response.affected_rows || 0} rows | ${response.execution_time_ms} ms`;
        }

        if (response.is_query && response.columns && response.columns.length > 0) {
            if (response.rows.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="text-center text-muted p-4 border rounded bg-white">
                        <i class="bi bi-inbox fs-3 d-block mb-1"></i>
                        Empty result set (0 rows returned).
                    </div>`;
                return;
            }

            let tableHtml = `
                <div class="result-table-container shadow-sm">
                    <table class="table table-sql table-hover table-bordered table-striped mb-0">
                        <thead>
                            <tr>
                                <th class="text-secondary" style="width: 50px;">#</th>
                                ${response.columns.map(c => `<th>${escapeHtml(c)}</th>`).join("")}
                            </tr>
                        </thead>
                        <tbody>
                            ${response.rows.map((row, idx) => `
                                <tr>
                                    <td class="text-secondary fw-semibold">${idx + 1}</td>
                                    ${response.columns.map(c => {
                                        const val = row[c];
                                        if (val === null) return `<td><span class="badge bg-light text-muted border">NULL</span></td>`;
                                        return `<td>${escapeHtml(String(val))}</td>`;
                                    }).join("")}
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>`;
            resultsContainer.innerHTML = tableHtml;
        } else {
            resultsContainer.innerHTML = `
                <div class="text-center text-success p-4 border rounded bg-white">
                    <i class="bi bi-check-circle-fill fs-2 d-block mb-2"></i>
                    <h6 class="fw-bold mb-1">Command Executed Successfully</h6>
                    <p class="text-muted small mb-0">${escapeHtml(response.message)}</p>
                </div>`;
        }
    }
}

/**
 * Initializes quick loaders for inspecting tables directly from the dashboard
 */
function initQuickTableLoaders() {
    document.querySelectorAll(".btn-load-table").forEach(btn => {
        btn.addEventListener("click", () => {
            const table = btn.getAttribute("data-table");
            const queryInput = document.getElementById("sql-query-input");
            const runBtn = document.getElementById("btn-run-query");
            if (queryInput && table) {
                queryInput.value = `SELECT * FROM ${table} LIMIT 10;`;
                queryInput.scrollIntoView({ behavior: "smooth", block: "center" });
                if (runBtn) runBtn.click();
            }
        });
    });
}

/**
 * Initializes the modal for verifying or updating MySQL connection settings
 */
function initConnectionTester() {
    const testForm = document.getElementById("form-test-connection");
    const testBtn = document.getElementById("btn-test-conn-submit");
    const applyBtn = document.getElementById("btn-apply-conn-submit");
    const testFeedback = document.getElementById("test-conn-feedback");

    if (!testForm) return;

    function getFormData() {
        const passwordInput = document.getElementById("modal-mysql-password");
        const userInput = document.getElementById("modal-mysql-user");
        const hostInput = document.getElementById("modal-mysql-host");
        const portInput = document.getElementById("modal-mysql-port");
        const dbInput = document.getElementById("modal-mysql-database");

        return {
            user: userInput ? userInput.value.trim() : "root",
            password: passwordInput ? passwordInput.value : "",
            host: hostInput ? hostInput.value.trim() : "localhost",
            port: portInput ? parseInt(portInput.value.trim()) || 3306 : 3306,
            database: dbInput ? dbInput.value.trim() : "dbms_learn_run"
        };
    }

    // 1. Test Connection: Only verifies credentials without altering active configuration
    if (testBtn) {
        testBtn.addEventListener("click", () => {
            const payload = getFormData();
            testBtn.disabled = true;
            testBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Testing...`;
            testFeedback.innerHTML = "";

            fetch("/api/test-connection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })
            .then(r => r.json())
            .then(data => {
                testBtn.disabled = false;
                testBtn.innerHTML = `<i class="bi bi-plug me-1"></i> Test Connection`;

                if (data.connected && data.database_exists) {
                    testFeedback.innerHTML = `
                        <div class="alert alert-success mt-3 mb-0 py-2">
                            <div class="d-flex align-items-center mb-1">
                                <i class="bi bi-check-circle-fill fs-5 me-2 text-success"></i>
                                <strong>Connection Successful!</strong>
                            </div>
                            <div class="small">
                                Connected to <strong>MySQL ${escapeHtml(data.mysql_version)}</strong> at <code>${escapeHtml(data.host)}:${data.port}</code>.<br>
                                Database <code>${escapeHtml(data.database)}</code> verified (${data.table_count} tables detected).
                            </div>
                            <div class="small text-muted mt-2 border-top pt-1">
                                <i class="bi bi-info-circle me-1"></i> Active app connection has <em>not</em> changed. Click <strong>Apply Connection</strong> to switch active runtime database.
                            </div>
                        </div>`;
                } else if (data.connected && !data.database_exists) {
                    testFeedback.innerHTML = `
                        <div class="alert alert-warning mt-3 mb-0 py-2">
                            <div class="d-flex align-items-center mb-1">
                                <i class="bi bi-exclamation-triangle-fill fs-5 me-2 text-warning"></i>
                                <strong>Server Reachable, Database Missing</strong>
                            </div>
                            <div class="small">
                                Connected to MySQL server ${escapeHtml(data.mysql_version)}, but database <code>${escapeHtml(data.database)}</code> was not found.<br>
                                Please initialize the schema using <code>python init_db.py</code> or specify an existing database.
                            </div>
                        </div>`;
                } else {
                    testFeedback.innerHTML = `
                        <div class="alert alert-danger mt-3 mb-0 py-2">
                            <div class="d-flex align-items-center mb-1">
                                <i class="bi bi-x-circle-fill fs-5 me-2 text-danger"></i>
                                <strong>Connection Test Failed</strong>
                            </div>
                            <div class="small">${escapeHtml(data.error || "Unable to connect to MySQL server. Please verify your host, port, and credentials.")}</div>
                        </div>`;
                }
            })
            .catch(err => {
                testBtn.disabled = false;
                testBtn.innerHTML = `<i class="bi bi-plug me-1"></i> Test Connection`;
                testFeedback.innerHTML = `<div class="alert alert-danger mt-3 mb-0 py-2"><i class="bi bi-x-circle-fill me-1"></i> Network error: ${escapeHtml(err.message)}</div>`;
            });
        });
    }

    // 2. Apply Connection: Validates and updates the backend runtime configuration
    if (applyBtn) {
        applyBtn.addEventListener("click", () => {
            const payload = getFormData();
            applyBtn.disabled = true;
            applyBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Applying...`;
            testFeedback.innerHTML = "";

            fetch("/api/apply-connection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })
            .then(r => r.json())
            .then(data => {
                applyBtn.disabled = false;
                applyBtn.innerHTML = `<i class="bi bi-check2-circle me-1"></i> Apply Connection`;

                if (data.success) {
                    testFeedback.innerHTML = `
                        <div class="alert alert-success mt-3 mb-0 py-2">
                            <div class="d-flex align-items-center mb-1">
                                <i class="bi bi-patch-check-fill fs-5 me-2 text-success"></i>
                                <strong>Connection Settings Applied!</strong>
                            </div>
                            <div class="small">
                                ${escapeHtml(data.message)}<br>
                                Reloading application view to update schema and tables...
                            </div>
                        </div>`;
                    initHeaderConnectionStatus();
                    setTimeout(() => window.location.reload(), 1200);
                } else {
                    testFeedback.innerHTML = `
                        <div class="alert alert-danger mt-3 mb-0 py-2">
                            <div class="d-flex align-items-center mb-1">
                                <i class="bi bi-x-circle-fill fs-5 me-2 text-danger"></i>
                                <strong>Failed to Apply Settings</strong>
                            </div>
                            <div class="small">${escapeHtml(data.error || "Could not apply new settings.")}</div>
                        </div>`;
                }
            })
            .catch(err => {
                applyBtn.disabled = false;
                applyBtn.innerHTML = `<i class="bi bi-check2-circle me-1"></i> Apply Connection`;
                testFeedback.innerHTML = `<div class="alert alert-danger mt-3 mb-0 py-2"><i class="bi bi-x-circle-fill me-1"></i> Network error: ${escapeHtml(err.message)}</div>`;
            });
        });
    }
}

/**
 * Periodically or on load queries /api/health to truthfully reflect the database status
 */
function initHeaderConnectionStatus() {
    const statusBtn = document.getElementById("btn-header-mysql-status");
    const statusText = document.getElementById("header-mysql-status-text");
    const spinner = document.getElementById("header-mysql-status-spinner");

    if (!statusBtn || !statusText) return;

    fetch("/api/health")
        .then(res => res.json())
        .then(data => {
            if (data.database_connected && data.database_exists) {
                statusBtn.className = "btn btn-sm btn-outline-success rounded-pill px-3 py-1 d-flex align-items-center shadow-sm";
                if (spinner) spinner.className = "spinner-grow spinner-grow-sm me-2 text-success";
                statusText.innerHTML = `MySQL 8.0: <strong>Connected</strong> <span class="d-none d-md-inline">(${data.table_count} tables)</span>`;
            } else if (data.database_connected && !data.database_exists) {
                statusBtn.className = "btn btn-sm btn-outline-warning rounded-pill px-3 py-1 d-flex align-items-center shadow-sm";
                if (spinner) spinner.className = "spinner-grow spinner-grow-sm me-2 text-warning";
                statusText.innerHTML = `MySQL 8.0: <strong>DB Setup Needed</strong>`;
            } else {
                statusBtn.className = "btn btn-sm btn-outline-danger rounded-pill px-3 py-1 d-flex align-items-center shadow-sm";
                if (spinner) spinner.className = "spinner-grow spinner-grow-sm me-2 text-danger";
                statusText.innerHTML = `MySQL 8.0: <strong>Disconnected</strong>`;
            }
        })
        .catch(() => {
            statusBtn.className = "btn btn-sm btn-outline-danger rounded-pill px-3 py-1 d-flex align-items-center shadow-sm";
            if (spinner) spinner.className = "spinner-grow spinner-grow-sm me-2 text-danger";
            statusText.innerHTML = `MySQL 8.0: <strong>Disconnected</strong>`;
        });
}

/**
 * Escapes unsafe HTML characters to prevent XSS in query result outputs
 */
function escapeHtml(str) {
    if (typeof str !== "string") return str;
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
