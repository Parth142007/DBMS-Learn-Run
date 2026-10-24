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
    // 3. NAVIGATION CONTROLLER
    // ====================================================================

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
    // 7. FUNCTIONAL VISUAL ER DIAGRAM BUILDER & SCHEMA GENERATOR
    // ====================================================================
    const DEFAULT_COLLEGE_MODEL = {
        entities: [
            { id: "e1", name: "STUDENT", isWeak: false, x: 200, y: 170 },
            { id: "e2", name: "DEPARTMENT", isWeak: false, x: 580, y: 170 },
            { id: "e3", name: "COURSE", isWeak: false, x: 200, y: 440 },
            { id: "e4", name: "DEPENDENT", isWeak: true, x: 580, y: 440 }
        ],
        attributes: [
            { id: "a1", entityId: "e1", name: "StudentID", type: "key", parentAttrId: null },
            { id: "a2", entityId: "e1", name: "StudentName", type: "simple", parentAttrId: null },
            { id: "a3", entityId: "e1", name: "GPA", type: "simple", parentAttrId: null },
            { id: "a4", entityId: "e1", name: "PhoneNumbers", type: "multivalued", parentAttrId: null },
            { id: "a5", entityId: "e1", name: "Age", type: "derived", parentAttrId: null },
            { id: "a6", entityId: "e1", name: "Address", type: "composite", parentAttrId: null },
            { id: "a7", entityId: "e1", name: "City", type: "simple", parentAttrId: "a6" },
            { id: "a8", entityId: "e1", name: "Pincode", type: "simple", parentAttrId: "a6" },
            { id: "a9", entityId: "e2", name: "DepartmentID", type: "key", parentAttrId: null },
            { id: "a10", entityId: "e2", name: "DepartmentName", type: "simple", parentAttrId: null },
            { id: "a11", entityId: "e2", name: "Budget", type: "simple", parentAttrId: null },
            { id: "a12", entityId: "e3", name: "CourseID", type: "key", parentAttrId: null },
            { id: "a13", entityId: "e3", name: "CourseTitle", type: "simple", parentAttrId: null },
            { id: "a14", entityId: "e3", name: "Credits", type: "simple", parentAttrId: null },
            { id: "a15", entityId: "e4", name: "DependentName", type: "partial_key", parentAttrId: null },
            { id: "a16", entityId: "e4", name: "Relationship", type: "simple", parentAttrId: null }
        ],
        relationships: [
            {
                id: "r1",
                name: "Belongs_To",
                e1Id: "e1",
                e2Id: "e2",
                cardinality: "N:1",
                e1Participation: "total",
                e2Participation: "partial",
                x: 390,
                y: 170
            },
            {
                id: "r2",
                name: "Enrolls",
                e1Id: "e1",
                e2Id: "e3",
                cardinality: "M:N",
                e1Participation: "partial",
                e2Participation: "partial",
                x: 200,
                y: 305
            },
            {
                id: "r3",
                name: "Offers",
                e1Id: "e2",
                e2Id: "e3",
                cardinality: "1:N",
                e1Participation: "partial",
                e2Participation: "total",
                x: 390,
                y: 305
            },
            {
                id: "r4",
                name: "Has_Dependent",
                e1Id: "e1",
                e2Id: "e4",
                cardinality: "1:N",
                e1Participation: "partial",
                e2Participation: "total",
                x: 390,
                y: 440
            }
        ]
    };

    // Active ER Model State
    let erModel = JSON.parse(JSON.stringify(DEFAULT_COLLEGE_MODEL));

    // Selection & Interaction State
    let selectedItem = null; // { type: 'entity'|'attribute'|'relationship', id: string }
    let activeDrag = null;   // { type, id, startMouseX, startMouseY, origX, origY, hasMoved }
    let isPanning = false;
    let panStart = { x: 0, y: 0, origPanX: 0, origPanY: 0 };

    // Viewport Zoom & Pan State
    let viewport = {
        zoom: 1.0,
        panX: 0,
        panY: 0
    };

    // Undo / Redo History
    let historyStack = [];
    let historyIndex = -1;
    const MAX_HISTORY = 30;

    function pushHistory(actionName) {
        if (historyIndex < historyStack.length - 1) {
            historyStack = historyStack.slice(0, historyIndex + 1);
        }
        historyStack.push(JSON.stringify(erModel));
        if (historyStack.length > MAX_HISTORY) {
            historyStack.shift();
        } else {
            historyIndex++;
        }
        updateUndoRedoButtons();
    }

    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            erModel = JSON.parse(historyStack[historyIndex]);
            selectedItem = null;
            renderErDiagramCanvas();
            populateBuilderSelects();
            updateInspectorUI();
            generateRelationalSchemaFromModel(false);
            updateUndoRedoButtons();
            showToast("Undo applied.");
        }
    }

    function redo() {
        if (historyIndex < historyStack.length - 1) {
            historyIndex++;
            erModel = JSON.parse(historyStack[historyIndex]);
            selectedItem = null;
            renderErDiagramCanvas();
            populateBuilderSelects();
            updateInspectorUI();
            generateRelationalSchemaFromModel(false);
            updateUndoRedoButtons();
            showToast("Redo applied.");
        }
    }

    function updateUndoRedoButtons() {
        const btnUndo = document.getElementById("btn-tool-undo");
        const btnRedo = document.getElementById("btn-tool-redo");
        if (btnUndo) btnUndo.disabled = (historyIndex <= 0);
        if (btnRedo) btnRedo.disabled = (historyIndex >= historyStack.length - 1);
    }

    function initErDiagramBuilder() {
        try {
            // Try restoring from local storage if available
            try {
                const saved = localStorage.getItem("dbms_phase6_er_diagram");
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed && Array.isArray(parsed.entities) && parsed.entities.length > 0) {
                        erModel = parsed;
                    }
                }
            } catch (e) {}

            // Initial snapshot in history
            historyStack = [JSON.stringify(erModel)];
            historyIndex = 0;
            updateUndoRedoButtons();

            populateBuilderSelects();
            renderErDiagramCanvas();
            updateInspectorUI();
            generateRelationalSchemaFromModel(false);

            // Bind Left Panel Forms & Controls
            bindAddForms();

            // Bind Visual Editor Toolbar
            bindToolbarControls();

            // Bind Canvas Mouse/Pointer Interaction (Drag, Pan, Zoom, Selection)
            bindCanvasInteractions();

            // Bind Global Keyboard Shortcuts
            bindKeyboardShortcuts();

            // Bind Schema & File Export Buttons
            bindExportAndPersistence();

            console.log("Interactive ER Diagram Builder initialized successfully.");
        } catch (err) {
            console.error("Error initializing ER Diagram Builder:", err);
        }
    }

    // ====================================================================
    // A. LEFT PANEL FORMS BINDING
    // ====================================================================
    function bindAddForms() {
        // 1. Add Entity
        const btnAddEntity = document.getElementById("btn-builder-add-entity");
        const entityNameInput = document.getElementById("builder-entity-name");
        const entityWeakCheck = document.getElementById("builder-entity-is-weak");

        function handleAddEntity() {
            if (!entityNameInput) return;
            const isWeak = entityWeakCheck ? entityWeakCheck.checked : false;
            const rawVal = (entityNameInput.value || "").trim();
            if (!rawVal) {
                alert("Please provide an alphanumeric Entity name (e.g. STUDENT, INSTRUCTOR, DEPARTMENT).");
                entityNameInput.focus();
                return;
            }
            const name = rawVal.toUpperCase().replace(/[^A-Z0-9_]/g, "");
            if (!name) {
                alert("Entity name must contain letters, numbers, or underscores.");
                entityNameInput.focus();
                return;
            }
            if (erModel.entities.some(e => e.name.toUpperCase() === name)) {
                alert(`Entity '${name}' already exists in the diagram.`);
                entityNameInput.focus();
                return;
            }

            // Compute smart initial position avoiding existing entities
            const newPos = getNextEntityPosition();
            const newEnt = {
                id: `e_${Date.now()}`,
                name: name,
                isWeak: isWeak,
                x: newPos.x,
                y: newPos.y
            };

            erModel.entities.push(newEnt);
            selectedItem = { type: "entity", id: newEnt.id };
            pushHistory(`Add Entity '${name}'`);

            entityNameInput.value = "";
            if (entityWeakCheck) entityWeakCheck.checked = false;

            populateBuilderSelects();
            renderErDiagramCanvas();
            updateInspectorUI();
            generateRelationalSchemaFromModel(false);
            showToast(`Entity '${name}' created and selected.`);
        }

        if (btnAddEntity) {
            btnAddEntity.addEventListener("click", function (e) {
                e.preventDefault();
                handleAddEntity();
            });
        }

        if (entityNameInput) {
            entityNameInput.addEventListener("keydown", function (e) {
                if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddEntity();
                }
            });
        }

        // 2. Add Attribute
        const btnAddAttr = document.getElementById("btn-builder-add-attr");
        const attrTargetSelect = document.getElementById("builder-attr-target");
        const attrNameInput = document.getElementById("builder-attr-name");
        const selectAttrType = document.getElementById("builder-attr-type");
        const compParentCont = document.getElementById("builder-attr-composite-parent-container");
        const parentCompSelect = document.getElementById("builder-attr-composite-parent");

        if (selectAttrType && compParentCont) {
            selectAttrType.addEventListener("change", function () {
                updateCompositeParentOptions();
            });
        }

        function handleAddAttribute() {
            const targetEntityId = attrTargetSelect ? attrTargetSelect.value : null;
            const attrType = selectAttrType ? selectAttrType.value : "simple";
            const rawName = (attrNameInput ? attrNameInput.value : "").trim();
            if (!targetEntityId) {
                alert("Please select a target entity first. Create an entity if none exist.");
                return;
            }
            if (!rawName) {
                alert("Please provide an attribute name (e.g. StudentID, Email, GPA).");
                if (attrNameInput) attrNameInput.focus();
                return;
            }
            const attrName = rawName.replace(/[^a-zA-Z0-9_]/g, "");
            if (!attrName) {
                alert("Attribute name must contain alphanumeric characters.");
                if (attrNameInput) attrNameInput.focus();
                return;
            }

            const existing = erModel.attributes.filter(a => a.entityId === targetEntityId);
            if (existing.some(a => a.name.toLowerCase() === attrName.toLowerCase())) {
                alert(`Attribute '${attrName}' already exists on this entity.`);
                if (attrNameInput) attrNameInput.focus();
                return;
            }

            const parentAttrId = (compParentCont && !compParentCont.classList.contains("d-none") && parentCompSelect)
                ? (parentCompSelect.value || null)
                : null;

            const newAttr = {
                id: `a_${Date.now()}`,
                entityId: targetEntityId,
                name: attrName,
                type: attrType,
                parentAttrId: parentAttrId
            };

            erModel.attributes.push(newAttr);
            selectedItem = { type: "attribute", id: newAttr.id };
            pushHistory(`Add Attribute '${attrName}'`);

            if (attrNameInput) attrNameInput.value = "";
            renderErDiagramCanvas();
            updateCompositeParentOptions();
            updateInspectorUI();
            generateRelationalSchemaFromModel(false);
            showToast(`Attribute '${attrName}' attached.`);
        }

        if (btnAddAttr) {
            btnAddAttr.addEventListener("click", function (e) {
                e.preventDefault();
                handleAddAttribute();
            });
        }

        if (attrNameInput) {
            attrNameInput.addEventListener("keydown", function (e) {
                if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddAttribute();
                }
            });
        }

        // 3. Add Relationship
        const btnAddRel = document.getElementById("btn-builder-add-rel");
        const relNameInput = document.getElementById("builder-rel-name");
        const selRelE1 = document.getElementById("builder-rel-e1");
        const selRelE2 = document.getElementById("builder-rel-e2");
        const selRelCard = document.getElementById("builder-rel-card");
        const selRelPartE1 = document.getElementById("builder-rel-part-e1");
        const selRelPartE2 = document.getElementById("builder-rel-part-e2");

        function handleAddRelationship() {
            const e1Id = selRelE1 ? selRelE1.value : null;
            const e2Id = selRelE2 ? selRelE2.value : null;
            const card = selRelCard ? selRelCard.value : "M:N";
            const partE1 = (selRelPartE1 && selRelPartE1.value) || "partial";
            const partE2 = (selRelPartE2 && selRelPartE2.value) || "partial";
            const rawRelName = (relNameInput ? relNameInput.value : "").trim();
            const relName = rawRelName.replace(/[^a-zA-Z0-9_]/g, "") || "Relates";

            if (!e1Id || !e2Id) {
                alert("Please ensure at least two entities exist to connect a relationship.");
                return;
            }
            if (e1Id === e2Id) {
                alert("Please select two distinct entities for the relationship.");
                return;
            }

            const e1 = erModel.entities.find(e => e.id === e1Id);
            const e2 = erModel.entities.find(e => e.id === e2Id);
            if (!e1 || !e2) {
                alert("Selected entities could not be found.");
                return;
            }

            const midX = Math.round((e1.x + e2.x) / 2);
            const midY = Math.round((e1.y + e2.y) / 2);

            const newRel = {
                id: `r_${Date.now()}`,
                name: relName,
                e1Id: e1Id,
                e2Id: e2Id,
                cardinality: card,
                e1Participation: partE1,
                e2Participation: partE2,
                x: midX,
                y: midY
            };

            erModel.relationships.push(newRel);
            selectedItem = { type: "relationship", id: newRel.id };
            pushHistory(`Add Relationship '${relName}'`);

            if (relNameInput) relNameInput.value = "";
            renderErDiagramCanvas();
            updateInspectorUI();
            generateRelationalSchemaFromModel(false);
            showToast(`Relationship '${relName}' connected.`);
        }

        if (btnAddRel) {
            btnAddRel.addEventListener("click", function (e) {
                e.preventDefault();
                handleAddRelationship();
            });
        }

        if (relNameInput) {
            relNameInput.addEventListener("keydown", function (e) {
                if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddRelationship();
                }
            });
        }
    }

    function getNextEntityPosition() {
        const count = erModel.entities.length;
        if (count === 0) return { x: 300, y: 200 };
        const cols = 3;
        const row = Math.floor(count / cols);
        const col = count % cols;
        return {
            x: 180 + col * 260,
            y: 160 + row * 220
        };
    }

    function updateCompositeParentOptions() {
        const targetEntityId = document.getElementById("builder-attr-target")?.value;
        const compParentCont = document.getElementById("builder-attr-composite-parent-container");
        const parentCompSelect = document.getElementById("builder-attr-composite-parent");
        if (!compParentCont || !parentCompSelect) return;

        const compositeAttrs = erModel.attributes.filter(a => a.entityId === targetEntityId && a.type === "composite");
        if (compositeAttrs.length > 0) {
            compParentCont.classList.remove("d-none");
            parentCompSelect.innerHTML = `<option value="">-- None (Top-Level Child) --</option>`;
            compositeAttrs.forEach(ca => {
                const opt = document.createElement("option");
                opt.value = ca.id;
                opt.textContent = ca.name;
                parentCompSelect.appendChild(opt);
            });
        } else {
            compParentCont.classList.add("d-none");
        }
    }

    // ====================================================================
    // B. SELECTION INSPECTOR
    // ====================================================================
    function updateInspectorUI() {
        const titleElem = document.getElementById("builder-inspector-title");
        const placeholder = document.getElementById("builder-inspector-placeholder");
        const btnDelete = document.getElementById("btn-builder-delete-selected");
        const btnDeselect = document.getElementById("btn-builder-deselect");

        const formEntity = document.getElementById("inspector-entity-form");
        const formAttr = document.getElementById("inspector-attr-form");
        const formRel = document.getElementById("inspector-rel-form");

        [formEntity, formAttr, formRel].forEach(f => f && f.classList.add("d-none"));

        if (!selectedItem) {
            if (titleElem) titleElem.innerHTML = `<i class="bi bi-cursor-fill me-1"></i> Selection Inspector`;
            if (placeholder) placeholder.classList.remove("d-none");
            if (btnDelete) btnDelete.classList.add("d-none");
            if (btnDeselect) btnDeselect.classList.add("d-none");
            return;
        }

        if (placeholder) placeholder.classList.add("d-none");
        if (btnDelete) btnDelete.classList.remove("d-none");
        if (btnDeselect) btnDeselect.classList.remove("d-none");

        if (selectedItem.type === "entity") {
            const ent = erModel.entities.find(e => e.id === selectedItem.id);
            if (!ent) { selectedItem = null; updateInspectorUI(); return; }

            if (titleElem) titleElem.innerHTML = `<i class="bi bi-square me-1 text-success"></i> Entity: <strong>${ent.name}</strong>`;
            if (formEntity) {
                formEntity.classList.remove("d-none");
                const nameInput = document.getElementById("inspector-entity-name");
                const weakCheck = document.getElementById("inspector-entity-weak");
                const summary = document.getElementById("inspector-entity-summary");

                if (nameInput) nameInput.value = ent.name;
                if (weakCheck) weakCheck.checked = ent.isWeak;
                const attachedAttrs = erModel.attributes.filter(a => a.entityId === ent.id);
                const attachedRels = erModel.relationships.filter(r => r.e1Id === ent.id || r.e2Id === ent.id);
                if (summary) {
                    summary.textContent = `${attachedAttrs.length} attribute(s) & ${attachedRels.length} relationship(s) connected.`;
                }

                // Bind instant updater
                nameInput.oninput = () => {
                    const newName = nameInput.value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
                    if (newName) {
                        ent.name = newName;
                        renderErDiagramCanvas(false);
                        populateBuilderSelects();
                    }
                };
                nameInput.onchange = () => {
                    pushHistory("Rename Entity");
                    generateRelationalSchemaFromModel(false);
                };
                weakCheck.onchange = () => {
                    ent.isWeak = weakCheck.checked;
                    pushHistory("Toggle Weak Entity");
                    renderErDiagramCanvas();
                    populateBuilderSelects();
                    generateRelationalSchemaFromModel(false);
                };
            }
        } else if (selectedItem.type === "attribute") {
            const attr = erModel.attributes.find(a => a.id === selectedItem.id);
            if (!attr) { selectedItem = null; updateInspectorUI(); return; }

            const parentEnt = erModel.entities.find(e => e.id === attr.entityId);
            if (titleElem) titleElem.innerHTML = `<i class="bi bi-tag-fill me-1 text-info"></i> Attribute: <strong>${attr.name}</strong>`;
            if (formAttr) {
                formAttr.classList.remove("d-none");
                const nameInput = document.getElementById("inspector-attr-name");
                const typeSelect = document.getElementById("inspector-attr-type");
                const summary = document.getElementById("inspector-attr-summary");

                if (nameInput) nameInput.value = attr.name;
                if (typeSelect) typeSelect.value = attr.type;
                if (summary) {
                    summary.textContent = `Belongs to entity '${parentEnt ? parentEnt.name : "Unknown"}'.`;
                }

                nameInput.oninput = () => {
                    const newName = nameInput.value.trim().replace(/[^a-zA-Z0-9_]/g, "");
                    if (newName) {
                        attr.name = newName;
                        renderErDiagramCanvas(false);
                    }
                };
                nameInput.onchange = () => {
                    pushHistory("Rename Attribute");
                    generateRelationalSchemaFromModel(false);
                };
                typeSelect.onchange = () => {
                    attr.type = typeSelect.value;
                    pushHistory("Change Attribute Type");
                    renderErDiagramCanvas();
                    generateRelationalSchemaFromModel(false);
                };
            }
        } else if (selectedItem.type === "relationship") {
            const rel = erModel.relationships.find(r => r.id === selectedItem.id);
            if (!rel) { selectedItem = null; updateInspectorUI(); return; }

            const e1 = erModel.entities.find(e => e.id === rel.e1Id);
            const e2 = erModel.entities.find(e => e.id === rel.e2Id);

            if (titleElem) titleElem.innerHTML = `<i class="bi bi-diamond-fill me-1 text-warning"></i> Relationship: <strong>${rel.name}</strong>`;
            if (formRel) {
                formRel.classList.remove("d-none");
                const nameInput = document.getElementById("inspector-rel-name");
                const cardSelect = document.getElementById("inspector-rel-card");
                const e1Label = document.getElementById("inspector-rel-e1-label");
                const e2Label = document.getElementById("inspector-rel-e2-label");
                const partE1Select = document.getElementById("inspector-rel-part-e1");
                const partE2Select = document.getElementById("inspector-rel-part-e2");
                const summary = document.getElementById("inspector-rel-summary");

                if (nameInput) nameInput.value = rel.name;
                if (cardSelect) cardSelect.value = rel.cardinality;
                if (e1Label) e1Label.textContent = `${e1 ? e1.name : "E1"} Part.:`;
                if (e2Label) e2Label.textContent = `${e2 ? e2.name : "E2"} Part.:`;
                if (partE1Select) partE1Select.value = rel.e1Participation || "partial";
                if (partE2Select) partE2Select.value = rel.e2Participation || "partial";
                if (summary) {
                    summary.textContent = `Links '${e1 ? e1.name : "E1"}' and '${e2 ? e2.name : "E2"}'.`;
                }

                nameInput.oninput = () => {
                    const newName = nameInput.value.trim().replace(/[^a-zA-Z0-9_]/g, "");
                    if (newName) {
                        rel.name = newName;
                        renderErDiagramCanvas(false);
                    }
                };
                nameInput.onchange = () => {
                    pushHistory("Rename Relationship");
                    generateRelationalSchemaFromModel(false);
                };
                cardSelect.onchange = () => {
                    rel.cardinality = cardSelect.value;
                    pushHistory("Change Cardinality");
                    renderErDiagramCanvas();
                    generateRelationalSchemaFromModel(false);
                };
                partE1Select.onchange = () => {
                    rel.e1Participation = partE1Select.value;
                    pushHistory("Change E1 Participation");
                    renderErDiagramCanvas();
                    generateRelationalSchemaFromModel(false);
                };
                partE2Select.onchange = () => {
                    rel.e2Participation = partE2Select.value;
                    pushHistory("Change E2 Participation");
                    renderErDiagramCanvas();
                    generateRelationalSchemaFromModel(false);
                };
            }
        }
    }

    function deleteSelectedItem() {
        if (!selectedItem) return;

        if (selectedItem.type === "entity") {
            const ent = erModel.entities.find(e => e.id === selectedItem.id);
            if (!ent) return;
            const connectedAttrs = erModel.attributes.filter(a => a.entityId === ent.id);
            const connectedRels = erModel.relationships.filter(r => r.e1Id === ent.id || r.e2Id === ent.id);

            const msg = `Delete entity '${ent.name}'? This will also remove its ${connectedAttrs.length} attribute(s) and ${connectedRels.length} relationship(s).`;
            if (confirm(msg)) {
                erModel.entities = erModel.entities.filter(e => e.id !== ent.id);
                erModel.attributes = erModel.attributes.filter(a => a.entityId !== ent.id);
                erModel.relationships = erModel.relationships.filter(r => r.e1Id !== ent.id && r.e2Id !== ent.id);
                selectedItem = null;
                pushHistory("Delete Entity");
                populateBuilderSelects();
                renderErDiagramCanvas();
                updateInspectorUI();
                generateRelationalSchemaFromModel(false);
                showToast(`Entity '${ent.name}' deleted.`);
            }
        } else if (selectedItem.type === "attribute") {
            const attr = erModel.attributes.find(a => a.id === selectedItem.id);
            if (!attr) return;
            erModel.attributes = erModel.attributes.filter(a => a.id !== attr.id && a.parentAttrId !== attr.id);
            selectedItem = null;
            pushHistory("Delete Attribute");
            renderErDiagramCanvas();
            updateInspectorUI();
            generateRelationalSchemaFromModel(false);
            showToast(`Attribute '${attr.name}' deleted.`);
        } else if (selectedItem.type === "relationship") {
            const rel = erModel.relationships.find(r => r.id === selectedItem.id);
            if (!rel) return;
            erModel.relationships = erModel.relationships.filter(r => r.id !== rel.id);
            selectedItem = null;
            pushHistory("Delete Relationship");
            renderErDiagramCanvas();
            updateInspectorUI();
            generateRelationalSchemaFromModel(false);
            showToast(`Relationship '${rel.name}' deleted.`);
        }
    }

    // ====================================================================
    // C. TOOLBAR CONTROLS & SHORTCUTS
    // ====================================================================
    function bindToolbarControls() {
        // Selection tool
        document.getElementById("btn-tool-select")?.addEventListener("click", () => {
            selectedItem = null;
            renderErDiagramCanvas();
            updateInspectorUI();
            showToast("Selection Tool: Click any entity, attribute, or relationship on canvas.");
        });

        // Deselect & Delete in Inspector
        document.getElementById("btn-builder-deselect")?.addEventListener("click", () => {
            selectedItem = null;
            renderErDiagramCanvas();
            updateInspectorUI();
        });
        document.getElementById("btn-builder-delete-selected")?.addEventListener("click", deleteSelectedItem);
        document.getElementById("btn-tool-delete")?.addEventListener("click", deleteSelectedItem);

        // Undo & Redo
        document.getElementById("btn-tool-undo")?.addEventListener("click", undo);
        document.getElementById("btn-tool-redo")?.addEventListener("click", redo);

        // Zoom & Pan
        document.getElementById("btn-tool-zoom-in")?.addEventListener("click", () => {
            const container = document.getElementById("er-canvas-container");
            const w = container ? container.clientWidth / 2 : 400;
            const h = container ? container.clientHeight / 2 : 250;
            setZoom(viewport.zoom * 1.2, w, h);
        });
        document.getElementById("btn-tool-zoom-out")?.addEventListener("click", () => {
            const container = document.getElementById("er-canvas-container");
            const w = container ? container.clientWidth / 2 : 400;
            const h = container ? container.clientHeight / 2 : 250;
            setZoom(viewport.zoom / 1.2, w, h);
        });
        document.getElementById("btn-tool-zoom-reset")?.addEventListener("click", resetZoom);
        document.getElementById("btn-tool-fit-view")?.addEventListener("click", fitView);

        // Auto Arrange
        document.getElementById("btn-tool-auto-arrange")?.addEventListener("click", autoArrangeLayout);
    }

    function autoArrangeLayout() {
        if (erModel.entities.length === 0) return;
        const count = erModel.entities.length;
        const centerX = 400;
        const centerY = 280;
        const radiusX = Math.max(220, count * 60);
        const radiusY = Math.max(140, count * 40);

        erModel.entities.forEach((ent, idx) => {
            const angle = (2 * Math.PI * idx) / count - Math.PI / 2;
            ent.x = Math.round(centerX + radiusX * Math.cos(angle));
            ent.y = Math.round(centerY + radiusY * Math.sin(angle));
        });

        // Reposition relationship diamonds at geometric midpoints
        erModel.relationships.forEach(rel => {
            const e1 = erModel.entities.find(e => e.id === rel.e1Id);
            const e2 = erModel.entities.find(e => e.id === rel.e2Id);
            if (e1 && e2) {
                rel.x = Math.round((e1.x + e2.x) / 2);
                rel.y = Math.round((e1.y + e2.y) / 2);
            }
        });

        pushHistory("Auto Arrange Layout");
        renderErDiagramCanvas();
        fitView();
        showToast("Auto-arranged diagram layout.");
    }

    function bindKeyboardShortcuts() {
        window.addEventListener("keydown", function (e) {
            // Ignore if active inside an editable input/textarea
            const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
            if (tag === "input" || tag === "textarea" || tag === "select") return;

            // Only trigger if topic10 (ER builder section) is active
            if (currentTopic !== "topic10") return;

            // Ctrl+Z or Cmd+Z -> Undo
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z -> Redo
            else if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
                     ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")) {
                e.preventDefault();
                redo();
            }
            // Delete or Backspace -> Delete Selected Element
            else if (e.key === "Delete" || e.key === "Backspace") {
                if (selectedItem) {
                    e.preventDefault();
                    deleteSelectedItem();
                }
            }
            // Escape -> Clear Selection
            else if (e.key === "Escape") {
                if (selectedItem) {
                    selectedItem = null;
                    renderErDiagramCanvas();
                    updateInspectorUI();
                }
            }
        });
    }

    // ====================================================================
    // D. CANVAS POINTER INTERACTIONS (DRAG, PAN, ZOOM, SELECTION)
    // ====================================================================
    function bindCanvasInteractions() {
        const svg = document.getElementById("er-builder-svg");
        const container = document.getElementById("er-canvas-container");
        if (!svg || !container) return;

        // Pointer Down
        svg.addEventListener("pointerdown", function (e) {
            const pt = screenToSvgCoords(e.clientX, e.clientY);
            const target = e.target;

            // Check if clicked an Entity
            const entGroup = target.closest("[data-entity-id]");
            if (entGroup) {
                const entId = entGroup.getAttribute("data-entity-id");
                const ent = erModel.entities.find(e => e.id === entId);
                if (ent) {
                    selectedItem = { type: "entity", id: ent.id };
                    activeDrag = {
                        type: "entity",
                        id: ent.id,
                        startMouseX: pt.x,
                        startMouseY: pt.y,
                        origX: ent.x,
                        origY: ent.y,
                        hasMoved: false
                    };
                    renderErDiagramCanvas(false);
                    updateInspectorUI();
                    e.stopPropagation();
                    return;
                }
            }

            // Check if clicked an Attribute
            const attrGroup = target.closest("[data-attr-id]");
            if (attrGroup) {
                const attrId = attrGroup.getAttribute("data-attr-id");
                const attr = erModel.attributes.find(a => a.id === attrId);
                if (attr) {
                    selectedItem = { type: "attribute", id: attr.id };
                    renderErDiagramCanvas(false);
                    updateInspectorUI();
                    e.stopPropagation();
                    return;
                }
            }

            // Check if clicked a Relationship
            const relGroup = target.closest("[data-rel-id]");
            if (relGroup) {
                const relId = relGroup.getAttribute("data-rel-id");
                const rel = erModel.relationships.find(r => r.id === relId);
                if (rel) {
                    selectedItem = { type: "relationship", id: rel.id };
                    const e1 = erModel.entities.find(e => e.id === rel.e1Id);
                    const e2 = erModel.entities.find(e => e.id === rel.e2Id);
                    const curX = (rel.x !== null && rel.x !== undefined) ? rel.x : (e1 && e2 ? (e1.x + e2.x) / 2 : 300);
                    const curY = (rel.y !== null && rel.y !== undefined) ? rel.y : (e1 && e2 ? (e1.y + e2.y) / 2 : 200);

                    activeDrag = {
                        type: "relationship",
                        id: rel.id,
                        startMouseX: pt.x,
                        startMouseY: pt.y,
                        origX: curX,
                        origY: curY,
                        hasMoved: false
                    };
                    renderErDiagramCanvas(false);
                    updateInspectorUI();
                    e.stopPropagation();
                    return;
                }
            }

            // Otherwise, clicked canvas background -> Deselect and Pan
            selectedItem = null;
            renderErDiagramCanvas(false);
            updateInspectorUI();

            isPanning = true;
            panStart = {
                x: e.clientX,
                y: e.clientY,
                origPanX: viewport.panX,
                origPanY: viewport.panY
            };
            container.classList.add("panning");
        });

        // Window Pointer Move
        window.addEventListener("pointermove", function (e) {
            if (isPanning) {
                viewport.panX = panStart.origPanX + (e.clientX - panStart.x);
                viewport.panY = panStart.origPanY + (e.clientY - panStart.y);
                updateViewportTransform();
                return;
            }

            if (activeDrag) {
                const pt = screenToSvgCoords(e.clientX, e.clientY);
                const dx = pt.x - activeDrag.startMouseX;
                const dy = pt.y - activeDrag.startMouseY;

                if (Math.hypot(dx, dy) > 2) {
                    activeDrag.hasMoved = true;
                }

                if (activeDrag.type === "entity") {
                    const ent = erModel.entities.find(e => e.id === activeDrag.id);
                    if (ent) {
                        ent.x = Math.round(activeDrag.origX + dx);
                        ent.y = Math.round(activeDrag.origY + dy);
                        renderErDiagramCanvas(false);
                    }
                } else if (activeDrag.type === "relationship") {
                    const rel = erModel.relationships.find(r => r.id === activeDrag.id);
                    if (rel) {
                        rel.x = Math.round(activeDrag.origX + dx);
                        rel.y = Math.round(activeDrag.origY + dy);
                        renderErDiagramCanvas(false);
                    }
                }
            }
        });

        // Window Pointer Up
        window.addEventListener("pointerup", function () {
            if (isPanning) {
                isPanning = false;
                container.classList.remove("panning");
            }
            if (activeDrag) {
                if (activeDrag.hasMoved) {
                    pushHistory(`Move ${activeDrag.type}`);
                    generateRelationalSchemaFromModel(false);
                }
                activeDrag = null;
            }
        });

        // Mouse Wheel Zoom
        container.addEventListener("wheel", function (e) {
            e.preventDefault();
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const zoomDelta = e.deltaY < 0 ? 1.12 : 0.89;
            setZoom(viewport.zoom * zoomDelta, mouseX, mouseY);
        }, { passive: false });
    }

    function screenToSvgCoords(clientX, clientY) {
        const svg = document.getElementById("er-builder-svg");
        if (!svg) return { x: clientX, y: clientY };
        const rect = svg.getBoundingClientRect();
        return {
            x: (clientX - rect.left - viewport.panX) / viewport.zoom,
            y: (clientY - rect.top - viewport.panY) / viewport.zoom
        };
    }

    function updateViewportTransform() {
        const vp = document.getElementById("er-viewport");
        if (vp) {
            vp.setAttribute("transform", `translate(${viewport.panX}, ${viewport.panY}) scale(${viewport.zoom})`);
        }
        const badge = document.getElementById("er-zoom-level-badge");
        if (badge) {
            badge.textContent = `Zoom: ${Math.round(viewport.zoom * 100)}%`;
        }
    }

    function setZoom(newZoom, centerX, centerY) {
        const clampedZoom = Math.max(0.3, Math.min(3.0, newZoom));
        const container = document.getElementById("er-canvas-container");
        if (centerX === undefined && container) centerX = container.clientWidth / 2;
        if (centerY === undefined && container) centerY = container.clientHeight / 2;

        const ratio = clampedZoom / viewport.zoom;
        viewport.panX = (centerX !== undefined ? centerX : 0) - ratio * ((centerX !== undefined ? centerX : 0) - viewport.panX);
        viewport.panY = (centerY !== undefined ? centerY : 0) - ratio * ((centerY !== undefined ? centerY : 0) - viewport.panY);
        viewport.zoom = clampedZoom;
        updateViewportTransform();
    }

    function resetZoom() {
        viewport.zoom = 1.0;
        viewport.panX = 0;
        viewport.panY = 0;
        updateViewportTransform();
    }

    function fitView() {
        if (!erModel.entities || erModel.entities.length === 0) {
            resetZoom();
            return;
        }
        const container = document.getElementById("er-canvas-container");
        const cw = container ? (container.clientWidth || 800) : 800;
        const ch = container ? (container.clientHeight || 500) : 500;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        erModel.entities.forEach(e => {
            minX = Math.min(minX, e.x - 90);
            minY = Math.min(minY, e.y - 70);
            maxX = Math.max(maxX, e.x + 90);
            maxY = Math.max(maxY, e.y + 70);
        });

        const modelW = maxX - minX;
        const modelH = maxY - minY;
        if (modelW <= 0 || modelH <= 0) {
            resetZoom();
            return;
        }

        const scaleX = (cw - 80) / modelW;
        const scaleY = (ch - 80) / modelH;
        const fitScale = Math.max(0.4, Math.min(1.4, Math.min(scaleX, scaleY)));

        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;

        viewport.zoom = fitScale;
        viewport.panX = Math.round(cw / 2 - midX * fitScale);
        viewport.panY = Math.round(ch / 2 - midY * fitScale);
        updateViewportTransform();
    }

    // ====================================================================
    // E. SVG CANVAS RENDERING (CHEN NOTATION)
    // ====================================================================
    function renderErDiagramCanvas(shouldFit = false) {
        const svg = document.getElementById("er-builder-svg");
        const activeElemBadge = document.getElementById("builder-active-elements");
        if (!svg) return;

        let vpGroup = document.getElementById("er-viewport");
        if (!vpGroup) {
            svg.innerHTML = `
                <defs>
                    <pattern id="er-canvas-grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="1" fill="#cbd5e1" opacity="0.8"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#er-canvas-grid-pattern)" id="er-canvas-bg"></rect>
                <g id="er-viewport">
                    <g id="er-lines-layer"></g>
                    <g id="er-relationships-layer"></g>
                    <g id="er-entities-layer"></g>
                    <g id="er-attributes-layer"></g>
                    <g id="er-selection-layer"></g>
                </g>
            `;
            vpGroup = document.getElementById("er-viewport");
        }

        updateViewportTransform();

        const linesLayer = document.getElementById("er-lines-layer");
        const relsLayer = document.getElementById("er-relationships-layer");
        const entsLayer = document.getElementById("er-entities-layer");
        const attrsLayer = document.getElementById("er-attributes-layer");
        const selLayer = document.getElementById("er-selection-layer");

        if (linesLayer) linesLayer.innerHTML = "";
        if (relsLayer) relsLayer.innerHTML = "";
        if (entsLayer) entsLayer.innerHTML = "";
        if (attrsLayer) attrsLayer.innerHTML = "";
        if (selLayer) selLayer.innerHTML = "";

        if (activeElemBadge) {
            activeElemBadge.textContent = `${erModel.entities.length} Entities, ${erModel.attributes.length} Attrs, ${erModel.relationships.length} Rels`;
        }

        // Entity dimensions
        const ENT_W = 110;
        const ENT_H = 46;

        // 1. Compute Attribute Coordinate Positions per Entity
        const attributeCoords = {}; // attrId -> { x, y }

        erModel.entities.forEach(ent => {
            const directAttrs = erModel.attributes.filter(a => a.entityId === ent.id && !a.parentAttrId);
            const total = directAttrs.length;

            directAttrs.forEach((attr, idx) => {
                // Distribute attributes in an arc above / around the entity
                const startAngle = -Math.PI * 0.85;
                const sweep = Math.PI * 1.7;
                const angle = total === 1 ? -Math.PI / 2 : startAngle + (idx * sweep) / (total - 1);
                const dist = 76 + (idx % 2) * 22;

                const ax = Math.round(ent.x + dist * Math.cos(angle));
                const ay = Math.round(ent.y + dist * Math.sin(angle));
                attributeCoords[attr.id] = { x: ax, y: ay };

                // Draw connector line from entity to attribute
                const isSelected = (selectedItem && selectedItem.type === "attribute" && selectedItem.id === attr.id);
                const line = createSvgElement("line", {
                    x1: ent.x, y1: ent.y,
                    x2: ax, y2: ay,
                    stroke: isSelected ? "#0284c7" : "#64748b",
                    "stroke-width": isSelected ? 2 : 1.3,
                    class: "er-connecting-line"
                });
                linesLayer.appendChild(line);

                // Check for composite sub-attributes
                const subAttrs = erModel.attributes.filter(a => a.parentAttrId === attr.id);
                subAttrs.forEach((sub, sIdx) => {
                    const subAngle = angle - 0.45 + (sIdx * 0.9) / Math.max(subAttrs.length - 1, 1);
                    const subDist = 48;
                    const sax = Math.round(ax + subDist * Math.cos(subAngle));
                    const say = Math.round(ay + subDist * Math.sin(subAngle));
                    attributeCoords[sub.id] = { x: sax, y: say };

                    const subLine = createSvgElement("line", {
                        x1: ax, y1: ay,
                        x2: sax, y2: say,
                        stroke: "#94a3b8",
                        "stroke-width": 1.2,
                        "stroke-dasharray": "3,2"
                    });
                    linesLayer.appendChild(subLine);
                });
            });
        });

        // 2. Render Relationships & Connector Lines to Entities
        erModel.relationships.forEach(rel => {
            const e1 = erModel.entities.find(e => e.id === rel.e1Id);
            const e2 = erModel.entities.find(e => e.id === rel.e2Id);
            if (!e1 || !e2) return;

            // Diamond Center Coordinate
            const rx = (rel.x !== null && rel.x !== undefined) ? rel.x : Math.round((e1.x + e2.x) / 2);
            const ry = (rel.y !== null && rel.y !== undefined) ? rel.y : Math.round((e1.y + e2.y) / 2);

            const isRelSelected = (selectedItem && selectedItem.type === "relationship" && selectedItem.id === rel.id);

            // Connect e1 to (rx, ry)
            drawRelationshipConnector(linesLayer, e1.x, e1.y, rx, ry, rel.e1Participation, isRelSelected);
            // Connect e2 to (rx, ry)
            drawRelationshipConnector(linesLayer, e2.x, e2.y, rx, ry, rel.e2Participation, isRelSelected);

            // Cardinality Labels
            const cardInfo = parseCardinality(rel.cardinality);
            drawCardinalityLabel(linesLayer, e1.x, e1.y, rx, ry, cardInfo.e1Label);
            drawCardinalityLabel(linesLayer, e2.x, e2.y, rx, ry, cardInfo.e2Label);

            // Relationship Diamond Group
            const relG = createSvgElement("g", {
                "data-rel-id": rel.id,
                class: `er-node er-relationship ${isRelSelected ? "er-selected" : ""}`,
                transform: `translate(${rx}, ${ry})`
            });

            const dw = 38;
            const dh = 24;
            const diamondPoints = `0,${-dh} ${dw},0 0,${dh} ${-dw},0`;

            // Check if identifying relationship (connecting a weak entity)
            const isIdentifying = (e1.isWeak || e2.isWeak);

            if (isIdentifying) {
                // Outer Diamond
                const outerDiamond = createSvgElement("polygon", {
                    points: diamondPoints,
                    fill: "#eff6ff",
                    stroke: isRelSelected ? "#0284c7" : "#2563eb",
                    "stroke-width": isRelSelected ? 2.5 : 2
                });
                // Inner Diamond
                const innerPoints = `0,${-dh + 4} ${dw - 6},0 0,${dh - 4} ${-dw + 6},0`;
                const innerDiamond = createSvgElement("polygon", {
                    points: innerPoints,
                    fill: "none",
                    stroke: isRelSelected ? "#0284c7" : "#2563eb",
                    "stroke-width": 1.4
                });
                relG.appendChild(outerDiamond);
                relG.appendChild(innerDiamond);
            } else {
                const diamond = createSvgElement("polygon", {
                    points: diamondPoints,
                    fill: "#eff6ff",
                    stroke: isRelSelected ? "#0284c7" : "#2563eb",
                    "stroke-width": isRelSelected ? 2.5 : 2
                });
                relG.appendChild(diamond);
            }

            // Relationship Name Text
            const relText = createSvgElement("text", {
                x: 0,
                y: 4,
                "font-size": 10,
                "font-weight": "bold",
                fill: "#1e3a8a",
                "text-anchor": "middle"
            });
            relText.textContent = rel.name;
            relG.appendChild(relText);

            relsLayer.appendChild(relG);
        });

        // 3. Render Entities
        erModel.entities.forEach(ent => {
            const isEntSelected = (selectedItem && selectedItem.type === "entity" && selectedItem.id === ent.id);
            const entG = createSvgElement("g", {
                "data-entity-id": ent.id,
                class: `er-node er-entity ${isEntSelected ? "er-selected" : ""}`,
                transform: `translate(${ent.x - ENT_W / 2}, ${ent.y - ENT_H / 2})`
            });

            if (ent.isWeak) {
                // Weak Entity: Double Rectangle
                const outerRect = createSvgElement("rect", {
                    x: -4, y: -4,
                    width: ENT_W + 8, height: ENT_H + 8,
                    rx: 5,
                    fill: "#fff7ed",
                    stroke: isEntSelected ? "#0284c7" : "#ea580c",
                    "stroke-width": isEntSelected ? 2.5 : 2
                });
                const innerRect = createSvgElement("rect", {
                    x: 0, y: 0,
                    width: ENT_W, height: ENT_H,
                    rx: 3,
                    fill: "none",
                    stroke: isEntSelected ? "#0284c7" : "#ea580c",
                    "stroke-width": 1.5
                });
                entG.appendChild(outerRect);
                entG.appendChild(innerRect);
            } else {
                // Strong Entity: Standard Rectangle
                const rect = createSvgElement("rect", {
                    x: 0, y: 0,
                    width: ENT_W, height: ENT_H,
                    rx: 4,
                    fill: "#f0fdf4",
                    stroke: isEntSelected ? "#0284c7" : "#16a34a",
                    "stroke-width": isEntSelected ? 2.5 : 2
                });
                entG.appendChild(rect);
            }

            // Entity Name Label
            const text = createSvgElement("text", {
                x: ENT_W / 2,
                y: ENT_H / 2 + 5,
                "font-size": 12,
                "font-weight": "bold",
                fill: ent.isWeak ? "#9a3412" : "#14532d",
                "text-anchor": "middle"
            });
            text.textContent = ent.name;
            entG.appendChild(text);

            entsLayer.appendChild(entG);
        });

        // 4. Render Attributes
        erModel.attributes.forEach(attr => {
            const coords = attributeCoords[attr.id];
            if (!coords) return;

            const isAttrSelected = (selectedItem && selectedItem.type === "attribute" && selectedItem.id === attr.id);
            const attrG = createSvgElement("g", {
                "data-attr-id": attr.id,
                class: `er-node er-attribute ${isAttrSelected ? "er-selected" : ""}`,
                transform: `translate(${coords.x}, ${coords.y})`
            });

            const rw = (attr.name.length > 9 ? 38 : 33);
            const rh = 16;

            if (attr.type === "multivalued") {
                // Multivalued Attribute: Double Oval
                const outerOval = createSvgElement("ellipse", {
                    cx: 0, cy: 0, rx: rw + 4, ry: rh + 3,
                    fill: "#ffffff",
                    stroke: isAttrSelected ? "#0284c7" : "#334155",
                    "stroke-width": isAttrSelected ? 2.2 : 1.5
                });
                const innerOval = createSvgElement("ellipse", {
                    cx: 0, cy: 0, rx: rw, ry: rh,
                    fill: "none",
                    stroke: isAttrSelected ? "#0284c7" : "#334155",
                    "stroke-width": 1.2
                });
                attrG.appendChild(outerOval);
                attrG.appendChild(innerOval);
            } else if (attr.type === "derived") {
                // Derived Attribute: Dashed Oval
                const oval = createSvgElement("ellipse", {
                    cx: 0, cy: 0, rx: rw, ry: rh,
                    fill: "#f8fafc",
                    stroke: isAttrSelected ? "#0284c7" : "#64748b",
                    "stroke-width": isAttrSelected ? 2.2 : 1.5,
                    "stroke-dasharray": "4,3"
                });
                attrG.appendChild(oval);
            } else if (attr.type === "composite") {
                // Composite Parent Attribute
                const oval = createSvgElement("ellipse", {
                    cx: 0, cy: 0, rx: rw + 2, ry: rh + 1,
                    fill: "#f1f5f9",
                    stroke: isAttrSelected ? "#0284c7" : "#475569",
                    "stroke-width": isAttrSelected ? 2.2 : 1.5
                });
                attrG.appendChild(oval);
            } else {
                // Simple, Key, or Partial Key
                const oval = createSvgElement("ellipse", {
                    cx: 0, cy: 0, rx: rw, ry: rh,
                    fill: "#ffffff",
                    stroke: isAttrSelected ? "#0284c7" : "#334155",
                    "stroke-width": isAttrSelected ? 2.2 : 1.5
                });
                attrG.appendChild(oval);
            }

            // Attribute Text Label
            const text = createSvgElement("text", {
                x: 0,
                y: 4,
                "font-size": 9.5,
                "font-weight": (attr.type === "key" || attr.type === "partial_key") ? "bold" : "normal",
                fill: "#0f172a",
                "text-anchor": "middle",
                "text-decoration": (attr.type === "key") ? "underline" : "none"
            });
            text.textContent = attr.name;
            attrG.appendChild(text);

            // Partial Key: Dashed Underline
            if (attr.type === "partial_key") {
                const textHalfW = Math.min(rw - 4, attr.name.length * 3.2);
                const dashLine = createSvgElement("line", {
                    x1: -textHalfW, y1: 7,
                    x2: textHalfW, y2: 7,
                    stroke: "#0f172a",
                    "stroke-width": 1.2,
                    "stroke-dasharray": "3,2"
                });
                attrG.appendChild(dashLine);
            }

            attrsLayer.appendChild(attrG);
        });

        if (shouldFit) {
            fitView();
        }
    }

    function drawRelationshipConnector(layer, x1, y1, x2, y2, participation, isSelected) {
        const strokeColor = isSelected ? "#0284c7" : "#334155";
        if (participation === "total") {
            // Double line for total participation (offset parallel lines)
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const perpAngle = angle + Math.PI / 2;
            const off = 2.5;
            const dx = off * Math.cos(perpAngle);
            const dy = off * Math.sin(perpAngle);

            const line1 = createSvgElement("line", {
                x1: x1 + dx, y1: y1 + dy,
                x2: x2 + dx, y2: y2 + dy,
                stroke: strokeColor,
                "stroke-width": 1.6
            });
            const line2 = createSvgElement("line", {
                x1: x1 - dx, y1: y1 - dy,
                x2: x2 - dx, y2: y2 - dy,
                stroke: strokeColor,
                "stroke-width": 1.6
            });
            layer.appendChild(line1);
            layer.appendChild(line2);
        } else {
            // Single line for partial participation
            const line = createSvgElement("line", {
                x1: x1, y1: y1,
                x2: x2, y2: y2,
                stroke: strokeColor,
                "stroke-width": isSelected ? 2.5 : 1.8
            });
            layer.appendChild(line);
        }
    }

    function parseCardinality(cardStr) {
        const parts = (cardStr || "1:N").toUpperCase().split(":");
        return {
            e1Label: parts[0] || "1",
            e2Label: parts[1] || "N"
        };
    }

    function drawCardinalityLabel(layer, ex, ey, rx, ry, labelText) {
        // Place label along line between entity and relationship diamond, closer to entity
        const lx = ex + (rx - ex) * 0.38;
        const ly = ey + (ry - ey) * 0.38 - 8;

        const text = createSvgElement("text", {
            x: lx,
            y: ly,
            "font-size": 12,
            "font-weight": "bold",
            fill: "#dc2626",
            "text-anchor": "middle"
        });
        text.textContent = labelText;
        layer.appendChild(text);
    }

    function createSvgElement(tag, attrs) {
        const elem = document.createElementNS("http://www.w3.org/2000/svg", tag);
        for (let k in attrs) {
            elem.setAttribute(k, attrs[k]);
        }
        return elem;
    }

    function populateBuilderSelects() {
        const selTarget = document.getElementById("builder-attr-target");
        const selE1 = document.getElementById("builder-rel-e1");
        const selE2 = document.getElementById("builder-rel-e2");
        const countBadge = document.getElementById("builder-entity-count");

        if (countBadge) countBadge.textContent = `${erModel.entities.length} Entities`;

        [selTarget, selE1, selE2].forEach(sel => {
            if (!sel) return;
            const prevVal = sel.value;
            sel.innerHTML = "";
            erModel.entities.forEach(ent => {
                const opt = document.createElement("option");
                opt.value = ent.id;
                opt.textContent = `${ent.name} ${ent.isWeak ? "(Weak)" : ""}`;
                sel.appendChild(opt);
            });
            if (prevVal && erModel.entities.some(e => e.id === prevVal)) {
                sel.value = prevVal;
            }
        });

        if (selE2 && selE2.options.length > 1 && selE2.selectedIndex === selE1.selectedIndex) {
            selE2.selectedIndex = (selE1.selectedIndex + 1) % selE2.options.length;
        }

        updateCompositeParentOptions();
    }

    // ====================================================================
    // F. RELATIONAL SCHEMA & MYSQL 8 DDL GENERATION
    // ====================================================================
    function generateRelationalSchemaFromModel(showSuccessToast = true) {
        const output = document.getElementById("builder-schema-output");
        const warningsBox = document.getElementById("builder-schema-warnings");
        const warningsText = document.getElementById("builder-schema-warnings-text");
        const validationBadge = document.getElementById("builder-validation-badge");
        if (!output) return;

        let ddlStatements = [];
        let relationalNotation = [];
        let warnings = [];

        // Validation Checks
        erModel.entities.forEach(ent => {
            const attrs = erModel.attributes.filter(a => a.entityId === ent.id);
            const keyAttrs = attrs.filter(a => a.type === "key");
            const partKeys = attrs.filter(a => a.type === "partial_key");

            if (!ent.isWeak && keyAttrs.length === 0) {
                warnings.push(`Entity '${ent.name}' has no Primary Key attribute.`);
            }
            if (ent.isWeak && partKeys.length === 0) {
                warnings.push(`Weak Entity '${ent.name}' has no Partial Key (discriminator).`);
            }
        });

        if (warningsBox && warningsText && validationBadge) {
            if (warnings.length > 0) {
                warningsBox.classList.remove("d-none");
                warningsText.innerHTML = `<strong>Model Design Warnings:</strong> ${warnings.join(" &bull; ")}`;
                validationBadge.className = "badge bg-warning text-dark";
                validationBadge.textContent = "Has Warnings";
            } else {
                warningsBox.classList.add("d-none");
                validationBadge.className = "badge bg-success";
                validationBadge.textContent = "Model Validated";
            }
        }

        // Map Strong and Weak Entities
        erModel.entities.forEach(ent => {
            const attrs = erModel.attributes.filter(a => a.entityId === ent.id && !a.parentAttrId);
            const keyAttrs = attrs.filter(a => a.type === "key");
            const simpleAttrs = attrs.filter(a => a.type === "simple");
            const multiAttrs = attrs.filter(a => a.type === "multivalued");
            const derivedAttrs = attrs.filter(a => a.type === "derived");
            const compAttrs = attrs.filter(a => a.type === "composite");
            const partKeys = attrs.filter(a => a.type === "partial_key");

            let colDefs = [];
            let pkCols = [];
            let notationPkCols = [];
            let notationAttrList = [];

            // 1. Primary Keys (for Strong Entities)
            if (!ent.isWeak) {
                if (keyAttrs.length > 0) {
                    keyAttrs.forEach(k => {
                        const colName = sanitizeSqlCol(k.name);
                        const colType = inferSqlDataType(k.name);
                        colDefs.push(`    \`${colName}\` ${colType} NOT NULL`);
                        pkCols.push(`\`${colName}\``);
                        notationPkCols.push(`<u>${colName}</u>`);
                    });
                } else {
                    // Fallback surrogate key
                    const fallbackPk = `${ent.name.toLowerCase()}_id`;
                    colDefs.push(`    \`${fallbackPk}\` INT NOT NULL AUTO_INCREMENT`);
                    pkCols.push(`\`${fallbackPk}\``);
                    notationPkCols.push(`<u>${fallbackPk}</u>`);
                }
            } else {
                // Weak Entity: Include Owner's Foreign Key + Partial Key
                const identifyingRel = erModel.relationships.find(r => r.e2Id === ent.id || r.e1Id === ent.id);
                let ownerEntity = null;
                if (identifyingRel) {
                    const ownerId = (identifyingRel.e1Id === ent.id) ? identifyingRel.e2Id : identifyingRel.e1Id;
                    ownerEntity = erModel.entities.find(e => e.id === ownerId);
                }

                const ownerPkName = ownerEntity ? `${ownerEntity.name.toLowerCase()}_id` : "owner_id";
                colDefs.push(`    \`${ownerPkName}\` INT NOT NULL -- FK from Owner Entity`);
                pkCols.push(`\`${ownerPkName}\``);
                notationPkCols.push(`<u>${ownerPkName}</u>`);

                if (partKeys.length > 0) {
                    partKeys.forEach(pk => {
                        const pkCol = sanitizeSqlCol(pk.name);
                        colDefs.push(`    \`${pkCol}\` VARCHAR(100) NOT NULL -- Partial Key`);
                        pkCols.push(`\`${pkCol}\``);
                        notationPkCols.push(`<u>${pkCol}</u>`);
                    });
                }
            }

            // 2. Simple Attributes
            simpleAttrs.forEach(s => {
                const colName = sanitizeSqlCol(s.name);
                const colType = inferSqlDataType(s.name);
                colDefs.push(`    \`${colName}\` ${colType} NOT NULL`);
                notationAttrList.push(colName);
            });

            // 3. Composite Attributes (Flatten into table columns)
            compAttrs.forEach(ca => {
                const subAttrs = erModel.attributes.filter(a => a.parentAttrId === ca.id);
                if (subAttrs.length > 0) {
                    subAttrs.forEach(sub => {
                        const flatCol = sanitizeSqlCol(`${ca.name}_${sub.name}`);
                        colDefs.push(`    \`${flatCol}\` VARCHAR(100) NOT NULL -- Flattened from ${ca.name}`);
                        notationAttrList.push(flatCol);
                    });
                } else {
                    const colName = sanitizeSqlCol(ca.name);
                    colDefs.push(`    \`${colName}\` VARCHAR(150) NOT NULL`);
                    notationAttrList.push(colName);
                }
            });

            // 4. Foreign Keys from 1:N Relationships (FK on the Many side)
            erModel.relationships.forEach(rel => {
                if (rel.cardinality === "1:N" && rel.e2Id === ent.id) {
                    const parent = erModel.entities.find(e => e.id === rel.e1Id);
                    if (parent) {
                        const fkCol = `${parent.name.toLowerCase()}_id`;
                        const isMandatory = (rel.e2Participation === "total");
                        colDefs.push(`    \`${fkCol}\` INT ${isMandatory ? "NOT NULL" : "DEFAULT NULL"} -- FK from 1:N \`${rel.name}\``);
                        notationAttrList.push(fkCol);
                    }
                } else if (rel.cardinality === "N:1" && rel.e1Id === ent.id) {
                    const parent = erModel.entities.find(e => e.id === rel.e2Id);
                    if (parent) {
                        const fkCol = `${parent.name.toLowerCase()}_id`;
                        const isMandatory = (rel.e1Participation === "total");
                        colDefs.push(`    \`${fkCol}\` INT ${isMandatory ? "NOT NULL" : "DEFAULT NULL"} -- FK from N:1 \`${rel.name}\``);
                        notationAttrList.push(fkCol);
                    }
                } else if (rel.cardinality === "1:1") {
                    // Place FK on side with Total participation, or e1
                    const isE1 = (rel.e1Id === ent.id);
                    const shouldPlaceHere = isE1
                        ? (rel.e1Participation === "total" || rel.e2Participation !== "total")
                        : (rel.e2Participation === "total" && rel.e1Participation !== "total");

                    if (shouldPlaceHere) {
                        const otherEnt = erModel.entities.find(e => e.id === (isE1 ? rel.e2Id : rel.e1Id));
                        if (otherEnt) {
                            const fkCol = `${otherEnt.name.toLowerCase()}_id`;
                            colDefs.push(`    \`${fkCol}\` INT NOT NULL UNIQUE -- 1:1 FK to \`${otherEnt.name}\``);
                            notationAttrList.push(fkCol);
                        }
                    }
                }
            });

            // Primary Key Clause
            if (pkCols.length > 0) {
                colDefs.push(`    PRIMARY KEY (${pkCols.join(", ")})`);
            }

            // Foreign Key Constraints
            if (ent.isWeak) {
                const identifyingRel = erModel.relationships.find(r => r.e2Id === ent.id || r.e1Id === ent.id);
                if (identifyingRel) {
                    const ownerId = (identifyingRel.e1Id === ent.id) ? identifyingRel.e2Id : identifyingRel.e1Id;
                    const owner = erModel.entities.find(e => e.id === ownerId);
                    if (owner) {
                        const ownerTable = owner.name.toLowerCase() + "s";
                        const ownerPkCol = `${owner.name.toLowerCase()}_id`;
                        colDefs.push(`    FOREIGN KEY (\`${ownerPkCol}\`) REFERENCES \`${ownerTable}\`(\`${ownerPkCol}\`) ON DELETE CASCADE`);
                    }
                }
            }

            const tableName = ent.name.toLowerCase() + "s";
            let ddl = `-- ========================================================\n` +
                      `-- Table: ${tableName} (${ent.isWeak ? "Weak Entity" : "Strong Entity"})\n` +
                      `-- ========================================================\n` +
                      `CREATE TABLE \`${tableName}\` (\n${colDefs.join(",\n")}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

            // Derived Attributes Explanation Note
            if (derivedAttrs.length > 0) {
                const notes = derivedAttrs.map(da => `-- Note: '${da.name}' is a DERIVED attribute. Computed via expression/view; not physically stored to avoid update anomalies.`);
                ddl += `\n${notes.join("\n")}`;
            }

            ddlStatements.push(ddl);

            const notationStr = `${tableName.toUpperCase()}(${[...notationPkCols, ...notationAttrList].join(", ")})`;
            relationalNotation.push(notationStr);

            // 5. Multivalued Attributes -> Separate Junction Table
            multiAttrs.forEach(ma => {
                const multiTableName = `${ent.name.toLowerCase()}_${ma.name.toLowerCase()}`;
                const ownerPk = `${ent.name.toLowerCase()}_id`;
                const valCol = sanitizeSqlCol(ma.name.toLowerCase());

                const multiDdl = `-- ========================================================\n` +
                                 `-- Multivalued Attribute Table for ${ent.name}.${ma.name}\n` +
                                 `-- ========================================================\n` +
                                 `CREATE TABLE \`${multiTableName}\` (\n` +
                                 `    \`${ownerPk}\` INT NOT NULL,\n` +
                                 `    \`${valCol}\` VARCHAR(100) NOT NULL,\n` +
                                 `    PRIMARY KEY (\`${ownerPk}\`, \`${valCol}\`),\n` +
                                 `    FOREIGN KEY (\`${ownerPk}\`) REFERENCES \`${tableName}\`(\`${ownerPk}\`) ON DELETE CASCADE\n` +
                                 `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

                ddlStatements.push(multiDdl);
                relationalNotation.push(`${multiTableName.toUpperCase()}(<u>${ownerPk}</u>, <u>${valCol}</u>)`);
            });
        });

        // Map M:N Relationships into Associative Junction Tables
        erModel.relationships.forEach(rel => {
            if (rel.cardinality === "M:N") {
                const e1 = erModel.entities.find(e => e.id === rel.e1Id);
                const e2 = erModel.entities.find(e => e.id === rel.e2Id);
                if (!e1 || !e2) return;

                const jTableName = `${rel.name.toLowerCase()}_junction`;
                const fk1 = `${e1.name.toLowerCase()}_id`;
                const fk2 = `${e2.name.toLowerCase()}_id`;
                const t1 = `${e1.name.toLowerCase()}s`;
                const t2 = `${e2.name.toLowerCase()}s`;

                const jDdl = `-- ========================================================\n` +
                             `-- Associative Junction Table for M:N Relationship: ${rel.name}\n` +
                             `-- ========================================================\n` +
                             `CREATE TABLE \`${jTableName}\` (\n` +
                             `    \`${fk1}\` INT NOT NULL,\n` +
                             `    \`${fk2}\` INT NOT NULL,\n` +
                             `    \`enrolled_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n` +
                             `    PRIMARY KEY (\`${fk1}\`, \`${fk2}\`),\n` +
                             `    FOREIGN KEY (\`${fk1}\`) REFERENCES \`${t1}\`(\`${fk1}\`) ON DELETE CASCADE,\n` +
                             `    FOREIGN KEY (\`${fk2}\`) REFERENCES \`${t2}\`(\`${fk2}\`) ON DELETE CASCADE\n` +
                             `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

                ddlStatements.push(jDdl);
                relationalNotation.push(`${jTableName.toUpperCase()}(<u>${fk1}</u>, <u>${fk2}</u>, enrolled_at)`);
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
        if (showSuccessToast) {
            showToast("Relational Schema successfully generated!");
        }
    }

    function sanitizeSqlCol(str) {
        return (str || "col").toLowerCase().replace(/[^a-z0-9_]/g, "_");
    }

    function inferSqlDataType(name) {
        const lower = (name || "").toLowerCase();
        if (lower.endsWith("id") || lower.endsWith("num") || lower.endsWith("code")) return "INT";
        if (lower.includes("gpa") || lower.includes("salary") || lower.includes("price") || lower.includes("budget")) return "DECIMAL(10, 2)";
        if (lower.includes("credits") || lower.includes("hours") || lower.includes("age") || lower.includes("year")) return "INT";
        if (lower.includes("date") || lower.includes("dob")) return "DATE";
        return "VARCHAR(100)";
    }

    // ====================================================================
    // G. EXPORT, IMPORT & LOCAL PERSISTENCE
    // ====================================================================
    function bindExportAndPersistence() {
        // Generate Relational Schema
        document.getElementById("btn-builder-generate-schema")?.addEventListener("click", function () {
            generateRelationalSchemaFromModel(true);
            const card = document.getElementById("builder-generated-schema-card");
            if (card) {
                card.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
        });

        // Copy SQL
        document.getElementById("btn-copy-generated-sql")?.addEventListener("click", function () {
            const output = document.getElementById("builder-schema-output");
            if (output && output.textContent) {
                navigator.clipboard.writeText(output.textContent).then(() => {
                    showToast("SQL DDL copied to clipboard!");
                }).catch(() => {
                    alert("Copy failed. Please manually select and copy.");
                });
            }
        });

        // Download SQL
        document.getElementById("btn-download-generated-sql")?.addEventListener("click", function () {
            const output = document.getElementById("builder-schema-output");
            if (!output || !output.textContent) return;
            downloadBlob(output.textContent, "application/sql", "schema_generated.sql");
            showToast("Downloaded schema_generated.sql.");
        });

        // Save LocalStorage
        document.getElementById("btn-builder-save-local")?.addEventListener("click", function () {
            try {
                localStorage.setItem("dbms_phase6_er_diagram", JSON.stringify(erModel));
                showToast("Diagram saved in browser local storage.");
            } catch (e) {
                alert("Failed to save diagram: " + e.message);
            }
        });

        // Restore LocalStorage
        document.getElementById("btn-builder-load-local")?.addEventListener("click", function () {
            try {
                const saved = localStorage.getItem("dbms_phase6_er_diagram");
                if (saved) {
                    erModel = JSON.parse(saved);
                    selectedItem = null;
                    pushHistory("Restore Saved Diagram");
                    renderErDiagramCanvas();
                    populateBuilderSelects();
                    updateInspectorUI();
                    fitView();
                    generateRelationalSchemaFromModel(false);
                    showToast("Saved diagram restored.");
                } else {
                    alert("No saved diagram found in local storage.");
                }
            } catch (e) {
                alert("Failed to restore diagram: " + e.message);
            }
        });

        // Export JSON
        document.getElementById("btn-builder-export-json")?.addEventListener("click", function () {
            const jsonText = JSON.stringify(erModel, null, 2);
            downloadBlob(jsonText, "application/json", "er_model.json");
            showToast("Exported er_model.json.");
        });

        // Import JSON
        const fileInput = document.getElementById("builder-import-json-file");
        if (fileInput) {
            fileInput.addEventListener("change", function (e) {
                const file = e.target.files && e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function (ev) {
                    try {
                        const parsed = JSON.parse(ev.target.result);
                        if (!parsed || !Array.isArray(parsed.entities) || !Array.isArray(parsed.attributes) || !Array.isArray(parsed.relationships)) {
                            throw new Error("Invalid ER diagram schema. Expected { entities: [], attributes: [], relationships: [] }.");
                        }
                        erModel = parsed;
                        selectedItem = null;
                        pushHistory("Import Diagram JSON");
                        renderErDiagramCanvas();
                        populateBuilderSelects();
                        updateInspectorUI();
                        fitView();
                        generateRelationalSchemaFromModel(false);
                        showToast(`Imported ${erModel.entities.length} entities successfully.`);
                    } catch (err) {
                        alert("Failed to import JSON file: " + err.message);
                    }
                    fileInput.value = "";
                };
                reader.readAsText(file);
            });
        }

        // Export SVG
        document.getElementById("btn-builder-export-svg")?.addEventListener("click", function () {
            const svg = document.getElementById("er-builder-svg");
            if (!svg) return;
            const serializer = new XMLSerializer();
            const source = serializer.serializeToString(svg);
            const fullSvg = `<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated by DBMS Learn & Run ER Visual Editor -->\n${source}`;
            downloadBlob(fullSvg, "image/svg+xml", "er_diagram.svg");
            showToast("Exported er_diagram.svg.");
        });

        // Load Sample College Model
        document.getElementById("btn-builder-load-sample")?.addEventListener("click", function () {
            if (confirm("Load full College Management System sample diagram? Current unsaved edits will be replaced.")) {
                erModel = JSON.parse(JSON.stringify(DEFAULT_COLLEGE_MODEL));
                selectedItem = null;
                pushHistory("Load Sample College Model");
                renderErDiagramCanvas();
                populateBuilderSelects();
                updateInspectorUI();
                fitView();
                generateRelationalSchemaFromModel(false);
                showToast("Sample College ER Diagram loaded.");
            }
        });

        // Reset Diagram Canvas
        document.getElementById("btn-builder-reset-all")?.addEventListener("click", function () {
            if (confirm("Reset canvas to blank state? All entities, attributes, and relationships will be cleared.")) {
                erModel = { entities: [], attributes: [], relationships: [] };
                selectedItem = null;
                pushHistory("Clear Diagram Canvas");
                renderErDiagramCanvas();
                populateBuilderSelects();
                updateInspectorUI();
                generateRelationalSchemaFromModel(false);
                showToast("Canvas cleared.");
            }
        });
    }

    function downloadBlob(content, mimeType, filename) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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

    // ====================================================================
    // LAUNCH ALL PHASE 6 MODULE ENGINES
    // ====================================================================
    try {
        initNavigation();
        initQuizHandlers();
        initRelationalAlgebraLab();
        initErDiagramBuilder();
        syncProgressWithBackend();
        console.log("Phase 6 engines successfully initialized.");
    } catch (err) {
        console.error("Critical error launching Phase 6 engines:", err);
    }
});
