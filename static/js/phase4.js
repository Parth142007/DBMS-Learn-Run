/**
 * DBMS Learn & Run: Phase 4 Client-Side Interactivity
 * Handles topic navigation, localStorage progress, live view inspection,
 * trigger testing, constraint laboratory, stored procedure execution,
 * RBAC authorization simulator, and interactive quizzes.
 */

document.addEventListener("DOMContentLoaded", function () {
    const STORAGE_KEY = "dbms_learn_run_phase4";
    const TOPICS = ["views", "triggers", "constraints", "procedures", "security"];
    const TOPIC_NAMES = {
        "views": "Views & Updatable Views",
        "triggers": "BEFORE & AFTER Triggers",
        "constraints": "Database Constraints",
        "procedures": "Stored Procedures",
        "security": "Authorization & Database Security"
    };

    // Default state structure
    let progressState = {
        completed_topics: {
            "views": false,
            "triggers": false,
            "constraints": false,
            "procedures": false,
            "security": false
        },
        quizzes: {
            "phase4-views": { score: 0, attempted: false, answers: {} },
            "phase4-triggers": { score: 0, attempted: false, answers: {} },
            "phase4-constraints": { score: 0, attempted: false, answers: {} },
            "phase4-procedures": { score: 0, attempted: false, answers: {} },
            "phase4-security": { score: 0, attempted: false, answers: {} }
        }
    };

    // Load saved progress from localStorage
    function loadProgress() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                progressState = Object.assign(progressState, parsed);
            }
        } catch (e) {
            console.warn("Could not parse saved Phase 4 progress from localStorage:", e);
        }
    }

    // Save progress to localStorage
    function saveProgress() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(progressState));
        } catch (e) {
            console.warn("Could not save Phase 4 progress to localStorage:", e);
        }
    }

    // Toast notification helper
    function showToast(msg, isSuccess = true) {
        const toastEl = document.getElementById("phase4-toast");
        const msgEl = document.getElementById("phase4-toast-msg");
        if (toastEl && msgEl && window.bootstrap) {
            msgEl.textContent = msg;
            toastEl.className = isSuccess
                ? "toast align-items-center text-bg-success border-0 shadow"
                : "toast align-items-center text-bg-danger border-0 shadow";
            const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
            toast.show();
        }
    }

    // Recalculate & update overall progress bar and indicators
    function updateProgressUI() {
        let completedTopicCount = 0;
        TOPICS.forEach(t => {
            if (progressState.completed_topics[t]) completedTopicCount++;
        });

        let totalQuizScore = 0; // out of 15
        let totalQuizAttempted = 0;
        TOPICS.forEach(t => {
            const qKey = `phase4-${t}`;
            const q = progressState.quizzes[qKey];
            if (q) {
                totalQuizScore += (q.score || 0);
                if (q.attempted) totalQuizAttempted++;
            }
        });

        // 5 topics = 10% each (total 50%). 15 quiz points = 3.33% each (total 50%).
        const topicPct = completedTopicCount * 10;
        const quizPct = (totalQuizScore / 15) * 50;
        const totalPct = Math.min(100, Math.round(topicPct + quizPct));

        // Update progress bar
        const pBar = document.getElementById("phase4-progress-bar");
        const pBadge = document.getElementById("progress-percentage-badge");
        if (pBar) {
            pBar.style.width = totalPct + "%";
            pBar.setAttribute("aria-valuenow", totalPct);
        }
        if (pBadge) {
            pBadge.textContent = totalPct + "% Complete";
            if (totalPct === 100) {
                pBadge.className = "badge bg-success";
                pBadge.innerHTML = '<i class="bi bi-patch-check-fill me-1"></i> Module Mastered (100%)';
            } else if (totalPct > 0) {
                pBadge.className = "badge bg-primary";
            } else {
                pBadge.className = "badge bg-secondary";
            }
        }

        // Update topic pills
        TOPICS.forEach(t => {
            const pill = document.getElementById("pill-progress-" + t);
            if (pill) {
                const icon = pill.querySelector(".status-icon");
                if (progressState.completed_topics[t]) {
                    pill.classList.add("border-success", "bg-success-subtle");
                    if (icon) {
                        icon.className = "bi bi-check-circle-fill text-success me-1 status-icon";
                    }
                } else {
                    pill.classList.remove("border-success", "bg-success-subtle");
                    if (icon) {
                        icon.className = "bi bi-circle text-muted me-1 status-icon";
                    }
                }
            }

            // Update quiz status text in pill
            const quizStatusEl = document.getElementById("quiz-status-" + t);
            const qData = progressState.quizzes[`phase4-${t}`];
            if (quizStatusEl && qData) {
                if (qData.attempted) {
                    quizStatusEl.innerHTML = `<span class="text-success fw-bold">Score: ${qData.score}/3</span>`;
                } else {
                    quizStatusEl.textContent = "Quiz: 0/3";
                }
            }
        });
    }

    // ====================================================================
    // TOPIC SWITCHING LOGIC
    // ====================================================================
    function switchTopic(targetTopic) {
        if (!TOPICS.includes(targetTopic)) targetTopic = "views";

        // Hide all topic containers, show target
        TOPICS.forEach(t => {
            const container = document.getElementById("topic-container-" + t);
            if (container) {
                if (t === targetTopic) {
                    container.classList.remove("d-none");
                } else {
                    container.classList.add("d-none");
                }
            }
        });

        // Update tab buttons
        document.querySelectorAll("#phase4-topic-tabs .nav-link").forEach(btn => {
            const t = btn.getAttribute("data-target");
            if (t === targetTopic) {
                btn.classList.add("active");
                btn.classList.remove("text-secondary");
            } else {
                btn.classList.remove("active");
                btn.classList.add("text-secondary");
            }
        });

        // Update Prev / Next footer buttons
        const currentIndex = TOPICS.indexOf(targetTopic);
        const prevBtn = document.getElementById("btn-prev-topic");
        const nextBtn = document.getElementById("btn-next-topic");
        const indicatorText = document.getElementById("topic-indicator-text");

        if (indicatorText) {
            indicatorText.textContent = `Viewing Topic ${currentIndex + 1} of 5: ${TOPIC_NAMES[targetTopic]}`;
        }

        if (prevBtn) {
            if (currentIndex > 0) {
                prevBtn.disabled = false;
                const prevTarget = TOPICS[currentIndex - 1];
                prevBtn.innerHTML = `<i class="bi bi-chevron-left me-1"></i> Prev: ${TOPIC_NAMES[prevTarget]}`;
                prevBtn.setAttribute("data-target", prevTarget);
            } else {
                prevBtn.disabled = true;
                prevBtn.innerHTML = `<i class="bi bi-chevron-left me-1"></i> Previous Topic`;
            }
        }

        if (nextBtn) {
            if (currentIndex < TOPICS.length - 1) {
                nextBtn.disabled = false;
                const nextTarget = TOPICS[currentIndex + 1];
                nextBtn.innerHTML = `Next: ${TOPIC_NAMES[nextTarget]} <i class="bi bi-chevron-right ms-1"></i>`;
                nextBtn.setAttribute("data-target", nextTarget);
            } else {
                nextBtn.disabled = true;
                nextBtn.innerHTML = `End of Module <i class="bi bi-check2-all ms-1"></i>`;
            }
        }

        // Mark current topic as visited/completed in progress
        progressState.completed_topics[targetTopic] = true;
        saveProgress();
        updateProgressUI();

        // Update URL query param without reload
        const url = new URL(window.location);
        url.searchParams.set("topic", targetTopic);
        window.history.replaceState({}, "", url);

        // Scroll smoothly to topic tabs top
        const tabsEl = document.getElementById("phase4-topic-tabs");
        if (tabsEl) {
            tabsEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    // Tab buttons click listener
    document.querySelectorAll("#phase4-topic-tabs .nav-link").forEach(btn => {
        btn.addEventListener("click", function () {
            const target = this.getAttribute("data-target");
            switchTopic(target);
        });
    });

    // Prev / Next footer buttons click listeners
    const prevTopicBtn = document.getElementById("btn-prev-topic");
    if (prevTopicBtn) {
        prevTopicBtn.addEventListener("click", function () {
            const target = this.getAttribute("data-target");
            if (target) switchTopic(target);
        });
    }

    const nextTopicBtn = document.getElementById("btn-next-topic");
    if (nextTopicBtn) {
        nextTopicBtn.addEventListener("click", function () {
            const target = this.getAttribute("data-target");
            if (target) switchTopic(target);
        });
    }

    // Start reading button
    const btnStartReading = document.getElementById("btn-start-reading");
    if (btnStartReading) {
        btnStartReading.addEventListener("click", function () {
            switchTopic("views");
        });
    }

    // Reset all progress button
    const btnResetAll = document.getElementById("btn-reset-all-progress");
    if (btnResetAll) {
        btnResetAll.addEventListener("click", function () {
            if (confirm("Reset all Phase 4 learning progress and quiz scores?")) {
                localStorage.removeItem(STORAGE_KEY);
                progressState = {
                    completed_topics: {
                        "views": false,
                        "triggers": false,
                        "constraints": false,
                        "procedures": false,
                        "security": false
                    },
                    quizzes: {
                        "phase4-views": { score: 0, attempted: false, answers: {} },
                        "phase4-triggers": { score: 0, attempted: false, answers: {} },
                        "phase4-constraints": { score: 0, attempted: false, answers: {} },
                        "phase4-procedures": { score: 0, attempted: false, answers: {} },
                        "phase4-security": { score: 0, attempted: false, answers: {} }
                    }
                };
                // Reset quiz DOM
                document.querySelectorAll(".quiz-feedback").forEach(f => {
                    f.style.display = "none";
                    f.innerHTML = "";
                });
                document.querySelectorAll(".form-check-input").forEach(inp => {
                    inp.checked = false;
                });
                updateProgressUI();
                showToast("All Phase 4 progress has been reset.");
            }
        });
    }

    // Toggle hint buttons
    document.querySelectorAll(".btn-toggle-hint").forEach(btn => {
        btn.addEventListener("click", function () {
            const targetId = this.getAttribute("data-target");
            const hintEl = document.getElementById(targetId);
            if (hintEl) {
                if (hintEl.classList.contains("d-none")) {
                    hintEl.classList.remove("d-none");
                    this.innerHTML = '<i class="bi bi-eye-slash me-1"></i> Hide Hint';
                } else {
                    hintEl.classList.add("d-none");
                    this.innerHTML = '<i class="bi bi-lightbulb me-1"></i> Show Hint';
                }
            }
        });
    });

    // ====================================================================
    // TOPIC 1: VIEW INSPECTOR & UPDATABLE VIEW LABORATORY
    // ====================================================================
    const btnInspectView = document.getElementById("btn-inspect-view");
    const selectViewInspect = document.getElementById("select-view-inspect");
    const viewInspectResults = document.getElementById("view-inspect-results");

    if (btnInspectView && selectViewInspect && viewInspectResults) {
        btnInspectView.addEventListener("click", async function () {
            const viewName = selectViewInspect.value;
            viewInspectResults.innerHTML = `<div class="text-center py-3 text-muted"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Inspecting view <code>${viewName}</code> from MySQL data dictionary...</div>`;

            try {
                const resp = await fetch("/api/view/inspect", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ view_name: viewName })
                });
                const data = await resp.json();

                if (!data.success) {
                    viewInspectResults.innerHTML = `<div class="alert alert-danger mb-0 py-2"><strong>Error:</strong> ${data.error}</div>`;
                    return;
                }

                const updatableBadge = data.is_updatable
                    ? '<span class="badge bg-success ms-2"><i class="bi bi-check-circle me-1"></i> Updatable View</span>'
                    : '<span class="badge bg-danger ms-2"><i class="bi bi-x-circle me-1"></i> NOT Updatable</span>';

                let rowsHtml = "";
                if (data.sample_data && data.sample_data.length > 0) {
                    const headers = Object.keys(data.sample_data[0]);
                    rowsHtml = `
                        <h6 class="fw-bold mt-3 mb-1 text-dark">Live Row Preview (First 5 records):</h6>
                        <div class="table-responsive">
                            <table class="table table-sm table-bordered table-striped font-monospace small mb-0">
                                <thead class="table-dark">
                                    <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
                                </thead>
                                <tbody>
                                    ${data.sample_data.map(row => `
                                        <tr>${headers.map(h => `<td>${row[h] !== null ? row[h] : '<span class="text-muted">NULL</span>'}</td>`).join("")}</tr>
                                    `).join("")}
                                </tbody>
                            </table>
                        </div>
                    `;
                }

                viewInspectResults.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="fw-bold text-primary">${data.view_name}</span>
                        <div>${updatableBadge}</div>
                    </div>
                    <div class="small text-secondary mb-2">${data.updatability_reason}</div>
                    <h6 class="fw-bold mb-1 text-dark">SHOW CREATE VIEW Definition:</h6>
                    <pre class="bg-dark text-light p-2 rounded small mb-2" style="white-space: pre-wrap;">${escapeHtml(data.create_statement)}</pre>
                    ${rowsHtml}
                `;
            } catch (err) {
                viewInspectResults.innerHTML = `<div class="alert alert-danger mb-0 py-2">Failed to reach MySQL server: ${err.message}</div>`;
            }
        });
    }

    // Run View DML Test Buttons
    document.querySelectorAll(".btn-run-view-dml").forEach(btn => {
        btn.addEventListener("click", async function () {
            const sql = this.getAttribute("data-sql");
            const feedbackEl = document.getElementById("view-dml-feedback");
            if (!feedbackEl) return;

            feedbackEl.classList.remove("d-none");
            feedbackEl.innerHTML = `<div class="spinner-border spinner-border-sm text-primary me-2"></div>Executing SQL through view against MySQL 8...`;

            try {
                const resp = await fetch("/api/query", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query: sql })
                });
                const res = await resp.json();

                if (res.success) {
                    feedbackEl.className = "alert alert-success mt-3 small font-monospace";
                    feedbackEl.innerHTML = `
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <i class="bi bi-check-circle-fill text-success fs-5"></i>
                            <strong>DML Execution Succeeded!</strong>
                        </div>
                        <div><strong>Executed SQL:</strong> <code>${escapeHtml(sql)}</code></div>
                        <div><strong>Rows Affected:</strong> ${res.affected_rows}</div>
                        <div class="text-success-emphasis mt-1">Underlying base table was updated directly through the view.</div>
                    `;
                    showToast("Update through view succeeded!");
                } else {
                    feedbackEl.className = "alert alert-danger mt-3 small font-monospace";
                    feedbackEl.innerHTML = `
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <i class="bi bi-shield-x text-danger fs-5"></i>
                            <strong>MySQL Execution Rejected:</strong>
                        </div>
                        <div><strong>Attempted SQL:</strong> <code>${escapeHtml(sql)}</code></div>
                        <div class="mt-1"><strong>Database Error:</strong> <code>${escapeHtml(res.error)}</code></div>
                        <div class="text-danger-emphasis mt-2">
                            <strong>Why this happened:</strong> The view was created with <code>WITH CHECK OPTION</code>. Because the new GPA (6.50) is less than 8.00, MySQL rejected the modification to protect view integrity!
                        </div>
                    `;
                    showToast("WITH CHECK OPTION successfully caught and rejected invalid update!", false);
                }
            } catch (err) {
                feedbackEl.className = "alert alert-danger mt-3 small";
                feedbackEl.innerHTML = `Request failed: ${err.message}`;
            }
        });
    });

    // Reset View Sandbox
    const btnResetViewSandbox = document.getElementById("btn-reset-view-sandbox");
    if (btnResetViewSandbox) {
        btnResetViewSandbox.addEventListener("click", async function () {
            try {
                const resp = await fetch("/api/reset-practice", { method: "POST" });
                const res = await resp.json();
                if (res.success) {
                    showToast("Practice table & views reset successfully!");
                    if (btnInspectView) btnInspectView.click();
                    const feedbackEl = document.getElementById("view-dml-feedback");
                    if (feedbackEl) feedbackEl.classList.add("d-none");
                }
            } catch (err) {
                showToast("Could not reset practice dataset: " + err.message, false);
            }
        });
    }

    // ====================================================================
    // TOPIC 2: INTERACTIVE TRIGGER LABORATORY
    // ====================================================================
    document.querySelectorAll(".btn-run-trigger-test").forEach(btn => {
        btn.addEventListener("click", async function () {
            const action = this.getAttribute("data-action");
            const resultsEl = document.getElementById("trigger-test-results");
            if (!resultsEl) return;

            resultsEl.innerHTML = `<div class="text-center py-3 text-muted"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Firing trigger test scenario [${action}] against MySQL...</div>`;

            try {
                const resp = await fetch("/api/trigger/test", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: action })
                });
                const data = await resp.json();

                if (!data.success && !data.error_message) {
                    resultsEl.innerHTML = `<div class="alert alert-danger mb-0 py-2"><strong>Error:</strong> ${data.error}</div>`;
                    return;
                }

                if (action === "capacity_check") {
                    // Expecting trigger rejection
                    resultsEl.innerHTML = `
                        <div class="alert ${data.trigger_fired ? 'alert-warning' : 'alert-info'} mb-3">
                            <div class="d-flex align-items-center gap-2 mb-1">
                                <i class="bi bi-shield-slash-fill fs-5 text-warning"></i>
                                <strong>BEFORE INSERT Trigger Interception:</strong>
                            </div>
                            <div><strong>Trigger Name:</strong> <code>${data.trigger_name}</code></div>
                            <div><strong>Attempted Statement:</strong> <code>${escapeHtml(data.attempted_sql)}</code></div>
                            <div class="mt-2"><strong>Result Status:</strong> <span class="badge bg-danger">ABORTED (SQLSTATE 45000)</span></div>
                            <div class="mt-1"><strong>MySQL Signal Message:</strong> <span class="text-danger fw-bold">${escapeHtml(data.error_message)}</span></div>
                        </div>
                        <div class="p-2 bg-white rounded border small text-secondary">
                            <strong>Relational Engine Walkthrough:</strong>
                            <ol class="mb-0 ps-3 mt-1">
                                <li>DML statement <code>INSERT INTO registrations ...</code> was received by MySQL.</li>
                                <li>Prior to disk write, <code>trg_check_event_capacity</code> calculated active registrations for Event 4.</li>
                                <li>Event capacity (4) was exceeded. Trigger executed <code>SIGNAL SQLSTATE '45000'</code>.</li>
                                <li>The transaction was rolled back immediately with <strong>zero invalid rows</strong> inserted.</li>
                            </ol>
                        </div>
                    `;
                    showToast("Capacity trigger executed and rejected the insert!");
                } else if (action === "audit_log") {
                    // Expecting audit row
                    let auditRowsHtml = "";
                    if (data.audit_records && data.audit_records.length > 0) {
                        const cols = Object.keys(data.audit_records[0]);
                        auditRowsHtml = `
                            <h6 class="fw-bold mt-3 mb-1 text-dark">Live Security Audit Log (registration_audit):</h6>
                            <div class="table-responsive">
                                <table class="table table-sm table-bordered table-striped font-monospace small mb-0">
                                    <thead class="table-dark">
                                        <tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr>
                                    </thead>
                                    <tbody>
                                        ${data.audit_records.map(r => `
                                            <tr>${cols.map(c => `<td>${r[c]}</td>`).join("")}</tr>
                                        `).join("")}
                                    </tbody>
                                </table>
                            </div>
                        `;
                    }

                    resultsEl.innerHTML = `
                        <div class="alert alert-success mb-3">
                            <div class="d-flex align-items-center gap-2 mb-1">
                                <i class="bi bi-journal-check fs-5 text-success"></i>
                                <strong>AFTER INSERT Trigger Execution Succeeded!</strong>
                            </div>
                            <div><strong>Trigger Name:</strong> <code>${data.trigger_name}</code></div>
                            <div><strong>Registration ID Generated:</strong> <code>${data.inserted_registration_id}</code></div>
                            <div class="mt-1 text-success-emphasis">The trigger automatically created an immutable audit entry with timestamp and DB user.</div>
                        </div>
                        ${auditRowsHtml}
                    `;
                    showToast("AFTER INSERT trigger wrote audit log row successfully!");
                }
            } catch (err) {
                resultsEl.innerHTML = `<div class="alert alert-danger mb-0 py-2">Failed: ${err.message}</div>`;
            }
        });
    });

    // ====================================================================
    // TOPIC 3: INTERACTIVE CONSTRAINT LABORATORY
    // ====================================================================
    document.querySelectorAll(".btn-run-constraint-test").forEach(btn => {
        btn.addEventListener("click", async function () {
            const scenario = this.getAttribute("data-scenario");
            const resultsEl = document.getElementById("constraint-test-results");
            if (!resultsEl) return;

            resultsEl.innerHTML = `<div class="text-center py-3 text-muted"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Evaluating constraint scenario [${scenario}] against MySQL 8 engine...</div>`;

            try {
                const resp = await fetch("/api/constraint/test", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ scenario: scenario })
                });
                const data = await resp.json();

                if (!data.success && !data.error_message) {
                    resultsEl.innerHTML = `<div class="alert alert-danger mb-0 py-2"><strong>Error:</strong> ${data.error}</div>`;
                    return;
                }

                const statusBadge = data.constraint_violated
                    ? '<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i> Constraint Violation Caught</span>'
                    : '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i> Succeeded as Expected</span>';

                resultsEl.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="fw-bold text-dark">${data.scenario_title}</span>
                        <div>${statusBadge}</div>
                    </div>
                    <div class="mb-2"><strong>Attempted SQL:</strong> <code class="p-1 bg-white border rounded">${escapeHtml(data.attempted_sql)}</code></div>
                    ${data.error_message ? `
                        <div class="alert alert-danger py-2 small mb-2">
                            <strong>Raw MySQL Error:</strong> <code>${escapeHtml(data.error_message)}</code>
                        </div>
                    ` : `
                        <div class="alert alert-success py-2 small mb-2">
                            <strong>Execution Result:</strong> Statement executed successfully. Default value applied.
                        </div>
                    `}
                    <div class="p-2 bg-white rounded border small text-secondary">
                        <strong>Educational Explanation:</strong> ${data.explanation}
                    </div>
                `;
                showToast(data.constraint_violated ? "Constraint prevented invalid data insertion!" : "Default constraint applied successfully!");
            } catch (err) {
                resultsEl.innerHTML = `<div class="alert alert-danger mb-0 py-2">Request failed: ${err.message}</div>`;
            }
        });
    });

    // ====================================================================
    // TOPIC 4: INTERACTIVE STORED PROCEDURE LABORATORY
    // ====================================================================
    const selectProcedure = document.getElementById("select-procedure");
    const lblParam1 = document.getElementById("lbl-param1");
    const inputParam1 = document.getElementById("input-param1");
    const inputParam2 = document.getElementById("input-param2");
    const btnCallProcedure = document.getElementById("btn-call-procedure");
    const procedureResults = document.getElementById("procedure-results");

    if (selectProcedure && lblParam1 && inputParam1) {
        selectProcedure.addEventListener("change", function () {
            const selected = this.value;
            if (selected === "sp_get_students_by_department") {
                lblParam1.textContent = "Department Code (IN in_dept_code):";
                inputParam1.value = "CSE";
                inputParam1.placeholder = "e.g. CSE, ECE, MECH";
                inputParam2.value = "";
                inputParam2.type = "hidden";
            } else if (selected === "sp_get_event_roster") {
                lblParam1.textContent = "Event ID (IN in_event_id):";
                inputParam1.value = "1";
                inputParam1.placeholder = "e.g. 1, 2, 3, 4";
                inputParam2.value = "";
                inputParam2.type = "hidden";
            } else if (selected === "sp_calculate_dept_gpa") {
                lblParam1.textContent = "Department Code (IN in_dept_code):";
                inputParam1.value = "CSE";
                inputParam1.placeholder = "e.g. CSE, ECE";
                inputParam2.value = "";
                inputParam2.type = "hidden";
            } else if (selected === "sp_register_student_safe") {
                lblParam1.textContent = "Student ID (IN in_student_id) & Event ID (IN in_event_id):";
                inputParam1.value = "2";
                inputParam1.placeholder = "Student ID (e.g. 2)";
                inputParam2.type = "text";
                inputParam2.className = "form-control form-control-sm font-monospace mt-1";
                inputParam2.value = "2";
                inputParam2.placeholder = "Event ID (e.g. 2)";
            }
        });
    }

    if (btnCallProcedure && selectProcedure && inputParam1 && procedureResults) {
        btnCallProcedure.addEventListener("click", async function () {
            const procName = selectProcedure.value;
            let params = [];

            if (procName === "sp_get_students_by_department" || procName === "sp_calculate_dept_gpa") {
                params = [inputParam1.value.trim() || "CSE"];
            } else if (procName === "sp_get_event_roster") {
                params = [parseInt(inputParam1.value.trim()) || 1];
            } else if (procName === "sp_register_student_safe") {
                params = [parseInt(inputParam1.value.trim()) || 2, parseInt(inputParam2.value.trim()) || 2];
            }

            procedureResults.innerHTML = `<div class="text-center py-3 text-muted"><div class="spinner-border spinner-border-sm text-success me-2"></div>Executing CALL ${procName}(${params.join(', ')})...</div>`;

            try {
                const resp = await fetch("/api/procedure/call", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        procedure_name: procName,
                        params: params
                    })
                });
                const res = await resp.json();

                if (!res.success) {
                    procedureResults.innerHTML = `
                        <div class="alert alert-danger mb-0 py-2">
                            <strong>Procedure Error:</strong> ${escapeHtml(res.error)}
                        </div>
                    `;
                    return;
                }

                let outParamsHtml = "";
                if (res.out_parameters && Object.keys(res.out_parameters).length > 0) {
                    outParamsHtml = `
                        <div class="card border-info mb-3">
                            <div class="card-header bg-info-subtle py-1 px-3 fw-bold small text-info-emphasis">
                                Returned OUT Parameters:
                            </div>
                            <div class="card-body py-2 px-3">
                                <div class="row g-2">
                                    ${Object.entries(res.out_parameters).map(([k, v]) => `
                                        <div class="col-sm-6">
                                            <span class="text-muted">${k}:</span> <strong>${v !== null ? v : 'NULL'}</strong>
                                        </div>
                                    `).join("")}
                                </div>
                            </div>
                        </div>
                    `;
                }

                let resultSetsHtml = "";
                if (res.result_sets && res.result_sets.length > 0) {
                    res.result_sets.forEach((resultSet, idx) => {
                        if (resultSet.length === 0) {
                            resultSetsHtml += `<div class="text-muted small mb-2">Result Set ${idx + 1}: 0 rows returned.</div>`;
                            return;
                        }
                        const cols = Object.keys(resultSet[0]);
                        resultSetsHtml += `
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <h6 class="fw-bold mb-0 text-dark">Returned Tabular Result Set (${resultSet.length} rows):</h6>
                                <span class="badge bg-light text-secondary border">Timing: ${res.execution_time_ms} ms</span>
                            </div>
                            <div class="table-responsive mb-2">
                                <table class="table table-sm table-bordered table-striped font-monospace small mb-0">
                                    <thead class="table-dark">
                                        <tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr>
                                    </thead>
                                    <tbody>
                                        ${resultSet.map(row => `
                                            <tr>${cols.map(c => `<td>${row[c] !== null ? row[c] : '<span class="text-muted">NULL</span>'}</td>`).join("")}</tr>
                                        `).join("")}
                                    </tbody>
                                </table>
                            </div>
                        `;
                    });
                }

                procedureResults.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-success"><i class="bi bi-check2-circle me-1"></i> CALL ${procName} Completed</span>
                        <span class="small text-muted">Execution time: <strong>${res.execution_time_ms} ms</strong></span>
                    </div>
                    ${outParamsHtml}
                    ${resultSetsHtml}
                `;
                showToast("Stored procedure executed successfully!");
            } catch (err) {
                procedureResults.innerHTML = `<div class="alert alert-danger mb-0 py-2">Procedure invocation failed: ${err.message}</div>`;
            }
        });
    }

    // ====================================================================
    // TOPIC 5: INTERACTIVE ROLE-BASED ACCESS CONTROL (RBAC) SIMULATOR
    // ====================================================================
    let selectedAuthRole = "student_portal";
    const roleCards = document.querySelectorAll(".role-card");
    const selectAuthOperation = document.getElementById("select-auth-operation");
    const btnTestAuth = document.getElementById("btn-test-authorization");
    const authResultEl = document.getElementById("auth-simulation-result");

    const RBAC_RULES = {
        "student_portal": {
            "op_read_views": { permitted: true, msg: "SELECT permitted on vw_event_occupancy." },
            "op_insert_reg": { permitted: false, code: "1142 (42000)", msg: "INSERT command denied to user 'student_portal'@'localhost' for table 'registrations'" },
            "op_call_sp": { permitted: false, code: "1370 (42000)", msg: "EXECUTE command denied to user 'student_portal'@'localhost' for routine 'college_db.sp_get_event_roster'" },
            "op_update_gpa": { permitted: false, code: "1142 (42000)", msg: "UPDATE command denied to user 'student_portal'@'localhost' for table 'students'" },
            "op_drop_table": { permitted: false, code: "1142 (42000)", msg: "DROP command denied to user 'student_portal'@'localhost' for table 'students'" }
        },
        "event_coordinator": {
            "op_read_views": { permitted: true, msg: "SELECT permitted on views." },
            "op_insert_reg": { permitted: true, msg: "INSERT permitted on registrations table." },
            "op_call_sp": { permitted: true, msg: "EXECUTE permitted on sp_get_event_roster." },
            "op_update_gpa": { permitted: false, code: "1142 (42000)", msg: "UPDATE command denied to user 'event_coordinator'@'localhost' for table 'students'" },
            "op_drop_table": { permitted: false, code: "1142 (42000)", msg: "DROP command denied to user 'event_coordinator'@'localhost' for table 'students'" }
        },
        "db_admin": {
            "op_read_views": { permitted: true, msg: "ALL PRIVILEGES granted." },
            "op_insert_reg": { permitted: true, msg: "ALL PRIVILEGES granted." },
            "op_call_sp": { permitted: true, msg: "ALL PRIVILEGES granted." },
            "op_update_gpa": { permitted: true, msg: "ALL PRIVILEGES granted." },
            "op_drop_table": { permitted: true, msg: "ALL PRIVILEGES granted (Proceed with extreme caution in production!)." }
        }
    };

    roleCards.forEach(card => {
        card.addEventListener("click", function () {
            roleCards.forEach(c => {
                c.classList.remove("border-success", "border-2", "bg-white", "shadow-sm");
                c.classList.add("bg-light");
            });
            this.classList.remove("bg-light");
            this.classList.add("border-success", "border-2", "bg-white", "shadow-sm");
            selectedAuthRole = this.getAttribute("data-role");
        });
    });

    if (btnTestAuth && selectAuthOperation && authResultEl) {
        btnTestAuth.addEventListener("click", function () {
            const opKey = selectAuthOperation.value;
            const opText = selectAuthOperation.options[selectAuthOperation.selectedIndex].text;
            const outcome = RBAC_RULES[selectedAuthRole][opKey];

            if (outcome.permitted) {
                authResultEl.innerHTML = `
                    <div class="alert alert-success mb-2 py-2">
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <i class="bi bi-shield-check fs-5 text-success"></i>
                            <strong>PERMISSION GRANTED</strong>
                        </div>
                        <div><strong>Active Role:</strong> <code>${selectedAuthRole}</code></div>
                        <div><strong>Attempted Statement:</strong> <code>${escapeHtml(opText)}</code></div>
                        <div class="mt-1 text-success-emphasis">${outcome.msg}</div>
                    </div>
                    <div class="small text-muted">The MySQL privilege cache verified that <code>${selectedAuthRole}</code> holds adequate authorization for this operation.</div>
                `;
                showToast("Permission Granted!");
            } else {
                authResultEl.innerHTML = `
                    <div class="alert alert-danger mb-2 py-2">
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <i class="bi bi-shield-x fs-5 text-danger"></i>
                            <strong>ACCESS DENIED: ERROR ${outcome.code}</strong>
                        </div>
                        <div><strong>Active Role:</strong> <code>${selectedAuthRole}</code></div>
                        <div><strong>Attempted Statement:</strong> <code>${escapeHtml(opText)}</code></div>
                        <div class="mt-2"><strong>MySQL Engine Response:</strong> <code>${outcome.msg}</code></div>
                    </div>
                    <div class="small text-secondary">
                        <strong>Security Principle in Action:</strong> The Principle of Least Privilege (PoLP) blocked an unauthorized action. To grant this permission, a DBA must run: <code>GRANT ... TO '${selectedAuthRole}';</code>.
                    </div>
                `;
                showToast("Access Denied (Expected for this role)!", false);
            }
        });
    }

    // ====================================================================
    // TOPIC 1-5 QUIZZES
    // ====================================================================
    document.querySelectorAll(".check-quiz-btn").forEach(btn => {
        btn.addEventListener("click", function () {
            const quizId = this.getAttribute("data-quiz-id");
            const quizContainer = document.querySelector(`.quiz-container[data-quiz-id="${quizId}"]`);
            if (!quizContainer) return;

            const questions = quizContainer.querySelectorAll(".quiz-question");
            let score = 0;

            questions.forEach((qEl, idx) => {
                const inputs = qEl.querySelectorAll("input[type='radio']");
                let answered = false;
                let isCorrect = false;
                const feedbackEl = qEl.querySelector(".quiz-feedback");

                inputs.forEach(inp => {
                    if (inp.checked) {
                        answered = true;
                        if (inp.getAttribute("data-correct") === "true") {
                            isCorrect = true;
                        }
                    }
                });

                if (feedbackEl) {
                    feedbackEl.style.display = "block";
                    if (!answered) {
                        feedbackEl.className = "quiz-feedback mt-2 alert alert-warning py-1 px-2 small mb-0";
                        feedbackEl.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i> Please select an option to check your answer.';
                    } else if (isCorrect) {
                        score++;
                        feedbackEl.className = "quiz-feedback mt-2 alert alert-success py-1 px-2 small mb-0";
                        feedbackEl.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> <strong>Correct!</strong> Great job understanding this concept.';
                    } else {
                        feedbackEl.className = "quiz-feedback mt-2 alert alert-danger py-1 px-2 small mb-0";
                        feedbackEl.innerHTML = '<i class="bi bi-x-circle-fill me-1"></i> <strong>Incorrect.</strong> Review the theory above and try again.';
                    }
                }
            });

            // Save in state
            progressState.quizzes[quizId] = {
                score: score,
                attempted: true,
                answers: {}
            };
            saveProgress();
            updateProgressUI();

            if (score === questions.length) {
                showToast(`Perfect Score! ${score}/${questions.length} on quiz.`);
            } else {
                showToast(`Quiz checked: scored ${score}/${questions.length}.`);
            }
        });
    });

    // Helper: Escape HTML strings
    function escapeHtml(str) {
        if (!str) return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Initialize module state
    loadProgress();
    updateProgressUI();

    // Check URL parameters for active topic
    const urlParams = new URLSearchParams(window.location.search);
    const initialTopic = urlParams.get("topic");
    if (initialTopic && TOPICS.includes(initialTopic)) {
        switchTopic(initialTopic);
    } else {
        switchTopic("views");
    }
});
