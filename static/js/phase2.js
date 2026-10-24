/**
 * DBMS Learn & Run: Phase 2 Client-Side Interactivity
 * Handles topic tab navigation, progress persistence, quizzes, and data independence simulation.
 */

document.addEventListener("DOMContentLoaded", function () {
    const STORAGE_KEY = "dbms_learn_run_phase2";
    const TOPICS = ["architecture", "data-models", "three-schema", "data-independence"];

    // Default state structure
    let progressState = {
        completed_topics: {
            "architecture": false,
            "data-models": false,
            "three-schema": false,
            "data-independence": false
        },
        quizzes: {
            "1": { score: 0, attempted: false, answers: {} },
            "2": { score: 0, attempted: false, answers: {} },
            "3": { score: 0, attempted: false, answers: {} },
            "4": { score: 0, attempted: false, answers: {} }
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
            console.warn("Could not parse saved progress from localStorage:", e);
        }
    }

    // Save progress to localStorage
    function saveProgress() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(progressState));
        } catch (e) {
            console.warn("Could not save progress to localStorage:", e);
        }
    }

    // Toast notification helper
    function showToast(msg) {
        const toastEl = document.getElementById("phase2-toast");
        const msgEl = document.getElementById("phase2-toast-msg");
        if (toastEl && msgEl && window.bootstrap) {
            msgEl.textContent = msg;
            const toast = new bootstrap.Toast(toastEl, { delay: 2800 });
            toast.show();
        }
    }

    // Recalculate & update overall progress bar and indicators
    function updateProgressUI() {
        let completedTopicCount = 0;
        TOPICS.forEach(t => {
            if (progressState.completed_topics[t]) completedTopicCount++;
        });

        let totalQuizScore = 0; // out of 20
        let totalQuizAttempted = 0;
        for (let i = 1; i <= 4; i++) {
            const q = progressState.quizzes[i.toString()];
            if (q) {
                totalQuizScore += (q.score || 0);
                if (q.attempted) totalQuizAttempted++;
            }
        }

        // Each topic = 12.5% (total 50%). Each quiz score point = 2.5% (total 50%).
        const topicPct = completedTopicCount * 12.5;
        const quizPct = (totalQuizScore / 20) * 50;
        const totalPct = Math.round(topicPct + quizPct);

        // Update progress bar
        const pBar = document.getElementById("phase2-progress-bar");
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
        TOPICS.forEach((t, idx) => {
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
            const quizStatusEl = document.getElementById("quiz-status-" + (idx + 1));
            const qData = progressState.quizzes[(idx + 1).toString()];
            if (quizStatusEl && qData) {
                if (qData.attempted) {
                    quizStatusEl.innerHTML = `<span class="text-success fw-bold">Score: ${qData.score}/5</span>`;
                } else {
                    quizStatusEl.textContent = "Quiz: 0/5";
                }
            }
        });

        // Update Mark Topic Completed button labels
        document.querySelectorAll(".btn-mark-completed").forEach(btn => {
            const topic = btn.getAttribute("data-topic");
            if (progressState.completed_topics[topic]) {
                btn.innerHTML = '<i class="bi bi-check2-all me-1"></i> Topic Completed';
                btn.classList.remove("btn-outline-success");
                btn.classList.add("btn-success");
            } else {
                btn.innerHTML = `<i class="bi bi-check-circle me-1"></i> Mark as Completed`;
                btn.classList.remove("btn-success");
                btn.classList.add("btn-outline-success");
            }
        });
    }

    // ====================================================================
    // TOPIC SWITCHING LOGIC
    // ====================================================================
    function switchTopic(targetTopic) {
        if (!TOPICS.includes(targetTopic)) targetTopic = "architecture";

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
        document.querySelectorAll("#phase2-topic-tabs .nav-link").forEach(btn => {
            const t = btn.getAttribute("data-target");
            if (t === targetTopic) {
                btn.classList.add("active");
                btn.classList.remove("text-secondary");
            } else {
                btn.classList.remove("active");
                btn.classList.add("text-secondary");
            }
        });

        // Update URL query param without reload
        const url = new URL(window.location);
        url.searchParams.set("topic", targetTopic);
        window.history.replaceState({}, "", url);

        // Scroll smoothly to topic tabs top
        const tabsEl = document.getElementById("phase2-topic-tabs");
        if (tabsEl) {
            tabsEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    // Tab buttons click listener
    document.querySelectorAll("#phase2-topic-tabs .nav-link").forEach(btn => {
        btn.addEventListener("click", function () {
            const target = this.getAttribute("data-target");
            switchTopic(target);
        });
    });

    // Nav buttons click listener (Next / Previous buttons)
    document.querySelectorAll(".btn-nav-topic").forEach(btn => {
        btn.addEventListener("click", function () {
            const target = this.getAttribute("data-target");
            switchTopic(target);
        });
    });

    // Start reading button
    const btnStartReading = document.getElementById("btn-start-reading");
    if (btnStartReading) {
        btnStartReading.addEventListener("click", function () {
            switchTopic("architecture");
        });
    }

    // Mark as completed button
    document.querySelectorAll(".btn-mark-completed").forEach(btn => {
        btn.addEventListener("click", function () {
            const topic = this.getAttribute("data-topic");
            progressState.completed_topics[topic] = !progressState.completed_topics[topic];
            saveProgress();
            updateProgressUI();
            showToast(progressState.completed_topics[topic] ? "Topic marked as completed!" : "Topic marked as uncompleted.");
        });
    });

    // Reset all progress button
    const btnResetAll = document.getElementById("btn-reset-all-progress");
    if (btnResetAll) {
        btnResetAll.addEventListener("click", function () {
            if (confirm("Reset all Phase 2 progress and quiz scores?")) {
                localStorage.removeItem(STORAGE_KEY);
                progressState = {
                    completed_topics: {
                        "architecture": false,
                        "data-models": false,
                        "three-schema": false,
                        "data-independence": false
                    },
                    quizzes: {
                        "1": { score: 0, attempted: false, answers: {} },
                        "2": { score: 0, attempted: false, answers: {} },
                        "3": { score: 0, attempted: false, answers: {} },
                        "4": { score: 0, attempted: false, answers: {} }
                    }
                };
                // Reset quiz DOM
                document.querySelectorAll(".quiz-feedback").forEach(f => {
                    f.className = "quiz-feedback mt-2 d-none";
                    f.innerHTML = "";
                });
                document.querySelectorAll(".quiz-option").forEach(opt => {
                    opt.className = "btn btn-outline-secondary text-start btn-sm py-2 px-3 quiz-option";
                    opt.disabled = false;
                });
                updateProgressUI();
                for (let i = 1; i <= 4; i++) updateQuizScoreBadge(i);
                showToast("All progress has been reset.");
            }
        });
    }

    // ====================================================================
    // QUIZ LOGIC WITH DETAILED EXPLANATIONS
    // ====================================================================
    const QUIZ_EXPLANATIONS = {
        // Topic 1 Architecture
        "arch-q1": {
            correctMsg: "Correct! In Two-Tier (Client-Server) architecture, the client workstation is known as a 'Fat Client' because it executes both the presentation interface and the business logic while issuing direct SQL commands via ODBC/JDBC.",
            incorrectMsg: "Incorrect. The correct answer is B. In Two-Tier architecture, the client runs the UI and application logic, while the database server handles DBMS and storage."
        },
        "arch-q2": {
            correctMsg: "Correct! Three-Tier architecture isolates the database in a secure private network subnet, eliminates direct database connection exposure from clients, and allows independent horizontal scaling.",
            incorrectMsg: "Incorrect. The correct answer is C. Three-Tier architecture is chosen for public systems because of robust security isolation, centralized business logic, and horizontal scalability."
        },
        "arch-q3": {
            correctMsg: "Correct! The Query Optimizer evaluates multiple potential execution strategies (index scan, clustered lookup, full table scan) and generates the lowest-cost physical execution plan.",
            incorrectMsg: "Incorrect. The correct answer is B. The Query Optimizer (part of the Query Processor) analyzes SQL queries and chooses the optimal access path."
        },
        "arch-q4": {
            correctMsg: "Correct! The Data Dictionary (or System Catalog) holds the metadata describing table schemas, column data types, primary/foreign key constraints, and user access permissions.",
            incorrectMsg: "Incorrect. The correct answer is B. The Data Dictionary stores critical metadata describing the database's structure and security privileges."
        },
        "arch-q5": {
            correctMsg: "Correct! An embedded SQLite database running locally on a smartphone with in-process storage calls is a classic One-Tier architecture.",
            incorrectMsg: "Incorrect. The correct answer is A. Because the user interface, application code, and SQLite database file all reside on the single mobile device, it is a One-Tier architecture."
        },

        // Topic 2 Data Models
        "dm-q1": {
            correctMsg: "Correct! The Hierarchical data model strictly mandates that every child node has only ONE parent node. Representing many-to-many relationships requires duplicating child records across multiple branches.",
            incorrectMsg: "Incorrect. The correct answer is A. The Hierarchical (Tree-based) model enforces single-parent relationships strictly."
        },
        "dm-q2": {
            correctMsg: "Correct! The Relational model represents relationships between tables purely by sharing common attribute values (Primary Keys and Foreign Keys), without requiring physical disk memory pointers.",
            incorrectMsg: "Incorrect. The correct answer is B. In the relational model, tables are linked using common values in matching key columns."
        },
        "dm-q3": {
            correctMsg: "Correct! The Network model used complex circular pointer chains. Programmers had to understand physical storage pointer paths, resulting in very low data independence and brittle maintenance.",
            incorrectMsg: "Incorrect. The correct answer is B. The Network model declined because of high pointer maintenance complexity and lack of data independence."
        },
        "dm-q4": {
            correctMsg: "Correct! The Entity-Relationship (ER) model is a high-level conceptual model used during requirements analysis and planning to visualize entities and relationships before physical tables are constructed.",
            incorrectMsg: "Incorrect. The correct answer is B. The ER model is used during the preliminary database planning phase to bridge business requirements and database design."
        },
        "dm-q5": {
            correctMsg: "Correct! The Object-Oriented model packages data attributes (state) and computational operations (methods) together into persistent encapsulated objects.",
            incorrectMsg: "Incorrect. The correct answer is A. The Object-Oriented model encapsulates both state (data) and behavior (methods) into persistent objects."
        },

        // Topic 3 Three-Schema Architecture
        "ts-q1": {
            correctMsg: "Correct! The Conceptual Level (Logical Schema) describes the entire global logical database structure &mdash; all entities, attributes, relationships, and constraints &mdash; for the community of users.",
            incorrectMsg: "Incorrect. The correct answer is B. The Conceptual level describes the entire logical structure of the database without physical storage details."
        },
        "ts-q2": {
            correctMsg: "Correct! An External Schema is a virtual view or projection of the underlying data, not a separate physical copy. Different users access the same tables through customized windows.",
            incorrectMsg: "Incorrect. The correct answer is B. An external schema is a logical view, not a duplicate physical database on disk."
        },
        "ts-q3": {
            correctMsg: "Correct! Conceptual-to-Internal mapping translates conceptual relational operations into physical disk block offsets, record byte formats, and B+ tree index looks.",
            incorrectMsg: "Incorrect. The correct answer is B. Conceptual-to-Internal mapping connects logical tables to physical disk storage structures and index files."
        },
        "ts-q4": {
            correctMsg: "Correct! Three-Schema describes levels of data abstraction inside the DBMS (External, Conceptual, Internal), while Three-Tier describes the physical distribution of software/hardware components across a network.",
            incorrectMsg: "Incorrect. The correct answer is A. Three-Schema refers to levels of database abstraction; Three-Tier refers to network application distribution."
        },
        "ts-q5": {
            correctMsg: "Correct! Disk block allocation, record byte layouts, and B+ tree index structures are specified at the Internal Schema (Physical Level).",
            incorrectMsg: "Incorrect. The correct answer is C. The Internal Schema defines physical storage parameters such as block size and index structures."
        },

        // Topic 4 Data Independence
        "di-q1": {
            correctMsg: "Correct! Physical Data Independence guarantees that altering internal storage structures (such as moving from HDD to SSD or adding a B+ tree index) does not require altering conceptual schemas or user applications.",
            incorrectMsg: "Incorrect. The correct answer is A. Physical Data Independence isolates applications from changes to the physical internal storage schema."
        },
        "di-q2": {
            correctMsg: "Correct! Adding a new column to a conceptual table without breaking existing applications that do not use that column is an example of Logical Data Independence.",
            incorrectMsg: "Incorrect. The correct answer is B. Modifying the conceptual schema (adding a column) while preserving existing external views illustrates Logical Data Independence."
        },
        "di-q3": {
            correctMsg: "Correct! The two levels of Schema Mappings (External-to-Conceptual and Conceptual-to-Internal) absorb schema modifications at lower levels, preventing them from propagating upward.",
            incorrectMsg: "Incorrect. The correct answer is B. Schema mappings absorb changes made at lower levels, preserving higher-level definitions."
        },
        "di-q4": {
            correctMsg: "Correct! Logical Data Independence is harder because applications directly mention table and attribute names in SQL queries. If an attribute is deleted or restructured, dependent code must be adapted.",
            incorrectMsg: "Incorrect. The correct answer is A. Applications are tightly coupled to logical attribute and table names, making logical changes harder to hide than physical disk changes."
        },
        "di-q5": {
            correctMsg: "Correct! Changing the physical disk storage block size from 8KB to 16KB is a purely physical internal storage modification, demonstrating Physical Data Independence.",
            incorrectMsg: "Incorrect. The correct answer is C. Disk block size is an internal physical parameter, making it an example of Physical Data Independence."
        }
    };

    function setupQuizzes() {
        for (let qNum = 1; qNum <= 4; qNum++) {
            const container = document.getElementById("quiz-container-" + qNum);
            if (!container) continue;

            const qCards = container.querySelectorAll(".quiz-question-card");

            qCards.forEach(card => {
                const qid = card.getAttribute("data-qid");
                const options = card.querySelectorAll(".quiz-option");
                const feedbackEl = card.querySelector(".quiz-feedback");

                options.forEach(optBtn => {
                    optBtn.addEventListener("click", function () {
                        const isCorrect = this.getAttribute("data-correct") === "true";
                        const explanation = QUIZ_EXPLANATIONS[qid] || {
                            correctMsg: "Correct!",
                            incorrectMsg: "Incorrect choice."
                        };

                        // Disable options in this question
                        options.forEach(btn => {
                            btn.disabled = true;
                            if (btn.getAttribute("data-correct") === "true") {
                                btn.classList.remove("btn-outline-secondary");
                                btn.classList.add("btn-success", "text-white");
                            }
                        });

                        // If selected was incorrect, color it red
                        if (!isCorrect) {
                            this.classList.remove("btn-outline-secondary");
                            this.classList.add("btn-danger", "text-white");
                        }

                        // Display feedback
                        if (feedbackEl) {
                            feedbackEl.classList.remove("d-none");
                            if (isCorrect) {
                                feedbackEl.className = "quiz-feedback mt-2 p-2 rounded small bg-success-subtle text-success-emphasis border border-success-subtle";
                                feedbackEl.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> ${explanation.correctMsg}`;
                            } else {
                                feedbackEl.className = "quiz-feedback mt-2 p-2 rounded small bg-danger-subtle text-danger-emphasis border border-danger-subtle";
                                feedbackEl.innerHTML = `<i class="bi bi-x-circle-fill me-1"></i> ${explanation.incorrectMsg}`;
                            }
                        }

                        // Record answer in state
                        const qStr = qNum.toString();
                        if (!progressState.quizzes[qStr]) {
                            progressState.quizzes[qStr] = { score: 0, attempted: true, answers: {} };
                        }
                        progressState.quizzes[qStr].attempted = true;
                        progressState.quizzes[qStr].answers[qid] = isCorrect;

                        // Calculate total score for this quiz
                        let currentScore = 0;
                        qCards.forEach(c => {
                            const cQid = c.getAttribute("data-qid");
                            if (progressState.quizzes[qStr].answers[cQid] === true) {
                                currentScore++;
                            }
                        });
                        progressState.quizzes[qStr].score = currentScore;

                        saveProgress();
                        updateProgressUI();
                        updateQuizScoreBadge(qNum);
                    });
                });
            });

            // Reset quiz button
            const resetBtn = document.getElementById("btn-reset-quiz-" + qNum);
            if (resetBtn) {
                resetBtn.addEventListener("click", function () {
                    const qStr = qNum.toString();
                    progressState.quizzes[qStr] = { score: 0, attempted: false, answers: {} };
                    saveProgress();

                    qCards.forEach(card => {
                        card.querySelectorAll(".quiz-option").forEach(b => {
                            b.className = "btn btn-outline-secondary text-start btn-sm py-2 px-3 quiz-option";
                            b.disabled = false;
                        });
                        const fb = card.querySelector(".quiz-feedback");
                        if (fb) {
                            fb.className = "quiz-feedback mt-2 d-none";
                            fb.innerHTML = "";
                        }
                    });

                    updateProgressUI();
                    updateQuizScoreBadge(qNum);
                    showToast(`Topic ${qNum} quiz has been reset.`);
                });
            }
        }
    }

    function updateQuizScoreBadge(qNum) {
        const badge = document.getElementById(`quiz${qNum}-score-badge`);
        const summary = document.getElementById(`quiz${qNum}-summary`);
        const qData = progressState.quizzes[qNum.toString()];

        if (badge && qData) {
            if (qData.attempted) {
                badge.className = qData.score >= 4 ? "badge bg-success" : (qData.score >= 2 ? "badge bg-warning text-dark" : "badge bg-danger");
                badge.innerHTML = `<i class="bi bi-star-fill me-1"></i> Score: ${qData.score} / 5`;
            } else {
                badge.className = "badge bg-light text-dark border";
                badge.textContent = "Not Attempted";
            }
        }

        if (summary && qData && qData.attempted) {
            const answeredCount = Object.keys(qData.answers).length;
            if (answeredCount === 5) {
                summary.innerHTML = `<span class="text-success fw-bold"><i class="bi bi-check2-all me-1"></i> Completed: ${qData.score} out of 5 correct!</span>`;
            } else {
                summary.textContent = `Answered ${answeredCount} of 5 questions.`;
            }
        }
    }

    // ====================================================================
    // INTERACTIVE DATA INDEPENDENCE SIMULATOR (Topic 4)
    // ====================================================================
    const SIM_SCENARIOS = {
        "1": {
            title: "Scenario 1: Adding a B+ Tree Index on students.gpa",
            badgeText: "Physical Data Independence",
            badgeClass: "badge bg-success",
            changeDesc: "A new auxiliary B+ Tree search index is constructed on the storage disk for students.gpa.",
            levelAffected: "Internal Schema (Physical Level)",
            levelAffectedClass: "badge bg-danger-subtle text-danger",
            levelsUnaffected: "Conceptual Schema & External Application",
            explanation: "The DBMS Query Optimizer automatically utilizes the new index to speed up GPA lookups. The SQL query syntax and student results remain 100% unchanged.",
            extStatus: "Unaffected (100% Operational)",
            extClass: "text-success",
            extDetail: "SELECT roll_no, gpa FROM students WHERE gpa > 9.0;",
            concStatus: "Intact (Zero schema edits)",
            concClass: "text-success",
            concDetail: "TABLE students(student_id, roll_no, gpa)",
            intStatus: "Modified (Index File Added)",
            intClass: "text-danger",
            intDetail: "CREATE INDEX idx_gpa ON students(gpa);"
        },
        "2": {
            title: "Scenario 2: Migrating Table Storage from HDD to NVMe SSD",
            badgeText: "Physical Data Independence",
            badgeClass: "badge bg-success",
            changeDesc: "The database administrator relocates the physical .ibd tablespace files from a spinning magnetic drive to a high-speed NVMe SSD.",
            levelAffected: "Internal Schema (Physical Storage Media)",
            levelAffectedClass: "badge bg-danger-subtle text-danger",
            levelsUnaffected: "Conceptual Schema, External Views & Queries",
            explanation: "Operating system file paths and block drivers change, but the Conceptual-to-Internal mapping connects the logical tables to the new storage mount. Queries run 50x faster with zero code rewrite.",
            extStatus: "Unaffected (Runs Faster)",
            extClass: "text-success",
            extDetail: "Web user requests student roster (50x lower latency)",
            concStatus: "Intact (Zero Changes)",
            concClass: "text-success",
            concDetail: "Relational tables and constraints are unchanged",
            intStatus: "Modified (Hardware Relocation)",
            intClass: "text-danger",
            intDetail: "Tablespace moved to /mnt/fast_nvme/students.ibd"
        },
        "3": {
            title: "Scenario 3: Adding 'blood_group' Column to students Table",
            badgeText: "Logical Data Independence",
            badgeClass: "badge bg-primary",
            changeDesc: "A new attribute 'blood_group VARCHAR(5)' is added to the logical students relation.",
            levelAffected: "Conceptual Schema (Logical Level)",
            levelAffectedClass: "badge bg-primary-subtle text-primary",
            levelsUnaffected: "Existing External Views & Applications",
            explanation: "Existing client applications (such as the Professor's grading portal) only query roll_no and gpa. The DBMS ignores the new column for unaffected applications, preserving their functionality.",
            extStatus: "Unaffected (Ignores extra column)",
            extClass: "text-success",
            extDetail: "Existing App: SELECT roll_no, gpa FROM students;",
            concStatus: "Modified (New Attribute)",
            concClass: "text-warning-emphasis",
            concDetail: "ALTER TABLE students ADD blood_group VARCHAR(5);",
            intStatus: "Modified (Storage block layout updated)",
            intClass: "text-muted",
            intDetail: "Record layout adds 5-byte nullable varchar offset"
        },
        "4": {
            title: "Scenario 4: Introducing New 'hostels' Relational Table",
            badgeText: "Logical Data Independence",
            badgeClass: "badge bg-primary",
            changeDesc: "A brand new table 'hostel_accommodations' is added to track room allotments.",
            levelAffected: "Conceptual Schema (Logical Level)",
            levelAffectedClass: "badge bg-primary-subtle text-primary",
            levelsUnaffected: "All Existing External Applications",
            explanation: "The introduction of a new independent table does not impact existing academic or event registration applications. Only new hostel-specific modules will access this table.",
            extStatus: "Unaffected (100% Unaware)",
            extClass: "text-success",
            extDetail: "Academic Portal continues operating normally",
            concStatus: "Modified (New Table Added)",
            concClass: "text-warning-emphasis",
            concDetail: "CREATE TABLE hostels(room_no INT, student_id INT);",
            intStatus: "Modified (New tablespace file created)",
            intClass: "text-muted",
            intDetail: "New file hostels.ibd allocated on disk"
        },
        "5": {
            title: "Scenario 5: Splitting Student Entity with View Translation",
            badgeText: "Logical Data Independence (Advanced)",
            badgeClass: "badge bg-warning text-dark",
            changeDesc: "The conceptual table students is split into student_personal and student_academic. An external SQL View is created that joins them back together.",
            levelAffected: "Conceptual Schema (Decomposed into 2 tables)",
            levelAffectedClass: "badge bg-primary-subtle text-primary",
            levelsUnaffected: "External Application (Shielded by View Mapping)",
            explanation: "Because an External View 'students' is created that reconstructs the original schema, legacy applications querying the 'students' view experience zero breakages!",
            extStatus: "Unaffected (Queries the reconstructed View)",
            extClass: "text-success",
            extDetail: "Legacy App: SELECT * FROM students (Views behave like tables)",
            concStatus: "Modified (Normalized into 2 tables)",
            concClass: "text-warning-emphasis",
            concDetail: "TABLE student_personal + TABLE student_academic",
            intStatus: "Modified (Separate physical files)",
            intClass: "text-muted",
            intDetail: "Two independent .ibd tablespaces stored on disk"
        }
    };

    function setupSimulator() {
        const scenarioBtns = document.querySelectorAll(".sim-scenario-btn");
        scenarioBtns.forEach(btn => {
            btn.addEventListener("click", function () {
                const sId = this.getAttribute("data-scenario");
                const data = SIM_SCENARIOS[sId];
                if (!data) return;

                // Update active button
                scenarioBtns.forEach(b => b.classList.remove("active"));
                this.classList.add("active");

                // Update Feedback Card
                const titleEl = document.getElementById("sim-feedback-title");
                const badgeEl = document.getElementById("sim-feedback-badge");
                const changeEl = document.getElementById("sim-change-desc");
                const levelAffEl = document.getElementById("sim-level-affected");
                const levelsUnaffEl = document.getElementById("sim-levels-unaffected");
                const explEl = document.getElementById("sim-explanation");

                if (titleEl) titleEl.textContent = data.title;
                if (badgeEl) {
                    badgeEl.textContent = data.badgeText;
                    badgeEl.className = data.badgeClass;
                }
                if (changeEl) changeEl.textContent = data.changeDesc;
                if (levelAffEl) {
                    levelAffEl.textContent = data.levelAffected;
                    levelAffEl.className = data.levelAffectedClass;
                }
                if (levelsUnaffEl) levelsUnaffEl.textContent = data.levelsUnaffected;
                if (explEl) explEl.textContent = data.explanation;

                // Update Visual Nodes
                const extStatus = document.getElementById("sim-status-external");
                const extDetail = document.getElementById("sim-detail-external");
                const concStatus = document.getElementById("sim-status-conceptual");
                const concDetail = document.getElementById("sim-detail-conceptual");
                const intStatus = document.getElementById("sim-status-internal");
                const intDetail = document.getElementById("sim-detail-internal");

                if (extStatus) {
                    extStatus.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> ${data.extStatus}`;
                    extStatus.className = `sim-node-status small fw-semibold ${data.extClass}`;
                }
                if (extDetail) extDetail.textContent = data.extDetail;

                if (concStatus) {
                    concStatus.innerHTML = `<i class="bi bi-info-circle-fill me-1"></i> ${data.concStatus}`;
                    concStatus.className = `sim-node-status small fw-semibold ${data.concClass}`;
                }
                if (concDetail) concDetail.textContent = data.concDetail;

                if (intStatus) {
                    intStatus.innerHTML = `<i class="bi bi-gear-fill me-1"></i> ${data.intStatus}`;
                    intStatus.className = `sim-node-status small fw-semibold ${data.intClass}`;
                }
                if (intDetail) intDetail.textContent = data.intDetail;

                // Subtle animation pulse on the canvas
                const canvas = document.querySelector(".sim-canvas");
                if (canvas) {
                    canvas.classList.add("bg-white");
                    setTimeout(() => canvas.classList.remove("bg-white"), 300);
                }
            });
        });
    }

    // Initialize module
    loadProgress();
    updateProgressUI();
    setupQuizzes();
    setupSimulator();

    // Check URL parameters for active topic
    const urlParams = new URLSearchParams(window.location.search);
    const initialTopic = urlParams.get("topic");
    if (initialTopic && TOPICS.includes(initialTopic)) {
        switchTopic(initialTopic);
    }
});
