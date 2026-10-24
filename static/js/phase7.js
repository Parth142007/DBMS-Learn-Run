/**
 * DBMS Learn & Run: Phase 7 — Transactions & Concurrency
 * Client-Side Controller, Interactive Schedule Analyzer, Lock Simulator,
 * Deadlock Detector, WAL Recovery Engine & Comprehensive Assessment
 */

document.addEventListener("DOMContentLoaded", function () {
    console.log("Initializing Phase 7: Transactions & Concurrency...");

    // ====================================================================
    // 1. STATE & CONSTANTS
    // ====================================================================
    const TOTAL_TOPICS = 10;
    const TOPIC_NAMES = {
        "topic1": "Lesson 1: Introduction to Transactions",
        "topic2": "Lesson 2: ACID Properties",
        "topic3": "Lesson 3: Transaction States",
        "topic4": "Lesson 4: Concurrency Problems",
        "topic5": "Lesson 5: Schedules & Serializability",
        "topic6": "Lesson 6: Lock-Based Concurrency Control (2PL)",
        "topic7": "Lesson 7: Deadlocks & Recovery",
        "topic8": "Lesson 8: Recovery & WAL Logging",
        "topic9": "Lesson 9: SQL Isolation Levels",
        "topic10": "Lesson 10: Interactive Transaction Lab"
    };

    let currentTopic = "topic1";
    let progressState = loadLocalProgress();

    // ====================================================================
    // 2. QUIZ ANSWER KEYS & EXPLANATIONS (5 Questions per Topic = 50 total)
    // ====================================================================
    const QUIZ_DATA = {
        "topic1": {
            q1: { ans: "B", expl: "A transaction is a logical unit of database operations that must be executed in its entirety (COMMIT) or not at all (ROLLBACK)." },
            q2: { ans: "C", expl: "COMMIT permanently saves all modifications made in the current transaction to non-volatile disk storage." },
            q3: { ans: "A", expl: "Upon restart after a crash, uncommitted transactions are rolled back using the undo log, restoring Account A so no money is lost." },
            q4: { ans: "B", expl: "Intermediate states may be temporarily inconsistent during execution, but must never be permanently saved if the transaction aborts." },
            q5: { ans: "A", expl: "ROLLBACK undoes all changes made in the transaction, restoring data to its pre-transaction state." }
        },
        "topic2": {
            q1: { ans: "B", expl: "Atomicity ('All-or-Nothing') guarantees that either all operations of a transaction succeed together or all are rolled back." },
            q2: { ans: "B", expl: "False. ACID Consistency requires database schema constraints (CHECK, FOREIGN KEY, NOT NULL) and correct application logic to guarantee business invariants." },
            q3: { ans: "A", expl: "Isolation ensures intermediate modifications made by an active transaction are hidden from other concurrent transactions." },
            q4: { ans: "A", expl: "MySQL InnoDB enforces Durability using Write-Ahead Logging (WAL) via its Redo Log files (ib_logfile) flushed to disk on commit." },
            q5: { ans: "A", expl: "Atomicity was violated because the transfer was only partially executed (money was deducted without being credited)." }
        },
        "topic3": {
            q1: { ans: "B", expl: "A transaction enters the 'Active' state immediately upon starting and remains active while executing read/write statements." },
            q2: { ans: "A", expl: "In 'Partially Committed', all statements have finished in memory, but commit records and dirty buffers are not yet guaranteed durable on disk." },
            q3: { ans: "B", expl: "If an error occurs while partially committed, the transaction transitions immediately to the 'Failed' state." },
            q4: { ans: "B", expl: "Committed transactions are permanent. Reversing their real-world effect requires executing a new compensating transaction." },
            q5: { ans: "A", expl: "Transitioning from Failed to Aborted involves rolling back all tentative writes using the undo log to restore prior consistent data." }
        },
        "topic4": {
            q1: { ans: "A", expl: "In the Lost Update anomaly, transaction T2 reads an initial value and overwrites it, destroying T1's concurrent update." },
            q2: { ans: "A", expl: "A Dirty Read occurs when T2 reads uncommitted modifications made by T1, and T1 subsequently aborts and rolls back." },
            q3: { ans: "A", expl: "Non-repeatable reads involve modifying/deleting an existing row, whereas phantom reads involve inserting new rows that match a range predicate." },
            q4: { ans: "A", expl: "Inconsistent Analysis occurs when an aggregate query reads some rows before a concurrent transfer and other rows after the transfer." },
            q5: { ans: "A", expl: "Serial execution causes unacceptable user latency, starves multi-core CPUs, and drastically reduces transaction throughput." }
        },
        "topic5": {
            q1: { ans: "A", expl: "Two read operations (R1(X) and R2(X)) do not conflict because reading does not modify data and read operations commute freely." },
            q2: { ans: "A", expl: "In a Precedence Graph, nodes represent transactions and a directed edge Ti -> Tj exists if an operation in Ti conflicts with and precedes an operation in Tj." },
            q3: { ans: "A", expl: "A directed cycle in a precedence graph indicates that the schedule is NOT conflict-serializable; no equivalent serial order exists." },
            q4: { ans: "A", expl: "If a precedence graph is a directed acyclic graph (DAG), Topological Sort generates the equivalent serial schedule order." },
            q5: { ans: "A", expl: "Testing View Serializability is NP-Complete, whereas Conflict Serializability is verifiable in polynomial time via cycle detection." }
        },
        "topic6": {
            q1: { ans: "B", expl: "Exclusive locks are incompatible with both Shared and Exclusive locks. T2 must wait until T1 releases its lock." },
            q2: { ans: "A", expl: "During the Growing Phase of 2PL, a transaction may acquire new locks, but must NEVER release any lock." },
            q3: { ans: "A", expl: "Strict 2PL holds Exclusive (X) locks until commit, whereas Rigorous 2PL holds BOTH Shared (S) and Exclusive (X) locks until commit." },
            q4: { ans: "B", expl: "Basic 2PL guarantees conflict serializability, but does NOT prevent deadlocks. Deadlocks can still occur and require detection." },
            q5: { ans: "A", expl: "Holding Exclusive locks until commit prevents other transactions from reading uncommitted data, eliminating Cascading Aborts." }
        },
        "topic7": {
            q1: { ans: "A", expl: "A deadlock exists in a system if and only if its Wait-For Graph (WFG) contains at least one directed cycle." },
            q2: { ans: "A", expl: "In the Wait-Die prevention scheme, an older transaction is allowed to wait for a younger transaction; a younger transaction dies if it requests from an older." },
            q3: { ans: "A", expl: "To minimize lost computation, database recovery managers choose the transaction with the fewest modified rows and smallest undo log as the victim." },
            q4: { ans: "A", expl: "In the Wound-Wait scheme, an older transaction 'wounds' (aborts/preempts) a younger transaction holding the lock so the older can proceed immediately." },
            q5: { ans: "A", expl: "MySQL InnoDB's deadlock detector automatically aborts the transaction that modified the fewest rows with Error 1213, allowing the other to finish." }
        },
        "topic8": {
            q1: { ans: "A", expl: "Write-Ahead Logging (WAL) requires that log records describing a change are flushed to stable storage before the modified dirty data page is written to disk." },
            q2: { ans: "A", expl: "Transactions with both START and COMMIT records in the log are in the REDO list to guarantee Durability." },
            q3: { ans: "A", expl: "Transactions that started but have no COMMIT record at the crash point are in the UNDO list to guarantee Atomicity." },
            q4: { ans: "A", expl: "Checkpoints flush dirty pages and bound recovery time so the database restart process does not have to scan historical logs." },
            q5: { ans: "A", expl: "LSN stands for Log Sequence Number, a monotonically increasing identifier tracking the chronological sequence of log records." }
        },
        "topic9": {
            q1: { ans: "C", expl: "MySQL 8 with InnoDB defaults to the Repeatable Read transaction isolation level." },
            q2: { ans: "A", expl: "Read Committed is the lowest SQL isolation level that prohibits Dirty Reads." },
            q3: { ans: "A", expl: "InnoDB uses Multi-Version Concurrency Control (MVCC) Read Views to read consistent snapshots from Undo Logs without taking read locks." },
            q4: { ans: "A", expl: "Next-Key Locking combines an index record lock with a gap lock on the gap preceding the record, preventing concurrent sessions from inserting phantom rows." },
            q5: { ans: "A", expl: "Read Committed provides significantly higher concurrent throughput by minimizing lock durations and eliminating gap locks for simple queries." }
        },
        "topic10": {
            q1: { ans: "A", expl: "R1(X) conflicts with W2(X) creating edge T1 -> T2, and W2(X) conflicts with W1(X) creating edge T2 -> T1, forming a directed cycle." },
            q2: { ans: "A", expl: "In Strict 2PL, all Exclusive (X) locks must be held until the transaction reaches its final COMMIT or ROLLBACK." },
            q3: { ans: "A", expl: "WAL ensures that uncommitted writes can be undone (Atomicity) and committed writes can be redone (Durability) after a system failure." },
            q4: { ans: "A", expl: "Repeatable Read prevents both Dirty Reads and Non-Repeatable Reads, and is the default isolation level in MySQL InnoDB." },
            q5: { ans: "A", expl: "Topological sorting of the acyclic graph with edges T1 -> T2 and T2 -> T3 produces the equivalent serial order T1 -> T2 -> T3." }
        }
    };

    // ====================================================================
    // 3. NAVIGATION CONTROLLER
    // ====================================================================
    function initNavigation() {
        const searchStr = (window.location && window.location.search) ? window.location.search : "";
        const urlParams = (typeof URLSearchParams !== "undefined") ? new URLSearchParams(searchStr) : { get: () => null };
        const requestedTopic = urlParams.get("topic") || "topic1";
        switchTopic(requestedTopic, false);

        // Header quick jump button
        document.getElementById("btn-header-open-lab")?.addEventListener("click", () => switchTopic("topic10", true));
        document.getElementById("btn-jump-transaction-lab")?.addEventListener("click", () => switchTopic("topic10", true));
        document.getElementById("btn-start-reading")?.addEventListener("click", () => switchTopic("topic1", true));

        // Tab pill buttons
        document.querySelectorAll(".phase7-nav-tab").forEach(btn => {
            btn.addEventListener("click", function () {
                const target = this.getAttribute("data-target");
                if (target) switchTopic(target, true);
            });
        });

        // Bottom Prev / Next buttons
        document.getElementById("btn-prev-lesson")?.addEventListener("click", () => {
            const idx = parseInt(currentTopic.replace("topic", ""), 10);
            if (idx > 1) switchTopic(`topic${idx - 1}`, true);
        });

        document.getElementById("btn-next-lesson")?.addEventListener("click", () => {
            const idx = parseInt(currentTopic.replace("topic", ""), 10);
            if (idx < TOTAL_TOPICS) switchTopic(`topic${idx + 1}`, true);
        });

        // Reset progress button
        document.getElementById("btn-reset-phase7-progress")?.addEventListener("click", () => {
            if (confirm("Reset all stored Phase 7 progress, quiz scores, and simulation badges on this device?")) {
                localStorage.removeItem("dbms_phase7_learning_progress");
                progressState = {};
                updateProgressUI();
                showToast("Phase 7 progress has been reset.");
            }
        });
    }

    function switchTopic(topicId, updateHistory = true) {
        if (!TOPIC_NAMES[topicId]) topicId = "topic1";
        currentTopic = topicId;

        // Hide all topic containers
        document.querySelectorAll(".topic-section-panel").forEach(panel => {
            panel.classList.add("d-none");
        });

        // Show target container
        const targetContainer = document.getElementById(`topic-container-${topicId}`);
        if (targetContainer) targetContainer.classList.remove("d-none");

        // Update tabs active state
        document.querySelectorAll(".phase7-nav-tab").forEach(btn => {
            if (btn.getAttribute("data-target") === topicId) {
                btn.classList.add("active", "text-white");
                btn.classList.remove("text-secondary");
            } else {
                btn.classList.remove("active", "text-white");
                btn.classList.add("text-secondary");
            }
        });

        // Update bottom indicator and buttons
        const idx = parseInt(topicId.replace("topic", ""), 10);
        const prevBtn = document.getElementById("btn-prev-lesson");
        const nextBtn = document.getElementById("btn-next-lesson");
        const indicator = document.getElementById("lesson-indicator-text");

        if (prevBtn) prevBtn.disabled = (idx <= 1);
        if (nextBtn) {
            nextBtn.disabled = (idx >= TOTAL_TOPICS);
            if (idx < TOTAL_TOPICS) {
                nextBtn.innerHTML = `Next: ${TOPIC_NAMES[`topic${idx + 1}`].split(":")[1] || ""} <i class="bi bi-chevron-right ms-1"></i>`;
            } else {
                nextBtn.innerHTML = `Module Complete <i class="bi bi-trophy-fill ms-1"></i>`;
            }
        }
        if (indicator) {
            indicator.textContent = `Lesson ${idx} of ${TOTAL_TOPICS}: ${TOPIC_NAMES[topicId].replace(`Lesson ${idx}: `, "")}`;
        }

        if (updateHistory) {
            try {
                if (typeof URL !== "undefined" && window.location && window.history && window.history.pushState) {
                    const href = window.location.href || "http://localhost/phase-7";
                    const url = new URL(href);
                    url.searchParams.set("topic", topicId);
                    window.history.pushState({}, "", url);
                }
            } catch (e) {}
            document.getElementById("topics-navigation")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    // ====================================================================
    // 4. QUIZ ENGINE & PROGRESS PERSISTENCE
    // ====================================================================
    function initQuizHandlers() {
        document.querySelectorAll(".btn-submit-quiz").forEach(btn => {
            btn.addEventListener("click", function () {
                const lessonId = this.getAttribute("data-lesson");
                submitQuiz(lessonId);
            });
        });

        document.querySelectorAll(".btn-reset-quiz").forEach(btn => {
            btn.addEventListener("click", function () {
                const lessonId = this.getAttribute("data-lesson");
                resetQuiz(lessonId);
            });
        });
    }

    function submitQuiz(lessonId) {
        const lessonQuiz = QUIZ_DATA[lessonId];
        if (!lessonQuiz) return;

        let score = 0;
        const total = Object.keys(lessonQuiz).length;

        for (let qKey in lessonQuiz) {
            const expected = lessonQuiz[qKey].ans;
            const explanation = lessonQuiz[qKey].expl;
            const selectedInput = document.querySelector(`input[name="${qKey}_${lessonId}"]:checked`);
            const qCard = document.getElementById(`${qKey}-card-${lessonId}`);
            const feedbackElem = qCard ? qCard.querySelector(".feedback-msg") : null;

            if (!selectedInput) {
                if (feedbackElem) {
                    feedbackElem.className = "feedback-msg mt-2 small text-warning";
                    feedbackElem.innerHTML = `<i class="bi bi-exclamation-circle me-1"></i> Please select an answer.`;
                    feedbackElem.classList.remove("d-none");
                }
                continue;
            }

            const isCorrect = (selectedInput.value.toUpperCase() === expected.toUpperCase());
            if (isCorrect) score++;

            if (feedbackElem) {
                feedbackElem.classList.remove("d-none");
                if (isCorrect) {
                    feedbackElem.className = "feedback-msg mt-2 small text-success";
                    feedbackElem.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> <strong>Correct!</strong> ${explanation}`;
                } else {
                    feedbackElem.className = "feedback-msg mt-2 small text-danger";
                    feedbackElem.innerHTML = `<i class="bi bi-x-circle-fill me-1"></i> <strong>Incorrect.</strong> Correct answer is <strong>${expected}</strong>. ${explanation}`;
                }
            }
        }

        // Show retry button
        const resetBtn = document.querySelector(`.btn-reset-quiz[data-lesson="${lessonId}"]`);
        if (resetBtn) resetBtn.classList.remove("d-none");

        // Save progress
        saveLessonProgress(lessonId, score, total);
        showToast(`Lesson ${lessonId.replace("topic", "")} Quiz: Scored ${score}/${total}`);
    }

    function resetQuiz(lessonId) {
        document.querySelectorAll(`input[name^="q"][name$="_${lessonId}"]`).forEach(inp => {
            inp.checked = false;
        });
        document.querySelectorAll(`#topic-container-${lessonId} .feedback-msg`).forEach(fb => {
            fb.classList.add("d-none");
            fb.innerHTML = "";
        });
        const resetBtn = document.querySelector(`.btn-reset-quiz[data-lesson="${lessonId}"]`);
        if (resetBtn) resetBtn.classList.add("d-none");
    }

    function loadLocalProgress() {
        try {
            const raw = localStorage.getItem("dbms_phase7_learning_progress");
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function saveLessonProgress(lessonId, score, maxScore) {
        if (!progressState[lessonId]) progressState[lessonId] = {};
        progressState[lessonId].quiz_score = Math.max(progressState[lessonId].quiz_score || 0, score);
        progressState[lessonId].quiz_max_score = maxScore;
        progressState[lessonId].completed = (progressState[lessonId].quiz_score >= Math.ceil(maxScore * 0.6));
        progressState[lessonId].updated_at = new Date().toISOString();

        try {
            localStorage.setItem("dbms_phase7_learning_progress", JSON.stringify(progressState));
        } catch (e) {}

        updateProgressUI();

        // Sync with backend API asynchronously
        fetch("/api/progress/phase7", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: "default_student",
                lesson_id: lessonId,
                score: score,
                quiz_max_score: maxScore,
                completed: progressState[lessonId].completed
            })
        }).catch(err => console.log("Offline or local storage mode:", err));
    }

    function updateProgressUI() {
        let completedCount = 0;
        let totalScore = 0;

        for (let i = 1; i <= TOTAL_TOPICS; i++) {
            const tId = `topic${i}`;
            const state = progressState[tId] || {};
            const score = state.quiz_score || 0;
            const max = state.quiz_max_score || 5;
            const isCompleted = state.completed || (score >= 3);

            if (isCompleted) completedCount++;
            totalScore += score;

            // Checkpoint UI
            const statusElem = document.getElementById(`quiz-status-${tId}`);
            const box = document.getElementById(`checkpoint-${tId}`);
            if (statusElem) statusElem.textContent = `Quiz: ${score}/${max}`;
            if (box) {
                const icon = box.querySelector(".status-icon");
                if (isCompleted) {
                    box.querySelector(".checkpoint-box")?.classList.add("border-success", "bg-success-subtle");
                    if (icon) icon.className = "bi bi-check-circle-fill text-success me-1 status-icon";
                }
            }
        }

        const pct = Math.round((completedCount / TOTAL_TOPICS) * 100);
        const bar = document.getElementById("master-progress-bar");
        const badge = document.getElementById("overall-progress-badge");
        const text = document.getElementById("lessons-completed-text");
        const quizAcc = document.getElementById("quiz-accuracy-badge");

        if (bar) bar.style.width = `${pct}%`;
        if (badge) badge.textContent = `${pct}% Completed`;
        if (text) text.textContent = `${completedCount} of ${TOTAL_TOPICS} Lessons Mastered`;
        if (quizAcc) quizAcc.textContent = `Quiz Score: ${totalScore}/50`;
    }

    // ====================================================================
    // 5. INTERACTIVE SIMULATORS
    // ====================================================================

    // --- A. Bank Transfer Simulator (Topic 1) ---
    function initBankSimulator() {
        let simState = { a: 5000, b: 3000, step: 0, active: false };

        const accAVal = document.getElementById("sim-acc-a-val");
        const accBVal = document.getElementById("sim-acc-b-val");
        const accAStatus = document.getElementById("sim-acc-a-status");
        const accBStatus = document.getElementById("sim-acc-b-status");
        const totalWealth = document.getElementById("sim-total-wealth");
        const invarStatus = document.getElementById("sim-invariant-status");
        const stepInd = document.getElementById("sim-step-indicator");
        const logOut = document.getElementById("sim-log-output");

        const btnStart = document.getElementById("btn-sim-start");
        const btnDebit = document.getElementById("btn-sim-debit");
        const btnCrash = document.getElementById("btn-sim-crash");
        const btnCredit = document.getElementById("btn-sim-credit");
        const btnCommit = document.getElementById("btn-sim-commit");
        const btnReset = document.getElementById("btn-sim-reset");

        function updateBankUI(logMsg) {
            if (accAVal) accAVal.textContent = `₹${simState.a.toLocaleString()}`;
            if (accBVal) accBVal.textContent = `₹${simState.b.toLocaleString()}`;
            const sum = simState.a + simState.b;
            if (totalWealth) totalWealth.textContent = `A + B = ₹${sum.toLocaleString()}`;
            if (invarStatus) {
                if (sum === 8000) {
                    invarStatus.className = "badge bg-success ms-1";
                    invarStatus.textContent = "Valid State";
                } else {
                    invarStatus.className = "badge bg-danger ms-1";
                    invarStatus.textContent = "Invariant Violated (Unsafe!)";
                }
            }
            if (logMsg && logOut) {
                logOut.innerHTML += `<br>[${new Date().toLocaleTimeString()}] ${logMsg}`;
                logOut.scrollTop = logOut.scrollHeight;
            }
        }

        btnStart?.addEventListener("click", () => {
            simState.active = true;
            simState.step = 1;
            btnStart.disabled = true;
            btnDebit.disabled = false;
            btnReset.disabled = false;
            if (stepInd) stepInd.textContent = "1: Transaction Started";
            if (accAStatus) accAStatus.textContent = "Selected FOR UPDATE";
            updateBankUI("START TRANSACTION; Transaction boundary established in InnoDB engine.");
        });

        btnDebit?.addEventListener("click", () => {
            simState.a -= 1000;
            simState.step = 2;
            btnDebit.disabled = true;
            btnCrash.disabled = false;
            btnCredit.disabled = false;
            if (stepInd) stepInd.textContent = "2: Account A Debited";
            if (accAStatus) accAStatus.textContent = "Pending -₹1,000";
            updateBankUI("UPDATE accounts SET balance = balance - 1000 WHERE id = 'A'; [A is now ₹4,000]");
        });

        btnCrash?.addEventListener("click", () => {
            // Rollback
            simState.a = 5000;
            simState.b = 3000;
            simState.step = 0;
            simState.active = false;
            btnStart.disabled = false;
            btnDebit.disabled = true;
            btnCrash.disabled = true;
            btnCredit.disabled = true;
            btnCommit.disabled = true;
            if (stepInd) stepInd.textContent = "Aborted & Rolled Back";
            if (accAStatus) accAStatus.textContent = "Restored via Undo Log";
            if (accBStatus) accBStatus.textContent = "Untouched";
            updateBankUI("SYSTEM CRASH SIMULATED! Rollback initiated. Account A restored to ₹5,000. Invariant preserved.");
        });

        btnCredit?.addEventListener("click", () => {
            simState.b += 1000;
            simState.step = 3;
            btnCredit.disabled = true;
            btnCrash.disabled = true;
            btnCommit.disabled = false;
            if (stepInd) stepInd.textContent = "3: Account B Credited";
            if (accBStatus) accBStatus.textContent = "Pending +₹1,000";
            updateBankUI("UPDATE accounts SET balance = balance + 1000 WHERE id = 'B'; [B is now ₹4,000]");
        });

        btnCommit?.addEventListener("click", () => {
            simState.step = 4;
            simState.active = false;
            btnCommit.disabled = true;
            btnStart.disabled = false;
            if (stepInd) stepInd.textContent = "4: COMMITTED (Durable)";
            if (accAStatus) accAStatus.textContent = "Committed (₹4,000)";
            if (accBStatus) accBStatus.textContent = "Committed (₹4,000)";
            updateBankUI("COMMIT; Flush Redo Log to disk. Both updates permanently recorded.");
        });

        btnReset?.addEventListener("click", () => {
            simState = { a: 5000, b: 3000, step: 0, active: false };
            btnStart.disabled = false;
            btnDebit.disabled = true;
            btnCrash.disabled = true;
            btnCredit.disabled = true;
            btnCommit.disabled = true;
            if (stepInd) stepInd.textContent = "0: Ready";
            if (accAStatus) accAStatus.textContent = "Status: Idle";
            if (accBStatus) accBStatus.textContent = "Status: Idle";
            if (logOut) logOut.innerHTML = "[System] Sandbox reset. Accounts A = ₹5,000, B = ₹3,000.";
            updateBankUI();
        });
    }

    // --- B. ACID Property Explorer (Topic 2) ---
    function initAcidExplorer() {
        const scenarios = {
            "atomicity": {
                title: "Scenario: Atomicity under Abrupt Failure",
                desc: "You execute: UPDATE Accounts SET balance = balance - 1000 WHERE id = 'A';. Immediately afterward, an unhandled exception or power cut occurs.",
                trace: "[Engine] Uncommitted transaction detected upon reboot. Applying UNDO log. Account A restored to ₹5,000.",
                outcome: "Result: Invariant Intact — No Partial Writes"
            },
            "consistency": {
                title: "Scenario: Consistency & Business Rule Validation",
                desc: "Account A attempts to transfer ₹10,000 when current balance is ₹5,000. Table has CHECK (balance >= 0).",
                trace: "[Engine] Constraint CHECK violation detected on Accounts.balance. Statement rejected. Transaction rolled back.",
                outcome: "Result: State Protected — Negative Balance Prevented"
            },
            "isolation": {
                title: "Scenario: Isolation Against Dirty Reads",
                desc: "Transaction T1 modifies row X = 5000 in buffer pool. Concurrently, T2 queries row X under Read Committed isolation.",
                trace: "[Engine] T2 checks transaction active slot. Finds uncommitted state. Reads prior version from Undo Log (X = 0).",
                outcome: "Result: Isolation Guaranteed — No Dirty Read"
            },
            "durability": {
                title: "Scenario: Durability Surviving Sudden Power Loss",
                desc: "Transaction commits at 14:02:15.001. Main power cord is disconnected at 14:02:15.005 before dirty pages flush.",
                trace: "[Engine] Server boots. Recovery manager scans Redo Log (ib_logfile). Finds COMMIT record. Reapplies page updates.",
                outcome: "Result: Durability Guaranteed — Zero Data Loss"
            }
        };

        document.querySelectorAll(".acid-tab-btn").forEach(btn => {
            btn.addEventListener("click", function () {
                document.querySelectorAll(".acid-tab-btn").forEach(b => {
                    b.classList.remove("btn-primary", "active");
                    b.classList.add("btn-outline-secondary");
                });
                this.classList.add("btn-primary", "active");
                this.classList.remove("btn-outline-secondary");

                const prop = this.getAttribute("data-acid");
                const data = scenarios[prop];
                if (data) {
                    const title = document.getElementById("acid-scenario-title");
                    const desc = document.getElementById("acid-scenario-desc");
                    const trace = document.getElementById("acid-scenario-trace");
                    const outcome = document.getElementById("acid-scenario-outcome");
                    if (title) title.textContent = data.title;
                    if (desc) desc.textContent = data.desc;
                    if (trace) trace.textContent = data.trace;
                    if (outcome) outcome.textContent = data.outcome;
                }
            });
        });

        document.getElementById("btn-acid-trigger-scenario")?.addEventListener("click", () => {
            const trace = document.getElementById("acid-scenario-trace");
            if (trace) {
                trace.style.opacity = "0.5";
                setTimeout(() => {
                    trace.style.opacity = "1";
                    showToast("Simulated ACID test verification completed.");
                }, 250);
            }
        });
    }

    // --- C. State Machine Stepper (Topic 3) ---
    function initStateMachine() {
        const stateNodes = {
            "active": document.getElementById("state-node-active"),
            "partially_committed": document.getElementById("state-node-part-committed"),
            "committed": document.getElementById("state-node-committed"),
            "failed": document.getElementById("state-node-failed"),
            "aborted": document.getElementById("state-node-aborted")
        };
        const badge = document.getElementById("state-badge-current");
        const msg = document.getElementById("state-stepper-msg");

        function highlightState(nodeKey, badgeText, badgeClass, message) {
            for (let k in stateNodes) {
                if (stateNodes[k]) {
                    const rect = stateNodes[k].querySelector("rect");
                    if (rect) rect.setAttribute("stroke-width", "2");
                }
            }
            if (stateNodes[nodeKey]) {
                const rect = stateNodes[nodeKey].querySelector("rect");
                if (rect) rect.setAttribute("stroke-width", "5");
            }
            if (badge) {
                badge.className = `badge fs-6 px-3 py-2 ${badgeClass}`;
                badge.textContent = badgeText;
            }
            if (msg) msg.textContent = message;
        }

        document.getElementById("btn-state-flow-success")?.addEventListener("click", () => {
            highlightState("active", "ACTIVE", "bg-primary", "[Step 1] Transaction executing statements. State is ACTIVE.");
            setTimeout(() => {
                highlightState("partially_committed", "PARTIALLY COMMITTED", "bg-info text-dark", "[Step 2] Final SQL statement finished in memory. State is PARTIALLY COMMITTED.");
                setTimeout(() => {
                    highlightState("committed", "COMMITTED", "bg-success", "[Step 3] Commit record flushed to durable storage. State is COMMITTED.");
                }, 1000);
            }, 1000);
        });

        document.getElementById("btn-state-flow-fail")?.addEventListener("click", () => {
            highlightState("active", "ACTIVE", "bg-primary", "[Step 1] Transaction started. State is ACTIVE.");
            setTimeout(() => {
                highlightState("failed", "FAILED", "bg-warning text-dark", "[Step 2] Unique key violation or crash detected! State transitions to FAILED.");
                setTimeout(() => {
                    highlightState("aborted", "ABORTED", "bg-danger", "[Step 3] Rollback completed using undo log. State is ABORTED.");
                }, 1000);
            }, 1000);
        });

        document.getElementById("btn-state-reset")?.addEventListener("click", () => {
            highlightState("active", "ACTIVE", "bg-primary", "[Status] Transaction started via START TRANSACTION. State is ACTIVE.");
        });
    }

    // --- D. Concurrency Anomaly Stepper (Topic 4) ---
    function initAnomalyStepper() {
        let currentAnomaly = "lost_update";
        let stepIndex = 0;

        const anomalyConfigs = {
            "lost_update": {
                title: "Schedule: Lost Update Simulation",
                desc: "Two concurrent transactions deposit funds into account X without locking. Watch T2 overwrite T1's deposit.",
                steps: [
                    { t: "T1", op: "Read X (100)", val: 100, log: "Step 1: T1 reads initial balance X = 100." },
                    { t: "T2", op: "Read X (100)", val: 100, log: "Step 2: T2 also reads initial balance X = 100 concurrently." },
                    { t: "T1", op: "Write X = 150", val: 150, log: "Step 3: T1 adds ₹50 and writes X = 150." },
                    { t: "T2", op: "Write X = 120", val: 120, log: "Step 4: T2 adds ₹20 to its stale copy (100+20) and writes X = 120. T1's deposit is lost!" }
                ],
                expected: "₹170",
                actual: "₹120 (Corrupted)"
            },
            "dirty_read": {
                title: "Schedule: Dirty Read Simulation",
                desc: "T1 writes temporary bonus credit. T2 reads it before T1 aborts.",
                steps: [
                    { t: "T1", op: "Write X = 5000", val: 5000, log: "Step 1: T1 writes uncommitted bonus X = 5,000." },
                    { t: "T2", op: "Read X (5000)", val: 5000, log: "Step 2: T2 reads uncommitted value 5,000 (DIRTY READ)!" },
                    { t: "T1", op: "ROLLBACK", val: 0, log: "Step 3: T1 rolls back. Official X is restored to 0. T2 read garbage!" }
                ],
                expected: "₹0",
                actual: "T2 read ₹5,000"
            },
            "unrepeatable_read": {
                title: "Schedule: Non-Repeatable Read Simulation",
                desc: "T1 reads row twice; T2 modifies row and commits in between.",
                steps: [
                    { t: "T1", op: "Read Price = ₹100", val: 100, log: "Step 1: T1 reads item price = ₹100." },
                    { t: "T2", op: "Update Price = ₹150; COMMIT;", val: 150, log: "Step 2: T2 updates price to ₹150 and commits." },
                    { t: "T1", op: "Read Price = ₹150", val: 150, log: "Step 3: T1 re-reads price in same transaction and discovers ₹150!" }
                ],
                expected: "Constant ₹100",
                actual: "Changed to ₹150"
            }
        };

        const title = document.getElementById("anomaly-sim-title");
        const desc = document.getElementById("anomaly-sim-desc");
        const counter = document.getElementById("anomaly-step-counter");
        const hist = document.getElementById("anomaly-step-history");
        const varX = document.getElementById("anomaly-var-x");
        const statusRes = document.getElementById("anomaly-status-result");
        const btnStep = document.getElementById("btn-anomaly-step-forward");
        const btnReset = document.getElementById("btn-anomaly-stepper-reset");

        function loadAnomaly(type) {
            currentAnomaly = type;
            stepIndex = 0;
            const cfg = anomalyConfigs[type];
            if (title) title.textContent = cfg.title;
            if (desc) desc.textContent = cfg.desc;
            if (counter) counter.textContent = `Step 0 of ${cfg.steps.length}`;
            if (hist) hist.innerHTML = `[Ready] Click 'Execute Next Step' to interleave operations.`;
            if (varX) varX.textContent = "100";
            if (statusRes) statusRes.textContent = `Expected: ${cfg.expected} | Actual: Pending`;
            if (btnStep) btnStep.disabled = false;
        }

        document.querySelectorAll(".sim-anomaly-btn").forEach(btn => {
            btn.addEventListener("click", function () {
                document.querySelectorAll(".sim-anomaly-btn").forEach(b => {
                    b.classList.remove("btn-primary", "active");
                    b.classList.add("btn-outline-secondary");
                });
                this.classList.add("btn-primary", "active");
                this.classList.remove("btn-outline-secondary");
                loadAnomaly(this.getAttribute("data-anomaly"));
            });
        });

        btnStep?.addEventListener("click", () => {
            const cfg = anomalyConfigs[currentAnomaly];
            if (!cfg || stepIndex >= cfg.steps.length) return;

            const st = cfg.steps[stepIndex];
            stepIndex++;

            if (counter) counter.textContent = `Step ${stepIndex} of ${cfg.steps.length}`;
            if (varX) varX.textContent = st.val;
            if (hist) {
                hist.innerHTML += `<br><span class="text-primary font-monospace">&bull; ${st.log}</span>`;
                hist.scrollTop = hist.scrollHeight;
            }

            if (stepIndex === cfg.steps.length) {
                if (statusRes) statusRes.textContent = `Expected: ${cfg.expected} | Actual: ${cfg.actual}`;
                if (btnStep) btnStep.disabled = true;
            }
        });

        btnReset?.addEventListener("click", () => loadAnomaly(currentAnomaly));
    }

    // --- E. Precedence Graph & Schedule Analyzer (Topic 5 & Lab Topic 10) ---
    function initScheduleAnalyzer() {
        const inputSchedule = document.getElementById("schedule-input-text");
        const btnAnalyze = document.getElementById("btn-analyze-schedule");

        // Lab controls
        const labInput = document.getElementById("lab-schedule-input");
        const btnLabAnalyze = document.getElementById("btn-lab-analyze-schedule");
        const btnLabClear = document.getElementById("btn-lab-clear-schedule");

        // Presets
        document.querySelectorAll(".btn-schedule-preset").forEach(btn => {
            btn.addEventListener("click", function () {
                const sched = this.getAttribute("data-schedule");
                if (inputSchedule && sched) {
                    inputSchedule.value = sched;
                    runAnalysis(sched);
                }
            });
        });

        // Quick Tokens
        document.querySelectorAll(".btn-quick-token").forEach(btn => {
            btn.addEventListener("click", function () {
                const tok = this.getAttribute("data-token");
                if (labInput && tok) {
                    const cur = labInput.value.trim();
                    labInput.value = cur ? `${cur}, ${tok}` : tok;
                }
            });
        });

        btnAnalyze?.addEventListener("click", () => {
            const text = inputSchedule ? inputSchedule.value.trim() : "";
            if (text) runAnalysis(text);
        });

        btnLabAnalyze?.addEventListener("click", () => {
            const text = labInput ? labInput.value.trim() : "";
            if (text) runAnalysis(text, true);
        });

        btnLabClear?.addEventListener("click", () => {
            if (labInput) labInput.value = "";
        });

        function runAnalysis(schedStr, isLab = false) {
            const result = clientAnalyzeSchedule(schedStr);
            renderScheduleResults(result, isLab);
        }

        // Initial analysis run
        if (inputSchedule && inputSchedule.value) {
            runAnalysis(inputSchedule.value);
        }
    }

    function clientAnalyzeSchedule(rawStr) {
        importScheduleRegex:
        var tokens = rawStr.split(/[,;\s\n]+/).map(t => t.trim()).filter(Boolean);
        var ops = [];
        var step = 1;

        tokens.forEach(tok => {
            var m_rw = tok.match(/^([RrWw])(\d+)[\(\[]\s*([A-Za-z0-9_]+)\s*[\)\]]$/);
            if (m_rw) {
                ops.push({
                    step: step++,
                    raw: `${m_rw[1].toUpperCase()}${m_rw[2]}(${m_rw[3].toUpperCase()})`,
                    op: m_rw[1].toUpperCase() === "R" ? "read" : "write",
                    tx: `T${m_rw[2]}`,
                    item: m_rw[3].toUpperCase()
                });
                return;
            }
            var m_ca = tok.match(/^(?:(C|COMMIT)|(A|ABORT))(\d+)$/i);
            if (m_ca) {
                var isCommit = Boolean(m_ca[1]);
                ops.push({
                    step: step++,
                    raw: `${isCommit ? 'C' : 'A'}${m_ca[3]}`,
                    op: isCommit ? "commit" : "abort",
                    tx: `T${m_ca[3]}`,
                    item: null
                });
            }
        });

        var txSet = Array.from(new Set(ops.map(o => o.tx))).sort();
        var conflicts = [];
        var edges = new Set();
        var edgeList = [];

        for (var i = 0; i < ops.length; i++) {
            if (!ops[i].item) continue;
            for (var j = i + 1; j < ops.length; j++) {
                if (!ops[j].item) continue;
                if (ops[i].tx !== ops[j].tx && ops[i].item === ops[j].item) {
                    if (ops[i].op === "write" || ops[j].op === "write") {
                        var fromTx = ops[i].tx;
                        var toTx = ops[j].tx;
                        var type = (ops[i].op === "read") ? "Read-Write (Anti-Dependency)" : (ops[j].op === "read" ? "Write-Read (Flow Dependency)" : "Write-Write (Output Dependency)");
                        conflicts.push({
                            from: fromTx,
                            to: toTx,
                            item: ops[i].item,
                            type: type,
                            earlier: `Step ${ops[i].step}: ${ops[i].raw}`,
                            later: `Step ${ops[j].step}: ${ops[j].raw}`
                        });
                        var eKey = `${fromTx}->${toTx}`;
                        if (!edges.has(eKey)) {
                            edges.add(eKey);
                            edgeList.push({ from: fromTx, to: toTx, type: type });
                        }
                    }
                }
            }
        }

        // Graph Cycle Detection (DFS)
        var adj = {};
        var inDegree = {};
        txSet.forEach(t => { adj[t] = []; inDegree[t] = 0; });
        edgeList.forEach(e => {
            adj[e.from].push(e.to);
            inDegree[e.to]++;
        });

        var visited = {};
        txSet.forEach(t => visited[t] = 0);
        var cycleFound = false;
        var cyclePath = [];

        function dfs(u, path) {
            visited[u] = 1;
            path.push(u);
            for (var v of adj[u]) {
                if (visited[v] === 1) {
                    cycleFound = true;
                    var idx = path.indexOf(v);
                    cyclePath = path.slice(idx).concat([v]);
                    return true;
                } else if (visited[v] === 0) {
                    if (dfs(v, path)) return true;
                }
            }
            path.pop();
            visited[u] = 2;
            return false;
        }

        for (var t of txSet) {
            if (visited[t] === 0) {
                if (dfs(t, [])) break;
            }
        }

        // Topological Sort (Kahn's)
        var q = txSet.filter(t => inDegree[t] === 0);
        var topo = [];
        var inDegCopy = Object.assign({}, inDegree);

        while (q.length > 0) {
            var curr = q.shift();
            topo.push(curr);
            for (var nbr of adj[curr]) {
                inDegCopy[nbr]--;
                if (inDegCopy[nbr] === 0) q.push(nbr);
            }
        }

        var isSerial = (!cycleFound && topo.length === txSet.length);

        return {
            transactions: txSet,
            edges: edgeList,
            conflicts: conflicts,
            isSerializable: isSerial,
            hasCycle: cycleFound,
            cyclePath: cyclePath,
            topologicalOrder: topo
        };
    }

    function renderScheduleResults(res, isLab = false) {
        const badge = document.getElementById(isLab ? "lab-serializable-badge" : "analysis-serializable-badge");
        const topoOut = document.getElementById(isLab ? "lab-topo-output" : "analysis-topo-order");
        const expl = document.getElementById(isLab ? "lab-schedule-explanation" : "analysis-explanation-text");

        if (badge) {
            if (res.isSerializable) {
                badge.className = "badge bg-success fs-6";
                badge.textContent = "CONFLICT-SERIALIZABLE";
            } else {
                badge.className = "badge bg-danger fs-6";
                badge.textContent = "NOT CONFLICT-SERIALIZABLE (CYCLE DETECTED)";
            }
        }

        if (topoOut) {
            if (res.isSerializable) {
                topoOut.textContent = `Serial Equivalent Order: ${res.topologicalOrder.join(" -> ")}`;
            } else {
                topoOut.textContent = `Cycle Detected: ${res.cyclePath.join(" -> ")}`;
            }
        }

        if (expl) {
            if (res.isSerializable) {
                expl.textContent = `[Verified] The precedence graph contains no directed cycles. Topological sort proves conflict-equivalence to: ${res.topologicalOrder.join(" -> ")}.`;
            } else {
                expl.textContent = `[Violation] Directed cycle found (${res.cyclePath.join(" -> ")}). Mutually conflicting dependencies prevent any equivalent serial ordering.`;
            }
        }

        if (!isLab) {
            // Render Conflicts Table
            const tbody = document.querySelector("#table-conflicts-list tbody");
            if (tbody) {
                if (res.conflicts.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No conflicting operation pairs found.</td></tr>`;
                } else {
                    tbody.innerHTML = res.conflicts.map(c => `
                        <tr>
                            <td>${c.earlier}</td>
                            <td>${c.later}</td>
                            <td>${c.item}</td>
                            <td>${c.type}</td>
                            <td><span class="badge ${res.hasCycle ? 'bg-danger' : 'bg-primary'}">${c.from} &rarr; ${c.to}</span></td>
                        </tr>
                    `).join("");
                }
            }

            // Render SVG Precedence Graph
            renderPrecedenceGraphSvg(res);
        }
    }

    function renderPrecedenceGraphSvg(res) {
        const nodesG = document.getElementById("svg-graph-nodes");
        const edgesG = document.getElementById("svg-graph-edges");
        if (!nodesG || !edgesG) return;

        nodesG.innerHTML = "";
        edgesG.innerHTML = "";

        const count = res.transactions.length;
        if (count === 0) return;

        const positions = {};
        const width = 600;
        const height = 180;

        if (count === 1) {
            positions[res.transactions[0]] = { x: width / 2, y: height / 2 };
        } else {
            const spacing = (width - 160) / (count - 1 || 1);
            res.transactions.forEach((tx, idx) => {
                positions[tx] = {
                    x: 80 + idx * spacing,
                    y: 90
                };
            });
        }

        // Draw Edges
        res.edges.forEach(e => {
            const p1 = positions[e.from];
            const p2 = positions[e.to];
            if (p1 && p2) {
                const isCycle = res.hasCycle && res.cyclePath.includes(e.from) && res.cyclePath.includes(e.to);
                const marker = isCycle ? "url(#edge-arrow-cycle)" : "url(#edge-arrow)";
                const stroke = isCycle ? "#dc3545" : "#0d6efd";

                // Curve arc if nodes are adjacent or backwards
                let d = "";
                if (p1.x < p2.x) {
                    d = `M ${p1.x + 28} ${p1.y - 6} Q ${(p1.x + p2.x) / 2} ${p1.y - 35} ${p2.x - 28} ${p2.y - 6}`;
                } else {
                    d = `M ${p1.x - 28} ${p1.y + 6} Q ${(p1.x + p2.x) / 2} ${p1.y + 35} ${p2.x + 28} ${p2.y + 6}`;
                }

                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("d", d);
                path.setAttribute("stroke", stroke);
                path.setAttribute("stroke-width", "2.5");
                path.setAttribute("fill", "none");
                path.setAttribute("marker-end", marker);
                edgesG.appendChild(path);
            }
        });

        // Draw Nodes
        res.transactions.forEach(tx => {
            const pos = positions[tx];
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("transform", `translate(${pos.x}, ${pos.y})`);

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("r", "26");
            circle.setAttribute("fill", "#e0e7ff");
            circle.setAttribute("stroke", "#4f46e5");
            circle.setAttribute("stroke-width", "2");

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("dy", "5");
            text.setAttribute("font-weight", "bold");
            text.setAttribute("font-size", "14");
            text.setAttribute("fill", "#312e81");
            text.textContent = tx;

            g.appendChild(circle);
            g.appendChild(text);
            nodesG.appendChild(g);
        });
    }

    // --- F. 2PL Lock Simulator (Topic 6 & Lab Topic 10) ---
    function initLockSimulator() {
        let grantedLocks = []; // { item, type, txList: [] }
        let waitingQueue = []; // { tx, type, item, blockedBy }

        function checkCompatibility(item, reqType, reqTx) {
            const existing = grantedLocks.find(l => l.item === item);
            if (!existing || existing.txList.length === 0) return { compatible: true };
            if (existing.txList.length === 1 && existing.txList[0] === reqTx) {
                // Same transaction already holds lock
                return { compatible: true, upgrade: (existing.type === "S" && reqType === "X") };
            }
            if (existing.type === "S" && reqType === "S") {
                return { compatible: true };
            }
            return { compatible: false, heldBy: existing.txList.join(", ") };
        }

        function handleRequestLock(tx, type, item, logElemId) {
            const compat = checkCompatibility(item, type, tx);
            const logBox = document.getElementById(logElemId);

            if (compat.compatible) {
                let entry = grantedLocks.find(l => l.item === item);
                if (!entry) {
                    grantedLocks.push({ item, type, txList: [tx] });
                } else {
                    if (!entry.txList.includes(tx)) entry.txList.push(tx);
                    if (compat.upgrade) entry.type = "X";
                }
                if (logBox) logBox.textContent = `[Granted] ${tx} successfully acquired ${type}-Lock on ${item}.`;
            } else {
                waitingQueue.push({ tx, type, item, blockedBy: compat.heldBy });
                if (logBox) logBox.textContent = `[Blocked] ${tx} requested ${type}-Lock on ${item}, but is blocked by ${compat.heldBy}. Added to wait queue.`;
            }
            updateLockTableUI();
        }

        function handleReleaseLocks(tx, logElemId) {
            grantedLocks.forEach(l => {
                l.txList = l.txList.filter(t => t !== tx);
            });
            grantedLocks = grantedLocks.filter(l => l.txList.length > 0);

            // Re-evaluate waiting queue
            const stillWaiting = [];
            waitingQueue.forEach(req => {
                const compat = checkCompatibility(req.item, req.type, req.tx);
                if (compat.compatible) {
                    let entry = grantedLocks.find(l => l.item === req.item);
                    if (!entry) {
                        grantedLocks.push({ item: req.item, type: req.type, txList: [req.tx] });
                    } else {
                        if (!entry.txList.includes(req.tx)) entry.txList.push(req.tx);
                    }
                } else {
                    req.blockedBy = compat.heldBy;
                    stillWaiting.push(req);
                }
            });
            waitingQueue = stillWaiting;

            const logBox = document.getElementById(logElemId);
            if (logBox) logBox.textContent = `[Released] ${tx} committed and released all held locks. Unblocked compatible waiters.`;
            updateLockTableUI();
        }

        function updateLockTableUI() {
            const grantedTbody = document.querySelector("#table-granted-locks tbody");
            const waitingTbody = document.querySelector("#table-waiting-locks tbody");

            if (grantedTbody) {
                if (grantedLocks.length === 0) {
                    grantedTbody.innerHTML = `<tr><td colspan="3" class="text-muted">No locks currently held.</td></tr>`;
                } else {
                    grantedTbody.innerHTML = grantedLocks.map(l => `
                        <tr>
                            <td><strong>${l.item}</strong></td>
                            <td><span class="badge ${l.type === 'X' ? 'bg-danger' : 'bg-primary'}">${l.type}-Lock</span></td>
                            <td>${l.txList.join(", ")}</td>
                        </tr>
                    `).join("");
                }
            }

            if (waitingTbody) {
                if (waitingQueue.length === 0) {
                    waitingTbody.innerHTML = `<tr><td colspan="4" class="text-muted">No transactions blocked.</td></tr>`;
                } else {
                    waitingTbody.innerHTML = waitingQueue.map(w => `
                        <tr>
                            <td><strong class="text-danger">${w.tx}</strong></td>
                            <td>${w.type}-Lock</td>
                            <td>${w.item}</td>
                            <td>${w.blockedBy}</td>
                        </tr>
                    `).join("");
                }
            }
        }

        // Topic 6 controls
        document.getElementById("btn-request-lock")?.addEventListener("click", () => {
            const tx = document.getElementById("lock-sim-tx")?.value || "T1";
            const type = document.getElementById("lock-sim-type")?.value || "S";
            const item = document.getElementById("lock-sim-item")?.value || "X";
            handleRequestLock(tx, type, item, "lock-sim-log");
        });

        document.getElementById("btn-release-t1-locks")?.addEventListener("click", () => handleReleaseLocks("T1", "lock-sim-log"));
        document.getElementById("btn-release-t2-locks")?.addEventListener("click", () => handleReleaseLocks("T2", "lock-sim-log"));
        document.getElementById("btn-release-t3-locks")?.addEventListener("click", () => handleReleaseLocks("T3", "lock-sim-log"));

        document.getElementById("btn-reset-lock-sim")?.addEventListener("click", () => {
            grantedLocks = [];
            waitingQueue = [];
            updateLockTableUI();
            const logBox = document.getElementById("lock-sim-log");
            if (logBox) logBox.textContent = `[Reset] Lock table and wait queue cleared.`;
        });

        // Lab Topic 10 controls
        document.getElementById("btn-lab-request-lock")?.addEventListener("click", () => {
            const tx = document.getElementById("lab-lock-tx")?.value || "T1";
            const type = document.getElementById("lab-lock-type")?.value || "S";
            const item = document.getElementById("lab-lock-item")?.value || "X";
            handleRequestLock(tx, type, item, "lab-lock-log");
        });

        document.getElementById("btn-lab-release-t1")?.addEventListener("click", () => handleReleaseLocks("T1", "lab-lock-log"));
        document.getElementById("btn-lab-release-t2")?.addEventListener("click", () => handleReleaseLocks("T2", "lab-lock-log"));
        document.getElementById("btn-lab-release-t3")?.addEventListener("click", () => handleReleaseLocks("T3", "lab-lock-log"));
        document.getElementById("btn-lab-reset-locks")?.addEventListener("click", () => {
            grantedLocks = [];
            waitingQueue = [];
            const logBox = document.getElementById("lab-lock-log");
            if (logBox) logBox.textContent = `[Reset] In-memory lock table cleared.`;
        });
    }

    // --- G. Deadlock Simulator & WFG (Topic 7 & Lab Topic 10) ---
    function initDeadlockSimulator() {
        const btnTrigger = document.getElementById("btn-deadlock-trigger");
        const btnVictim = document.getElementById("btn-victim-select");
        const btnReset = document.getElementById("btn-deadlock-reset");
        const wfgStatus = document.getElementById("wfg-status-badge");
        const t1Status = document.getElementById("deadlock-t1-status");
        const t2Status = document.getElementById("deadlock-t2-status");
        const edgesG = document.getElementById("wfg-edges");
        const logBox = document.getElementById("deadlock-log");

        // Lab controls
        const labTrigger = document.getElementById("btn-lab-deadlock-trigger");
        const labAbort = document.getElementById("btn-lab-abort-victim");
        const labReset = document.getElementById("btn-lab-deadlock-reset");
        const labLog = document.getElementById("lab-deadlock-log");

        function stageDeadlock(isLab = false) {
            if (edgesG) {
                edgesG.innerHTML = `
                    <path d="M 130 70 Q 280 30 420 70" stroke="#dc2626" stroke-width="3" fill="none" marker-end="url(#wfg-arrow)"/>
                    <path d="M 420 90 Q 280 130 130 90" stroke="#dc2626" stroke-width="3" fill="none" marker-end="url(#wfg-arrow)"/>
                `;
            }
            if (wfgStatus) {
                wfgStatus.className = "badge bg-danger fs-6";
                wfgStatus.textContent = "DEADLOCK DETECTED! Directed Cycle (T1 <-> T2)";
            }
            if (t1Status) t1Status.innerHTML = `Holds X-Lock on Item X.<br><span class="badge bg-danger">BLOCKED waiting for Item Y (held by T2)</span>`;
            if (t2Status) t2Status.innerHTML = `Holds X-Lock on Item Y.<br><span class="badge bg-danger">BLOCKED waiting for Item X (held by T1)</span>`;
            if (btnVictim) btnVictim.disabled = false;
            if (labAbort) labAbort.disabled = false;

            const msg = "[Deadlock Detected] T1 holds X and waits for Y; T2 holds Y and waits for X. Circular wait cycle formed in WFG.";
            if (logBox) logBox.textContent = msg;
            if (labLog) labLog.textContent = msg;
        }

        function resolveDeadlock(victim, isLab = false) {
            const survivor = (victim === "T1") ? "T2" : "T1";
            if (edgesG) edgesG.innerHTML = "";
            if (wfgStatus) {
                wfgStatus.className = "badge bg-success";
                wfgStatus.textContent = `Deadlock Resolved! Victim ${victim} Aborted`;
            }
            if (victim === "T1") {
                if (t1Status) t1Status.innerHTML = `<span class="badge bg-secondary">ABORTED (Rolled back via Undo Log)</span>`;
                if (t2Status) t2Status.innerHTML = `<span class="badge bg-success">UNBLOCKED &rarr; Acquired X, Committed</span>`;
            } else {
                if (t2Status) t2Status.innerHTML = `<span class="badge bg-secondary">ABORTED (Rolled back via Undo Log)</span>`;
                if (t1Status) t1Status.innerHTML = `<span class="badge bg-success">UNBLOCKED &rarr; Acquired Y, Committed</span>`;
            }
            if (btnVictim) btnVictim.disabled = true;
            if (labAbort) labAbort.disabled = true;

            const msg = `[Recovery] Transaction ${victim} chosen as victim. Aborted & rolled back. ${survivor} unblocked and completed successfully.`;
            if (logBox) logBox.textContent = msg;
            if (labLog) labLog.textContent = msg;
        }

        function resetDeadlock() {
            if (edgesG) edgesG.innerHTML = "";
            if (wfgStatus) {
                wfgStatus.className = "badge bg-success";
                wfgStatus.textContent = "No Deadlock Detected";
            }
            if (t1Status) t1Status.textContent = "Status: Idle";
            if (t2Status) t2Status.textContent = "Status: Idle";
            if (btnVictim) btnVictim.disabled = true;
            if (labAbort) labAbort.disabled = true;
            if (logBox) logBox.textContent = "[Deadlock Detector] Sandbox reset.";
            if (labLog) labLog.textContent = "[Deadlock Detector] Sandbox reset.";
        }

        btnTrigger?.addEventListener("click", () => stageDeadlock(false));
        labTrigger?.addEventListener("click", () => stageDeadlock(true));

        document.querySelectorAll(".btn-victim-option").forEach(btn => {
            btn.addEventListener("click", function (e) {
                e.preventDefault();
                resolveDeadlock(this.getAttribute("data-victim"), false);
            });
        });

        labAbort?.addEventListener("click", () => resolveDeadlock("T1", true));
        btnReset?.addEventListener("click", resetDeadlock);
        labReset?.addEventListener("click", resetDeadlock);
    }

    // --- H. WAL Recovery Simulator (Topic 8 & Lab Topic 10) ---
    function initWalRecoverySimulator() {
        const scenarios = {
            2: {
                redo: "None",
                undo: "T1",
                a: "₹5,000",
                b: "₹3,000",
                c: "₹2,000",
                desc: "Crash at LSN 2: T1 had deducted 1000 from A but never committed. T1 rolled back to initial ₹5,000."
            },
            4: {
                redo: "None",
                undo: "T1, T2",
                a: "₹5,000",
                b: "₹3,000",
                c: "₹2,000",
                desc: "Crash at LSN 4: Neither T1 nor T2 committed. Both rolled back via Undo Log. Balances restored to initial values."
            },
            5: {
                redo: "T1",
                undo: "T2",
                a: "₹4,000",
                b: "₹4,000",
                c: "₹2,000",
                desc: "Crash at LSN 5: T1 reached COMMIT. Its updates on A and B are reapplied (REDO). T2 never committed and is undone."
            },
            8: {
                redo: "T1",
                undo: "T2, T3",
                a: "₹4,000",
                b: "₹4,000",
                c: "₹2,000",
                desc: "Crash at LSN 8: T1 is committed (REDO list). T2 and T3 were active and uncommitted (UNDO list, rolled back)."
            }
        };

        function setCrashPoint(lsn, isLab = false) {
            const data = scenarios[lsn];
            if (!data) return;

            const redoBadge = document.getElementById("wal-redo-list");
            const undoBadge = document.getElementById("wal-undo-list");
            const stateA = document.getElementById("wal-state-a");
            const stateB = document.getElementById("wal-state-b");
            const stateC = document.getElementById("wal-state-c");
            const expl = document.getElementById("wal-explanation-box");
            const labLog = document.getElementById("lab-recovery-log");

            if (redoBadge) redoBadge.textContent = data.redo;
            if (undoBadge) undoBadge.textContent = data.undo;
            if (stateA) stateA.textContent = data.a;
            if (stateB) stateB.textContent = data.b;
            if (stateC) stateC.textContent = data.c;
            if (expl) expl.textContent = data.desc;
            if (labLog) labLog.textContent = `[Crash LSN ${lsn}] REDO List: ${data.redo} | UNDO List: ${data.undo} | Restored: A=${data.a}, B=${data.b}, C=${data.c}.`;

            // Highlight table rows in topic 8
            for (let i = 1; i <= 8; i++) {
                const tr = document.getElementById(`wal-row-${i}`);
                if (tr) {
                    if (i <= lsn) {
                        tr.classList.remove("opacity-25");
                    } else {
                        tr.classList.add("opacity-25");
                    }
                }
            }
        }

        document.querySelectorAll(".btn-crash-preset").forEach(btn => {
            btn.addEventListener("click", function () {
                document.querySelectorAll(".btn-crash-preset").forEach(b => b.classList.remove("active"));
                this.classList.add("active");
                setCrashPoint(parseInt(this.getAttribute("data-crash"), 10), false);
            });
        });

        document.querySelectorAll(".btn-lab-crash").forEach(btn => {
            btn.addEventListener("click", function () {
                document.querySelectorAll(".btn-lab-crash").forEach(b => b.classList.remove("active"));
                this.classList.add("active");
                setCrashPoint(parseInt(this.getAttribute("data-crash"), 10), true);
            });
        });
    }

    // --- I. Isolation Level Explorer (Topic 9) ---
    function initIsolationExplorer() {
        const levels = {
            "ru": {
                title: "Level: READ UNCOMMITTED",
                status: "Dangerous / No Locking",
                desc: "Queries read intermediate, uncommitted writes directly. Maximum throughput, but permits all concurrency anomalies.",
                dirty: "Allowed",
                fuzzy: "Allowed",
                phantom: "Allowed",
                mech: "[Engine Mechanism] Consistent reads do not inspect undo logs or wait for locks. Reads dirty buffer pool pages directly."
            },
            "rc": {
                title: "Level: READ COMMITTED",
                status: "Popular in Oracle & PostgreSQL",
                desc: "Each query within a transaction reads a fresh snapshot of committed data. Prevents dirty reads, but allows non-repeatable reads.",
                dirty: "Prevented",
                fuzzy: "Allowed",
                phantom: "Allowed",
                mech: "[Engine Mechanism] In MySQL InnoDB, each consistent read builds a brand new Read View at statement execution time."
            },
            "rr": {
                title: "Level: REPEATABLE READ (MySQL 8 Default)",
                status: "Balanced Production Setting",
                desc: "All consistent reads within the same transaction read the snapshot established by the first read in that transaction.",
                dirty: "Prevented",
                fuzzy: "Prevented",
                phantom: "Prevented (InnoDB)",
                mech: "[Engine Mechanism] Uses MVCC Read Views for ordinary SELECTs, and Next-Key Locks (Record Lock + Gap Lock) for SELECT ... FOR UPDATE."
            },
            "ser": {
                title: "Level: SERIALIZABLE",
                status: "Highest Isolation / Lowest Throughput",
                desc: "Forces all ordinary SELECT statements to implicitly behave as SELECT ... FOR SHARE under autocommit=0.",
                dirty: "Prevented",
                fuzzy: "Prevented",
                phantom: "Prevented",
                mech: "[Engine Mechanism] Enforces strict lock acquisition on all reads, preventing all concurrent writes until commit."
            }
        };

        document.querySelectorAll(".isolation-pill-btn").forEach(btn => {
            btn.addEventListener("click", function () {
                document.querySelectorAll(".isolation-pill-btn").forEach(b => {
                    b.classList.remove("btn-primary", "active");
                    b.classList.add("btn-outline-secondary");
                });
                this.classList.add("btn-primary", "active");
                this.classList.remove("btn-outline-secondary");

                const lvl = this.getAttribute("data-level");
                const data = levels[lvl];
                if (data) {
                    const title = document.getElementById("iso-card-title");
                    const status = document.getElementById("iso-card-status");
                    const desc = document.getElementById("iso-card-desc");
                    const dirty = document.getElementById("iso-badge-dirty");
                    const fuzzy = document.getElementById("iso-badge-fuzzy");
                    const phantom = document.getElementById("iso-badge-phantom");
                    const mech = document.getElementById("iso-card-mechanism");

                    if (title) title.textContent = data.title;
                    if (status) status.textContent = data.status;
                    if (desc) desc.textContent = data.desc;
                    if (dirty) dirty.innerHTML = `<span class="d-block text-muted">Dirty Read</span><strong class="${data.dirty === 'Prevented' ? 'text-success' : 'text-danger'}">${data.dirty}</strong>`;
                    if (fuzzy) fuzzy.innerHTML = `<span class="d-block text-muted">Non-Repeatable Read</span><strong class="${data.fuzzy === 'Prevented' ? 'text-success' : 'text-danger'}">${data.fuzzy}</strong>`;
                    if (phantom) phantom.innerHTML = `<span class="d-block text-muted">Phantom Read</span><strong class="${data.phantom.includes('Prevented') ? 'text-success' : 'text-danger'}">${data.phantom}</strong>`;
                    if (mech) mech.textContent = data.mech;
                }
            });
        });
    }

    // Helper Toast
    function showToast(msg) {
        const toastElem = document.getElementById("phase7-toast");
        const msgElem = document.getElementById("phase7-toast-message");
        if (toastElem && msgElem && window.bootstrap) {
            msgElem.textContent = msg;
            const toast = new bootstrap.Toast(toastElem, { delay: 3500 });
            toast.show();
        }
    }

    // ====================================================================
    // 6. LAUNCH ALL ENGINES
    // ====================================================================
    try {
        initNavigation();
        initQuizHandlers();
        initBankSimulator();
        initAcidExplorer();
        initStateMachine();
        initAnomalyStepper();
        initScheduleAnalyzer();
        initLockSimulator();
        initDeadlockSimulator();
        initWalRecoverySimulator();
        initIsolationExplorer();
        updateProgressUI();
        console.log("Phase 7 engines successfully initialized.");
    } catch (err) {
        console.error("Critical error launching Phase 7 engines:", err);
    }
});
