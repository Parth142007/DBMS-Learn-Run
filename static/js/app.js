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
    const revertBtn = document.getElementById("btn-revert-conn-submit");
    const testFeedback = document.getElementById("test-conn-feedback");
    const fetchDbsBtn = document.getElementById("btn-fetch-databases");
    const dbsDropdownList = document.getElementById("list-server-databases");
    const profileSelect = document.getElementById("modal-conn-profile");
    const togglePasswordBtn = document.getElementById("btn-toggle-password");
    const passwordInput = document.getElementById("modal-mysql-password");
    const togglePasswordIcon = document.getElementById("toggle-password-icon");
    const hostInput = document.getElementById("modal-mysql-host");
    const portInput = document.getElementById("modal-mysql-port");
    const userInput = document.getElementById("modal-mysql-user");
    const dbInput = document.getElementById("modal-mysql-database");
    const modalStatusBar = document.getElementById("modal-conn-status-bar");
    const modalStatusBadge = document.getElementById("modal-status-badge");
    const modalStatusTarget = document.getElementById("modal-status-target");
    const modalStatusVer = document.getElementById("modal-status-ver");

    if (!testForm) return;

    // Cache initial values
    const initialConfig = {
        host: hostInput ? hostInput.value.trim() : "localhost",
        port: portInput ? parseInt(portInput.value.trim()) || 3306 : 3306,
        user: userInput ? userInput.value.trim() : "root",
        database: dbInput ? dbInput.value.trim() : "dbms_learn_run"
    };

    // 1. Password Visibility Toggle
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener("click", () => {
            const isPassword = passwordInput.getAttribute("type") === "password";
            passwordInput.setAttribute("type", isPassword ? "text" : "password");
            if (togglePasswordIcon) {
                togglePasswordIcon.className = isPassword ? "bi bi-eye-slash" : "bi bi-eye";
            }
        });
    }

    // 2. Profile Selection Handler
    if (profileSelect) {
        profileSelect.addEventListener("change", (e) => {
            const profile = e.target.value;
            if (profile === "default") {
                if (hostInput) hostInput.value = initialConfig.host;
                if (portInput) portInput.value = initialConfig.port;
                if (userInput) userInput.value = initialConfig.user;
                if (dbInput) dbInput.value = initialConfig.database;
                if (passwordInput) passwordInput.value = "";
            } else if (profile === "localhost") {
                if (hostInput) hostInput.value = "localhost";
                if (portInput) portInput.value = "3306";
                if (userInput) userInput.value = "root";
                if (dbInput) dbInput.value = "dbms_learn_run";
            }
        });

        // If user manually modifies connection fields, set profile to custom
        [hostInput, portInput, userInput, dbInput].forEach(inputEl => {
            if (inputEl) {
                inputEl.addEventListener("input", () => {
                    if (profileSelect) profileSelect.value = "custom";
                });
            }
        });
    }

    // Refresh live connection status whenever modal is opened
    const dbConfigModal = document.getElementById("dbConfigModal");
    if (dbConfigModal) {
        dbConfigModal.addEventListener("show.bs.modal", () => {
            fetch("/api/health")
                .then(r => r.json())
                .then(data => {
                    if (modalStatusBadge) {
                        modalStatusBadge.className = data.database_connected && data.database_exists
                            ? "badge bg-success me-2"
                            : (data.database_connected ? "badge bg-warning text-dark me-2" : "badge bg-danger me-2");
                        modalStatusBadge.textContent = data.database_connected && data.database_exists
                            ? "Connected"
                            : (data.database_connected ? "DB Missing" : "Disconnected");
                    }
                    if (modalStatusTarget) modalStatusTarget.textContent = `${data.host}:${data.port}/${data.database}`;
                    if (modalStatusVer) modalStatusVer.textContent = data.database_connected ? `MySQL ${data.mysql_version}` : "";
                })
                .catch(() => {});
        });
    }

    // 3. Fetch Available Databases from Server
    if (fetchDbsBtn && dbsDropdownList) {
        fetchDbsBtn.addEventListener("click", () => {
            const payload = getFormData();
            fetchDbsBtn.disabled = true;
            fetchDbsBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Fetching...`;

            fetch("/api/connection/databases", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })
            .then(r => r.json())
            .then(data => {
                fetchDbsBtn.disabled = false;
                fetchDbsBtn.innerHTML = `<i class="bi bi-arrow-repeat me-1"></i>Fetch Databases`;
                if (data.success && Array.isArray(data.databases) && data.databases.length > 0) {
                    dbsDropdownList.innerHTML = "";
                    data.databases.forEach(dbName => {
                        const li = document.createElement("li");
                        const a = document.createElement("a");
                        a.className = "dropdown-item small py-1 px-3 d-flex align-items-center gap-2";
                        a.href = "#";
                        a.innerHTML = `<i class="bi bi-database text-secondary small"></i> ${escapeHtml(dbName)}`;
                        a.addEventListener("click", (evt) => {
                            evt.preventDefault();
                            if (dbInput) dbInput.value = dbName;
                        });
                        li.appendChild(a);
                        dbsDropdownList.appendChild(li);
                    });
                    // Automatically trigger dropdown opening
                    const dropdownTrigger = document.getElementById("btn-dropdown-databases");
                    if (dropdownTrigger && window.bootstrap && bootstrap.Dropdown) {
                        const dd = bootstrap.Dropdown.getOrCreateInstance(dropdownTrigger);
                        dd.show();
                    }
                } else {
                    dbsDropdownList.innerHTML = `<li><span class="dropdown-item-text text-danger small">${escapeHtml(data.error || "No databases found")}</span></li>`;
                }
            })
            .catch(err => {
                fetchDbsBtn.disabled = false;
                fetchDbsBtn.innerHTML = `<i class="bi bi-arrow-repeat me-1"></i>Fetch Databases`;
                dbsDropdownList.innerHTML = `<li><span class="dropdown-item-text text-danger small">Network error fetching databases</span></li>`;
            });
        });
    }

    function getFormData() {
        return {
            user: userInput ? userInput.value.trim() : "root",
            password: passwordInput ? passwordInput.value : "",
            host: hostInput ? hostInput.value.trim() : "localhost",
            port: portInput ? parseInt(portInput.value.trim()) || 3306 : 3306,
            database: dbInput ? dbInput.value.trim() : "dbms_learn_run"
        };
    }

    // 4. Test Connection
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
                    if (modalStatusBadge) {
                        modalStatusBadge.className = "badge bg-success me-2";
                        modalStatusBadge.textContent = "Connected";
                    }
                    if (modalStatusTarget) modalStatusTarget.textContent = `${data.host}:${data.port}/${data.database}`;
                    if (modalStatusVer) modalStatusVer.textContent = `MySQL ${data.mysql_version}`;

                    testFeedback.innerHTML = `
                        <div class="alert alert-success mt-3 mb-0 py-2 small shadow-sm">
                            <div class="d-flex align-items-center mb-1">
                                <i class="bi bi-check-circle-fill fs-5 me-2 text-success"></i>
                                <strong>Connection Successful!</strong>
                            </div>
                            <div>
                                Connected to <strong>MySQL ${escapeHtml(data.mysql_version)}</strong> at <code>${escapeHtml(data.host)}:${data.port}</code>.<br>
                                Database <code>${escapeHtml(data.database)}</code> verified (${data.table_count} tables detected).
                            </div>
                            <div class="text-muted mt-2 border-top pt-1" style="font-size:0.75rem;">
                                <i class="bi bi-info-circle me-1"></i> Runtime database remains unchanged until you click <strong>Apply Connection</strong>.
                            </div>
                        </div>`;
                } else if (data.connected && !data.database_exists) {
                    if (modalStatusBadge) {
                        modalStatusBadge.className = "badge bg-warning text-dark me-2";
                        modalStatusBadge.textContent = "DB Missing";
                    }
                    if (modalStatusTarget) modalStatusTarget.textContent = `${data.host}:${data.port}/${data.database}`;
                    if (modalStatusVer) modalStatusVer.textContent = `MySQL ${data.mysql_version}`;

                    testFeedback.innerHTML = `
                        <div class="alert alert-warning mt-3 mb-0 py-2 small shadow-sm">
                            <div class="d-flex align-items-center mb-1">
                                <i class="bi bi-exclamation-triangle-fill fs-5 me-2 text-warning"></i>
                                <strong>Server Reachable, Database Missing</strong>
                            </div>
                            <div>
                                Connected to MySQL server ${escapeHtml(data.mysql_version)}, but database <code>${escapeHtml(data.database)}</code> was not found.<br>
                                Click <strong>Fetch Databases</strong> above to pick an existing database, or initialize it.
                            </div>
                        </div>`;
                } else {
                    if (modalStatusBadge) {
                        modalStatusBadge.className = "badge bg-danger me-2";
                        modalStatusBadge.textContent = "Disconnected";
                    }
                    testFeedback.innerHTML = `
                        <div class="alert alert-danger mt-3 mb-0 py-2 small shadow-sm">
                            <div class="d-flex align-items-center mb-1">
                                <i class="bi bi-x-circle-fill fs-5 me-2 text-danger"></i>
                                <strong>Connection Test Failed</strong>
                            </div>
                            <div>${escapeHtml(data.error || "Unable to reach MySQL server. Please verify your host, port, and credentials.")}</div>
                        </div>`;
                }
            })
            .catch(err => {
                testBtn.disabled = false;
                testBtn.innerHTML = `<i class="bi bi-plug me-1"></i> Test Connection`;
                testFeedback.innerHTML = `<div class="alert alert-danger mt-3 mb-0 py-2 small"><i class="bi bi-x-circle-fill me-1"></i> Network error: ${escapeHtml(err.message)}</div>`;
            });
        });
    }

    // 5. Apply Connection
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
                    window.dispatchEvent(new CustomEvent("dbms:connection-applied", { detail: data }));
                    testFeedback.innerHTML = `
                        <div class="alert alert-success mt-3 mb-0 py-2 small shadow-sm">
                            <div class="d-flex align-items-center mb-1">
                                <i class="bi bi-patch-check-fill fs-5 me-2 text-success"></i>
                                <strong>Connection Settings Applied!</strong>
                            </div>
                            <div>
                                ${escapeHtml(data.message)}<br>
                                Reloading application view to update schema and tables...
                            </div>
                        </div>`;
                    if (data.status) {
                        const st = data.status;
                        if (modalStatusBadge) {
                            modalStatusBadge.className = "badge bg-success me-2";
                            modalStatusBadge.textContent = "Connected";
                        }
                        if (modalStatusTarget) modalStatusTarget.textContent = `${st.host}:${st.port}/${st.database}`;
                        if (modalStatusVer) modalStatusVer.textContent = `MySQL ${st.mysql_version}`;
                    }
                    initHeaderConnectionStatus();
                    setTimeout(() => window.location.reload(), 1200);
                } else {
                    testFeedback.innerHTML = `
                        <div class="alert alert-danger mt-3 mb-0 py-2 small shadow-sm">
                            <div class="d-flex align-items-center mb-1">
                                <i class="bi bi-x-circle-fill fs-5 me-2 text-danger"></i>
                                <strong>Failed to Apply Settings</strong>
                            </div>
                            <div>${escapeHtml(data.error || "Could not apply new settings.")}</div>
                        </div>`;
                }
            })
            .catch(err => {
                applyBtn.disabled = false;
                applyBtn.innerHTML = `<i class="bi bi-check2-circle me-1"></i> Apply Connection`;
                testFeedback.innerHTML = `<div class="alert alert-danger mt-3 mb-0 py-2 small"><i class="bi bi-x-circle-fill me-1"></i> Network error: ${escapeHtml(err.message)}</div>`;
            });
        });
    }

    // 6. Revert to Default Configuration (.env)
    if (revertBtn) {
        revertBtn.addEventListener("click", () => {
            if (!confirm("Revert active database connection back to original .env settings?")) {
                return;
            }
            revertBtn.disabled = true;
            revertBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Reverting...`;
            testFeedback.innerHTML = "";

            fetch("/api/connection/revert", { method: "POST" })
            .then(r => r.json())
            .then(data => {
                revertBtn.disabled = false;
                revertBtn.innerHTML = `<i class="bi bi-arrow-counterclockwise me-1"></i> Revert to Default`;

                if (data.success && data.config) {
                    window.dispatchEvent(new CustomEvent("dbms:connection-applied", { detail: data }));
                    if (hostInput) hostInput.value = data.config.host || "localhost";
                    if (portInput) portInput.value = data.config.port || 3306;
                    if (userInput) userInput.value = data.config.user || "root";
                    if (dbInput) dbInput.value = data.config.database || "dbms_learn_run";
                    if (passwordInput) passwordInput.value = "";
                    if (profileSelect) profileSelect.value = "default";

                    if (data.status) {
                        const st = data.status;
                        if (modalStatusBadge) {
                            modalStatusBadge.className = st.connected && st.database_exists
                                ? "badge bg-success me-2"
                                : (st.connected ? "badge bg-warning text-dark me-2" : "badge bg-danger me-2");
                            modalStatusBadge.textContent = st.connected && st.database_exists
                                ? "Connected"
                                : (st.connected ? "DB Missing" : "Disconnected");
                        }
                        if (modalStatusTarget) modalStatusTarget.textContent = `${st.host}:${st.port}/${st.database}`;
                        if (modalStatusVer) modalStatusVer.textContent = st.connected ? `MySQL ${st.mysql_version}` : "";
                    }

                    testFeedback.innerHTML = `
                        <div class="alert alert-info mt-3 mb-0 py-2 small shadow-sm">
                            <i class="bi bi-info-circle-fill me-1"></i> Reverted to default .env configuration. Reloading view...
                        </div>`;
                    initHeaderConnectionStatus();
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    testFeedback.innerHTML = `<div class="alert alert-danger mt-3 mb-0 py-2 small">Failed to revert configuration.</div>`;
                }
            })
            .catch(err => {
                revertBtn.disabled = false;
                revertBtn.innerHTML = `<i class="bi bi-arrow-counterclockwise me-1"></i> Revert to Default`;
                testFeedback.innerHTML = `<div class="alert alert-danger mt-3 mb-0 py-2 small">Error reverting connection: ${escapeHtml(err.message)}</div>`;
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
