/**
 * DBMS Learn & Run: Phase 6 — ER & Relational Model
 * Client-Side Controller, Interactive ER Builder, Relational Algebra Lab & Quiz Engine
 */

document.addEventListener("DOMContentLoaded", function () {
    console.log("Initializing Phase 6: ER & Relational Model...");

    // ====================================================================
    // 1. STATE & CONSTANTS
    // ====================================================================
    const TOTAL_TOPICS = 10;
    const TOPIC_NAMES = {
        "topic1": "Lesson 1: Introduction to the ER Model",
        "topic2": "Lesson 2: Attributes and Keys",
        "topic3": "Lesson 3: Relationships & Degree",
        "topic4": "Lesson 4: Cardinality Constraints",
        "topic5": "Lesson 5: Participation Constraints",
        "topic6": "Lesson 6: Weak Entities & Identifying Relationships",
        "topic7": "Lesson 7: Extended ER (EER) Concepts",
        "topic8": "Lesson 8: Mapping ER Diagrams to Relational Schemas",
        "topic9": "Lesson 9: Relational Model Fundamentals",
        "topic10": "Lesson 10: Relational Algebra & Interactive Labs"
    };

    let currentTopic = "topic1";
    let progressState = loadLocalProgress();

    // ====================================================================
    // 2. QUIZ ANSWER KEYS & EXPLANATIONS (5 Questions per Topic = 50 total)
    // ====================================================================
    const QUIZ_DATA = {
        "topic1": {
            q1: { ans: "B", expl: "In Chen's ER notation, a standard Rectangle represents an entity type." },
            q2: { ans: "B", expl: "Entity type is the blueprint/schema definition; entity instance is a specific concrete occurrence (tuple/record)." },
            q3: { ans: "A", expl: "A Weak Entity is depicted by a Double Rectangle in Chen notation." },
            q4: { ans: "C", expl: "Age is a derived attribute because it is calculated dynamically from DateOfBirth and CURRENT_DATE." },
            q5: { ans: "B", expl: "Grade only exists when a specific student associates with a specific course; placing it on student would violate 1NF and create multivalued columns." }
        },
        "topic2": {
            q1: { ans: "B", expl: "A candidate key is a minimal superkey: no proper subset can be discarded without losing unique identification." },
            q2: { ans: "B", expl: "Candidate keys not chosen as the Primary Key are formally classified as Alternate Keys." },
            q3: { ans: "B", expl: "A Multivalued Attribute is represented by a Double Oval (concentrical ellipses) in Chen notation." },
            q4: { ans: "B", expl: "Derived attributes change over time (e.g. as birthdays pass); storing them causes update anomalies and data staleness." },
            q5: { ans: "C", expl: "In an M:N enrollment relation, neither StudentID nor CourseID is unique alone; a Composite Primary Key (StudentID, CourseID) is required." }
        },
        "topic3": {
            q1: { ans: "B", expl: "The degree of a relationship is defined as the number of participating entity types in the relationship set." },
            q2: { ans: "B", expl: "When an entity type participates in a relationship with itself, it is a Unary (Recursive) relationship." },
            q3: { ans: "B", expl: "Role names (e.g. Mentor vs Mentee) distinguish the functional roles played by instances of the same entity set." },
            q4: { ans: "B", expl: "Decomposing ternary relationships into three binaries causes semantic loss, allowing false inference of simultaneous associations." },
            q5: { ans: "B", expl: "Recursive 1:N relationships are implemented in MySQL as a self-referencing foreign key column (e.g. manager_id REFERENCES employees)." }
        },
        "topic4": {
            q1: { ans: "B", expl: "Department to Instructor is One-to-Many (1:N): one department employs many instructors, each instructor belongs to one." },
            q2: { ans: "B", expl: "In a 1:N relationship, the Foreign Key must always be placed on the 'Many' (N) side table." },
            q3: { ans: "B", expl: "Storing multiple course IDs inside a single student row creates multivalued repeating groups, violating 1NF." },
            q4: { ans: "B", expl: "A UNIQUE constraint on the foreign key column ensures that no two instructors can reference the same department in 1:1." },
            q5: { ans: "B", expl: "Maximum Cardinality defines the upper bound on the number of relationship instances an entity can enter." }
        },
        "topic5": {
            q1: { ans: "B", expl: "Total Participation is represented by a Double Line (====) connecting the entity to the diamond in Chen notation." },
            q2: { ans: "B", expl: "If every course must belong to a department, min = 1 (mandatory participation)." },
            q3: { ans: "A", expl: "Total participation is enforced in SQL by specifying NOT NULL on the foreign key column." },
            q4: { ans: "B", expl: "Since freshmen can exist before enrolling, their participation is Partial (optional, min = 0)." },
            q5: { ans: "A", expl: "Participation constraints depend strictly on organizational business policy and enterprise workflow, not universal math." }
        },
        "topic6": {
            q1: { ans: "B", expl: "A Partial Key (discriminator) is represented by a Dashed Underline inside the attribute oval in Chen notation." },
            q2: { ans: "B", expl: "A weak entity table's Primary Key is formed by combining the owner's primary key (as a foreign key) with the partial key." },
            q3: { ans: "B", expl: "An Identifying Relationship is represented by a Double Diamond in Chen notation." },
            q4: { ans: "B", expl: "Under existence dependency, deleting an owner employee must trigger ON DELETE CASCADE to remove dependents." },
            q5: { ans: "B", expl: "In physical SQL, weak entities are implemented as normal tables using composite keys and foreign keys; there is no special 'weak' SQL keyword." }
        },
        "topic7": {
            q1: { ans: "B", expl: "Specialization is a top-down design process identifying sub-groupings (subclasses) within a superclass." },
            q2: { ans: "B", expl: "The Disjoint constraint ('d') specifies that an entity can belong to at most one subclass." },
            q3: { ans: "A", expl: "Total Specialization specifies that every superclass entity must belong to at least one subclass." },
            q4: { ans: "B", expl: "When an entity can simultaneously belong to multiple subclasses, it is an Overlapping Specialization ('o')." },
            q5: { ans: "A", expl: "Aggregation treats a relationship (with its participating entities) as a higher-level composite entity that can enter other relationships." }
        },
        "topic8": {
            q1: { ans: "B", expl: "Multivalued attributes are mapped into a separate table containing the attribute value and the owner's PK as a foreign key." },
            q2: { ans: "B", expl: "Placing the foreign key in the table with Total Participation ensures that the FK column will never contain NULL values." },
            q3: { ans: "C", expl: "Relationship attributes in an M:N relationship are placed in the junction table (ENROLLMENT) alongside both foreign keys." },
            q4: { ans: "A", expl: "Composite attributes are flattened so that each atomic sub-component becomes a separate column." },
            q5: { ans: "B", expl: "Ternary relationship mapping forms the primary key from the combination of foreign keys from all three participating entities." }
        },
        "topic9": {
            q1: { ans: "B", expl: "The Degree (or arity) of a relation is the total number of attributes (columns) in its relation schema." },
            q2: { ans: "B", expl: "Entity Integrity states that no primary key attribute can ever contain a NULL value." },
            q3: { ans: "A", expl: "Mathematical relations are strict sets (no duplicates), whereas SQL tables are multisets/bags allowing duplicates unless constrained." },
            q4: { ans: "B", expl: "Referential integrity requires that foreign key values must exist in the parent relation or be NULL." },
            q5: { ans: "C", expl: "In SQL 3-valued logic, comparing NULL to anything with '=' evaluates to UNKNOWN." }
        },
        "topic10": {
            q1: { ans: "B", expl: "In classical relational algebra, projection strictly eliminates duplicate tuples to preserve mathematical set semantics." },
            q2: { ans: "B", expl: "Union Compatibility requires identical degree and compatible attribute domains between the two relations." },
            q3: { ans: "B", expl: "Cardinality of Cartesian Product = |R| × |S| = 4 × 5 = 20 tuples." },
            q4: { ans: "B", expl: "Relational division answers universal quantification queries ('find entities associated with ALL items in the divisor')." },
            q5: { ans: "B", expl: "Natural Join is formally defined as selection on equality of common attributes over Cartesian product, with duplicates projected out." }
        }
    };

    // ====================================================================
    // 3. INITIALIZATION & TOPIC NAVIGATION
    // ====================================================================
    initNavigation();
    initQuizHandlers();
    initRelationalAlgebraLab();
    initErDiagramBuilder();
    syncProgressWithBackend();

    function initNavigation() {
        // Parse topic from query params
        const urlParams = new URLSearchParams(window.location.search);
        const requestedTopic = urlParams.get("topic");
        if (requestedTopic) {
            const aliasMap = {
                "er-intro": "topic1", "attributes-keys": "topic2", "relationships": "topic3",
                "cardinality": "topic4", "participation": "topic5", "weak-entities": "topic6",
                "extended-er": "topic7", "er-mapping": "topic8", "relational-fundamentals": "topic9",
                "relational-algebra": "topic10"
            };
            const mapped = aliasMap[requestedTopic.toLowerCase()] || requestedTopic.toLowerCase();
            if (TOPIC_NAMES[mapped]) {
                currentTopic = mapped;
            }
        }

        switchTopic(currentTopic, false);

        // Tab click listeners
        document.querySelectorAll(".phase6-nav-tab").forEach(tab => {
            tab.addEventListener("click", function () {
                const target = this.getAttribute("data-target");
                if (target) switchTopic(target, true);
            });
        });

        // Pill click listeners
        document.querySelectorAll(".topic-progress-pill").forEach(pill => {
            pill.addEventListener("click", function () {
                const target = this.getAttribute("data-target");
                if (target) switchTopic(target, true);
            });
        });

        // Bottom Nav Prev/Next Buttons
        const btnPrev = document.getElementById("btn-prev-lesson");
        const btnNext = document.getElementById("btn-next-lesson");

        if (btnPrev) {
            btnPrev.addEventListener("click", function () {
                const topicIdx = parseInt(currentTopic.replace("topic", ""), 10);
                if (topicIdx > 1) {
                    switchTopic(`topic${topicIdx - 1}`, true);
                }
            });
        }

        if (btnNext) {
            btnNext.addEventListener("click", function () {
                const topicIdx = parseInt(currentTopic.replace("topic", ""), 10);
                if (topicIdx < TOTAL_TOPICS) {
                    switchTopic(`topic${topicIdx + 1}`, true);
                }
            });
        }

        // Start reading button
        const btnStart = document.getElementById("btn-start-reading");
        if (btnStart) {
            btnStart.addEventListener("click", () => switchTopic("topic1", true));
        }

        // Universal Jump to ER builder handler
        function openErBuilder() {
            switchTopic("topic10", true);
            setTimeout(() => {
                const sec = document.getElementById("interactive-er-builder-section");
                if (sec) {
                    sec.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                renderErDiagramCanvas();
            }, 120);
        }

        document.querySelectorAll("#btn-jump-er-builder, #btn-header-open-builder, .btn-open-er-builder").forEach(btn => {
            btn.addEventListener("click", function (e) {
                e.preventDefault();
                openErBuilder();
            });
        });

        // Auto jump to builder if requested via hash or param
        if (window.location.hash.includes("builder") || urlParams.get("builder") === "true" || urlParams.get("tool") === "builder") {
            setTimeout(openErBuilder, 200);
        }

        // Reset progress button
        const btnResetProg = document.getElementById("btn-reset-phase6-progress");
        if (btnResetProg) {
            btnResetProg.addEventListener("click", function () {
                if (confirm("Are you sure you want to reset all Phase 6 progress and quiz scores?")) {
                    localStorage.removeItem("dbms_phase6_progress");
                    progressState = {};
                    updateUIProgress();
                    showToast("Phase 6 progress reset successfully.");
                }
            });
        }
    }

    function switchTopic(topicId, updateHistory) {
        if (!TOPIC_NAMES[topicId]) topicId = "topic1";
        currentTopic = topicId;

        // Hide all topic panels
        document.querySelectorAll(".topic-section-panel").forEach(panel => {
            panel.classList.add("d-none");
        });

        // Show active topic panel
        const targetPanel = document.getElementById(`topic-container-${topicId}`);
        if (targetPanel) {
            targetPanel.classList.remove("d-none");
        }

        // Update tab styling
        document.querySelectorAll(".phase6-nav-tab").forEach(tab => {
            if (tab.getAttribute("data-target") === topicId) {
                tab.classList.add("active");
                tab.classList.remove("text-secondary");
            } else {
                tab.classList.remove("active");
                tab.classList.add("text-secondary");
            }
        });

        // Update pills
        document.querySelectorAll(".topic-progress-pill").forEach(pill => {
            if (pill.getAttribute("data-target") === topicId) {
                pill.classList.add("active-pill", "border-success");
            } else {
                pill.classList.remove("active-pill", "border-success");
            }
        });

        // Update bottom indicator & buttons
        const topicIdx = parseInt(topicId.replace("topic", ""), 10);
        const indicator = document.getElementById("lesson-indicator-text");
        if (indicator) {
            indicator.textContent = `${TOPIC_NAMES[topicId]}`;
        }

        const btnPrev = document.getElementById("btn-prev-lesson");
        const btnNext = document.getElementById("btn-next-lesson");
        if (btnPrev) btnPrev.disabled = (topicIdx === 1);
        if (btnNext) {
            if (topicIdx < TOTAL_TOPICS) {
                btnNext.disabled = false;
                btnNext.innerHTML = `Next: ${TOPIC_NAMES['topic' + (topicIdx + 1)].split(':')[1]} <i class="bi bi-chevron-right ms-1"></i>`;
            } else {
                btnNext.disabled = true;
                btnNext.innerHTML = `Module Completed <i class="bi bi-check-all ms-1"></i>`;
            }
        }

        // Update URL query parameter
        if (updateHistory) {
            const newUrl = `${window.location.pathname}?topic=${topicId}`;
            window.history.replaceState({ topic: topicId }, "", newUrl);
            const topicNav = document.getElementById("topics-navigation");
            if (topicNav) topicNav.scrollIntoView({ behavior: "smooth" });
        }

        // If topic 10, trigger render of ER builder canvas
        if (topicId === "topic10") {
            setTimeout(renderErDiagramCanvas, 50);
        }
    }

    // ====================================================================
    // 4. PROGRESS TRACKING & BACKEND SYNC
    // ====================================================================
    function loadLocalProgress() {
        try {
            return JSON.parse(localStorage.getItem("dbms_phase6_progress")) || {};
        } catch (e) {
            return {};
        }
    }

    function saveLocalProgress(state) {
        try {
            localStorage.setItem("dbms_phase6_progress", JSON.stringify(state));
        } catch (e) {}
    }

    function updateUIProgress() {
        let completedCount = 0;
        for (let i = 1; i <= TOTAL_TOPICS; i++) {
            const key = `topic${i}`;
            const item = progressState[key] || { completed: false, score: 0 };
            const pill = document.getElementById(`pill-progress-${key}`);
            const scoreLabel = document.getElementById(`quiz-status-${key}`);

            if (item.completed) {
                completedCount++;
                if (pill) {
                    pill.classList.add("bg-success-subtle", "border-success");
                    const icon = pill.querySelector(".status-icon");
                    if (icon) {
                        icon.className = "bi bi-check-circle-fill text-success me-1 status-icon";
                    }
                }
            } else if (pill) {
                pill.classList.remove("bg-success-subtle", "border-success");
                const icon = pill.querySelector(".status-icon");
                if (icon) {
                    icon.className = "bi bi-circle text-muted me-1 status-icon";
                }
            }

            if (scoreLabel) {
                scoreLabel.textContent = `Quiz: ${item.score || 0}/5`;
                if ((item.score || 0) >= 3) {
                    scoreLabel.className = "d-block text-success fw-bold";
                }
            }
        }

        const pct = Math.round((completedCount / TOTAL_TOPICS) * 100);
        const progressBar = document.getElementById("master-progress-bar");
        const badge = document.getElementById("progress-percentage-badge");

        if (progressBar) progressBar.style.width = `${pct}%`;
        if (badge) badge.textContent = `${pct}% Complete (${completedCount}/${TOTAL_TOPICS})`;
    }

    async function syncProgressWithBackend() {
        updateUIProgress();
        try {
            const res = await fetch("/api/progress/phase6");
            const data = await res.json();
            if (data.success && Array.isArray(data.progress)) {
                data.progress.forEach(row => {
                    const cleanKey = row.lesson_id.replace("topic_", "topic");
                    if (TOPIC_NAMES[cleanKey]) {
                        progressState[cleanKey] = {
                            completed: Boolean(row.completed),
                            score: row.quiz_score || 0
                        };
                    }
                });
                saveLocalProgress(progressState);
                updateUIProgress();
            }
        } catch (e) {
            console.warn("Could not sync Phase 6 progress with backend:", e);
        }
    }

    async function saveLessonProgress(lessonId, score, completed) {
        progressState[lessonId] = {
            score: score,
            completed: completed || score >= 3
        };
        saveLocalProgress(progressState);
        updateUIProgress();

        try {
            await fetch("/api/progress/phase6", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lesson_id: lessonId,
                    quiz_score: score,
                    quiz_max_score: 5,
                    completed: completed || score >= 3
                })
            });
        } catch (e) {
            console.warn("Failed saving progress to API:", e);
        }
    }

    // ====================================================================
    // 5. UNIVERSAL QUIZ HANDLER
    // ====================================================================
    function initQuizHandlers() {
        document.querySelectorAll(".btn-submit-quiz").forEach(btn => {
            btn.addEventListener("click", function () {
                const lessonId = this.getAttribute("data-lesson");
                evaluateQuiz(lessonId);
            });
        });

        document.querySelectorAll(".btn-reset-quiz").forEach(btn => {
            btn.addEventListener("click", function () {
                const lessonId = this.getAttribute("data-lesson");
                resetQuiz(lessonId);
            });
        });
    }

    function evaluateQuiz(lessonId) {
        const lessonKeys = QUIZ_DATA[lessonId];
        if (!lessonKeys) return;

        const answeredInputs = document.querySelectorAll(`input[name$="_${lessonId}"]:checked`);
        if (answeredInputs.length === 0) {
            alert("Please select your answer for at least one question before submitting the quiz.");
            return;
        }

        let score = 0;
        let total = Object.keys(lessonKeys).length;

        for (let qKey in lessonKeys) {
            const expected = lessonKeys[qKey].ans;
            const explanation = lessonKeys[qKey].expl;
            const selected = document.querySelector(`input[name="${qKey}_${lessonId}"]:checked`);
            const qCard = document.getElementById(`${qKey}-card-${lessonId}`);
            if (!qCard) continue;

            const feedbackDiv = qCard.querySelector(".feedback-msg");
            if (feedbackDiv) {
                feedbackDiv.classList.remove("d-none", "text-success", "text-danger", "text-warning");
                if (selected && selected.value === expected) {
                    score++;
                    feedbackDiv.classList.add("text-success");
                    feedbackDiv.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i><strong>Correct!</strong> ${explanation}`;
                    qCard.classList.add("border-success");
                    qCard.classList.remove("border-danger", "border-warning");
                } else if (selected) {
                    feedbackDiv.classList.add("text-danger");
                    feedbackDiv.innerHTML = `<i class="bi bi-x-circle-fill me-1"></i><strong>Incorrect (You chose Option ${selected.value}).</strong> Correct is <strong>Option ${expected}</strong>. ${explanation}`;
                    qCard.classList.add("border-danger");
                    qCard.classList.remove("border-success", "border-warning");
                } else {
                    feedbackDiv.classList.add("text-warning");
                    feedbackDiv.innerHTML = `<i class="bi bi-exclamation-circle-fill me-1"></i><strong>Unanswered.</strong> Correct answer is <strong>Option ${expected}</strong>. ${explanation}`;
                    qCard.classList.add("border-warning");
                    qCard.classList.remove("border-success", "border-danger");
                }
            }
        }

        const isPassed = score >= 3;
        saveLessonProgress(lessonId, score, isPassed);

        const submitBtn = document.querySelector(`.btn-submit-quiz[data-lesson="${lessonId}"]`);
        const retryBtn = document.querySelector(`.btn-reset-quiz[data-lesson="${lessonId}"]`);
        if (submitBtn) {
            submitBtn.innerHTML = `<i class="bi bi-arrow-repeat me-1"></i> Re-submit Answers (Score: ${score}/${total})`;
            submitBtn.classList.remove("btn-gfg");
            submitBtn.classList.add(isPassed ? "btn-success" : "btn-outline-primary");
        }
        if (retryBtn) retryBtn.classList.remove("d-none");

        showToast(`Quiz completed: ${score}/${total}. ${isPassed ? "Passed!" : "Review explanations and retry."}`);
    }

    function resetQuiz(lessonId) {
        document.querySelectorAll(`input[name^="q"][name$="_${lessonId}"]`).forEach(input => {
            input.checked = false;
        });

        document.querySelectorAll(`.lesson-quiz-block[data-lesson="${lessonId}"] .quiz-question-card`).forEach(card => {
            card.classList.remove("border-success", "border-danger", "border-warning");
            const fb = card.querySelector(".feedback-msg");
            if (fb) fb.classList.add("d-none");
        });

        const submitBtn = document.querySelector(`.btn-submit-quiz[data-lesson="${lessonId}"]`);
        const retryBtn = document.querySelector(`.btn-reset-quiz[data-lesson="${lessonId}"]`);
        if (submitBtn) {
            submitBtn.innerHTML = `<i class="bi bi-check-circle me-1"></i> Submit Lesson Answers`;
            submitBtn.classList.remove("btn-success", "btn-outline-primary");
            submitBtn.classList.add("btn-gfg");
            submitBtn.classList.remove("d-none");
        }
        if (retryBtn) retryBtn.classList.add("d-none");
    }

    // ====================================================================
    // 6. INTERACTIVE RELATIONAL ALGEBRA LAB
    // ====================================================================
    function initRelationalAlgebraLab() {
        const selectOp = document.getElementById("ra-select-op");
        const selectR1 = document.getElementById("ra-select-r1");
        const selectR2 = document.getElementById("ra-select-r2");
        const groupR2 = document.getElementById("ra-group-r2");
        const groupParam = document.getElementById("ra-group-param");
        const paramLabel = document.getElementById("ra-param-label");
        const paramInput = document.getElementById("ra-param-input");
        const btnExecute = document.getElementById("btn-ra-execute");
        const btnReset = document.getElementById("btn-ra-reset");

        if (!selectOp) return;

        function updateLabForm() {
            const op = selectOp.value;
            // Handle binary vs unary
            const binaryOps = ["natural_join", "equi_join", "union", "difference", "intersection", "cartesian", "division", "left_outer_join"];
            if (binaryOps.includes(op)) {
                if (groupR2) groupR2.classList.remove("d-none");
            } else {
                if (groupR2) groupR2.classList.add("d-none");
            }

            // Handle param input
            if (op === "select") {
                if (groupParam) groupParam.classList.remove("d-none");
                if (paramLabel) paramLabel.textContent = "Condition Predicate (WHERE):";
                if (paramInput) paramInput.placeholder = "e.g. DepartmentID = 10";
            } else if (op === "project") {
                if (groupParam) groupParam.classList.remove("d-none");
                if (paramLabel) paramLabel.textContent = "Attributes (Columns to keep):";
                if (paramInput) paramInput.placeholder = "e.g. StudentName, DepartmentID";
            } else if (op === "equi_join") {
                if (groupParam) groupParam.classList.remove("d-none");
                if (paramLabel) paramLabel.textContent = "Join Condition:";
                if (paramInput) paramInput.placeholder = "e.g. STUDENT.DepartmentID = DEPARTMENT.DepartmentID";
            } else if (op === "rename") {
                if (groupParam) groupParam.classList.remove("d-none");
                if (paramLabel) paramLabel.textContent = "Rename Map (Old -> New):";
                if (paramInput) paramInput.placeholder = "e.g. StudentID -> RollNo";
            } else {
                if (groupParam) groupParam.classList.add("d-none");
            }
        }

        selectOp.addEventListener("change", updateLabForm);
        updateLabForm();

        // Preset buttons
        document.querySelectorAll(".btn-ra-preset").forEach(btn => {
            btn.addEventListener("click", function () {
                const op = this.getAttribute("data-op");
                const r1 = this.getAttribute("data-r1");
                const r2 = this.getAttribute("data-r2");
                const param = this.getAttribute("data-param") || "";

                if (selectOp) selectOp.value = op;
                if (selectR1) selectR1.value = r1;
                if (r2 && selectR2) selectR2.value = r2;
                if (paramInput) paramInput.value = param;

                updateLabForm();
                executeRelationalAlgebra();
            });
        });

        if (btnExecute) {
            btnExecute.addEventListener("click", executeRelationalAlgebra);
        }

        if (btnReset) {
            btnReset.addEventListener("click", function () {
                if (selectOp) selectOp.value = "select";
                if (selectR1) selectR1.value = "STUDENT";
                if (selectR2) selectR2.value = "DEPARTMENT";
                if (paramInput) paramInput.value = "DepartmentID = 10";
                updateLabForm();
                const resCard = document.getElementById("ra-result-card");
                if (resCard) resCard.classList.add("d-none");
                showToast("Relational Algebra Lab reset.");
            });
        }
    }

    async function executeRelationalAlgebra() {
        const op = document.getElementById("ra-select-op").value;
        const r1 = document.getElementById("ra-select-r1").value;
        const r2 = document.getElementById("ra-select-r2").value;
        const paramVal = (document.getElementById("ra-param-input").value || "").trim();

        const payload = {
            operator: op,
            relation1: r1,
            relation2: r2
        };

        if (op === "select") {
            payload.condition = paramVal || "DepartmentID = 10";
        } else if (op === "project") {
            payload.attributes = paramVal || "StudentName, DepartmentID";
        } else if (op === "equi_join") {
            payload.condition = paramVal || "STUDENT.DepartmentID = DEPARTMENT.DepartmentID";
        } else if (op === "rename") {
            payload.rename_map = paramVal || "StudentID -> RollNo";
        }

        try {
            const res = await fetch("/api/relational-algebra/eval", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            const resCard = document.getElementById("ra-result-card");
            if (!resCard) return;

            if (!data.success) {
                alert(`Relational Algebra Evaluation Error:\n${data.error}`);
                return;
            }

            resCard.classList.remove("d-none");

            // Fill notation & stats
            document.getElementById("ra-res-badge").textContent = data.operator || op;
            document.getElementById("ra-res-notation").textContent = data.notation || "";
            document.getElementById("ra-res-stats").textContent = `Cardinality (|R|): ${data.cardinality} tuples • Degree: ${data.degree} columns`;

            // Build Table Headers
            const thead = document.getElementById("ra-result-thead");
            const tbody = document.getElementById("ra-result-tbody");
            thead.innerHTML = "";
            tbody.innerHTML = "";

            const trHead = document.createElement("tr");
            (data.columns || []).forEach(col => {
                const th = document.createElement("th");
                th.textContent = col;
                trHead.appendChild(th);
            });
            thead.appendChild(trHead);

            // Build Table Rows
            if (!data.rows || data.rows.length === 0) {
                const emptyTr = document.createElement("tr");
                const td = document.createElement("td");
                td.colSpan = data.columns ? data.columns.length : 1;
                td.className = "text-muted py-3";
                td.textContent = "(Empty set: No tuples satisfied the relational operation)";
                emptyTr.appendChild(td);
                tbody.appendChild(emptyTr);
            } else {
                data.rows.forEach(row => {
                    const tr = document.createElement("tr");
                    data.columns.forEach(col => {
                        const td = document.createElement("td");
                        const val = row[col];
                        td.textContent = val === null ? "NULL" : val;
                        if (val === null) td.className = "text-muted fst-italic";
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                });
            }

            // Fill Step by step
            document.getElementById("ra-res-explanation").textContent = data.explanation || "";
            const stepsList = document.getElementById("ra-res-steps");
            stepsList.innerHTML = "";
            (data.step_by_step || []).forEach(step => {
                const li = document.createElement("li");
                li.textContent = step;
                stepsList.appendChild(li);
            });

            resCard.scrollIntoView({ behavior: "smooth" });
        } catch (e) {
            alert(`Execution failed: ${e.message}`);
        }
    }

    // ====================================================================
    // 7. INTERACTIVE ER DIAGRAM BUILDER & SCHEMA GENERATOR
    // ====================================================================
    // Default starting college management system graph model
    let erModel = {
        entities: [
            { id: "e1", name: "STUDENT", isWeak: false, x: 80, y: 150 },
            { id: "e2", name: "DEPARTMENT", isWeak: false, x: 350, y: 150 },
            { id: "e3", name: "COURSE", isWeak: false, x: 580, y: 150 }
        ],
        attributes: [
            { id: "a1", entityId: "e1", name: "StudentID", type: "key" },
            { id: "a2", entityId: "e1", name: "StudentName", type: "simple" },
            { id: "a3", entityId: "e1", name: "GPA", type: "simple" },
            { id: "a4", entityId: "e2", name: "DepartmentID", type: "key" },
            { id: "a5", entityId: "e2", name: "DepartmentName", type: "simple" },
            { id: "a6", entityId: "e3", name: "CourseID", type: "key" },
            { id: "a7", entityId: "e3", name: "CourseName", type: "simple" }
        ],
        relationships: [
            { id: "r1", name: "Belongs_To", e1Id: "e1", e2Id: "e2", cardinality: "N:1", participation: "total" },
            { id: "r2", name: "Offers", e1Id: "e2", e2Id: "e3", cardinality: "1:N", participation: "total" }
        ]
    };

    function initErDiagramBuilder() {
        populateBuilderSelects();
        renderErDiagramCanvas();

        const btnAddEntity = document.getElementById("btn-builder-add-entity");
        const btnAddAttr = document.getElementById("btn-builder-add-attr");
        const btnAddRel = document.getElementById("btn-builder-add-rel");
        const btnGenerateSchema = document.getElementById("btn-builder-generate-schema");
        const btnResetAll = document.getElementById("btn-builder-reset-all");

        if (btnAddEntity) {
            btnAddEntity.addEventListener("click", function () {
                const nameInput = document.getElementById("builder-entity-name");
                const isWeak = document.getElementById("builder-entity-is-weak").checked;
                const name = (nameInput.value || "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");

                if (!name) {
                    alert("Please provide a valid alphanumeric Entity name.");
                    return;
                }
                if (erModel.entities.some(e => e.name === name)) {
                    alert(`Entity '${name}' already exists.`);
                    return;
                }

                // Place dynamically across canvas
                const nextX = 80 + (erModel.entities.length * 150) % 550;
                const nextY = 150 + ((erModel.entities.length % 2) * 50);

                erModel.entities.push({
                    id: `e_${Date.now()}`,
                    name: name,
                    isWeak: isWeak,
                    x: nextX,
                    y: nextY
                });

                nameInput.value = "";
                document.getElementById("builder-entity-is-weak").checked = false;
                populateBuilderSelects();
                renderErDiagramCanvas();
                showToast(`Entity '${name}' added.`);
            });
        }

        if (btnAddAttr) {
            btnAddAttr.addEventListener("click", function () {
                const targetEntityId = document.getElementById("builder-attr-target").value;
                const attrNameInput = document.getElementById("builder-attr-name");
                const attrType = document.getElementById("builder-attr-type").value;
                const attrName = (attrNameInput.value || "").trim().replace(/[^a-zA-Z0-9_]/g, "");

                if (!targetEntityId || !attrName) {
                    alert("Select an entity and provide an attribute name.");
                    return;
                }

                erModel.attributes.push({
                    id: `a_${Date.now()}`,
                    entityId: targetEntityId,
                    name: attrName,
                    type: attrType
                });

                attrNameInput.value = "";
                renderErDiagramCanvas();
                showToast(`Attribute '${attrName}' attached.`);
            });
        }

        if (btnAddRel) {
            btnAddRel.addEventListener("click", function () {
                const relNameInput = document.getElementById("builder-rel-name");
                const e1Id = document.getElementById("builder-rel-e1").value;
                const e2Id = document.getElementById("builder-rel-e2").value;
                const card = document.getElementById("builder-rel-card").value;
                const part = document.getElementById("builder-rel-part").value;
                const relName = (relNameInput.value || "").trim().replace(/[^a-zA-Z0-9_]/g, "") || "Relates";

                if (!e1Id || !e2Id || e1Id === e2Id) {
                    alert("Select two distinct entities for the relationship.");
                    return;
                }

                erModel.relationships.push({
                    id: `r_${Date.now()}`,
                    name: relName,
                    e1Id: e1Id,
                    e2Id: e2Id,
                    cardinality: card,
                    participation: part
                });

                relNameInput.value = "";
                renderErDiagramCanvas();
                showToast(`Relationship '${relName}' connected.`);
            });
        }

        if (btnGenerateSchema) {
            btnGenerateSchema.addEventListener("click", generateRelationalSchemaFromModel);
        }

        if (btnResetAll) {
            btnResetAll.addEventListener("click", function () {
                erModel = {
                    entities: [
                        { id: "e1", name: "STUDENT", isWeak: false, x: 80, y: 150 },
                        { id: "e2", name: "DEPARTMENT", isWeak: false, x: 350, y: 150 },
                        { id: "e3", name: "COURSE", isWeak: false, x: 580, y: 150 }
                    ],
                    attributes: [
                        { id: "a1", entityId: "e1", name: "StudentID", type: "key" },
                        { id: "a2", entityId: "e1", name: "StudentName", type: "simple" },
                        { id: "a3", entityId: "e1", name: "GPA", type: "simple" },
                        { id: "a4", entityId: "e2", name: "DepartmentID", type: "key" },
                        { id: "a5", entityId: "e2", name: "DepartmentName", type: "simple" },
                        { id: "a6", entityId: "e3", name: "CourseID", type: "key" },
                        { id: "a7", entityId: "e3", name: "CourseName", type: "simple" }
                    ],
                    relationships: [
                        { id: "r1", name: "Belongs_To", e1Id: "e1", e2Id: "e2", cardinality: "N:1", participation: "total" },
                        { id: "r2", name: "Offers", e1Id: "e2", e2Id: "e3", cardinality: "1:N", participation: "total" }
                    ]
                };
                populateBuilderSelects();
                renderErDiagramCanvas();
                const output = document.getElementById("builder-schema-output");
                if (output) output.textContent = "-- Reset to default college model. Click 'Generate Relational Schema' to view SQL tables.";
                showToast("Default College ER Model restored.");
            });
        }
    }

    function populateBuilderSelects() {
        const selTarget = document.getElementById("builder-attr-target");
        const selE1 = document.getElementById("builder-rel-e1");
        const selE2 = document.getElementById("builder-rel-e2");
        const countBadge = document.getElementById("builder-entity-count");

        if (countBadge) countBadge.textContent = `${erModel.entities.length} Entities`;

        [selTarget, selE1, selE2].forEach(sel => {
            if (!sel) return;
            sel.innerHTML = "";
            erModel.entities.forEach(ent => {
                const opt = document.createElement("option");
                opt.value = ent.id;
                opt.textContent = `${ent.name} ${ent.isWeak ? "(Weak)" : ""}`;
                sel.appendChild(opt);
            });
        });

        if (selE2 && selE2.options.length > 1) {
            selE2.selectedIndex = 1;
        }
    }

    function renderErDiagramCanvas() {
        const svg = document.getElementById("er-builder-svg");
        const activeElemBadge = document.getElementById("builder-active-elements");
        if (!svg) return;

        svg.innerHTML = "";
        if (activeElemBadge) {
            activeElemBadge.textContent = `${erModel.entities.length} Entities, ${erModel.relationships.length} Relationships`;
        }

        // Dynamically compute layout positions for entities
        const count = erModel.entities.length;
        const width = 700;
        const spacing = width / (count + 1);

        erModel.entities.forEach((ent, idx) => {
            ent.x = spacing * (idx + 1);
            ent.y = 150 + ((idx % 2 === 0 ? 0 : 30));
        });

        // 1. Render Relationships & Connecting Lines
        erModel.relationships.forEach(rel => {
            const e1 = erModel.entities.find(e => e.id === rel.e1Id);
            const e2 = erModel.entities.find(e => e.id === rel.e2Id);
            if (!e1 || !e2) return;

            const midX = (e1.x + e2.x) / 2;
            const midY = (e1.y + e2.y) / 2 - 20;

            // Connection Lines
            const isTotal = (rel.participation === "total");
            if (isTotal) {
                // Double line for total participation
                const line1 = createSvgElement("line", { x1: e1.x, y1: e1.y - 2, x2: midX, y2: midY - 2, stroke: "#333", "stroke-width": 1.5 });
                const line2 = createSvgElement("line", { x1: e1.x, y1: e1.y + 2, x2: midX, y2: midY + 2, stroke: "#333", "stroke-width": 1.5 });
                svg.appendChild(line1);
                svg.appendChild(line2);
            } else {
                const line = createSvgElement("line", { x1: e1.x, y1: e1.y, x2: midX, y2: midY, stroke: "#333", "stroke-width": 2 });
                svg.appendChild(line);
            }

            const lineToE2 = createSvgElement("line", { x1: midX, y1: midY, x2: e2.x, y2: e2.y, stroke: "#333", "stroke-width": 2 });
            svg.appendChild(lineToE2);

            // Cardinality Label
            const cardText = createSvgElement("text", {
                x: (midX + e2.x) / 2,
                y: (midY + e2.y) / 2 - 8,
                "font-size": 11,
                "font-weight": "bold",
                fill: "#d32f2f",
                "text-anchor": "middle"
            });
            cardText.textContent = rel.cardinality;
            svg.appendChild(cardText);

            // Diamond Symbol (Double Diamond if either entity is weak)
            const isWeakRel = (e1.isWeak || e2.isWeak);
            const diamondPoints = `${midX},${midY - 22} ${midX + 35},${midY} ${midX},${midY + 22} ${midX - 35},${midY}`;
            const diamond = createSvgElement("polygon", {
                points: diamondPoints,
                fill: "#e3f2fd",
                stroke: "#1565c0",
                "stroke-width": 2
            });
            svg.appendChild(diamond);

            if (isWeakRel) {
                const innerPoints = `${midX},${midY - 17} ${midX + 28},${midY} ${midX},${midY + 17} ${midX - 28},${midY}`;
                const innerDiamond = createSvgElement("polygon", {
                    points: innerPoints,
                    fill: "none",
                    stroke: "#1565c0",
                    "stroke-width": 1.5
                });
                svg.appendChild(innerDiamond);
            }

            const relLabel = createSvgElement("text", {
                x: midX,
                y: midY + 4,
                "font-size": 10,
                "font-weight": "bold",
                fill: "#0d47a1",
                "text-anchor": "middle"
            });
            relLabel.textContent = rel.name;
            svg.appendChild(relLabel);
        });

        // 2. Render Entities and their Attributes
        erModel.entities.forEach(ent => {
            // Draw Entity Box
            const boxW = 100;
            const boxH = 44;
            const rx = ent.x - boxW / 2;
            const ry = ent.y - boxH / 2;

            if (ent.isWeak) {
                const outerRect = createSvgElement("rect", {
                    x: rx - 3, y: ry - 3, width: boxW + 6, height: boxH + 6,
                    fill: "#fff3e0", stroke: "#e65100", "stroke-width": 2, rx: 4
                });
                const innerRect = createSvgElement("rect", {
                    x: rx, y: ry, width: boxW, height: boxH,
                    fill: "none", stroke: "#e65100", "stroke-width": 1.5, rx: 3
                });
                svg.appendChild(outerRect);
                svg.appendChild(innerRect);
            } else {
                const rect = createSvgElement("rect", {
                    x: rx, y: ry, width: boxW, height: boxH,
                    fill: "#e8f5e9", stroke: "#2e7d32", "stroke-width": 2, rx: 4
                });
                svg.appendChild(rect);
            }

            const text = createSvgElement("text", {
                x: ent.x, y: ent.y + 5,
                "font-size": 12, "font-weight": "bold",
                fill: ent.isWeak ? "#e65100" : "#1b5e20",
                "text-anchor": "middle"
            });
            text.textContent = ent.name;
            svg.appendChild(text);

            // Draw Attached Attributes as Ovals
            const attrs = erModel.attributes.filter(a => a.entityId === ent.id);
            attrs.forEach((attr, aIdx) => {
                const angle = -140 + (aIdx * (280 / Math.max(attrs.length - 1, 1)));
                const rad = (angle * Math.PI) / 180;
                const dist = 65 + (aIdx % 2) * 20;
                const ax = ent.x + dist * Math.cos(rad);
                const ay = ent.y - Math.abs(dist * Math.sin(rad));

                // Connector line
                const line = createSvgElement("line", {
                    x1: ent.x, y1: ry, x2: ax, y2: ay + 8,
                    stroke: "#777", "stroke-width": 1.2
                });
                svg.appendChild(line);

                // Attribute Oval
                const ovalParams = {
                    cx: ax, cy: ay, rx: 32, ry: 15,
                    fill: "#ffffff", stroke: "#333", "stroke-width": 1.5
                };
                if (attr.type === "derived") {
                    ovalParams["stroke-dasharray"] = "3,2";
                }

                const oval = createSvgElement("ellipse", ovalParams);
                svg.appendChild(oval);

                if (attr.type === "multivalued") {
                    const innerOval = createSvgElement("ellipse", {
                        cx: ax, cy: ay, rx: 27, ry: 11,
                        fill: "none", stroke: "#333", "stroke-width": 1.2
                    });
                    svg.appendChild(innerOval);
                }

                // Attribute Label
                const label = createSvgElement("text", {
                    x: ax, y: ay + 4,
                    "font-size": 9,
                    "font-weight": attr.type === "key" ? "bold" : "normal",
                    fill: "#000",
                    "text-anchor": "middle",
                    "text-decoration": attr.type === "key" ? "underline" : "none"
                });
                label.textContent = attr.name;
                svg.appendChild(label);
            });
        });
    }

    function createSvgElement(tag, attrs) {
        const elem = document.createElementNS("http://www.w3.org/2000/svg", tag);
        for (let k in attrs) {
            elem.setAttribute(k, attrs[k]);
        }
        return elem;
    }

    function generateRelationalSchemaFromModel() {
        const output = document.getElementById("builder-schema-output");
        if (!output) return;

        let ddlStatements = [];
        let relationalNotation = [];

        // Step 1 & 2 & 3: Map Entities into Relations
        erModel.entities.forEach(ent => {
            const attrs = erModel.attributes.filter(a => a.entityId === ent.id);
            const keyAttrs = attrs.filter(a => a.type === "key");
            const simpleAttrs = attrs.filter(a => a.type === "simple");
            const multiAttrs = attrs.filter(a => a.type === "multivalued");

            let colDefs = [];
            let pkCols = keyAttrs.map(k => k.name.toLowerCase());

            keyAttrs.forEach(k => {
                colDefs.push(`    ${k.name.toLowerCase()} INT NOT NULL`);
            });
            simpleAttrs.forEach(s => {
                colDefs.push(`    ${s.name.toLowerCase()} VARCHAR(100) NOT NULL`);
            });

            // Check if 1:N foreign keys should be added here
            erModel.relationships.forEach(rel => {
                // If this entity is on the N side of a 1:N relationship
                if (rel.cardinality === "1:N" && rel.e2Id === ent.id) {
                    const parent = erModel.entities.find(e => e.id === rel.e1Id);
                    if (parent) {
                        const fkCol = `${parent.name.toLowerCase()}_id`;
                        colDefs.push(`    ${fkCol} INT NOT NULL -- FK from 1:N ${rel.name}`);
                    }
                } else if (rel.cardinality === "N:1" && rel.e1Id === ent.id) {
                    const parent = erModel.entities.find(e => e.id === rel.e2Id);
                    if (parent) {
                        const fkCol = `${parent.name.toLowerCase()}_id`;
                        colDefs.push(`    ${fkCol} INT NOT NULL -- FK from N:1 ${rel.name}`);
                    }
                }
            });

            if (pkCols.length > 0) {
                colDefs.push(`    PRIMARY KEY (${pkCols.join(", ")})`);
            }

            const tableName = ent.name.toLowerCase() + "s";
            ddlStatements.push(`-- Table: ${ent.name} (${ent.isWeak ? "Weak Entity" : "Strong Entity"})\nCREATE TABLE ${tableName} (\n${colDefs.join(",\n")}\n);`);
            relationalNotation.push(`${tableName.toUpperCase()}(<u>${pkCols.join(", ")}</u>${simpleAttrs.length ? ", " + simpleAttrs.map(s => s.name.toLowerCase()).join(", ") : ""})`);

            // Step 7: Handle Multivalued Attributes (Separate Table)
            multiAttrs.forEach(ma => {
                const multiTableName = `${ent.name.toLowerCase()}_${ma.name.toLowerCase()}`;
                const ownerPkCol = pkCols[0] || `${ent.name.toLowerCase()}_id`;
                const maCol = ma.name.toLowerCase();

                ddlStatements.push(`-- Multivalued Attribute Table for ${ma.name}\nCREATE TABLE ${multiTableName} (\n    ${ownerPkCol} INT NOT NULL,\n    ${maCol} VARCHAR(100) NOT NULL,\n    PRIMARY KEY (${ownerPkCol}, ${maCol}),\n    FOREIGN KEY (${ownerPkCol}) REFERENCES ${tableName}(${ownerPkCol}) ON DELETE CASCADE\n);`);
                relationalNotation.push(`${multiTableName.toUpperCase()}(<u>${ownerPkCol}</u>, <u>${maCol}</u>)`);
            });
        });

        // Step 6: Map M:N Relationships into Junction Tables
        erModel.relationships.forEach(rel => {
            if (rel.cardinality === "M:N") {
                const e1 = erModel.entities.find(e => e.id === rel.e1Id);
                const e2 = erModel.entities.find(e => e.id === rel.e2Id);
                if (!e1 || !e2) return;

                const jTableName = `${rel.name.toLowerCase()}_junction`;
                const fk1 = `${e1.name.toLowerCase()}_id`;
                const fk2 = `${e2.name.toLowerCase()}_id`;

                ddlStatements.push(`-- M:N Associative Junction Table: ${rel.name}\nCREATE TABLE ${jTableName} (\n    ${fk1} INT NOT NULL,\n    ${fk2} INT NOT NULL,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    PRIMARY KEY (${fk1}, ${fk2}),\n    FOREIGN KEY (${fk1}) REFERENCES ${e1.name.toLowerCase()}s(${fk1}),\n    FOREIGN KEY (${fk2}) REFERENCES ${e2.name.toLowerCase()}s(${fk2})\n);`);
                relationalNotation.push(`${jTableName.toUpperCase()}(<u>${fk1}</u>, <u>${fk2}</u>, created_at)`);
            }
        });

        const fullOutput = `-- ====================================================================\n` +
            `-- AUTOMATICALLY GENERATED RELATIONAL SCHEMA (MySQL 8 DDL)\n` +
            `-- Generated from Interactive ER Diagram Builder\n` +
            `-- ====================================================================\n\n` +
            `-- Relational Schema Notation:\n` +
            `-- ${relationalNotation.join("\n-- ")}\n\n` +
            ddlStatements.join("\n\n");

        output.textContent = fullOutput;
        showToast("Relational Schema successfully generated!");
    }

    // Helper Toast
    function showToast(msg) {
        const toastElem = document.getElementById("phase6-toast");
        const msgElem = document.getElementById("phase6-toast-message");
        if (toastElem && msgElem && window.bootstrap) {
            msgElem.textContent = msg;
            const toast = new bootstrap.Toast(toastElem, { delay: 3500 });
            toast.show();
        }
    }
});
