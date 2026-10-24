/**
 * DBMS Learn & Run: Phase 3 Client-Side Interactivity
 * Manages SQL query execution, topic tab navigation, real-time MySQL results rendering,
 * practice database reset, and progress tracking with localStorage persistence.
 */

document.addEventListener("DOMContentLoaded", function () {
    const STORAGE_KEY = "dbms_learn_run_phase3";
    const TOPICS = [
        "ddl", "dml", "dql",
        "inner-join", "left-join", "right-join", "self-join", "cross-join",
        "aggregates", "subqueries"
    ];

    // Default Phase 3 progress state
    let progressState = {
        completed_topics: {},
        quizzes: {}
    };

    TOPICS.forEach(t => {
        progressState.completed_topics[t] = false;
        progressState.quizzes[`phase3-${t}`] = { score: 0, total: 3, attempted: false };
    });

    // -------------------------------------------------------------------------
    // 1. Persistence & Progress Tracking
    // -------------------------------------------------------------------------
    function loadProgress() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.completed_topics) {
                    Object.assign(progressState.completed_topics, parsed.completed_topics);
                }
                if (parsed.quizzes) {
                    Object.assign(progressState.quizzes, parsed.quizzes);
                }
            }
        } catch (e) {
            console.warn("Could not load Phase 3 progress from localStorage:", e);
        }
    }

    function saveProgress() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(progressState));
        } catch (e) {
            console.warn("Could not save Phase 3 progress to localStorage:", e);
        }
    }

    function updateProgressUI() {
        let completedTopics = 0;
        TOPICS.forEach(t => {
            if (progressState.completed_topics[t]) completedTopics++;
        });

        let totalScore = 0;
        let totalPossible = 30; // 10 quizzes * 3 questions
        TOPICS.forEach(t => {
            const q = progressState.quizzes[`phase3-${t}`];
            if (q) {
                totalScore += (q.score || 0);
            }
        });

        // 50% weight for reading topics (5% each) + 50% for quizzes (1.67% per question)
        const topicPct = (completedTopics / TOPICS.length) * 50;
        const quizPct = (totalScore / totalPossible) * 50;
        const totalPct = Math.min(100, Math.round(topicPct + quizPct));

        // Update progress bar
        const pBar = document.getElementById("phase3-progress-bar");
        const pBadge = document.getElementById("progress-percentage-badge");
        if (pBar) {
            pBar.style.width = `${totalPct}%`;
            pBar.setAttribute("aria-valuenow", totalPct);
        }
        if (pBadge) {
            pBadge.textContent = `${totalPct}% Complete`;
        }

        // Update each topic pill indicator
        TOPICS.forEach(t => {
            const pill = document.getElementById(`pill-progress-${t}`);
            const qStatus = document.getElementById(`quiz-status-${t}`);
            const isCompleted = progressState.completed_topics[t];
            const quizInfo = progressState.quizzes[`phase3-${t}`];

            if (pill) {
                const icon = pill.querySelector(".status-icon");
                if (isCompleted) {
                    pill.classList.remove("bg-light");
                    pill.classList.add("bg-success-subtle", "border-success");
                    if (icon) {
                        icon.className = "bi bi-check-circle-fill text-success me-1 status-icon";
                    }
                } else {
                    pill.classList.remove("bg-success-subtle", "border-success");
                    pill.classList.add("bg-light");
                    if (icon) {
                        icon.className = "bi bi-circle text-muted me-1 status-icon";
                    }
                }
            }

            if (qStatus && quizInfo) {
                if (quizInfo.attempted) {
                    qStatus.textContent = `Quiz: ${quizInfo.score}/${quizInfo.total || 3}`;
                    qStatus.className = quizInfo.score === (quizInfo.total || 3) 
                        ? "d-block text-success fw-bold" 
                        : "d-block text-primary";
                } else {
                    qStatus.textContent = `Quiz: 0/3`;
                    qStatus.className = "d-block text-muted";
                }
            }
        });
    }

    // -------------------------------------------------------------------------
    // 2. Toast Notifications Helper
    // -------------------------------------------------------------------------
    function showToast(message, isSuccess = true) {
        const toastEl = document.getElementById("phase3-toast");
        const msgEl = document.getElementById("phase3-toast-msg");
        if (toastEl && msgEl && window.bootstrap) {
            msgEl.textContent = message;
            toastEl.className = `toast align-items-center text-bg-${isSuccess ? 'success' : 'danger'} border-0 shadow`;
            const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
            toast.show();
        }
    }

    // -------------------------------------------------------------------------
    // 3. Topic Navigation & URL Routing
    // -------------------------------------------------------------------------
    function switchTopic(targetTopic, updateUrl = true) {
        if (!TOPICS.includes(targetTopic)) {
            targetTopic = TOPICS[0];
        }

        // Hide all topic panels
        TOPICS.forEach(t => {
            const panel = document.getElementById(`topic-container-${t}`);
            const tabBtn = document.getElementById(`tab-btn-${t}`);
            if (panel) panel.classList.add("d-none");
            if (tabBtn) {
                tabBtn.classList.remove("active", "bg-success", "text-white");
                tabBtn.classList.add("text-secondary");
            }
        });

        // Show active panel
        const activePanel = document.getElementById(`topic-container-${targetTopic}`);
        const activeTabBtn = document.getElementById(`tab-btn-${targetTopic}`);
        if (activePanel) activePanel.classList.remove("d-none");
        if (activeTabBtn) {
            activeTabBtn.classList.add("active", "bg-success", "text-white");
            activeTabBtn.classList.remove("text-secondary");
        }

        // Update URL query parameter
        if (updateUrl) {
            const url = new URL(window.location);
            url.searchParams.set("topic", targetTopic);
            window.history.replaceState({ topic: targetTopic }, "", url);
        }
    }

    // Tab buttons event listeners
    document.querySelectorAll("#phase3-topic-tabs button").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-target");
            switchTopic(target);
        });
    });

    // Prev / Mark Complete buttons
    document.querySelectorAll(".btn-prev-topic").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-target");
            switchTopic(target);
            window.scrollTo({ top: document.getElementById("topics-navigation").offsetTop - 20, behavior: "smooth" });
        });
    });

    document.querySelectorAll(".btn-mark-complete").forEach(btn => {
        btn.addEventListener("click", () => {
            const currentTopic = btn.getAttribute("data-topic");
            progressState.completed_topics[currentTopic] = true;
            saveProgress();
            updateProgressUI();
            showToast(`Marked "${currentTopic.toUpperCase()}" as completed!`);

            const currentIndex = TOPICS.indexOf(currentTopic);
            if (currentIndex < TOPICS.length - 1) {
                const nextTopic = TOPICS[currentIndex + 1];
                switchTopic(nextTopic);
                window.scrollTo({ top: document.getElementById("topics-navigation").offsetTop - 20, behavior: "smooth" });
            } else {
                showToast("Congratulations! You completed all Phase 3 reading topics!", true);
            }
        });
    });

    // Reset all progress
    const resetProgressBtn = document.getElementById("btn-reset-all-progress");
    if (resetProgressBtn) {
        resetProgressBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to reset your Phase 3 learning and quiz progress?")) {
                localStorage.removeItem(STORAGE_KEY);
                TOPICS.forEach(t => {
                    progressState.completed_topics[t] = false;
                    progressState.quizzes[`phase3-${t}`] = { score: 0, total: 3, attempted: false };
                });
                updateProgressUI();
                showToast("Phase 3 progress has been reset.");
            }
        });
    }

    // -------------------------------------------------------------------------
    // 4. Interactive SQL Laboratory Implementation
    // -------------------------------------------------------------------------
    const queryInput = document.getElementById("lab-sql-input");
    const runBtn = document.getElementById("btn-lab-run");
    const clearBtn = document.getElementById("btn-lab-clear");
    const resetBtn = document.getElementById("btn-lab-reset");
    const resetPracticeTblBtn = document.getElementById("btn-reset-practice-tbl");
    const statusAlert = document.getElementById("lab-status-alert");
    const resultsContainer = document.getElementById("lab-results-container");
    const executionStats = document.getElementById("lab-execution-stats");

    const defaultQuery = queryInput ? (queryInput.getAttribute("data-default-query") || queryInput.value) : "";

    function showAlert(message, type = "info") {
        if (!statusAlert) return;
        statusAlert.className = `alert alert-${type} py-2 px-3 mb-3 d-flex align-items-center justify-content-between`;
        statusAlert.innerHTML = `<span><i class="bi bi-info-circle me-2"></i>${escapeHtml(message)}</span>`;
        statusAlert.classList.remove("d-none");
    }

    function renderQueryResults(response) {
        if (!resultsContainer) return;

        if (!response.success) {
            showAlert(response.error || "Query execution failed.", "danger");
            resultsContainer.innerHTML = `
                <div class="text-center text-muted p-4 border rounded bg-white">
                    <i class="bi bi-exclamation-triangle text-danger fs-2 d-block mb-2"></i>
                    <h6 class="text-danger fw-bold mb-1">Execution Error</h6>
                    <span class="text-secondary small font-monospace">${escapeHtml(response.error || "An error occurred during query execution.")}</span>
                </div>`;
            if (executionStats) executionStats.textContent = `Error (${response.execution_time_ms || 0} ms)`;
            return;
        }

        showAlert(response.message, "success");
        if (executionStats) {
            executionStats.textContent = `${response.row_count || response.affected_rows || 0} rows | ${response.execution_time_ms} ms`;
        }

        // DQL / SELECT Result Set
        if (response.is_query && response.columns && response.columns.length > 0) {
            if (response.rows.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="text-center text-muted p-4 border rounded bg-white">
                        <i class="bi bi-inbox fs-3 d-block mb-1 text-secondary"></i>
                        <span class="fw-semibold">Empty result set</span> (0 rows returned).
                    </div>`;
                return;
            }

            let tableHtml = `
                <div class="table-responsive shadow-sm rounded border bg-white" style="max-height: 480px; overflow-y: auto;">
                    <table class="table table-hover table-bordered table-striped mb-0 font-monospace small align-middle">
                        <thead class="table-dark sticky-top">
                            <tr>
                                <th class="text-secondary text-center" style="width: 50px;">#</th>
                                ${response.columns.map(c => `<th>${escapeHtml(c)}</th>`).join("")}
                            </tr>
                        </thead>
                        <tbody>
                            ${response.rows.map((row, idx) => `
                                <tr>
                                    <td class="text-secondary text-center fw-semibold">${idx + 1}</td>
                                    ${response.columns.map(c => {
                                        const val = row[c];
                                        if (val === null) return `<td><span class="badge bg-secondary-subtle text-muted border">NULL</span></td>`;
                                        return `<td>${escapeHtml(String(val))}</td>`;
                                    }).join("")}
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>`;
            resultsContainer.innerHTML = tableHtml;
        } else {
            // DDL / DML feedback
            resultsContainer.innerHTML = `
                <div class="text-center text-success p-4 border rounded bg-white">
                    <i class="bi bi-check-circle-fill text-success fs-2 d-block mb-2"></i>
                    <h6 class="fw-bold mb-1">Statement Executed Successfully</h6>
                    <p class="text-secondary small mb-1">${escapeHtml(response.message)}</p>
                    <span class="badge bg-success-subtle text-success">Affected Rows: ${response.affected_rows !== undefined ? response.affected_rows : 0}</span>
                </div>`;
        }
    }

    function executeSQL(sql, confirmUnfiltered = false) {
        if (!sql) {
            showAlert("Please enter a SQL statement to execute.", "warning");
            return;
        }

        if (runBtn) {
            runBtn.disabled = true;
            runBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Executing...`;
        }

        fetch("/api/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                query: sql,
                confirm_unfiltered: confirmUnfiltered
            })
        })
        .then(res => res.json())
        .then(data => {
            if (runBtn) {
                runBtn.disabled = false;
                runBtn.innerHTML = `<i class="bi bi-play-fill me-1"></i> Run Query`;
            }

            // Check if server raised an unfiltered DML confirmation requirement
            if (!data.success && data.requires_confirmation) {
                const proceed = confirm(
                    `WARNING: ${data.error}\n\nDo you want to proceed and execute this operation anyway?`
                );
                if (proceed) {
                    executeSQL(sql, true);
                    return;
                }
            }

            renderQueryResults(data);
        })
        .catch(err => {
            if (runBtn) {
                runBtn.disabled = false;
                runBtn.innerHTML = `<i class="bi bi-play-fill me-1"></i> Run Query`;
            }
            showAlert(`Network or server error: ${err.message}`, "danger");
        });
    }

    if (runBtn && queryInput) {
        runBtn.addEventListener("click", () => {
            executeSQL(queryInput.value.trim());
        });
    }

    if (clearBtn && queryInput) {
        clearBtn.addEventListener("click", () => {
            queryInput.value = "";
            queryInput.focus();
        });
    }

    if (resetBtn && queryInput) {
        resetBtn.addEventListener("click", () => {
            queryInput.value = defaultQuery;
            queryInput.focus();
        });
    }

    // Reset Practice Table button
    if (resetPracticeTblBtn) {
        resetPracticeTblBtn.addEventListener("click", () => {
            if (confirm("Reset 'practice_students' table to its initial clean state (5 seed records)?")) {
                resetPracticeTblBtn.disabled = true;
                resetPracticeTblBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Resetting...`;

                fetch("/api/reset-practice-table", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                })
                .then(res => res.json())
                .then(data => {
                    resetPracticeTblBtn.disabled = false;
                    resetPracticeTblBtn.innerHTML = `<i class="bi bi-arrow-clockwise me-1"></i> Reset Practice Table`;
                    if (data.success) {
                        showToast(data.message, true);
                        if (queryInput) {
                            queryInput.value = "SELECT * FROM practice_students;";
                            executeSQL(queryInput.value);
                        }
                    } else {
                        showAlert(data.error || "Failed to reset practice table", "danger");
                    }
                })
                .catch(err => {
                    resetPracticeTblBtn.disabled = false;
                    resetPracticeTblBtn.innerHTML = `<i class="bi bi-arrow-clockwise me-1"></i> Reset Practice Table`;
                    showAlert(`Error resetting table: ${err.message}`, "danger");
                });
            }
        });
    }

    // Preset dropdown options
    document.querySelectorAll(".btn-preset").forEach(btn => {
        btn.addEventListener("click", () => {
            const sql = btn.getAttribute("data-query");
            if (queryInput && sql) {
                queryInput.value = sql;
                executeSQL(sql);
            }
        });
    });

    // "Load into SQL Editor & Run" buttons from all 10 topics (supports both .run-code-btn and .btn-load-sql)
    document.querySelectorAll(".run-code-btn, .btn-load-sql").forEach(btn => {
        btn.addEventListener("click", () => {
            const sql = btn.getAttribute("data-sql");
            if (queryInput && sql) {
                queryInput.value = sql;
                const labPanel = document.getElementById("sql-lab-panel");
                if (labPanel) {
                    labPanel.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                executeSQL(sql);
                showToast("Loaded query into SQL Laboratory and executed!");
            }
        });
    });

    // Practice hint togglers (.btn-toggle-hint)
    document.querySelectorAll(".btn-toggle-hint").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-target");
            const hintEl = document.getElementById(targetId);
            if (hintEl) {
                hintEl.classList.toggle("d-none");
                const isHidden = hintEl.classList.contains("d-none");
                btn.innerHTML = isHidden 
                    ? `<i class="bi bi-lightbulb me-1"></i> Show Hint` 
                    : `<i class="bi bi-lightbulb-fill me-1"></i> Hide Hint`;
            }
        });
    });

    // -------------------------------------------------------------------------
    // 5. Quizzes Evaluation & Feedback
    // -------------------------------------------------------------------------
    document.querySelectorAll(".check-quiz-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const quizId = btn.getAttribute("data-quiz-id");
            const container = document.querySelector(`.quiz-container[data-quiz-id="${quizId}"]`);
            if (!container) return;

            const questions = container.querySelectorAll(".quiz-question");
            let score = 0;
            let answeredAll = true;

            questions.forEach((q, idx) => {
                const selected = q.querySelector('input[type="radio"]:checked');
                const feedbackEl = q.querySelector(".quiz-feedback");

                if (!selected) {
                    answeredAll = false;
                    if (feedbackEl) {
                        feedbackEl.className = "quiz-feedback alert alert-warning p-2 mt-2 small";
                        feedbackEl.innerHTML = `<i class="bi bi-exclamation-circle me-1"></i> Please select an option for question ${idx + 1}.`;
                        feedbackEl.style.display = "block";
                    }
                    return;
                }

                const isCorrect = selected.getAttribute("data-correct") === "true";
                if (feedbackEl) {
                    feedbackEl.style.display = "block";
                    if (isCorrect) {
                        score++;
                        feedbackEl.className = "quiz-feedback alert alert-success p-2 mt-2 small";
                        feedbackEl.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> <strong>Correct!</strong> Well reasoned.`;
                    } else {
                        // Find the correct option text
                        const correctRadio = q.querySelector('input[data-correct="true"]');
                        const correctLabel = correctRadio ? q.querySelector(`label[for="${correctRadio.id}"]`).textContent : "";
                        feedbackEl.className = "quiz-feedback alert alert-danger p-2 mt-2 small";
                        feedbackEl.innerHTML = `<i class="bi bi-x-circle-fill me-1"></i> <strong>Incorrect.</strong> The correct answer is: <em>${escapeHtml(correctLabel)}</em>`;
                    }
                }
            });

            if (answeredAll) {
                progressState.quizzes[quizId] = {
                    score: score,
                    total: questions.length,
                    attempted: true
                };

                // Also automatically mark the associated topic as completed if passing >= 2/3
                const topicKey = quizId.replace("phase3-", "");
                if (score >= 2) {
                    progressState.completed_topics[topicKey] = true;
                }

                saveProgress();
                updateProgressUI();
                showToast(`Quiz completed! Score: ${score}/${questions.length}`);
            }
        });
    });

    // Helper: Escape HTML string
    function escapeHtml(text) {
        if (text === null || text === undefined) return "";
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // -------------------------------------------------------------------------
    // 6. Initialization
    // -------------------------------------------------------------------------
    loadProgress();
    updateProgressUI();

    // Check URL parameter for initial topic
    const urlParams = new URLSearchParams(window.location.search);
    const initialTopic = urlParams.get("topic") || "ddl";
    switchTopic(initialTopic, false);
});
