/**
 * DBMS Learn & Run: AI-Powered Practical Lab Client Script
 * Handles isolated workspace management, real multi-statement MySQL execution,
 * persistent practical record saving/loading, and Gemini 2.5 Flash AI advisory features.
 */

document.addEventListener("DOMContentLoaded", () => {
    // ====================================================================
    // STATE MANAGEMENT
    // ====================================================================
    const state = {
        activeWorkspace: "college_practical",
        currentPracticalId: null,
        schemaContext: "",
        lastExecutionResult: null,
        lastExecutionError: "",
        suggestedSQL: "",
        isGeminiConfigured: true,
        tablesInWorkspace: []
    };

    // ====================================================================
    // DOM REFERENCES
    // ====================================================================
    const practicalNameInput = document.getElementById("practical-name");
    const practicalNumberInput = document.getElementById("practical-number");
    const practicalTopicInput = document.getElementById("practical-topic");
    const practicalTaskTextarea = document.getElementById("practical-task");
    const practicalRecordIdInput = document.getElementById("practical-record-id");
    const practicalStatusBadge = document.getElementById("active-practical-status");

    const workspaceSelect = document.getElementById("workspace-select");
    const workspaceTableCount = document.getElementById("workspace-table-count");
    const workspaceTablesContainer = document.getElementById("workspace-tables-container");
    const btnRefreshTables = document.getElementById("btn-refresh-tables");
    const btnConfirmCreateWorkspace = document.getElementById("btn-confirm-create-workspace");
    const newWorkspaceNameInput = document.getElementById("new-workspace-name");
    const resetModalTargetDb = document.getElementById("reset-modal-target-db");
    const btnConfirmResetWorkspace = document.getElementById("btn-confirm-reset-workspace");

    const sqlEditor = document.getElementById("sql-editor");
    const btnRunSQL = document.getElementById("btn-run-sql");
    const executionSpinner = document.getElementById("execution-spinner");
    const btnClearSQL = document.getElementById("btn-clear-sql");
    const btnCopySQL = document.getElementById("btn-copy-sql");
    const btnFormatSQL = document.getElementById("btn-format-sql");

    const executionOutputBody = document.getElementById("execution-output-body");
    const badgeExecStatus = document.getElementById("badge-exec-status");
    const executionOutputFooter = document.getElementById("execution-output-footer");
    const executionSummaryText = document.getElementById("execution-summary-text");
    const btnAiExplainOutput = document.getElementById("btn-ai-explain-output");

    const geminiKeyAlert = document.getElementById("gemini-key-alert");
    const aiLoadingContainer = document.getElementById("ai-loading-container");
    const aiLoadingLabel = document.getElementById("ai-loading-label");
    const aiResponseContainer = document.getElementById("ai-response-container");
    const aiSuggestedSqlPanel = document.getElementById("ai-suggested-sql-panel");
    const aiSuggestedCodeBlock = document.getElementById("ai-suggested-code-block");
    const btnCopySuggested = document.getElementById("btn-copy-suggested");
    const btnDiffSuggested = document.getElementById("btn-diff-suggested");
    const btnInsertSuggested = document.getElementById("btn-insert-suggested");

    const btnAiGenerate = document.getElementById("btn-ai-generate");
    const btnAiCheck = document.getElementById("btn-ai-check");
    const btnAiExplain = document.getElementById("btn-ai-explain");
    const btnAiErrors = document.getElementById("btn-ai-errors");
    const btnAiSuggest = document.getElementById("btn-ai-suggest");

    const btnSavePractical = document.getElementById("btn-save-practical");
    const btnSaveAsCopy = document.getElementById("btn-save-as-copy");
    const btnNewPractical = document.getElementById("btn-new-practical");
    const searchPracticalsInput = document.getElementById("search-practicals-input");
    const savedPracticalsTbody = document.getElementById("saved-practicals-tbody");

    // Modal elements
    const inspectTableName = document.getElementById("inspect-table-name");
    const inspectColumnsTbody = document.getElementById("inspect-columns-tbody");
    const inspectRowCount = document.getElementById("inspect-row-count");
    const inspectSampleDataContainer = document.getElementById("inspect-sample-data-container");

    const diffOriginalCode = document.getElementById("diff-original-code");
    const diffSuggestedCode = document.getElementById("diff-suggested-code");
    const btnModalInsertDiff = document.getElementById("btn-modal-insert-diff");

    // ====================================================================
    // INITIALIZATION
    // ====================================================================
    function init() {
        checkAiStatus();
        loadWorkspaces();
        setupEventListeners();
    }

    // Check Gemini API Key configuration
    async function checkAiStatus() {
        try {
            const res = await fetch("/api/practical-lab/ai/status");
            const data = await res.json();
            state.isGeminiConfigured = Boolean(data.configured);
            if (!state.isGeminiConfigured && geminiKeyAlert) {
                geminiKeyAlert.classList.remove("d-none");
                geminiKeyAlert.classList.add("d-flex");
            } else if (geminiKeyAlert) {
                geminiKeyAlert.classList.add("d-none");
                geminiKeyAlert.classList.remove("d-flex");
            }
        } catch (err) {
            console.warn("Could not check Gemini API status:", err);
        }
    }

    // ====================================================================
    // WORKSPACE MANAGEMENT
    // ====================================================================
    async function loadWorkspaces() {
        try {
            const res = await fetch("/api/practical-lab/workspaces");
            const data = await res.json();
            workspaceSelect.innerHTML = "";

            if (data.success && Array.isArray(data.workspaces) && data.workspaces.length > 0) {
                let matchedActive = false;

                data.workspaces.forEach(ws => {
                    const wsName = typeof ws === "string" ? ws.trim() : (ws.name || ws.database || "").trim();
                    if (!wsName) return;

                    const isDefault = typeof ws === "object" ? Boolean(ws.is_default) : (wsName === "college_practical" || wsName === "dbms_practice_lab");
                    const isPractice = isDefault || wsName.toLowerCase().startsWith("dbms_practice") || wsName.toLowerCase().startsWith("college_practical");

                    let label = wsName;
                    if (isDefault) {
                        label = `${wsName} (Student Practice - Default)`;
                    } else if (isPractice) {
                        label = `${wsName} (Student Practice Workspace)`;
                    } else {
                        label = `${wsName} (User Database)`;
                    }

                    const opt = document.createElement("option");
                    opt.value = wsName;
                    opt.textContent = label;

                    if (wsName === state.activeWorkspace) {
                        opt.selected = true;
                        matchedActive = true;
                    }
                    workspaceSelect.appendChild(opt);
                });

                if (!matchedActive && workspaceSelect.options.length > 0) {
                    workspaceSelect.options[0].selected = true;
                    state.activeWorkspace = workspaceSelect.options[0].value;
                } else if (workspaceSelect.value) {
                    state.activeWorkspace = workspaceSelect.value;
                }

                if (resetModalTargetDb) {
                    resetModalTargetDb.textContent = state.activeWorkspace;
                }
                loadWorkspaceTables(state.activeWorkspace);
            } else {
                const opt = document.createElement("option");
                opt.value = "";
                opt.textContent = "No practice workspaces found";
                opt.disabled = true;
                opt.selected = true;
                workspaceSelect.appendChild(opt);
                workspaceTablesContainer.innerHTML = '<span class="text-warning small"><i class="bi bi-exclamation-triangle me-1"></i> No practice databases found. Click New DB above.</span>';
            }
        } catch (err) {
            console.error("Error loading workspaces:", err);
            workspaceSelect.innerHTML = '<option value="" disabled selected>Error loading databases</option>';
            workspaceTablesContainer.innerHTML = '<span class="text-danger small">Cannot connect to MySQL server.</span>';
        }
    }

    async function loadWorkspaceTables(workspaceName) {
        workspaceTablesContainer.innerHTML = '<span class="spinner-border spinner-border-sm text-secondary me-2"></span> Loading tables...';
        try {
            const res = await fetch(`/api/practical-lab/workspaces/${encodeURIComponent(workspaceName)}/tables`);
            const data = await res.json();
            if (data.success) {
                state.tablesInWorkspace = data.tables || [];
                state.schemaContext = data.schema_context || "";
                renderTablePills(data.tables || []);
            } else {
                workspaceTablesContainer.innerHTML = `<span class="text-danger small">${escapeHtml(data.error || "Failed to load tables")}</span>`;
            }
        } catch (err) {
            workspaceTablesContainer.innerHTML = `<span class="text-danger small">Error connecting to server.</span>`;
        }
    }

    function renderTablePills(tables) {
        workspaceTableCount.textContent = tables.length;
        if (tables.length === 0) {
            workspaceTablesContainer.innerHTML = '<span class="text-muted small fst-italic">No tables created yet. Run a CREATE TABLE statement below.</span>';
            return;
        }

        workspaceTablesContainer.innerHTML = "";
        tables.forEach(table => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn btn-outline-secondary btn-sm py-1 px-2 d-flex align-items-center gap-1 table-explorer-item";
            btn.title = `Click to inspect table: ${table.name}`;
            btn.innerHTML = `
                <i class="bi bi-table text-primary"></i>
                <span class="fw-semibold">${escapeHtml(table.name)}</span>
                <span class="badge bg-light text-secondary border ms-1" style="font-size: 0.7rem;">${table.row_count} rows</span>
            `;
            btn.addEventListener("click", () => inspectTable(state.activeWorkspace, table.name));
            workspaceTablesContainer.appendChild(btn);
        });
    }

    // Inspect Table Modal
    async function inspectTable(workspaceName, tableName) {
        inspectTableName.textContent = `${workspaceName}.${tableName}`;
        inspectColumnsTbody.innerHTML = '<tr><td colspan="6" class="text-center py-2 text-muted">Loading schema...</td></tr>';
        inspectSampleDataContainer.innerHTML = '<div class="text-center py-2 text-muted">Loading data...</div>';
        inspectRowCount.textContent = "";

        const modalEl = document.getElementById("tableInspectionModal");
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();

        try {
            const res = await fetch(`/api/practical-lab/workspaces/${encodeURIComponent(workspaceName)}/tables/${encodeURIComponent(tableName)}/schema`);
            const data = await res.json();
            if (data.success) {
                // Render columns
                inspectColumnsTbody.innerHTML = "";
                (data.columns || []).forEach(col => {
                    const tr = document.createElement("tr");
                    const isPk = col.key === "PRI";
                    tr.innerHTML = `
                        <td class="fw-semibold ${isPk ? 'text-primary' : ''}">
                            ${isPk ? '<i class="bi bi-key-fill text-warning me-1"></i>' : ''}${escapeHtml(col.name)}
                        </td>
                        <td><code>${escapeHtml(col.type)}</code></td>
                        <td><span class="badge ${col.nullable === 'YES' ? 'bg-light text-dark border' : 'bg-secondary text-white'}">${col.nullable}</span></td>
                        <td>${col.key ? `<span class="badge bg-primary-subtle text-primary border">${escapeHtml(col.key)}</span>` : '<span class="text-muted">-</span>'}</td>
                        <td>${col.default !== null ? escapeHtml(String(col.default)) : '<span class="text-muted">NULL</span>'}</td>
                        <td class="small text-muted">${escapeHtml(col.extra || '')}</td>
                    `;
                    inspectColumnsTbody.appendChild(tr);
                });

                // Render Sample Data
                inspectRowCount.textContent = `Showing ${data.sample_rows ? data.sample_rows.length : 0} of ${data.total_rows || 0} rows`;
                if (!data.sample_rows || data.sample_rows.length === 0) {
                    inspectSampleDataContainer.innerHTML = '<div class="alert alert-light border small text-muted text-center py-2 mb-0">Table is empty. Insert records to view sample data.</div>';
                } else {
                    const table = document.createElement("table");
                    table.className = "table table-sm table-bordered table-striped align-middle mb-0";
                    const thead = document.createElement("thead");
                    thead.className = "table-light";
                    const headerRow = document.createElement("tr");
                    data.columns.forEach(col => {
                        const th = document.createElement("th");
                        th.className = "small";
                        th.textContent = col.name;
                        headerRow.appendChild(th);
                    });
                    thead.appendChild(headerRow);
                    table.appendChild(thead);

                    const tbody = document.createElement("tbody");
                    data.sample_rows.forEach(row => {
                        const tr = document.createElement("tr");
                        data.columns.forEach(col => {
                            const td = document.createElement("td");
                            td.className = "small font-monospace";
                            const val = row[col.name];
                            td.textContent = val !== null && val !== undefined ? val : "NULL";
                            if (val === null) td.className += " text-muted fst-italic";
                            tr.appendChild(td);
                        });
                        tbody.appendChild(tr);
                    });
                    table.appendChild(tbody);
                    inspectSampleDataContainer.innerHTML = "";
                    inspectSampleDataContainer.appendChild(table);
                }
            } else {
                inspectColumnsTbody.innerHTML = `<tr><td colspan="6" class="text-danger">${escapeHtml(data.error || "Failed to inspect table")}</td></tr>`;
            }
        } catch (err) {
            inspectColumnsTbody.innerHTML = `<tr><td colspan="6" class="text-danger">Error loading schema.</td></tr>`;
        }
    }

    // Create Workspace
    btnConfirmCreateWorkspace.addEventListener("click", async () => {
        const name = newWorkspaceNameInput.value.trim();
        if (!name) {
            alert("Please enter a database name.");
            return;
        }
        btnConfirmCreateWorkspace.disabled = true;
        btnConfirmCreateWorkspace.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Creating...';
        try {
            const res = await fetch("/api/practical-lab/workspaces/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspace_name: name })
            });
            const data = await res.json();
            if (data.success) {
                const modalEl = document.getElementById("createWorkspaceModal");
                bootstrap.Modal.getInstance(modalEl).hide();
                newWorkspaceNameInput.value = "";
                state.activeWorkspace = data.workspace_name;
                await loadWorkspaces();
                alert(`Isolated workspace '${data.workspace_name}' created successfully!`);
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            alert("Failed to create workspace. Check server connection.");
        } finally {
            btnConfirmCreateWorkspace.disabled = false;
            btnConfirmCreateWorkspace.textContent = "Create Database";
        }
    });

    // Reset Workspace
    btnConfirmResetWorkspace.addEventListener("click", async () => {
        btnConfirmResetWorkspace.disabled = true;
        btnConfirmResetWorkspace.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Resetting...';
        try {
            const res = await fetch("/api/practical-lab/workspaces/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspace_name: state.activeWorkspace, confirm: true })
            });
            const data = await res.json();
            if (data.success) {
                const modalEl = document.getElementById("resetWorkspaceModal");
                bootstrap.Modal.getInstance(modalEl).hide();
                await loadWorkspaceTables(state.activeWorkspace);
                executionOutputBody.innerHTML = `
                    <div class="alert alert-info border-info-subtle small mb-0">
                        <i class="bi bi-info-circle me-1"></i> Database <strong>${escapeHtml(state.activeWorkspace)}</strong> was reset to a fresh empty state.
                    </div>
                `;
                badgeExecStatus.className = "badge bg-info-subtle text-info border border-info-subtle small";
                badgeExecStatus.textContent = "Workspace Reset";
                alert(`Database '${state.activeWorkspace}' has been reset successfully.`);
            } else {
                alert(`Reset failed: ${data.error}`);
            }
        } catch (err) {
            alert("Reset error. Please try again.");
        } finally {
            btnConfirmResetWorkspace.disabled = false;
            btnConfirmResetWorkspace.innerHTML = '<i class="bi bi-trash3 me-1"></i> Drop &amp; Recreate Database';
        }
    });

    // ====================================================================
    // SQL EXECUTION ENGINE
    // ====================================================================
    async function runSQL() {
        const sqlScript = sqlEditor.value.trim();
        if (!sqlScript) {
            alert("SQL editor is empty. Please enter one or more SQL statements to execute.");
            return;
        }

        btnRunSQL.disabled = true;
        executionSpinner.classList.remove("d-none");
        badgeExecStatus.className = "badge bg-warning-subtle text-warning border border-warning-subtle small";
        badgeExecStatus.textContent = "Executing on MySQL 8...";
        executionOutputBody.innerHTML = '<div class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2 text-success"></span> Running script on local MySQL server...</div>';
        executionOutputFooter.classList.add("d-none");

        try {
            const startTime = performance.now();
            const res = await fetch("/api/practical-lab/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspace_name: state.activeWorkspace,
                    sql_script: sqlScript
                })
            });
            const duration = Math.round(performance.now() - startTime);
            const data = await res.json();

            // Refresh table explorer immediately
            loadWorkspaceTables(state.activeWorkspace);

            if (data.success) {
                state.lastExecutionResult = data;
                state.lastExecutionError = "";
                badgeExecStatus.className = "badge bg-success-subtle text-success border border-success-subtle small";
                badgeExecStatus.textContent = `Success (${duration}ms)`;
                renderExecutionSuccess(data, duration);
            } else {
                state.lastExecutionResult = null;
                state.lastExecutionError = data.error || "Unknown MySQL execution error.";
                badgeExecStatus.className = "badge bg-danger-subtle text-danger border border-danger-subtle small";
                badgeExecStatus.textContent = "Execution Failed";
                renderExecutionFailure(data);
            }
        } catch (err) {
            badgeExecStatus.className = "badge bg-danger-subtle text-danger border border-danger-subtle small";
            badgeExecStatus.textContent = "Network Error";
            executionOutputBody.innerHTML = `<div class="alert alert-danger small mb-0">Failed to connect to backend execution API: ${escapeHtml(err.message)}</div>`;
        } finally {
            btnRunSQL.disabled = false;
            executionSpinner.classList.add("d-none");
        }
    }

    function renderExecutionSuccess(data, duration) {
        const statements = data.statements || [];
        let html = "";

        // Statement summary pills
        html += `<div class="mb-3 d-flex flex-wrap gap-2 align-items-center">`;
        html += `<span class="small fw-bold text-secondary">Executed ${statements.length} statement${statements.length === 1 ? '' : 's'}:</span>`;
        statements.forEach((st, idx) => {
            const isSelect = st.type === "SELECT" || st.type === "SHOW" || st.type === "DESCRIBE" || st.type === "EXPLAIN";
            const badgeClass = st.status === "success" ? "bg-success-subtle text-success border border-success-subtle" : "bg-danger-subtle text-danger border border-danger-subtle";
            const detail = isSelect ? `${st.row_count} rows returned` : `${st.affected_rows} rows affected`;
            html += `<span class="badge ${badgeClass} small" title="${escapeHtml(st.statement)}">#${idx + 1} ${escapeHtml(st.type)} (${detail})</span>`;
        });
        html += `</div>`;

        // Find statements with tabular query results
        const queryResults = statements.filter(st => Array.isArray(st.columns) && st.columns.length > 0);

        if (queryResults.length > 0) {
            // Render the last query result, or all if multiple
            queryResults.forEach((q, idx) => {
                html += `
                    <div class="mb-3 border rounded overflow-hidden">
                        <div class="bg-light px-3 py-1 border-bottom d-flex justify-content-between align-items-center small">
                            <span class="fw-bold text-secondary font-monospace"><i class="bi bi-terminal me-1"></i> ${escapeHtml(q.statement.substring(0, 80))}${q.statement.length > 80 ? '...' : ''}</span>
                            <span class="badge bg-secondary-subtle text-secondary">${q.row_count} rows</span>
                        </div>
                        <div class="table-responsive" style="max-height: 280px;">
                            <table class="table table-sm table-striped table-hover align-middle mb-0">
                                <thead class="table-dark small">
                                    <tr>
                                        ${q.columns.map(col => `<th>${escapeHtml(col)}</th>`).join("")}
                                    </tr>
                                </thead>
                                <tbody class="small font-monospace">
                                    ${q.rows.length === 0 ? `<tr><td colspan="${q.columns.length}" class="text-center text-muted py-2 fst-italic">Empty result set (0 rows).</td></tr>` : ''}
                                    ${q.rows.map(row => `
                                        <tr>
                                            ${q.columns.map(col => {
                                                const val = row[col];
                                                if (val === null || val === undefined) {
                                                    return '<td class="text-muted fst-italic">NULL</td>';
                                                }
                                                return `<td>${escapeHtml(String(val))}</td>`;
                                            }).join("")}
                                        </tr>
                                    `).join("")}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            });
        } else {
            // Pure DDL or DML script
            html += `
                <div class="alert alert-success border-success-subtle small mb-0 d-flex align-items-center gap-2">
                    <i class="bi bi-check-circle-fill text-success fs-5"></i>
                    <div>
                        <strong>Script executed successfully on MySQL 8!</strong>
                        <div>All ${statements.length} DDL/DML statement(s) applied to workspace <code>${escapeHtml(data.workspace)}</code>.</div>
                    </div>
                </div>
            `;
        }

        executionOutputBody.innerHTML = html;
        executionSummaryText.textContent = `Completed in ${duration}ms | Database: ${data.workspace}`;
        executionOutputFooter.classList.remove("d-none");
    }

    function renderExecutionFailure(data) {
        const errorMsg = data.error || "An error occurred during SQL execution.";
        const failedStmt = data.failed_statement || "";
        const stmtIdx = data.failed_index !== undefined ? data.failed_index + 1 : "";

        let html = `
            <div class="alert alert-danger border-danger-subtle small mb-3">
                <div class="d-flex align-items-center gap-2 mb-1">
                    <i class="bi bi-x-octagon-fill text-danger fs-5"></i>
                    <strong class="fs-6">MySQL 8 Execution Error ${stmtIdx ? `in Statement #${stmtIdx}` : ''}</strong>
                </div>
                <div class="font-monospace p-2 bg-white rounded border text-danger mb-2" style="white-space: pre-wrap;">${escapeHtml(errorMsg)}</div>
                ${failedStmt ? `
                    <div class="text-muted mb-1 small fw-semibold">Failing Statement:</div>
                    <pre class="font-monospace p-2 bg-light border rounded small mb-2 text-dark">${escapeHtml(failedStmt)}</pre>
                ` : ''}
                <div class="d-flex justify-content-end">
                    <button class="btn btn-sm btn-outline-danger fw-semibold d-flex align-items-center gap-1 shadow-sm" id="btn-ask-ai-fix-error">
                        <i class="bi bi-stars text-warning"></i> Ask Gemini to Diagnose &amp; Fix
                    </button>
                </div>
                <!-- Inline failure diagnosis container -->
                <div id="failure-inline-diagnosis-container" class="mt-3 d-none"></div>
            </div>
        `;

        if (Array.isArray(data.statements) && data.statements.length > 0) {
            html += `<div class="small text-muted mb-2">Previous statements completed before failure:</div><div class="d-flex flex-wrap gap-1">`;
            data.statements.forEach((st, idx) => {
                html += `<span class="badge bg-secondary-subtle text-secondary small">#${idx + 1} ${escapeHtml(st.type)} (Success)</span>`;
            });
            html += `</div>`;
        }

        executionOutputBody.innerHTML = html;
        executionSummaryText.textContent = `Execution failed on database: ${state.activeWorkspace}`;
        executionOutputFooter.classList.remove("d-none");

        // Wire Ask AI button inside error alert
        const btnAskFix = document.getElementById("btn-ask-ai-fix-error");
        if (btnAskFix) {
            btnAskFix.addEventListener("click", () => handleDiagnoseAndFix(failedStmt, errorMsg, btnAskFix));
        }
    }

    async function handleDiagnoseAndFix(failedStmt, errorMsg, btnEl) {
        const diagContainer = document.getElementById("failure-inline-diagnosis-container");
        if (!diagContainer) return;

        if (!state.isGeminiConfigured) {
            diagContainer.className = "mt-3 d-block";
            diagContainer.innerHTML = `
                <div class="alert alert-warning border-warning-subtle small mb-0">
                    <div class="d-flex align-items-center gap-2 mb-1">
                        <i class="bi bi-key-fill text-warning fs-5"></i>
                        <strong>AI Key Required</strong>
                    </div>
                    <p class="mb-0">Please configure your <code>GEMINI_API_KEY</code> or <code>OPENROUTER_API_KEY</code> in the <code>.env</code> file to enable AI error diagnosis and automated corrections.</p>
                </div>
            `;
            return;
        }

        const sqlToDiagnose = (failedStmt && failedStmt.trim()) || sqlEditor.value.trim();
        const taskDesc = practicalTaskTextarea.value.trim();
        const practicalName = practicalNameInput.value.trim();

        // Visual loading state
        btnEl.disabled = true;
        btnEl.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status"></span> Diagnosing with Gemini 2.5 Flash...`;
        diagContainer.className = "mt-3 d-block";
        diagContainer.innerHTML = `
            <div class="card border-danger-subtle shadow-sm">
                <div class="card-body p-3 text-center bg-white rounded">
                    <div class="spinner-grow spinner-grow-sm text-danger me-2" role="status"></div>
                    <span class="small text-muted fw-semibold">Consulting Gemini 2.5 Flash to diagnose root cause and formulate MySQL 8 correction...</span>
                </div>
            </div>
        `;

        try {
            const payload = {
                action: "diagnose",
                practical_name: practicalName,
                task_description: taskDesc,
                sql_code: sqlToDiagnose,
                workspace_name: state.activeWorkspace,
                schema_context: state.schemaContext,
                execution_error: errorMsg
            };

            const res = await fetch("/api/practical-lab/ai/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (result.success && result.data) {
                renderInlineDiagnosis(result.data, diagContainer);
                renderAiResponse("diagnose", result.data);
                btnEl.disabled = false;
                btnEl.innerHTML = `<i class="bi bi-check2-circle text-success me-1"></i> Diagnosis Ready (Click to Re-run)`;
            } else {
                renderInlineDiagnosisError(result.error || "Gemini could not generate a diagnosis.", diagContainer, btnEl, () => handleDiagnoseAndFix(failedStmt, errorMsg, btnEl));
            }
        } catch (err) {
            renderInlineDiagnosisError(`Network or connection error: ${err.message}`, diagContainer, btnEl, () => handleDiagnoseAndFix(failedStmt, errorMsg, btnEl));
        }
    }

    function renderInlineDiagnosis(diag, container) {
        const rootCause = diag.root_cause || diag.explanation || "Execution error detected.";
        const category = diag.error_category || "Execution Error";
        const probSql = diag.problematic_sql || "";
        const correctedSql = diag.corrected_sql || diag.suggested_correction || "";
        const explanation = diag.explanation || "";
        const nextAction = diag.next_action || "Review the corrected SQL below and test it in your workspace.";

        let cardHtml = `
            <div class="card border-0 shadow-sm rounded-3 overflow-hidden bg-white mt-2">
                <!-- Header -->
                <div class="card-header bg-danger-subtle text-danger-emphasis py-2 px-3 d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-stars text-warning fs-6"></i>
                        <strong class="small text-uppercase">Gemini 2.5 Flash Diagnosis &amp; Fix</strong>
                    </div>
                    <span class="badge bg-danger text-white small">${escapeHtml(category)}</span>
                </div>

                <div class="card-body p-3">
                    <!-- 1. Problem Analysis -->
                    <div class="mb-3">
                        <h6 class="fw-bold small text-secondary text-uppercase mb-1">
                            <i class="bi bi-search me-1"></i> Root Cause Analysis
                        </h6>
                        <div class="p-2 bg-danger-subtle text-danger-emphasis rounded border border-danger-subtle small mb-2">
                            <strong>Why it failed:</strong> ${escapeHtml(rootCause)}
                        </div>
                        ${probSql ? `
                            <div class="small fw-semibold text-muted mb-1">Problematic SQL Fragment:</div>
                            <pre class="bg-light p-2 rounded border small font-monospace text-danger mb-0">${escapeHtml(probSql)}</pre>
                        ` : ''}
                    </div>

                    <hr class="text-secondary opacity-25 my-3">

                    <!-- 2. Suggested Working SQL -->
                    <div class="mb-3">
                        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                            <h6 class="fw-bold small text-success text-uppercase mb-0">
                                <i class="bi bi-check-circle-fill me-1"></i> Suggested Working SQL (MySQL 8)
                            </h6>
                            <div class="d-flex gap-2">
                                <button type="button" class="btn btn-sm btn-outline-secondary py-1 px-2 small" id="btn-copy-inline-diag" title="Copy SQL to clipboard">
                                    <i class="bi bi-clipboard me-1"></i> Copy Correction
                                </button>
                                <button type="button" class="btn btn-sm btn-success py-1 px-2 small fw-semibold" id="btn-insert-inline-diag" title="Insert into Editor (Does not execute)">
                                    <i class="bi bi-arrow-down-left-square me-1"></i> Insert into Editor
                                </button>
                            </div>
                        </div>
                        <pre class="bg-dark text-light p-3 rounded font-monospace small mb-2" style="white-space: pre-wrap; max-height: 250px; overflow-y: auto;">${escapeHtml(correctedSql)}</pre>
                        <div class="form-text text-muted small mt-0 mb-2">
                            <i class="bi bi-shield-lock me-1"></i> <strong>Safety Note:</strong> Suggested SQL is for your review. It will <strong>never</strong> execute automatically.
                        </div>
                    </div>

                    <!-- 3. Pedagogical Explanation & Next Action -->
                    <div class="p-2 bg-light border rounded small mb-2">
                        <strong class="text-secondary d-block mb-1"><i class="bi bi-lightbulb-fill text-warning me-1"></i> Pedagogical Explanation:</strong>
                        <div style="white-space: pre-wrap;">${escapeHtml(explanation)}</div>
                    </div>

                    <div class="small text-muted d-flex align-items-center gap-2">
                        <i class="bi bi-arrow-right-circle-fill text-primary"></i>
                        <span><strong>Next Step:</strong> ${escapeHtml(nextAction)}</span>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = cardHtml;

        // Wire Copy Correction button
        const btnCopy = document.getElementById("btn-copy-inline-diag");
        if (btnCopy) {
            btnCopy.addEventListener("click", async () => {
                try {
                    await navigator.clipboard.writeText(correctedSql);
                    const orig = btnCopy.innerHTML;
                    btnCopy.innerHTML = `<i class="bi bi-check2 text-success me-1"></i> Copied!`;
                    btnCopy.classList.replace("btn-outline-secondary", "btn-success");
                    setTimeout(() => {
                        btnCopy.innerHTML = orig;
                        btnCopy.classList.replace("btn-success", "btn-outline-secondary");
                    }, 2000);
                } catch (e) {
                    alert("Could not copy to clipboard. Please copy manually from the box.");
                }
            });
        }

        // Wire Insert into Editor button (Never executes automatically)
        const btnInsert = document.getElementById("btn-insert-inline-diag");
        if (btnInsert) {
            btnInsert.addEventListener("click", () => {
                sqlEditor.value = correctedSql;
                practicalStatusBadge.className = "badge bg-warning-subtle text-warning-emphasis border border-warning-subtle small";
                practicalStatusBadge.textContent = "Corrected SQL Inserted (Unsaved)";
                sqlEditor.focus();
                sqlEditor.scrollIntoView({ behavior: "smooth", block: "center" });
            });
        }
    }

    function renderInlineDiagnosisError(errMessage, container, btnEl, retryFn) {
        btnEl.disabled = false;
        btnEl.innerHTML = `<i class="bi bi-arrow-clockwise me-1"></i> Retry Diagnosis`;

        container.innerHTML = `
            <div class="alert alert-warning border-warning-subtle small mt-2 mb-0 shadow-sm">
                <div class="d-flex align-items-center gap-2 mb-1">
                    <i class="bi bi-exclamation-triangle-fill text-warning fs-5"></i>
                    <strong class="fs-6">Gemini Diagnosis Service Notice</strong>
                </div>
                <p class="mb-2">${escapeHtml(errMessage)}</p>
                <div class="bg-white p-2 rounded border small text-muted mb-2">
                    <strong>Troubleshooting Advice:</strong>
                    <ul class="mb-0 ps-3">
                        <li>Verify that <code>GEMINI_API_KEY</code> or <code>OPENROUTER_API_KEY</code> is correctly set in <code>.env</code>.</li>
                        <li>If using an OpenRouter key, ensure your account has sufficient credits or a valid key at <a href="https://openrouter.ai" target="_blank" class="text-decoration-none">openrouter.ai</a>.</li>
                        <li>If the request timed out, click <strong>Retry Diagnosis</strong> to query again.</li>
                    </ul>
                </div>
                <button type="button" class="btn btn-xs btn-outline-warning text-dark fw-semibold" id="btn-inline-retry-diag">
                    <i class="bi bi-arrow-clockwise me-1"></i> Retry Now
                </button>
            </div>
        `;

        const retryBtn = document.getElementById("btn-inline-retry-diag");
        if (retryBtn) {
            retryBtn.addEventListener("click", retryFn);
        }
    }

    // ====================================================================
    // GEMINI 2.5 FLASH AI ADVISORY ACTIONS
    // ====================================================================
    async function triggerAiAction(action) {
        if (!state.isGeminiConfigured) {
            alert("Gemini API key is not configured. Please add GEMINI_API_KEY=your_key to your .env file to enable AI assistance.");
            return;
        }

        const taskDesc = practicalTaskTextarea.value.trim();
        const sqlCode = sqlEditor.value.trim();
        const practicalName = practicalNameInput.value.trim();

        // Action-specific validations
        if (action === "generate" && !taskDesc) {
            alert("Please enter the teacher's task/question description in Section 1 so Gemini knows what SQL to generate.");
            practicalTaskTextarea.focus();
            return;
        }

        if ((action === "check" || action === "explain" || action === "suggest") && !sqlCode) {
            alert("Please enter some SQL in the editor first to use this AI feature.");
            sqlEditor.focus();
            return;
        }

        // Highlight active action tab
        document.querySelectorAll("[data-action]").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.action === action);
        });

        // Show loading state
        aiLoadingContainer.classList.remove("d-none");
        aiResponseContainer.classList.add("d-none");
        aiSuggestedSqlPanel.classList.add("d-none");

        const actionLabels = {
            check: "Checking SQL against task and schema...",
            explain: "Crafting pedagogical program walkthrough...",
            errors: "Analyzing syntax, runtime errors & constraints...",
            suggest: "Formulating recommended SQL correction...",
            generate: "Drafting complete MySQL 8 solution from prompt...",
            explain_output: "Interpreting execution output and returned rows..."
        };
        aiLoadingLabel.textContent = actionLabels[action] || "Consulting Gemini 2.5 Flash...";

        try {
            const payload = {
                action: action,
                practical_name: practicalName,
                task_description: taskDesc,
                sql_code: sqlCode,
                schema_context: state.schemaContext,
                execution_result: state.lastExecutionResult ? state.lastExecutionResult.statements : null,
                execution_error: state.lastExecutionError
            };

            const res = await fetch("/api/practical-lab/ai/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (result.success && result.data) {
                renderAiResponse(action, result.data);
            } else {
                renderAiError(result.error || "Failed to receive advice from Gemini.");
            }
        } catch (err) {
            renderAiError(`Connection to AI service failed: ${err.message}`);
        } finally {
            aiLoadingContainer.classList.add("d-none");
            aiResponseContainer.classList.remove("d-none");
        }
    }

    function renderAiResponse(action, data) {
        let html = "";
        let suggestedCode = null;

        if (action === "check") {
            const satisfies = data.satisfies_task;
            html += `
                <div class="alert ${satisfies ? 'alert-success border-success-subtle' : 'alert-warning border-warning-subtle'} small mb-3">
                    <div class="d-flex align-items-center gap-2 mb-1">
                        <i class="bi ${satisfies ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-warning'} fs-5"></i>
                        <strong class="fs-6">${satisfies ? 'Satisfies Assignment Task' : 'Needs Adjustments to Satisfy Task'}</strong>
                    </div>
                    <p class="mb-0">${escapeHtml(data.overall_assessment || '')}</p>
                </div>
            `;

            if (data.confirmed_errors && data.confirmed_errors.length > 0) {
                html += `
                    <div class="mb-3">
                        <h6 class="fw-bold small text-danger text-uppercase mb-1"><i class="bi bi-x-circle me-1"></i> Confirmed Errors</h6>
                        <ul class="list-group list-group-flush small border rounded">
                            ${data.confirmed_errors.map(err => `<li class="list-group-item text-danger py-1 px-2"><i class="bi bi-dot"></i> ${escapeHtml(err)}</li>`).join("")}
                        </ul>
                    </div>
                `;
            }

            if (data.potential_issues && data.potential_issues.length > 0) {
                html += `
                    <div class="mb-3">
                        <h6 class="fw-bold small text-warning-emphasis text-uppercase mb-1"><i class="bi bi-exclamation-circle me-1"></i> Potential Logical Issues</h6>
                        <ul class="list-group list-group-flush small border rounded">
                            ${data.potential_issues.map(iss => `<li class="list-group-item py-1 px-2"><i class="bi bi-arrow-right-short text-warning"></i> ${escapeHtml(iss)}</li>`).join("")}
                        </ul>
                    </div>
                `;
            }

            if (data.explanation) {
                html += `
                    <div class="mb-3 p-2 bg-light border rounded small">
                        <strong class="text-secondary d-block mb-1">Pedagogical Explanation:</strong>
                        <div style="white-space: pre-wrap;">${escapeHtml(data.explanation)}</div>
                    </div>
                `;
            }

            suggestedCode = data.suggested_sql;
        } 
        else if (action === "explain") {
            html += `
                <div class="mb-3">
                    <div class="alert alert-primary border-primary-subtle small mb-3">
                        <strong class="d-block mb-1"><i class="bi bi-journal-bookmark me-1"></i> Program Walkthrough Overview:</strong>
                        <div>${escapeHtml(data.overview || '')}</div>
                    </div>
                    <h6 class="fw-bold small text-secondary text-uppercase mb-2">Step-by-Step Statement Analysis</h6>
                    <div class="accordion accordion-flush border rounded mb-3" id="aiStepsAccordion">
                        ${(data.steps || []).map((step, idx) => `
                            <div class="accordion-item">
                                <h2 class="accordion-header" id="headingStep${idx}">
                                    <button class="accordion-button ${idx === 0 ? '' : 'collapsed'} py-2 px-3 small fw-semibold" type="button" data-bs-toggle="collapse" data-bs-target="#collapseStep${idx}">
                                        Step ${step.step_number || idx + 1}: ${escapeHtml(step.statement_summary || 'SQL Statement')}
                                    </button>
                                </h2>
                                <div id="collapseStep${idx}" class="accordion-collapse collapse ${idx === 0 ? 'show' : ''}">
                                    <div class="accordion-body small py-2 px-3 bg-light">
                                        <div class="mb-1">${escapeHtml(step.explanation || '')}</div>
                                        ${step.concept ? `<span class="badge bg-white text-primary border me-1 small">Concept: ${escapeHtml(step.concept)}</span>` : ''}
                                        ${step.mysql_feature ? `<span class="badge bg-white text-secondary border small">Feature: ${escapeHtml(step.mysql_feature)}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                        `).join("")}
                    </div>

                    ${(data.key_concepts_demonstrated && data.key_concepts_demonstrated.length > 0) ? `
                        <div class="mb-2">
                            <span class="small fw-semibold text-secondary">Key Concepts Demonstrated: </span>
                            ${data.key_concepts_demonstrated.map(c => `<span class="badge bg-light text-dark border me-1 small">${escapeHtml(c)}</span>`).join("")}
                        </div>
                    ` : ''}
                </div>
            `;
        } 
        else if (action === "diagnose" || data.root_cause) {
            const rootCause = data.root_cause || data.explanation || "Execution error detected.";
            const category = data.error_category || "Execution Error";
            const probSql = data.problematic_sql || "";
            const explanation = data.explanation || "";
            const nextAction = data.next_action || "Review the corrected SQL below and test it in your workspace.";

            html += `
                <div class="card mb-3 border-danger-subtle shadow-sm">
                    <div class="card-header bg-danger-subtle text-danger-emphasis py-2 px-3 d-flex justify-content-between align-items-center">
                        <span class="fw-bold small text-uppercase"><i class="bi bi-stars text-warning me-1"></i> Gemini 2.5 Flash Diagnosis &amp; Fix</span>
                        <span class="badge bg-danger text-white small">${escapeHtml(category)}</span>
                    </div>
                    <div class="card-body p-3 small">
                        <div class="alert alert-danger-subtle border-danger-subtle small mb-2">
                            <strong><i class="bi bi-bug-fill me-1"></i> Root Cause:</strong> ${escapeHtml(rootCause)}
                        </div>
                        ${probSql ? `
                            <div class="small fw-semibold text-muted mb-1">Problematic SQL Fragment:</div>
                            <pre class="bg-light p-2 rounded border small font-monospace text-danger mb-2">${escapeHtml(probSql)}</pre>
                        ` : ''}
                        <div class="p-2 bg-light border rounded small mb-2">
                            <strong><i class="bi bi-lightbulb-fill text-warning me-1"></i> Pedagogical Explanation:</strong>
                            <div style="white-space: pre-wrap;">${escapeHtml(explanation)}</div>
                        </div>
                        <div class="small text-muted"><i class="bi bi-arrow-right-circle text-primary me-1"></i><strong>Next Step:</strong> ${escapeHtml(nextAction)}</div>
                    </div>
                </div>
            `;
            suggestedCode = data.corrected_sql || data.suggested_correction;
        }
        else if (action === "errors") {
            const hasErrors = data.has_errors !== false;
            const summaryText = data.summary || data.summary_advice || (hasErrors ? "Potential issues detected." : "No syntax or logical errors found.");
            html += `
                <div class="alert ${hasErrors ? 'alert-danger border-danger-subtle' : 'alert-success border-success-subtle'} small mb-3">
                    <strong class="d-block mb-1"><i class="bi ${hasErrors ? 'bi-bug-fill text-danger' : 'bi-shield-check text-success'} me-1"></i> Error Analysis:</strong>
                    <div>${escapeHtml(summaryText)}</div>
                </div>
            `;

            const errList = data.errors || data.issues || [];
            if (errList.length > 0) {
                html += `
                    <div class="mb-3">
                        ${errList.map(err => `
                            <div class="card mb-2 border-danger-subtle shadow-sm">
                                <div class="card-body p-2 small">
                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                        <span class="badge bg-danger-subtle text-danger border border-danger-subtle">${escapeHtml(err.category || err.type || 'Error')}</span>
                                        ${err.line_number ? `<span class="text-muted">Line ${err.line_number}</span>` : ''}
                                    </div>
                                    <div class="fw-semibold text-danger mb-1">${escapeHtml(err.description || err.statement_fragment || '')}</div>
                                    <div class="text-dark bg-light p-2 rounded border mb-1"><strong>How to Fix:</strong> ${escapeHtml(err.fix || err.how_to_fix || '')}</div>
                                    ${(err.why_it_happens || err.why_wrong) ? `<div class="text-muted fst-italic" style="font-size: 0.8rem;">Theory: ${escapeHtml(err.why_it_happens || err.why_wrong)}</div>` : ''}
                                </div>
                            </div>
                        `).join("")}
                    </div>
                `;
            }

            suggestedCode = data.corrected_sql || data.suggested_correction;
        } 
        else if (action === "suggest") {
            html += `
                <div class="alert alert-info border-info-subtle small mb-3">
                    <strong class="d-block mb-1"><i class="bi bi-lightbulb-fill text-warning me-1"></i> Solution Suggestions:</strong>
                    <div>${escapeHtml(data.explanation || '')}</div>
                </div>
            `;

            if (data.changes_made && data.changes_made.length > 0) {
                html += `
                    <div class="mb-3">
                        <h6 class="fw-bold small text-secondary text-uppercase mb-1">Key Modifications Made:</h6>
                        <ul class="list-group list-group-flush small border rounded">
                            ${data.changes_made.map(chg => `<li class="list-group-item py-1 px-2"><i class="bi bi-check2 text-success me-1"></i> ${escapeHtml(chg)}</li>`).join("")}
                        </ul>
                    </div>
                `;
            }

            suggestedCode = data.suggested_sql;
        } 
        else if (action === "generate") {
            html += `
                <div class="alert alert-success border-success-subtle small mb-3">
                    <strong class="d-block mb-1"><i class="bi bi-stars text-warning me-1"></i> Generated MySQL 8 Solution:</strong>
                    <div>${escapeHtml(data.explanation || '')}</div>
                </div>
            `;

            if (data.assumptions && data.assumptions.length > 0) {
                html += `
                    <div class="mb-3 p-2 bg-light border rounded small">
                        <strong class="text-secondary d-block mb-1">Assumptions &amp; Schema Design:</strong>
                        <ul class="mb-0 ps-3">
                            ${data.assumptions.map(as => `<li>${escapeHtml(as)}</li>`).join("")}
                        </ul>
                    </div>
                `;
            }

            suggestedCode = data.generated_sql;
        } 
        else if (action === "explain_output") {
            const isPred = data.is_prediction;
            html += `
                <div class="alert ${isPred ? 'alert-warning border-warning-subtle' : 'alert-primary border-primary-subtle'} small mb-3">
                    <div class="d-flex align-items-center gap-2 mb-1">
                        <i class="bi ${isPred ? 'bi-binoculars text-warning' : 'bi-table text-primary'} fs-5"></i>
                        <strong class="fs-6">${isPred ? 'Predicted Query Output' : 'Actual Query Output Analysis'}</strong>
                    </div>
                    <div>${escapeHtml(data.summary || '')}</div>
                </div>
                <div class="mb-3 p-2 bg-light border rounded small">
                    <strong class="text-secondary d-block mb-1">Educational Data Interpretation:</strong>
                    <div style="white-space: pre-wrap;">${escapeHtml(data.data_interpretation || '')}</div>
                </div>
            `;

            if (data.column_insights && data.column_insights.length > 0) {
                html += `
                    <div class="mb-3">
                        <h6 class="fw-bold small text-secondary text-uppercase mb-1">Column Insights:</h6>
                        <ul class="list-group list-group-flush small border rounded">
                            ${data.column_insights.map(ci => `
                                <li class="list-group-item py-1 px-2">
                                    <strong class="text-dark">${escapeHtml(ci.column)}:</strong> <span class="text-muted">${escapeHtml(ci.meaning)}</span>
                                </li>
                            `).join("")}
                        </ul>
                    </div>
                `;
            }

            if (data.learning_takeaway) {
                html += `
                    <div class="p-2 border border-success-subtle bg-success-subtle rounded small text-success-emphasis">
                        <i class="bi bi-mortarboard-fill me-1"></i> <strong>Key DBMS Takeaway:</strong> ${escapeHtml(data.learning_takeaway)}
                    </div>
                `;
            }
        }

        aiResponseContainer.innerHTML = html;

        // If there's suggested code, populate the action panel
        if (suggestedCode && suggestedCode.trim()) {
            state.suggestedSQL = suggestedCode.trim();
            aiSuggestedCodeBlock.textContent = state.suggestedSQL;
            aiSuggestedSqlPanel.classList.remove("d-none");
        } else {
            state.suggestedSQL = "";
            aiSuggestedSqlPanel.classList.add("d-none");
        }
    }

    function renderAiError(message) {
        aiResponseContainer.innerHTML = `
            <div class="alert alert-danger border-danger-subtle small mb-0">
                <i class="bi bi-exclamation-circle-fill me-1 text-danger"></i>
                <strong>Gemini Advisory Notice:</strong>
                <div class="mt-1" style="white-space: pre-wrap;">${escapeHtml(message)}</div>
            </div>
        `;
        aiSuggestedSqlPanel.classList.add("d-none");
    }

    // ====================================================================
    // PRACTICAL RECORD SAVING & LOADING
    // ====================================================================
    async function savePractical() {
        const name = practicalNameInput.value.trim();
        const task = practicalTaskTextarea.value.trim();
        if (!name) {
            alert("Please enter a Practical/Program Name before saving.");
            practicalNameInput.focus();
            return;
        }
        if (!task) {
            alert("Please enter the Task Description / Question Prompt before saving.");
            practicalTaskTextarea.focus();
            return;
        }

        btnSavePractical.disabled = true;
        btnSavePractical.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';

        try {
            const payload = {
                id: state.currentPracticalId,
                practical_name: name,
                practical_number: practicalNumberInput.value.trim(),
                topic: practicalTopicInput.value.trim(),
                task_description: task,
                workspace_name: state.activeWorkspace,
                sql_script: sqlEditor.value
            };

            const res = await fetch("/api/practical-lab/practicals/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                state.currentPracticalId = data.id;
                practicalRecordIdInput.value = data.id;
                btnSavePractical.innerHTML = `<i class="bi bi-floppy"></i> Update Practical (#${data.id})`;
                if (btnSaveAsCopy) {
                    btnSaveAsCopy.classList.remove("d-none");
                    btnSaveAsCopy.classList.add("d-flex");
                }
                practicalStatusBadge.className = "badge bg-success-subtle text-success border border-success-subtle small";
                practicalStatusBadge.textContent = "Saved to Database (ID #" + data.id + ")";
                alert(`Practical '${name}' saved successfully without requiring a password!`);
            } else {
                alert(`Save failed: ${data.error}`);
            }
        } catch (err) {
            alert("Error saving practical. Check network connection.");
        } finally {
            btnSavePractical.disabled = false;
            if (!state.currentPracticalId) {
                btnSavePractical.innerHTML = '<i class="bi bi-floppy"></i> Save Practical';
            }
        }
    }

    async function loadPracticalsList(query = "") {
        savedPracticalsTbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3"><span class="spinner-border spinner-border-sm me-2"></span> Loading saved practicals...</td></tr>';
        try {
            const url = query ? `/api/practical-lab/practicals?search=${encodeURIComponent(query)}` : "/api/practical-lab/practicals";
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                renderPracticalsTable(data.practicals || []);
            } else {
                savedPracticalsTbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center">${escapeHtml(data.error || "Failed to load practicals")}</td></tr>`;
            }
        } catch (err) {
            savedPracticalsTbody.innerHTML = '<tr><td colspan="6" class="text-danger text-center">Error fetching practical records.</td></tr>';
        }
    }

    function renderPracticalsTable(practicals) {
        if (practicals.length === 0) {
            savedPracticalsTbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No saved practicals found. Save your current assignment to view it here.</td></tr>';
            return;
        }

        // Sort by updated_at descending (latest first)
        const sorted = [...practicals].sort((a, b) => {
            const tA = a.updated_at || "";
            const tB = b.updated_at || "";
            return tB.localeCompare(tA);
        });

        savedPracticalsTbody.innerHTML = "";
        sorted.forEach(p => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="font-monospace small">${escapeHtml(p.practical_number || '-')}</td>
                <td class="fw-semibold">${escapeHtml(p.practical_name)}</td>
                <td><span class="badge bg-light text-dark border small">${escapeHtml(p.topic || 'General')}</span></td>
                <td><code class="small text-secondary">${escapeHtml(p.workspace_name)}</code></td>
                <td class="small text-muted">${escapeHtml(p.updated_at ? p.updated_at.substring(0, 16) : '')}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-primary py-0 px-2 small me-1 btn-load-record" data-id="${p.id}" title="Load Practical into Editor">
                        <i class="bi bi-box-arrow-in-up-right me-1"></i> Load
                    </button>
                    <button class="btn btn-sm btn-outline-danger py-0 px-2 small btn-delete-record" data-id="${p.id}" title="Delete Practical">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            savedPracticalsTbody.appendChild(tr);
        });

        // Wire click handlers for load and delete buttons
        document.querySelectorAll(".btn-load-record").forEach(btn => {
            btn.addEventListener("click", () => loadSinglePractical(btn.dataset.id));
        });
        document.querySelectorAll(".btn-delete-record").forEach(btn => {
            btn.addEventListener("click", () => deletePractical(btn.dataset.id));
        });
    }

    async function loadSinglePractical(recordId) {
        try {
            const res = await fetch(`/api/practical-lab/practicals/${recordId}`);
            const data = await res.json();
            if (data.success && data.practical) {
                const p = data.practical;
                state.currentPracticalId = p.id;
                practicalRecordIdInput.value = p.id;
                practicalNameInput.value = p.practical_name || "";
                practicalNumberInput.value = p.practical_number || "";
                practicalTopicInput.value = p.topic || "";
                practicalTaskTextarea.value = p.task_description || "";
                sqlEditor.value = p.sql_script || "";

                btnSavePractical.innerHTML = `<i class="bi bi-floppy"></i> Update Practical (#${p.id})`;
                if (btnSaveAsCopy) {
                    btnSaveAsCopy.classList.remove("d-none");
                    btnSaveAsCopy.classList.add("d-flex");
                }

                if (p.workspace_name) {
                    const availableWorkspaces = Array.from(workspaceSelect.options).map(o => o.value).filter(Boolean);
                    if (availableWorkspaces.includes(p.workspace_name)) {
                        state.activeWorkspace = p.workspace_name;
                        workspaceSelect.value = p.workspace_name;
                        if (resetModalTargetDb) resetModalTargetDb.textContent = p.workspace_name;
                        loadWorkspaceTables(state.activeWorkspace);
                    } else {
                        const shouldCreate = confirm(
                            `Practical '${p.practical_name}' was originally created in database '${p.workspace_name}', but it was not found on your MySQL server.\n\n` +
                            `Would you like to automatically CREATE database '${p.workspace_name}' now?\n\n` +
                            `Click OK to create and switch to '${p.workspace_name}', or Cancel to continue using '${state.activeWorkspace}'.`
                        );
                        if (shouldCreate) {
                            try {
                                const createRes = await fetch("/api/practical-lab/workspaces/create", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ workspace_name: p.workspace_name })
                                });
                                const createData = await createRes.json();
                                if (createData.success) {
                                    await loadWorkspaces();
                                    state.activeWorkspace = p.workspace_name;
                                    workspaceSelect.value = p.workspace_name;
                                    if (resetModalTargetDb) resetModalTargetDb.textContent = p.workspace_name;
                                    loadWorkspaceTables(state.activeWorkspace);
                                } else {
                                    alert(`Could not create database '${p.workspace_name}': ${createData.error}`);
                                }
                            } catch (e) {
                                alert(`Error creating database: ${e.message}`);
                            }
                        }
                    }
                }

                practicalStatusBadge.className = "badge bg-primary-subtle text-primary border border-primary-subtle small";
                practicalStatusBadge.textContent = `Loaded (PR ID #${p.id})`;

                // Close modal
                const modalEl = document.getElementById("loadPracticalModal");
                bootstrap.Modal.getInstance(modalEl).hide();
            } else {
                alert(`Error loading practical: ${data.error}`);
            }
        } catch (err) {
            alert("Failed to load practical details.");
        }
    }

    async function deletePractical(recordId) {
        if (!confirm("Are you sure you want to delete this saved practical? This cannot be undone.")) {
            return;
        }
        try {
            const res = await fetch(`/api/practical-lab/practicals/${recordId}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                if (state.currentPracticalId == recordId) {
                    resetNewPractical();
                }
                loadPracticalsList(searchPracticalsInput.value.trim());
            } else {
                alert(`Delete failed: ${data.error}`);
            }
        } catch (err) {
            alert("Error deleting practical.");
        }
    }

    function resetNewPractical() {
        state.currentPracticalId = null;
        practicalRecordIdInput.value = "";
        practicalNameInput.value = "";
        practicalNumberInput.value = "";
        practicalTopicInput.value = "";
        practicalTaskTextarea.value = "";
        sqlEditor.value = "";
        practicalStatusBadge.className = "badge bg-secondary-subtle text-secondary small";
        practicalStatusBadge.textContent = "Unsaved New Practical";
        btnSavePractical.innerHTML = '<i class="bi bi-floppy"></i> Save Practical';
        if (btnSaveAsCopy) {
            btnSaveAsCopy.classList.add("d-none");
            btnSaveAsCopy.classList.remove("d-flex");
        }
        aiResponseContainer.innerHTML = `
            <div class="p-3 text-center text-muted small bg-white border rounded">
                <i class="bi bi-chat-quote fs-3 d-block mb-2 text-primary opacity-50"></i>
                <h6 class="fw-bold text-dark mb-1">Your Personal DBMS Lab Tutor</h6>
                <p class="mb-0">Enter your new practical question and SQL code to begin.</p>
            </div>
        `;
        aiSuggestedSqlPanel.classList.add("d-none");
    }

    // ====================================================================
    // EVENT LISTENERS
    // ====================================================================
    function setupEventListeners() {
        // Workspace select change
        workspaceSelect.addEventListener("change", () => {
            state.activeWorkspace = workspaceSelect.value;
            if (resetModalTargetDb) {
                resetModalTargetDb.textContent = state.activeWorkspace;
            }
            loadWorkspaceTables(state.activeWorkspace);
        });

        btnRefreshTables.addEventListener("click", () => {
            loadWorkspaceTables(state.activeWorkspace);
        });

        // Run SQL Button & Keyboard Shortcut
        btnRunSQL.addEventListener("click", runSQL);
        sqlEditor.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                runSQL();
            }
        });

        // Clear & Copy buttons
        btnClearSQL.addEventListener("click", () => {
            if (sqlEditor.value.trim() && confirm("Clear editor contents?")) {
                sqlEditor.value = "";
                sqlEditor.focus();
            }
        });

        btnCopySQL.addEventListener("click", () => {
            navigator.clipboard.writeText(sqlEditor.value).then(() => {
                const orig = btnCopySQL.innerHTML;
                btnCopySQL.innerHTML = '<i class="bi bi-check text-success me-1"></i> Copied!';
                setTimeout(() => { btnCopySQL.innerHTML = orig; }, 1800);
            });
        });

        btnFormatSQL.addEventListener("click", () => {
            const template = `-- Practical Template: Schema Definition & Basic Queries
-- Database Workspace: ${state.activeWorkspace}

-- 1. Create Tables with Constraints
CREATE TABLE IF NOT EXISTS student (
    roll_no INT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    branch VARCHAR(30) NOT NULL,
    semester INT DEFAULT 1 CHECK (semester BETWEEN 1 AND 8)
);

CREATE TABLE IF NOT EXISTS course (
    course_id VARCHAR(10) PRIMARY KEY,
    course_name VARCHAR(100) NOT NULL,
    credits INT DEFAULT 3
);

-- 2. Populate Sample Records
INSERT INTO student (roll_no, name, branch, semester) VALUES
(101, 'Aarav Patel', 'CSE', 3),
(102, 'Diya Sharma', 'ECE', 3),
(103, 'Rohan Verma', 'CSE', 3);

INSERT INTO course (course_id, course_name, credits) VALUES
('CS301', 'Database Management Systems', 4),
('EC302', 'Digital Signal Processing', 3);

-- 3. Verification Queries
SELECT * FROM student WHERE branch = 'CSE';
SELECT * FROM course;
`;
            if (!sqlEditor.value.trim() || confirm("Replace current editor content with sample practical template?")) {
                sqlEditor.value = template;
            }
        });

        // AI Feature Buttons
        btnAiGenerate.addEventListener("click", () => triggerAiAction("generate"));
        btnAiCheck.addEventListener("click", () => triggerAiAction("check"));
        if (btnAiExplain) btnAiExplain.addEventListener("click", () => triggerAiAction("explain"));
        btnAiErrors.addEventListener("click", () => triggerAiAction("errors"));
        btnAiSuggest.addEventListener("click", () => triggerAiAction("suggest"));
        btnAiExplainOutput.addEventListener("click", () => triggerAiAction("explain_output"));

        // AI Tab Buttons
        document.querySelectorAll("[data-action]").forEach(btn => {
            btn.addEventListener("click", () => {
                const action = btn.dataset.action;
                triggerAiAction(action);
            });
        });

        // Copy Suggested Code
        btnCopySuggested.addEventListener("click", () => {
            if (state.suggestedSQL) {
                navigator.clipboard.writeText(state.suggestedSQL).then(() => {
                    const orig = btnCopySuggested.innerHTML;
                    btnCopySuggested.innerHTML = '<i class="bi bi-check text-success me-1"></i> Copied!';
                    setTimeout(() => { btnCopySuggested.innerHTML = orig; }, 1800);
                });
            }
        });

        // Insert Suggested Code into Editor (Never auto-executed!)
        btnInsertSuggested.addEventListener("click", () => {
            if (state.suggestedSQL) {
                if (!sqlEditor.value.trim() || confirm("Insert suggested SQL into your editor? You can then review and click Run SQL.")) {
                    sqlEditor.value = state.suggestedSQL;
                    sqlEditor.scrollIntoView({ behavior: "smooth", block: "center" });
                    sqlEditor.focus();
                }
            }
        });

        // Compare Diff Modal
        btnDiffSuggested.addEventListener("click", () => {
            diffOriginalCode.textContent = sqlEditor.value || "-- Editor is currently empty --";
            diffSuggestedCode.textContent = state.suggestedSQL || "-- No suggestion available --";
            const diffModalEl = document.getElementById("diffModal");
            const modal = bootstrap.Modal.getOrCreateInstance(diffModalEl);
            modal.show();
        });

        btnModalInsertDiff.addEventListener("click", () => {
            if (state.suggestedSQL) {
                sqlEditor.value = state.suggestedSQL;
                const diffModalEl = document.getElementById("diffModal");
                bootstrap.Modal.getInstance(diffModalEl).hide();
                sqlEditor.focus();
            }
        });

        // Practical Saving & Loading
        btnSavePractical.addEventListener("click", savePractical);
        if (btnSaveAsCopy) {
            btnSaveAsCopy.addEventListener("click", () => {
                const currentName = practicalNameInput.value.trim();
                const copyName = currentName.endsWith("(Copy)") ? currentName : `${currentName} (Copy)`;
                practicalNameInput.value = copyName;
                state.currentPracticalId = null;
                practicalRecordIdInput.value = "";
                savePractical();
            });
        }
        btnNewPractical.addEventListener("click", () => {
            if (confirm("Start a new practical? Make sure you have saved any current work.")) {
                resetNewPractical();
            }
        });

        // Search in saved practicals modal
        document.getElementById("loadPracticalModal").addEventListener("show.bs.modal", () => {
            loadPracticalsList();
        });
        searchPracticalsInput.addEventListener("input", (e) => {
            loadPracticalsList(e.target.value.trim());
        });
    }

    // Helper: Escape HTML to avoid XSS
    function escapeHtml(str) {
        if (str === null || str === undefined) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Run initializer
    init();
});
