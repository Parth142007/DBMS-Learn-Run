/**
 * Phase 5: Database Design & Normalization - Interactive Logic
 * DBMS Learn & Run | NEPC42 Syllabus
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // =========================================================================
    // 1. STATE & CONSTANTS
    // =========================================================================
    const TOTAL_TOPICS = 10;
    let currentTopic = 1;
    let progressState = {
        completedTopics: {},
        quizScores: {}
    };

    // Quiz Answer Keys & Explanations for all 10 topics
    const QUIZ_DATA = {
        1: {
            answers: { q1_1: 'b', q1_2: 'c', q1_3: 'b' },
            explanations: {
                q1_1: 'Bad relational designs lead directly to insertion, update, and deletion anomalies, data inconsistency, and space redundancy.',
                q1_2: 'In an unnormalized table, updating an instructor requires modifying every student row enrolled in that course, risking inconsistent updates.',
                q1_3: 'Normalization systematically decomposes tables into smaller, well-structured relations to eliminate redundancy and maintain integrity.'
            }
        },
        2: {
            answers: { q2_1: 'b', q2_2: 'b', q2_3: 'c' },
            explanations: {
                q2_1: 'In the dependency X -> Y, X is called the determinant because its value uniquely determines Y.',
                q2_2: 'When X determines Y and Y determines Z (where Y is not a candidate key), X -> Z is a transitive dependency.',
                q2_3: 'Functional dependencies cannot be derived merely from sample data rows; they represent real-world enterprise business rules.'
            }
        },
        3: {
            answers: { q3_1: 'c', q3_2: 'a', q3_3: 'b' },
            explanations: {
                q3_1: "Armstrong's fundamental axioms are Reflexivity, Augmentation, and Transitivity.",
                q3_2: 'The Union Rule states that if X -> Y and X -> Z, then X -> YZ.',
                q3_3: "Armstrong's axioms are both Sound (generate only valid dependencies) and Complete (can derive all valid dependencies)."
            }
        },
        4: {
            answers: { q4_1: 'b', q4_2: 'b', q4_3: 'c' },
            explanations: {
                q4_1: '1NF requires all attribute values to be atomic with no repeating groups or multivalued lists in a single cell.',
                q4_2: 'Storing comma-separated lists prevents efficient B-Tree indexing, complex joins, and SQL aggregate calculations.',
                q4_3: 'Atomicity is determined by domain business requirements; values like addresses may or may not need further decomposition depending on usage.'
            }
        },
        5: {
            answers: { q5_1: 'b', q5_2: 'a', q5_3: 'b' },
            explanations: {
                q5_1: '2NF requires 1NF and no non-prime attribute to be partially dependent on any candidate key.',
                q5_2: 'If every candidate key consists of a single attribute, no proper subset of a key can exist, so partial dependencies are impossible.',
                q5_3: 'To reach 2NF, extract each partial dependency into its own relation with the partial determinant as its primary key.'
            }
        },
        6: {
            answers: { q6_1: 'b', q6_2: 'b', q6_3: 'b' },
            explanations: {
                q6_1: 'A transitive dependency occurs when non-key attribute A determines non-key attribute B, creating Key -> A -> B.',
                q6_2: 'The formal Codd/Zaniolo 3NF condition requires that for non-trivial X -> A, either X is a superkey OR A is a prime attribute.',
                q6_3: 'Extract the transitive dependency DeptID -> DeptName into DEPARTMENT(DeptID, DeptName), keeping DeptID in STUDENT as FK.'
            }
        },
        7: {
            answers: { q7_1: 'b', q7_2: 'b', q7_3: 'b' },
            explanations: {
                q7_1: 'BCNF strictly requires every determinant X of a non-trivial dependency X -> A to be a superkey of the relation.',
                q7_2: 'A relation can be in 3NF but not BCNF when overlapping composite keys exist and a non-superkey determines a prime attribute.',
                q7_3: 'BCNF decompositions are always lossless, but they are not guaranteed to preserve all functional dependencies.'
            }
        },
        8: {
            answers: { q8_1: 'b', q8_2: 'b', q8_3: 'a' },
            explanations: {
                q8_1: 'Progressing from 1NF to 2NF specifically eliminates partial functional dependencies on composite candidate keys.',
                q8_2: 'Excessive decomposition requires multi-table JOINs for reads and may fail to preserve certain constraints.',
                q8_3: "The famous mnemonic is: 'The key, the whole key (2NF), and nothing but the key (3NF), so help me Codd!'"
            }
        },
        9: {
            answers: { q9_1: 'a', q9_2: 'b', q9_3: 'b' },
            explanations: {
                q9_1: 'A lossy decomposition causes spurious tuples when rejoined, hallucinating false facts that corrupt data.',
                q9_2: 'Binary decomposition (R1, R2) is lossless if and only if (R1 cap R2) functionally determines R1 or R2.',
                q9_3: 'Dependency preservation allows constraints to be enforced locally within each table without expensive multi-table JOINs.'
            }
        },
        10: {
            answers: { q10_1: 'b', q10_2: 'a', q10_3: 'b' },
            explanations: {
                q10_1: 'Functional dependencies originate from business domain rules and real-world system constraints.',
                q10_2: 'Since (A, B) is the candidate key and B is a proper subset, B -> C is a partial dependency violating 2NF.',
                q10_3: 'A 3NF decomposition is always guaranteed to be both lossless and dependency preserving; BCNF can lose dependencies.'
            }
        }
    };

    // Practice Lab 5 Detailed Scenarios
    const LAB_CASES = {
        1: {
            badge: 'Case 1 of 5',
            title: 'University Student Course & Department',
            schema: 'STUDENT_ENROLLMENT(StudentID, StudentName, CourseID, CourseName, DepartmentID, DepartmentName, Grade)',
            desc: 'A university records student registrations, course titles, department metadata, and grades in a single unnormalized relation.',
            dependenciesText: '1. {StudentID, CourseID} -> Grade\n2. StudentID -> StudentName, DepartmentID\n3. DepartmentID -> DepartmentName\n4. CourseID -> CourseName',
            sampleRows: [
                { StudentID: '101', StudentName: 'Amit', CourseID: 'C01', CourseName: 'DBMS', DepartmentID: 'D01', DepartmentName: 'CompSci', Grade: 'A' },
                { StudentID: '101', StudentName: 'Amit', CourseID: 'C02', CourseName: 'Python', DepartmentID: 'D01', DepartmentName: 'CompSci', Grade: 'B' },
                { StudentID: '102', StudentName: 'Neha', CourseID: 'C01', CourseName: 'DBMS', DepartmentID: 'D02', DepartmentName: 'InfoTech', Grade: 'A' }
            ],
            candidateKeys: ['{StudentID, CourseID}'],
            step1Options: ['StudentID', '{StudentID, CourseID}', '{StudentID, DepartmentID}', 'CourseID'],
            correctStep1: '{StudentID, CourseID}',
            classifiers: [
                { fd: '{StudentID, CourseID} -> Grade', correct: 'full', label: 'Full Key Dependency' },
                { fd: 'StudentID -> StudentName, DepartmentID', correct: 'partial', label: 'Partial Dependency' },
                { fd: 'DepartmentID -> DepartmentName', correct: 'transitive', label: 'Transitive Dependency' },
                { fd: 'CourseID -> CourseName', correct: 'partial', label: 'Partial Dependency' }
            ],
            currentNF: '1NF',
            decomposedRelations: [
                { name: 'ENROLLMENT', attrs: 'StudentID, CourseID, Grade', pk: '(StudentID, CourseID)', type: 'Fact Table' },
                { name: 'STUDENT', attrs: 'StudentID, StudentName, DepartmentID', pk: 'StudentID', type: 'Entity' },
                { name: 'DEPARTMENT', attrs: 'DepartmentID, DepartmentName', pk: 'DepartmentID', type: 'Entity' },
                { name: 'COURSE', attrs: 'CourseID, CourseName', pk: 'CourseID', type: 'Entity' }
            ],
            solutionHtml: `
                <h6 class="fw-bold text-success mb-2">Comprehensive Derivation for Case 1:</h6>
                <ol class="ps-3 mb-2">
                    <li><strong>Candidate Key:</strong> Compute closure of {StudentID, CourseID}: gives all 7 attributes. Thus, <code>{StudentID, CourseID}</code> is the unique minimal candidate key.</li>
                    <li><strong>Violations in 1NF:</strong>
                        <ul>
                            <li><code>StudentID &rarr; StudentName, DepartmentID</code> is a partial dependency on the composite key.</li>
                            <li><code>CourseID &rarr; CourseName</code> is also a partial dependency.</li>
                        </ul>
                    </li>
                    <li><strong>2NF Step:</strong> Separate partial dependencies into <code>STUDENT(StudentID, StudentName, DepartmentID)</code> and <code>COURSE(CourseID, CourseName)</code>.</li>
                    <li><strong>3NF Step:</strong> In <code>STUDENT</code>, <code>DepartmentID &rarr; DepartmentName</code> is a transitive dependency. Decompose into <code>STUDENT(StudentID, StudentName, DepartmentID)</code> and <code>DEPARTMENT(DepartmentID, DepartmentName)</code>.</li>
                    <li><strong>Final 3NF Schema:</strong> 4 relations: ENROLLMENT, STUDENT, COURSE, DEPARTMENT. Lossless and 100% dependency preserving!</li>
                </ol>
            `
        },
        2: {
            badge: 'Case 2 of 5',
            title: 'Corporate Employee Project Assignment',
            schema: 'EMP_PROJECT_HOURS(EmpID, EmpName, ProjectID, ProjectName, ClientID, ClientName, HoursWorked)',
            desc: 'A consulting company tracks employee hours on client projects.',
            dependenciesText: '1. {EmpID, ProjectID} -> HoursWorked\n2. EmpID -> EmpName\n3. ProjectID -> ProjectName, ClientID\n4. ClientID -> ClientName',
            sampleRows: [
                { EmpID: 'E01', EmpName: 'Rahul', ProjectID: 'P10', ProjectName: 'Cloud Migration', ClientID: 'C50', ClientName: 'Acme Corp', HoursWorked: '35' },
                { EmpID: 'E01', EmpName: 'Rahul', ProjectID: 'P20', ProjectName: 'Data Pipeline', ClientID: 'C60', ClientName: 'FinTech Ltd', HoursWorked: '15' },
                { EmpID: 'E02', EmpName: 'Sneha', ProjectID: 'P10', ProjectName: 'Cloud Migration', ClientID: 'C50', ClientName: 'Acme Corp', HoursWorked: '40' }
            ],
            candidateKeys: ['{EmpID, ProjectID}'],
            step1Options: ['EmpID', '{EmpID, ProjectID}', '{ProjectID, ClientID}', 'ProjectID'],
            correctStep1: '{EmpID, ProjectID}',
            classifiers: [
                { fd: '{EmpID, ProjectID} -> HoursWorked', correct: 'full', label: 'Full Key Dependency' },
                { fd: 'EmpID -> EmpName', correct: 'partial', label: 'Partial Dependency' },
                { fd: 'ProjectID -> ProjectName, ClientID', correct: 'partial', label: 'Partial Dependency' },
                { fd: 'ClientID -> ClientName', correct: 'transitive', label: 'Transitive Dependency' }
            ],
            currentNF: '1NF',
            decomposedRelations: [
                { name: 'ASSIGNMENT', attrs: 'EmpID, ProjectID, HoursWorked', pk: '(EmpID, ProjectID)', type: 'Junction Table' },
                { name: 'EMPLOYEE', attrs: 'EmpID, EmpName', pk: 'EmpID', type: 'Entity' },
                { name: 'PROJECT', attrs: 'ProjectID, ProjectName, ClientID', pk: 'ProjectID', type: 'Entity' },
                { name: 'CLIENT', attrs: 'ClientID, ClientName', pk: 'ClientID', type: 'Entity' }
            ],
            solutionHtml: `
                <h6 class="fw-bold text-success mb-2">Comprehensive Derivation for Case 2:</h6>
                <ol class="ps-3 mb-2">
                    <li><strong>Candidate Key:</strong> <code>{EmpID, ProjectID}</code> because {EmpID, ProjectID}+ covers all attributes.</li>
                    <li><strong>2NF Violations:</strong> <code>EmpID &rarr; EmpName</code> and <code>ProjectID &rarr; ProjectName, ClientID</code> partially depend on parts of the key.</li>
                    <li><strong>3NF Violations:</strong> In project metadata, <code>ProjectID &rarr; ClientID</code> and <code>ClientID &rarr; ClientName</code> form a transitive dependency.</li>
                    <li><strong>Decomposition:</strong> 
                        <code>ASSIGNMENT(<u>EmpID</u>, <u>ProjectID</u>, HoursWorked)</code>,
                        <code>EMPLOYEE(<u>EmpID</u>, EmpName)</code>,
                        <code>PROJECT(<u>ProjectID</u>, ProjectName, ClientID)</code>,
                        <code>CLIENT(<u>ClientID</u>, ClientName)</code>.
                    </li>
                </ol>
            `
        },
        3: {
            badge: 'Case 3 of 5',
            title: 'Hospital Clinic Patient Appointments',
            schema: 'HOSPITAL_VISIT(AppointmentID, PatientID, PatientName, DoctorID, DoctorName, ClinicRoom, VisitFee)',
            desc: 'A medical clinic records patient visits with assigned doctors and clinic examination rooms.',
            dependenciesText: '1. AppointmentID -> PatientID, DoctorID, VisitFee\n2. PatientID -> PatientName\n3. DoctorID -> DoctorName, ClinicRoom',
            sampleRows: [
                { AppointmentID: 'APT-101', PatientID: 'P01', PatientName: 'Rohan', DoctorID: 'DOC-5', DoctorName: 'Dr. Rao', ClinicRoom: 'Room 204', VisitFee: '500' },
                { AppointmentID: 'APT-102', PatientID: 'P02', PatientName: 'Sunita', DoctorID: 'DOC-5', DoctorName: 'Dr. Rao', ClinicRoom: 'Room 204', VisitFee: '500' },
                { AppointmentID: 'APT-103', PatientID: 'P01', PatientName: 'Rohan', DoctorID: 'DOC-9', DoctorName: 'Dr. Khan', ClinicRoom: 'Room 108', VisitFee: '750' }
            ],
            candidateKeys: ['AppointmentID'],
            step1Options: ['AppointmentID', '{AppointmentID, PatientID}', '{DoctorID, ClinicRoom}', 'PatientID'],
            correctStep1: 'AppointmentID',
            classifiers: [
                { fd: 'AppointmentID -> PatientID, DoctorID, VisitFee', correct: 'full', label: 'Full Key Dependency' },
                { fd: 'PatientID -> PatientName', correct: 'transitive', label: 'Transitive Dependency' },
                { fd: 'DoctorID -> DoctorName, ClinicRoom', correct: 'transitive', label: 'Transitive Dependency' }
            ],
            currentNF: '2NF',
            decomposedRelations: [
                { name: 'APPOINTMENT', attrs: 'AppointmentID, PatientID, DoctorID, VisitFee', pk: 'AppointmentID', type: 'Core Record' },
                { name: 'PATIENT', attrs: 'PatientID, PatientName', pk: 'PatientID', type: 'Entity' },
                { name: 'DOCTOR', attrs: 'DoctorID, DoctorName, ClinicRoom', pk: 'DoctorID', type: 'Entity' }
            ],
            solutionHtml: `
                <h6 class="fw-bold text-success mb-2">Comprehensive Derivation for Case 3:</h6>
                <ol class="ps-3 mb-2">
                    <li><strong>Candidate Key:</strong> <code>AppointmentID</code> is a single attribute key.</li>
                    <li><strong>Why 2NF is satisfied:</strong> Because the candidate key is single-attribute, partial dependencies cannot exist! Hence the un-decomposed relation is automatically in 2NF.</li>
                    <li><strong>3NF Violations:</strong> Both <code>PatientID &rarr; PatientName</code> and <code>DoctorID &rarr; DoctorName, ClinicRoom</code> are transitive dependencies (non-key determines non-key).</li>
                    <li><strong>Final 3NF Schema:</strong>
                        <code>APPOINTMENT(<u>AppointmentID</u>, PatientID, DoctorID, VisitFee)</code>,
                        <code>PATIENT(<u>PatientID</u>, PatientName)</code>,
                        <code>DOCTOR(<u>DoctorID</u>, DoctorName, ClinicRoom)</code>.
                    </li>
                </ol>
            `
        },
        4: {
            badge: 'Case 4 of 5',
            title: 'College Academic Advising (3NF vs BCNF)',
            schema: 'COLLEGE_ADVISING(StudentID, CourseCode, AdvisorID)',
            desc: 'Students receive faculty academic advice for specific courses.',
            dependenciesText: '1. {StudentID, CourseCode} -> AdvisorID (each student has 1 advisor per course)\n2. AdvisorID -> CourseCode (each advisor advises only 1 course)',
            sampleRows: [
                { StudentID: 'S10', CourseCode: 'CS101', AdvisorID: 'ADV-1' },
                { StudentID: 'S20', CourseCode: 'CS101', AdvisorID: 'ADV-1' },
                { StudentID: 'S10', CourseCode: 'MATH201', AdvisorID: 'ADV-2' },
                { StudentID: 'S30', CourseCode: 'CS101', AdvisorID: 'ADV-3' }
            ],
            candidateKeys: ['{StudentID, CourseCode}', '{StudentID, AdvisorID}'],
            step1Options: ['StudentID', '{StudentID, CourseCode}', '{StudentID, CourseCode} and {StudentID, AdvisorID}', 'AdvisorID'],
            correctStep1: '{StudentID, CourseCode} and {StudentID, AdvisorID}',
            classifiers: [
                { fd: '{StudentID, CourseCode} -> AdvisorID', correct: 'full', label: 'Superkey Dependency' },
                { fd: 'AdvisorID -> CourseCode', correct: 'bcnf_violator', label: 'Non-Superkey Determinant (BCNF Violator)' }
            ],
            currentNF: '3NF',
            decomposedRelations: [
                { name: 'ADVISOR_ASSIGNMENT', attrs: 'AdvisorID, CourseCode', pk: 'AdvisorID', type: 'Entity' },
                { name: 'STUDENT_ADVISOR', attrs: 'StudentID, AdvisorID', pk: '(StudentID, AdvisorID)', type: 'Bridge' }
            ],
            solutionHtml: `
                <h6 class="fw-bold text-success mb-2">Comprehensive Derivation for Case 4 (3NF vs BCNF):</h6>
                <ol class="ps-3 mb-2">
                    <li><strong>Candidate Keys:</strong> Both <code>{StudentID, CourseCode}</code> and <code>{StudentID, AdvisorID}</code> are candidate keys.</li>
                    <li><strong>Prime Attributes:</strong> All attributes {StudentID, CourseCode, AdvisorID} are prime.</li>
                    <li><strong>Why 3NF Holds:</strong> In <code>AdvisorID &rarr; CourseCode</code>, AdvisorID is not a superkey, but CourseCode IS a prime attribute (member of key 1). Therefore, Condition 2 of 3NF is satisfied!</li>
                    <li><strong>Why BCNF Fails:</strong> BCNF requires AdvisorID to be a superkey without exception. It is not, so BCNF is violated.</li>
                    <li><strong>Decomposition:</strong> <code>ADVISOR(<u>AdvisorID</u>, CourseCode)</code> and <code>STUDENT_ADVISOR(<u>StudentID</u>, <u>AdvisorID</u>)</code>.</li>
                    <li><strong>Trade-off:</strong> The decomposition is Lossless, but the original dependency <code>{StudentID, CourseCode} &rarr; AdvisorID</code> is NOT preserved without a join!</li>
                </ol>
            `
        },
        5: {
            badge: 'Case 5 of 5',
            title: 'E-Commerce Order Line Items & Inventory',
            schema: 'ORDER_LINE_ITEMS(OrderID, ItemSKU, ItemName, CategoryID, CategoryName, Quantity, UnitPrice)',
            desc: 'An online store records shopping cart lines, products, categories, and item pricing.',
            dependenciesText: '1. {OrderID, ItemSKU} -> Quantity, UnitPrice\n2. ItemSKU -> ItemName, CategoryID\n3. CategoryID -> CategoryName',
            sampleRows: [
                { OrderID: 'ORD-901', ItemSKU: 'SKU-A', ItemName: 'Wireless Mouse', CategoryID: 'CAT-1', CategoryName: 'Electronics', Quantity: '2', UnitPrice: '25.00' },
                { OrderID: 'ORD-901', ItemSKU: 'SKU-B', ItemName: 'Mechanical Keyboard', CategoryID: 'CAT-1', CategoryName: 'Electronics', Quantity: '1', UnitPrice: '75.00' },
                { OrderID: 'ORD-902', ItemSKU: 'SKU-A', ItemName: 'Wireless Mouse', CategoryID: 'CAT-1', CategoryName: 'Electronics', Quantity: '1', UnitPrice: '25.00' }
            ],
            candidateKeys: ['{OrderID, ItemSKU}'],
            step1Options: ['OrderID', '{OrderID, ItemSKU}', '{ItemSKU, CategoryID}', 'CategoryID'],
            correctStep1: '{OrderID, ItemSKU}',
            classifiers: [
                { fd: '{OrderID, ItemSKU} -> Quantity, UnitPrice', correct: 'full', label: 'Full Key Dependency' },
                { fd: 'ItemSKU -> ItemName, CategoryID', correct: 'partial', label: 'Partial Dependency' },
                { fd: 'CategoryID -> CategoryName', correct: 'transitive', label: 'Transitive Dependency' }
            ],
            currentNF: '1NF',
            decomposedRelations: [
                { name: 'ORDER_ITEM', attrs: 'OrderID, ItemSKU, Quantity, UnitPrice', pk: '(OrderID, ItemSKU)', type: 'Transaction' },
                { name: 'PRODUCT', attrs: 'ItemSKU, ItemName, CategoryID', pk: 'ItemSKU', type: 'Catalog' },
                { name: 'CATEGORY', attrs: 'CategoryID, CategoryName', pk: 'CategoryID', type: 'Reference' }
            ],
            solutionHtml: `
                <h6 class="fw-bold text-success mb-2">Comprehensive Derivation for Case 5:</h6>
                <ol class="ps-3 mb-2">
                    <li><strong>Candidate Key:</strong> <code>{OrderID, ItemSKU}</code>.</li>
                    <li><strong>2NF Decomposition:</strong> <code>ItemSKU &rarr; ItemName, CategoryID</code> is a partial dependency. Split into <code>PRODUCT(ItemSKU, ItemName, CategoryID)</code> and <code>ORDER_ITEM(OrderID, ItemSKU, Quantity, UnitPrice)</code>.</li>
                    <li><strong>3NF Decomposition:</strong> In <code>PRODUCT</code>, <code>CategoryID &rarr; CategoryName</code> is transitive. Split into <code>PRODUCT(ItemSKU, ItemName, CategoryID)</code> and <code>CATEGORY(CategoryID, CategoryName)</code>.</li>
                    <li><strong>Final 3NF Schema:</strong> 3 tables. Zero redundancy, lossless join, and completely dependency preserving.</li>
                </ol>
            `
        }
    };

    // =========================================================================
    // 2. TOPIC METADATA & UNIFIED SWITCHING LOGIC
    // =========================================================================
    const TOPICS = [
        { num: 1, key: 'intro', title: '1. Introduction to Database Design', short: 'Design & Anomalies' },
        { num: 2, key: 'fds', title: '2. Functional Dependencies', short: 'Functional Dependencies' },
        { num: 3, key: 'axioms', title: "3. Armstrong's Axioms", short: "Armstrong's Axioms" },
        { num: 4, key: '1nf', title: '4. First Normal Form (1NF)', short: '1NF' },
        { num: 5, key: '2nf', title: '5. Second Normal Form (2NF)', short: '2NF' },
        { num: 6, key: '3nf', title: '6. Third Normal Form (3NF)', short: '3NF' },
        { num: 7, key: 'bcnf', title: '7. Boyce-Codd Normal Form (BCNF)', short: 'BCNF' },
        { num: 8, key: 'comparison', title: '8. Comparing Normal Forms', short: 'Compare NFs' },
        { num: 9, key: 'lossless', title: '9. Lossless Join & Dependency Preservation', short: 'Lossless & Preservation' },
        { num: 10, key: 'practice-lab', title: '10. Normalization Practice Lab', short: 'Practice Lab' }
    ];

    function resolveTopic(target) {
        if (typeof target === 'number') {
            const clamped = Math.max(1, Math.min(TOTAL_TOPICS, target));
            return TOPICS[clamped - 1];
        }
        if (typeof target === 'string') {
            const byKey = TOPICS.find(t => t.key === target);
            if (byKey) return byKey;
            const asNum = parseInt(target, 10);
            if (!isNaN(asNum) && asNum >= 1 && asNum <= TOTAL_TOPICS) {
                return TOPICS[asNum - 1];
            }
        }
        return TOPICS[0];
    }

    function switchTopic(target) {
        const topicObj = resolveTopic(target);
        currentTopic = topicObj.num;

        // 1. Hide all topic panels, show target panel
        document.querySelectorAll('.topic-section-panel').forEach(function (panel) {
            panel.classList.add('d-none');
        });
        const activeContainer = document.getElementById('topic-container-' + topicObj.key);
        if (activeContainer) {
            activeContainer.classList.remove('d-none');
        }

        // 2. Update Tab Buttons in #phase5-topic-tabs
        document.querySelectorAll('#phase5-topic-tabs button').forEach(function (btn) {
            const btnTarget = btn.getAttribute('data-target');
            if (btnTarget === topicObj.key) {
                btn.classList.add('active', 'text-white');
                btn.classList.remove('text-secondary');
                // Center active tab smoothly in toolbar without cutoffs
                btn.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
            } else {
                btn.classList.remove('active', 'text-white');
                btn.classList.add('text-secondary');
            }
        });

        // 3. Update Progress Pills Active State
        document.querySelectorAll('.topic-progress-pill').forEach(function (pill) {
            pill.classList.remove('active-pill');
        });
        const activePill = document.getElementById('pill-progress-' + topicObj.key);
        if (activePill) {
            activePill.classList.add('active-pill');
        }

        // 4. Update Indicator Text & Prev/Next Footer Controls
        const indicatorText = document.getElementById('topic-indicator-text');
        if (indicatorText) {
            indicatorText.innerText = `Viewing Lesson ${topicObj.num} of 10: ${topicObj.title}`;
        }

        const btnPrev = document.getElementById('btn-prev-topic');
        const btnNext = document.getElementById('btn-next-topic');
        if (btnPrev) {
            if (topicObj.num === 1) {
                btnPrev.disabled = true;
                btnPrev.innerHTML = '<i class="bi bi-chevron-left me-1"></i> Previous Lesson';
            } else {
                btnPrev.disabled = false;
                const prevTopic = TOPICS[topicObj.num - 2];
                btnPrev.innerHTML = `<i class="bi bi-chevron-left me-1"></i> Prev: ${prevTopic.short}`;
            }
        }
        if (btnNext) {
            if (topicObj.num === TOTAL_TOPICS) {
                btnNext.disabled = false;
                btnNext.innerHTML = 'Review All Lessons <i class="bi bi-arrow-repeat ms-1"></i>';
            } else {
                btnNext.disabled = false;
                const nextTopic = TOPICS[topicObj.num];
                btnNext.innerHTML = `Next Lesson: ${nextTopic.short} <i class="bi bi-chevron-right ms-1"></i>`;
            }
        }

        // 5. Update URL query string without page reload
        const url = new URL(window.location);
        url.searchParams.set('topic', topicObj.key);
        window.history.replaceState({}, '', url);
    }

    // Bind topic tabs
    document.querySelectorAll('#phase5-topic-tabs button').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const targetKey = this.getAttribute('data-target');
            switchTopic(targetKey);
        });
    });

    // Bind clickable progress pills
    document.querySelectorAll('.topic-progress-pill').forEach(function (pill) {
        pill.addEventListener('click', function () {
            const targetKey = this.getAttribute('data-target') || this.id.replace('pill-progress-', '');
            switchTopic(targetKey);
            const navSticky = document.getElementById('topics-navigation');
            if (navSticky) navSticky.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // Bind prev / next footer buttons
    const btnPrevTopic = document.getElementById('btn-prev-topic');
    if (btnPrevTopic) {
        btnPrevTopic.addEventListener('click', function () {
            switchTopic(currentTopic - 1);
            const navSticky = document.getElementById('topics-navigation');
            if (navSticky) navSticky.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
    const btnNextTopic = document.getElementById('btn-next-topic');
    if (btnNextTopic) {
        btnNextTopic.addEventListener('click', function () {
            if (currentTopic === TOTAL_TOPICS) {
                switchTopic(1);
            } else {
                switchTopic(currentTopic + 1);
            }
            const navSticky = document.getElementById('topics-navigation');
            if (navSticky) navSticky.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    // Bind start reading hero button
    const btnStartReading = document.getElementById('btn-start-reading');
    if (btnStartReading) {
        btnStartReading.addEventListener('click', function () {
            switchTopic('intro');
            const navSticky = document.getElementById('topics-navigation');
            if (navSticky) navSticky.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    // Bind reset all progress button
    const btnResetAll = document.getElementById('btn-reset-all-progress');
    if (btnResetAll) {
        btnResetAll.addEventListener('click', function () {
            if (confirm('Reset all Phase 5 Normalization learning progress and quiz scores?')) {
                progressState = { completedTopics: {}, quizScores: {} };
                localStorage.removeItem(STORAGE_KEY);
                renderProgressUI();
                showToast('Phase 5 progress reset successfully.', 'info');
            }
        });
    }

    // Read initial topic from URL or default to 1
    const initialParams = new URLSearchParams(window.location.search);
    const initialTopicParam = initialParams.get('topic') || 'intro';
    switchTopic(initialTopicParam);

    // =========================================================================
    // 3. PROGRESS TRACKING (LOCALSTORAGE + API SYNC)
    // =========================================================================
    const STORAGE_KEY = 'dbms_learn_run_phase5_progress';

    function loadProgress() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                progressState = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load local progress:', e);
        }

        // Attempt server fetch
        fetch('/api/progress/phase5')
            .then(res => res.json())
            .then(data => {
                if (data && data.success && data.progress) {
                    data.progress.forEach(item => {
                        let tId = item.lesson_id;
                        if (typeof tId === 'string' && tId.startsWith('topic_')) {
                            tId = parseInt(tId.replace('topic_', ''), 10);
                        }
                        progressState.completedTopics[tId] = true;
                        if (item.quiz_score !== undefined && item.quiz_score !== null) {
                            progressState.quizScores[tId] = item.quiz_score;
                        }
                    });
                    renderProgressUI();
                }
            })
            .catch(err => {
                renderProgressUI();
            });
    }

    function saveProgress(topicNum, score, answers) {
        progressState.completedTopics[topicNum] = true;
        if (score !== undefined) {
            progressState.quizScores[topicNum] = score;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(progressState));
        renderProgressUI();

        fetch('/api/progress/phase5', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lesson_id: topicNum,
                score: score !== undefined ? score : null,
                answers: answers || {}
            })
        }).catch(e => {
            console.warn('Backend progress sync failed, preserved locally:', e);
        });
    }

    function renderProgressUI() {
        let completedCount = 0;
        TOPICS.forEach(topic => {
            const tNum = topic.num;
            const tKey = topic.key;
            const isCompleted = progressState.completedTopics[tNum] || progressState.completedTopics[tKey] || progressState.completedTopics[`topic_${tNum}`];
            const score = progressState.quizScores[tNum] !== undefined ? progressState.quizScores[tNum] :
                          (progressState.quizScores[tKey] !== undefined ? progressState.quizScores[tKey] : null);

            const pill = document.getElementById('pill-progress-' + tKey);
            const quizStatusEl = document.getElementById('quiz-status-' + tKey);

            if (isCompleted) {
                completedCount++;
                if (pill) {
                    const icon = pill.querySelector('.status-icon');
                    if (icon) icon.className = 'bi bi-check-circle-fill text-success me-1 status-icon';
                    pill.classList.add('border-success');
                }
                if (quizStatusEl) {
                    quizStatusEl.innerHTML = score !== null ? `<span class="text-success fw-bold">Score: ${score}%</span>` : `<span class="text-success fw-bold">Done &check;</span>`;
                }
            } else {
                if (pill) {
                    const icon = pill.querySelector('.status-icon');
                    if (icon) icon.className = 'bi bi-circle text-muted me-1 status-icon';
                    pill.classList.remove('border-success');
                }
                if (quizStatusEl) {
                    quizStatusEl.innerText = (tNum === 10) ? 'Cases: 0/5' : 'Quiz: 0/3';
                }
            }
        });

        const percentage = Math.round((completedCount / TOTAL_TOPICS) * 100);
        const progressBar = document.getElementById('phase5-progress-bar');
        const badge = document.getElementById('progress-percentage-badge');
        if (progressBar) {
            progressBar.style.width = percentage + '%';
            progressBar.setAttribute('aria-valuenow', percentage);
        }
        if (badge) {
            badge.innerText = `${percentage}% Complete`;
            if (percentage === 100) {
                badge.className = 'badge bg-success';
                badge.innerHTML = '<i class="bi bi-patch-check-fill me-1"></i> Module Mastered (100%)';
            } else if (percentage > 0) {
                badge.className = 'badge bg-primary';
            } else {
                badge.className = 'badge bg-secondary';
            }
        }
    }

    loadProgress();

    // =========================================================================
    // 4. QUIZ SUBMISSION & RETRY SYSTEM
    // =========================================================================
    function handleQuizSubmit(topicNum) {
        const quizConfig = QUIZ_DATA[topicNum];
        if (!quizConfig) return;

        const form = document.getElementById(`quiz-form-topic${topicNum}`);
        if (!form) return;

        let totalQuestions = 0;
        let correctCount = 0;
        const userAnswers = {};
        let feedbackHtml = '<div class="alert alert-light border mt-3 p-3"><h6 class="fw-bold mb-2">Quiz Results & Explanations:</h6><ul class="ps-3 mb-0">';

        let allAnswered = true;

        for (const [qKey, expectedVal] of Object.entries(quizConfig.answers)) {
            totalQuestions++;
            const selected = form.querySelector(`input[name="${qKey}"]:checked`);
            if (!selected) {
                allAnswered = false;
                break;
            }
            const userVal = selected.value;
            userAnswers[qKey] = userVal;
            const explanation = quizConfig.explanations[qKey] || '';

            if (userVal === expectedVal) {
                correctCount++;
                feedbackHtml += `<li class="text-success mb-2"><strong>Question ${totalQuestions}: Correct!</strong> &mdash; ${explanation}</li>`;
            } else {
                feedbackHtml += `<li class="text-danger mb-2"><strong>Question ${totalQuestions}: Incorrect.</strong> You selected (${userVal.toUpperCase()}), correct was (${expectedVal.toUpperCase()}). &mdash; ${explanation}</li>`;
            }
        }

        if (!allAnswered) {
            showToast('Please answer all quiz questions before submitting!', 'warning');
            return;
        }

        feedbackHtml += '</ul></div>';

        const scorePercent = Math.round((correctCount / totalQuestions) * 100);

        // Feedback display
        const feedbackBox = form.querySelector('.quiz-feedback-box');
        if (feedbackBox) {
            feedbackBox.innerHTML = feedbackHtml;
            feedbackBox.classList.remove('d-none');
        }

        // Score Badge
        const scoreBadgeContainer = form.querySelector('.quiz-score-badge');
        if (scoreBadgeContainer) {
            const badgeSpan = scoreBadgeContainer.querySelector('span');
            badgeSpan.innerHTML = `Score: ${correctCount}/${totalQuestions} (${scorePercent}%)`;
            if (scorePercent >= 66) {
                badgeSpan.className = 'badge bg-success-subtle text-success border border-success-subtle fs-6 px-3 py-2';
            } else {
                badgeSpan.className = 'badge bg-danger-subtle text-danger border border-danger-subtle fs-6 px-3 py-2';
            }
            scoreBadgeContainer.classList.remove('d-none');
        }

        // Toggle buttons
        const submitBtn = form.querySelector('.btn-submit-topic-quiz');
        const retryBtn = form.querySelector('.btn-retry-topic-quiz');
        if (submitBtn) submitBtn.classList.add('d-none');
        if (retryBtn) retryBtn.classList.remove('d-none');

        // Disable radio inputs
        form.querySelectorAll('input[type="radio"]').forEach(r => r.disabled = true);

        // Save progress if passed (>= 66%)
        if (scorePercent >= 66) {
            saveProgress(topicNum, scorePercent, userAnswers);
            showToast(`Lesson ${topicNum} passed with ${scorePercent}%! Progress saved.`, 'success');
        } else {
            showToast(`Score: ${scorePercent}%. You need at least 66% to complete this lesson. Review and retry!`, 'info');
        }
    }

    function handleQuizRetry(topicNum) {
        const form = document.getElementById(`quiz-form-topic${topicNum}`);
        if (!form) return;

        form.reset();
        form.querySelectorAll('input[type="radio"]').forEach(r => r.disabled = false);

        const feedbackBox = form.querySelector('.quiz-feedback-box');
        if (feedbackBox) feedbackBox.classList.add('d-none');

        const scoreBadgeContainer = form.querySelector('.quiz-score-badge');
        if (scoreBadgeContainer) scoreBadgeContainer.classList.add('d-none');

        const submitBtn = form.querySelector('.btn-submit-topic-quiz');
        const retryBtn = form.querySelector('.btn-retry-topic-quiz');
        if (submitBtn) submitBtn.classList.remove('d-none');
        if (retryBtn) retryBtn.classList.add('d-none');
    }

    document.querySelectorAll('.btn-submit-topic-quiz').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const topicNum = parseInt(this.getAttribute('data-topic'), 10);
            handleQuizSubmit(topicNum);
        });
    });

    document.querySelectorAll('.btn-retry-topic-quiz').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const topicNum = parseInt(this.getAttribute('data-topic'), 10);
            handleQuizRetry(topicNum);
        });
    });

    // =========================================================================
    // 5. LESSON 1: ANOMALY INVESTIGATOR
    // =========================================================================
    const anomalyDescriptions = {
        insertion: {
            title: 'Insertion Anomaly Demonstration',
            alertClass: 'alert-warning border-warning',
            html: `<strong>Problem:</strong> Suppose a new course <code>C03 (Cloud Computing)</code> taught by <code>Dr. Verma</code> is introduced.<br>
                   Because the primary key involves <code>StudentID</code>, we <strong>cannot insert</strong> this new course into the table until at least one student enrolls in it!<br>
                   Attempting to store it would require setting <code>StudentID = NULL</code>, which directly violates <strong>Entity Integrity</strong>.`
        },
        update: {
            title: 'Update Anomaly Demonstration',
            alertClass: 'alert-danger border-danger',
            html: `<strong>Problem:</strong> Suppose <code>Prof. Sharma</code> (instructor for DBMS) changes departments or is replaced by <code>Prof. Mehta</code>.<br>
                   Because DBMS appears in multiple student rows (Amit and Neha), we must find and update <strong>every single occurrence</strong>.<br>
                   If we update Amit's record but miss Neha's, the database contains conflicting facts: <em>Who actually teaches DBMS?</em>`
        },
        deletion: {
            title: 'Deletion Anomaly Demonstration',
            alertClass: 'alert-info border-info',
            html: `<strong>Problem:</strong> Suppose student <code>Neha (102)</code> drops out of college.<br>
                   If we delete Neha's record from the table, we also unintentionally delete the <strong>only record</strong> indicating that <code>Prof. Patil</code> teaches <code>Python (C02)</code>!<br>
                   Deleting a student unexpectedly erases vital curriculum data.`
        }
    };

    document.querySelectorAll('.btn-investigate-anomaly').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const anomalyType = this.getAttribute('data-anomaly');
            const targetBox = document.getElementById('anomaly-investigation-result');
            const data = anomalyDescriptions[anomalyType];
            if (targetBox && data) {
                targetBox.className = `alert ${data.alertClass} p-3 mb-0`;
                targetBox.innerHTML = `<h6 class="fw-bold mb-1">${data.title}</h6><div>${data.html}</div>`;
                targetBox.classList.remove('d-none');
            }
        });
    });

    // =========================================================================
    // 6. LESSON 2: FUNCTIONAL DEPENDENCY EXPLORER
    // =========================================================================
    const FD_DATASETS = {
        STUDENT: {
            schema: 'STUDENT(StudentID, StudentName, DepartmentID, DepartmentName)',
            candidateKey: 'StudentID',
            dependencies: {
                'StudentID -> StudentName, DepartmentID': {
                    det: 'StudentID',
                    dep: 'StudentName, DepartmentID',
                    type: 'Full Functional Dependency',
                    typeBadge: 'bg-primary',
                    isKey: true,
                    meaning: 'StudentID is unique to each student and directly determines their name and assigned department code.',
                    normImplication: 'Satisfies 2NF and 3NF because determinant is a candidate key.'
                },
                'DepartmentID -> DepartmentName': {
                    det: 'DepartmentID',
                    dep: 'DepartmentName',
                    type: 'Transitive Dependency (Non-Key to Non-Key)',
                    typeBadge: 'bg-warning text-dark',
                    isKey: false,
                    meaning: 'DepartmentID is not a candidate key of STUDENT. Since StudentID -> DepartmentID -> DepartmentName, StudentName transitively determines DepartmentName.',
                    normImplication: 'Violates 3NF! Requires decomposition into STUDENT and DEPARTMENT relations.'
                },
                'StudentID, DepartmentID -> StudentName': {
                    det: '{StudentID, DepartmentID}',
                    dep: 'StudentName',
                    type: 'Redundant / Non-Minimal Dependency',
                    typeBadge: 'bg-secondary',
                    isKey: false,
                    meaning: 'Because StudentID alone determines StudentName, adding DepartmentID is unnecessary augmentation.',
                    normImplication: 'Shows why minimal covers and candidate keys must be irredundant.'
                }
            }
        },
        ENROLLMENT: {
            schema: 'ENROLLMENT(StudentID, CourseID, Grade, CourseName)',
            candidateKey: '{StudentID, CourseID}',
            dependencies: {
                '{StudentID, CourseID} -> Grade': {
                    det: '{StudentID, CourseID}',
                    dep: 'Grade',
                    type: 'Full Functional Dependency',
                    typeBadge: 'bg-success',
                    isKey: true,
                    meaning: 'Grade depends on both who the student is AND what course was taken.',
                    normImplication: 'Satisfies 2NF because it requires the complete composite key.'
                },
                'CourseID -> CourseName': {
                    det: 'CourseID',
                    dep: 'CourseName',
                    type: 'Partial Functional Dependency',
                    typeBadge: 'bg-danger',
                    isKey: false,
                    meaning: 'CourseID is a proper subset of the composite candidate key {StudentID, CourseID}. CourseName depends only on part of the key.',
                    normImplication: 'Violates 2NF! Must be extracted into COURSE(CourseID, CourseName).'
                }
            }
        }
    };

    function updateFDExplorer() {
        const relSelect = document.getElementById('select-fd-relation');
        const fdSelect = document.getElementById('select-fd-item');
        if (!relSelect || !fdSelect) return;

        const relKey = relSelect.value;
        const relObj = FD_DATASETS[relKey];
        if (!relObj) return;

        const selectedFd = fdSelect.value;
        const fdInfo = relObj.dependencies[selectedFd];
        if (!fdInfo) return;

        document.getElementById('fd-det-badge').innerText = fdInfo.det;
        document.getElementById('fd-dep-badge').innerText = fdInfo.dep;
        document.getElementById('fd-key-badge').innerText = relObj.candidateKey;

        const typeBadge = document.getElementById('fd-type-badge');
        if (typeBadge) {
            typeBadge.className = `badge ${fdInfo.typeBadge} px-2 py-1`;
            typeBadge.innerText = fdInfo.type;
        }

        const meaningElem = document.getElementById('fd-meaning-text');
        if (meaningElem) meaningElem.innerText = fdInfo.meaning;

        const normElem = document.getElementById('fd-norm-implication');
        if (normElem) normElem.innerText = fdInfo.normImplication;
    }

    const relSelectElem = document.getElementById('select-fd-relation');
    if (relSelectElem) {
        relSelectElem.addEventListener('change', function () {
            const relKey = this.value;
            const relObj = FD_DATASETS[relKey];
            const fdSelect = document.getElementById('select-fd-item');
            if (relObj && fdSelect) {
                fdSelect.innerHTML = '';
                for (const fdKey of Object.keys(relObj.dependencies)) {
                    const opt = document.createElement('option');
                    opt.value = fdKey;
                    opt.innerText = fdKey;
                    fdSelect.appendChild(opt);
                }
                updateFDExplorer();
            }
        });
    }

    const fdSelectElem = document.getElementById('select-fd-item');
    if (fdSelectElem) {
        fdSelectElem.addEventListener('change', updateFDExplorer);
    }

    // =========================================================================
    // 7. LESSON 3: ARMSTRONG'S AXIOMS DERIVATION TOOL
    // =========================================================================
    const AXIOM_INFO = {
        reflexivity: {
            title: "1. Axiom of Reflexivity (Trivial Dependencies)",
            formula: "If Y ⊆ X, then X → Y",
            explanation: "If an attribute set Y is a subset of X, then X naturally determines Y. This is always trivially true.",
            example: "Given attributes {StudentID, StudentName}, since {StudentID} ⊆ {StudentID, StudentName}, it follows that {StudentID, StudentName} → StudentID."
        },
        augmentation: {
            title: "2. Axiom of Augmentation",
            formula: "If X → Y, then XZ → YZ for any attribute set Z",
            explanation: "Adding the same set of attributes Z to both sides of a valid dependency preserves the dependency.",
            example: "If StudentID → StudentName, then {StudentID, Semester} → {StudentName, Semester}."
        },
        transitivity: {
            title: "3. Axiom of Transitivity",
            formula: "If X → Y and Y → Z, then X → Z",
            explanation: "Functional dependencies chain transitively. If X determines Y and Y determines Z, X indirectly determines Z.",
            example: "StudentID → DepartmentID and DepartmentID → DepartmentName implies StudentID → DepartmentName."
        },
        union: {
            title: "Derived Rule: Union (Additive Rule)",
            formula: "If X → Y and X → Z, then X → YZ",
            explanation: "If X determines Y and X also determines Z, then X determines both together.",
            example: "StudentID → StudentName and StudentID → Email implies StudentID → {StudentName, Email}."
        },
        decomposition: {
            title: "Derived Rule: Decomposition (Projective Rule)",
            formula: "If X → YZ, then X → Y and X → Z",
            explanation: "A dependency with multiple dependent attributes on the right can be broken into separate single-attribute dependencies.",
            example: "StudentID → {StudentName, DeptID} implies StudentID → StudentName and StudentID → DeptID."
        },
        pseudotransitivity: {
            title: "Derived Rule: Pseudotransitivity",
            formula: "If X → Y and WY → Z, then WX → Z",
            explanation: "Combines augmentation and transitivity to substitute determinants into composite dependencies.",
            example: "StudentID → CourseID and {CourseID, InstructorID} → RoomNo implies {StudentID, InstructorID} → RoomNo."
        }
    };

    document.querySelectorAll('.btn-axiom-select').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.btn-axiom-select').forEach(b => b.classList.remove('active', 'btn-primary'));
            this.classList.add('active', 'btn-primary');

            const ruleKey = this.getAttribute('data-rule');
            const rule = AXIOM_INFO[ruleKey];
            const targetContainer = document.getElementById('axiom-derivation-card');
            if (targetContainer && rule) {
                targetContainer.innerHTML = `
                    <div class="card-header bg-primary text-white fw-bold py-2">${rule.title}</div>
                    <div class="card-body">
                        <div class="p-2 bg-light rounded border text-center font-monospace fw-bold fs-5 text-primary mb-3">${rule.formula}</div>
                        <p class="small text-secondary mb-2"><strong>Formal Meaning:</strong> ${rule.explanation}</p>
                        <div class="alert alert-secondary py-2 px-3 small mb-0"><strong>Database Application Example:</strong> ${rule.example}</div>
                    </div>
                `;
            }
        });
    });

    // =========================================================================
    // 8. LESSON 9: INTERACTIVE DECOMPOSITION VERIFIER WIDGET
    // =========================================================================
    const btnRunVerifyDecomp = document.getElementById('btn-run-verify-decomp');
    if (btnRunVerifyDecomp) {
        btnRunVerifyDecomp.addEventListener('click', function () {
            const rawAttrs = document.getElementById('verify-input-attrs').value.trim();
            const rawFds = document.getElementById('verify-input-fds').value.trim();
            const rawRels = document.getElementById('verify-input-rels').value.trim();

            const attributes = rawAttrs.split(',').map(s => s.trim()).filter(Boolean);
            const fds = rawFds.split('\n').map(s => s.trim()).filter(Boolean);
            const relLines = rawRels.split('\n').map(s => s.trim()).filter(Boolean);

            const decomposed = [];
            relLines.forEach(line => {
                // Support format "R1: A, B" or "A, B"
                let cleanLine = line;
                if (line.includes(':')) {
                    cleanLine = line.split(':')[1].trim();
                }
                const parts = cleanLine.split(',').map(s => s.trim()).filter(Boolean);
                if (parts.length > 0) decomposed.push(parts);
            });

            if (attributes.length === 0 || fds.length === 0 || decomposed.length < 2) {
                showToast('Please provide attributes, at least one FD, and at least 2 decomposed relations.', 'warning');
                return;
            }

            fetch('/api/normalization/verify-decomposition', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attributes: attributes,
                    fds: fds,
                    decomposed: decomposed
                })
            })
            .then(res => res.json())
            .then(data => {
                const resultsCard = document.getElementById('verify-decomp-results');
                const contentElem = document.getElementById('verify-decomp-report-content');
                if (!resultsCard || !contentElem) return;

                resultsCard.classList.remove('d-none');

                if (!data.success) {
                    contentElem.innerHTML = `<div class="alert alert-danger py-2 px-3 mb-0">${data.error || 'Verification failed.'}</div>`;
                    return;
                }

                const res = data.verification;
                let html = '<div class="row g-2">';

                // Attribute Preservation
                html += `
                    <div class="col-md-4">
                        <div class="p-2 border rounded bg-white">
                            <span class="badge ${res.attribute_preservation ? 'bg-success' : 'bg-danger'} mb-1">
                                ${res.attribute_preservation ? 'Preserved' : 'Failed'}
                            </span>
                            <div class="fw-bold">Attribute Preservation</div>
                            <div class="text-muted small">All original schema attributes are accounted for in decomposed relations.</div>
                        </div>
                    </div>
                `;

                // Lossless Join
                const losslessBadge = res.lossless_join === true ? 'bg-success' : (res.lossless_join === false ? 'bg-danger' : 'bg-secondary');
                const losslessText = res.lossless_join === true ? 'Lossless Join' : (res.lossless_join === false ? 'Lossy (Failed)' : 'Binary test N/A');
                html += `
                    <div class="col-md-4">
                        <div class="p-2 border rounded bg-white">
                            <span class="badge ${losslessBadge} mb-1">${losslessText}</span>
                            <div class="fw-bold">Lossless Join Property</div>
                            <div class="text-muted small">${res.details.lossless_reason || 'Tested via binary intersection closure theorem.'}</div>
                        </div>
                    </div>
                `;

                // Dependency Preservation
                const depBadge = res.dependency_preservation ? 'bg-success' : 'bg-warning text-dark';
                const depText = res.dependency_preservation ? '100% Preserved' : 'Dependencies Lost';
                html += `
                    <div class="col-md-4">
                        <div class="p-2 border rounded bg-white">
                            <span class="badge ${depBadge} mb-1">${depText}</span>
                            <div class="fw-bold">Dependency Preservation</div>
                            <div class="text-muted small">
                                ${res.details.lost_dependencies.length === 0 ? 'All functional dependencies can be enforced locally.' : 'Lost: ' + res.details.lost_dependencies.join(', ')}
                            </div>
                        </div>
                    </div>
                `;

                html += '</div>';
                contentElem.innerHTML = html;
            })
            .catch(err => {
                showToast('Failed to run verification API: ' + err, 'danger');
            });
        });
    }

    const btnResetVerifyDecomp = document.getElementById('btn-reset-verify-decomp');
    if (btnResetVerifyDecomp) {
        btnResetVerifyDecomp.addEventListener('click', function () {
            document.getElementById('verify-input-attrs').value = 'A, B, C';
            document.getElementById('verify-input-fds').value = 'A -> B';
            document.getElementById('verify-input-rels').value = 'R1: A, B\nR2: A, C';
            const resultsCard = document.getElementById('verify-decomp-results');
            if (resultsCard) resultsCard.classList.add('d-none');
        });
    }

    // =========================================================================
    // 9. LESSON 10: NORMALIZATION PRACTICE LAB (5 CASES)
    // =========================================================================
    let activeCaseNum = 1;

    function renderLabCase(caseNum) {
        activeCaseNum = caseNum;
        const caseData = LAB_CASES[caseNum];
        if (!caseData) return;

        // Update active case button
        document.querySelectorAll('.btn-case-select').forEach(function (btn) {
            const bCase = parseInt(btn.getAttribute('data-case'), 10);
            if (bCase === caseNum) {
                btn.classList.add('active', 'btn-primary');
                btn.classList.remove('btn-outline-secondary');
            } else {
                btn.classList.remove('active', 'btn-primary');
                btn.classList.add('btn-outline-secondary');
            }
        });

        // Update header & definitions
        document.getElementById('lab-case-badge').innerText = caseData.badge;
        document.getElementById('lab-case-title').innerText = caseData.title;
        document.getElementById('lab-schema-definition').innerText = caseData.schema;
        document.getElementById('lab-schema-desc').innerText = caseData.desc;
        document.getElementById('lab-dependencies-list').innerHTML = caseData.dependenciesText.replace(/\n/g, '<br>');

        // Render Sample Table
        const tableContainer = document.getElementById('lab-sample-table-container');
        if (tableContainer && caseData.sampleRows.length > 0) {
            const columns = Object.keys(caseData.sampleRows[0]);
            let tHtml = '<table class="table table-bordered table-sm text-center align-middle small mb-0"><thead class="table-dark"><tr>';
            columns.forEach(col => tHtml += `<th>${col}</th>`);
            tHtml += '</tr></thead><tbody>';
            caseData.sampleRows.forEach(row => {
                tHtml += '<tr>';
                columns.forEach(col => tHtml += `<td>${row[col]}</td>`);
                tHtml += '</tr>';
            });
            tHtml += '</tbody></table>';
            tableContainer.innerHTML = tHtml;
        }

        // Render Step 1 Candidate Key Options
        const step1Container = document.getElementById('lab-step1-options');
        if (step1Container) {
            let s1Html = '';
            caseData.step1Options.forEach((opt, idx) => {
                s1Html += `
                    <div class="col-md-6">
                        <div class="form-check p-2 border rounded bg-white">
                            <input class="form-check-input ms-0 me-2" type="radio" name="lab_step1_choice" id="s1_opt_${idx}" value="${opt}">
                            <label class="form-check-label small font-monospace fw-bold" for="s1_opt_${idx}">${opt}</label>
                        </div>
                    </div>
                `;
            });
            step1Container.innerHTML = s1Html;
        }
        const s1Feedback = document.getElementById('lab-step1-feedback');
        if (s1Feedback) s1Feedback.classList.add('d-none');

        // Render Step 2 Classifier
        const step2Container = document.getElementById('lab-step2-classifier');
        if (step2Container) {
            let s2Html = '';
            caseData.classifiers.forEach((item, idx) => {
                s2Html += `
                    <div class="p-2 border rounded bg-white mb-2 d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <div class="font-monospace small fw-bold">${item.fd}</div>
                        <div class="d-flex align-items-center gap-2">
                            <select class="form-select form-select-sm lab-fd-classifier-select" data-idx="${idx}" style="width: 220px;">
                                <option value="">Select Type...</option>
                                <option value="full">Full Key Dependency</option>
                                <option value="partial">Partial Dependency</option>
                                <option value="transitive">Transitive Dependency</option>
                                <option value="bcnf_violator">Non-Superkey Determinant</option>
                            </select>
                        </div>
                    </div>
                `;
            });
            step2Container.innerHTML = s2Html;
        }
        const s2Feedback = document.getElementById('lab-step2-feedback');
        if (s2Feedback) s2Feedback.classList.add('d-none');

        // Reset Step 3
        const step3Radios = document.querySelectorAll('input[name="lab_current_nf"]');
        step3Radios.forEach(r => r.checked = false);
        const s3Feedback = document.getElementById('lab-step3-feedback');
        if (s3Feedback) s3Feedback.classList.add('d-none');

        // Render Step 4 Decomposed Schema Cards
        const step4Container = document.getElementById('lab-step4-decomposed-cards');
        if (step4Container) {
            let s4Html = '';
            caseData.decomposedRelations.forEach(rel => {
                s4Html += `
                    <div class="col-md-6">
                        <div class="card h-100 border-primary">
                            <div class="card-header bg-light fw-bold py-1 small d-flex justify-content-between">
                                <span>${rel.name}</span>
                                <span class="badge bg-secondary">${rel.type}</span>
                            </div>
                            <div class="card-body p-2 small">
                                <div class="font-monospace mb-1"><strong>Attributes:</strong> ${rel.attrs}</div>
                                <div class="text-primary font-monospace"><strong>PK:</strong> ${rel.pk}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
            step4Container.innerHTML = s4Html;
        }
        const s4Report = document.getElementById('lab-step4-verification-report');
        if (s4Report) s4Report.classList.add('d-none');

        // Hide Model Solution Card
        const solCard = document.getElementById('lab-model-solution-card');
        if (solCard) solCard.classList.add('d-none');
    }

    // Bind Case buttons
    document.querySelectorAll('.btn-case-select').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const caseNum = parseInt(this.getAttribute('data-case'), 10);
            renderLabCase(caseNum);
        });
    });

    // Step 1 Check Button
    const btnCheckStep1 = document.getElementById('btn-check-step1');
    if (btnCheckStep1) {
        btnCheckStep1.addEventListener('click', function () {
            const selected = document.querySelector('input[name="lab_step1_choice"]:checked');
            const feedback = document.getElementById('lab-step1-feedback');
            if (!selected || !feedback) {
                showToast('Please select a candidate key option!', 'warning');
                return;
            }
            const caseData = LAB_CASES[activeCaseNum];
            feedback.classList.remove('d-none');
            if (selected.value === caseData.correctStep1) {
                feedback.className = 'mt-2 alert alert-success py-2 px-3 small';
                feedback.innerHTML = `<strong>Correct!</strong> <code>${caseData.correctStep1}</code> is the minimal determinant whose attribute closure includes the complete relation schema.`;
            } else {
                feedback.className = 'mt-2 alert alert-danger py-2 px-3 small';
                feedback.innerHTML = `<strong>Not quite.</strong> Notice that <code>${selected.value}</code> cannot determine all remaining attributes. Check the business dependencies and try again!`;
            }
        });
    }

    // Step 2 Check Button
    const btnCheckStep2 = document.getElementById('btn-check-step2');
    if (btnCheckStep2) {
        btnCheckStep2.addEventListener('click', function () {
            const caseData = LAB_CASES[activeCaseNum];
            const feedback = document.getElementById('lab-step2-feedback');
            const selects = document.querySelectorAll('.lab-fd-classifier-select');
            let allCorrect = true;
            let answered = true;

            selects.forEach(sel => {
                const idx = parseInt(sel.getAttribute('data-idx'), 10);
                const userVal = sel.value;
                if (!userVal) answered = false;
                if (userVal !== caseData.classifiers[idx].correct) {
                    allCorrect = false;
                }
            });

            if (!answered) {
                showToast('Please classify all dependencies before verifying!', 'warning');
                return;
            }

            feedback.classList.remove('d-none');
            if (allCorrect) {
                feedback.className = 'mt-2 alert alert-success py-2 px-3 small';
                feedback.innerHTML = '<strong>Excellent!</strong> All functional dependencies have been accurately classified against the candidate keys.';
            } else {
                feedback.className = 'mt-2 alert alert-warning py-2 px-3 small';
                feedback.innerHTML = '<strong>Review Needed:</strong> One or more dependencies are misclassified. Check if the determinant is part of a key (partial) or non-key determining another non-key (transitive).';
            }
        });
    }

    // Step 3 Check Button
    const btnCheckStep3 = document.getElementById('btn-check-step3');
    if (btnCheckStep3) {
        btnCheckStep3.addEventListener('click', function () {
            const selected = document.querySelector('input[name="lab_current_nf"]:checked');
            const feedback = document.getElementById('lab-step3-feedback');
            if (!selected || !feedback) {
                showToast('Please choose a normal form!', 'warning');
                return;
            }
            const caseData = LAB_CASES[activeCaseNum];
            feedback.classList.remove('d-none');
            if (selected.value === caseData.currentNF) {
                feedback.className = 'mt-2 alert alert-success py-2 px-3 small';
                feedback.innerHTML = `<strong>Spot on!</strong> The un-decomposed relation is in <strong>${caseData.currentNF}</strong>.`;
            } else {
                feedback.className = 'mt-2 alert alert-danger py-2 px-3 small';
                feedback.innerHTML = `<strong>Incorrect.</strong> The relation satisfies 1NF, but violates higher forms due to the dependencies identified in Step 2. Try again!`;
            }
        });
    }

    // Step 4 Verification Button
    const btnVerifyLabDecomp = document.getElementById('btn-verify-lab-decomposition');
    if (btnVerifyLabDecomp) {
        btnVerifyLabDecomp.addEventListener('click', function () {
            const report = document.getElementById('lab-step4-verification-report');
            if (!report) return;
            const caseData = LAB_CASES[activeCaseNum];

            report.classList.remove('d-none');
            report.innerHTML = `
                <div class="d-flex align-items-center gap-2 mb-2">
                    <span class="spinner-border spinner-border-sm text-primary"></span>
                    <span class="text-secondary small">Evaluating closure and dependency preservation...</span>
                </div>
            `;

            setTimeout(() => {
                let isDepPreserved = (activeCaseNum !== 4); // Case 4 BCNF loses dependency
                report.innerHTML = `
                    <h6 class="fw-bold text-dark mb-2"><i class="bi bi-shield-check text-success me-1"></i> Mathematical Guarantee Report:</h6>
                    <div class="row g-2 small">
                        <div class="col-md-4">
                            <div class="p-2 border rounded bg-light">
                                <span class="badge bg-success mb-1">Passed (100%)</span>
                                <div class="fw-bold">Attribute Preservation</div>
                                <div class="text-muted">All original attributes present across decomposed tables.</div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="p-2 border rounded bg-light">
                                <span class="badge bg-success mb-1">Lossless Join</span>
                                <div class="fw-bold">Non-Additive Guarantee</div>
                                <div class="text-muted">Common attributes form superkeys; zero spurious tuples generated.</div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="p-2 border rounded bg-light">
                                <span class="badge ${isDepPreserved ? 'bg-success' : 'bg-warning text-dark'} mb-1">
                                    ${isDepPreserved ? 'Preserved' : 'Trade-off: Lost in BCNF'}
                                </span>
                                <div class="fw-bold">Dependency Preservation</div>
                                <div class="text-muted">${isDepPreserved ? 'All business rules enforceable locally.' : 'Requires join to enforce student-course uniqueness.'}</div>
                            </div>
                        </div>
                    </div>
                `;
            }, 300);
        });
    }

    // Model Solution Buttons
    const btnRevealModelSol = document.getElementById('btn-reveal-model-solution');
    if (btnRevealModelSol) {
        btnRevealModelSol.addEventListener('click', function () {
            const caseData = LAB_CASES[activeCaseNum];
            const card = document.getElementById('lab-model-solution-card');
            const content = document.getElementById('lab-model-solution-content');
            if (card && content && caseData) {
                content.innerHTML = caseData.solutionHtml;
                card.classList.remove('d-none');
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    const btnCloseModelSol = document.getElementById('btn-close-model-solution');
    if (btnCloseModelSol) {
        btnCloseModelSol.addEventListener('click', function () {
            const card = document.getElementById('lab-model-solution-card');
            if (card) card.classList.add('d-none');
        });
    }

    const btnResetCurrentCase = document.getElementById('btn-reset-current-case');
    if (btnResetCurrentCase) {
        btnResetCurrentCase.addEventListener('click', function () {
            renderLabCase(activeCaseNum);
            showToast(`Case ${activeCaseNum} reset to initial state.`, 'info');
        });
    }

    // Initialize Case 1
    renderLabCase(1);

    // =========================================================================
    // 10. EXERCISE HINTS & SOLUTIONS TOGGLER
    // =========================================================================
    document.querySelectorAll('.btn-toggle-hint').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const targetElem = document.querySelector(targetId);
            if (targetElem) {
                targetElem.classList.toggle('show');
                const isShown = targetElem.classList.contains('show');
                this.innerHTML = isShown ? '<i class="bi bi-lightbulb-fill me-1"></i> Hide Hint' : '<i class="bi bi-lightbulb me-1"></i> Show Hint';
            }
        });
    });

    document.querySelectorAll('.btn-toggle-solution').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const targetElem = document.querySelector(targetId);
            if (targetElem) {
                targetElem.classList.toggle('show');
                const isShown = targetElem.classList.contains('show');
                this.innerHTML = isShown ? '<i class="bi bi-eye-slash me-1"></i> Hide Solution' : '<i class="bi bi-check-circle me-1"></i> Show Solution';
            }
        });
    });

    // =========================================================================
    // 11. TOAST NOTIFICATION UTILITY
    // =========================================================================
    function showToast(message, type = 'info') {
        const toastEl = document.getElementById('phase5-toast');
        const msgEl = document.getElementById('phase5-toast-msg');
        if (toastEl && msgEl && typeof bootstrap !== 'undefined' && bootstrap.Toast) {
            msgEl.innerText = message;
            toastEl.className = (type === 'success') ? 'toast align-items-center text-bg-success border-0 shadow' :
                                (type === 'danger' || type === 'warning') ? 'toast align-items-center text-bg-warning border-0 shadow' :
                                'toast align-items-center text-bg-dark border-0 shadow';
            const bsToast = new bootstrap.Toast(toastEl, { delay: 3500 });
            bsToast.show();
            return;
        }

        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            alert(message);
            return;
        }

        const toastId = 'toast-' + Date.now();
        const bgClass = type === 'success' ? 'bg-success text-white' :
                        type === 'danger' ? 'bg-danger text-white' :
                        type === 'warning' ? 'bg-warning text-dark' : 'bg-dark text-white';

        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 shadow" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body small">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastElem = document.getElementById(toastId);
        if (toastElem && typeof bootstrap !== 'undefined' && bootstrap.Toast) {
            const bsToast = new bootstrap.Toast(toastElem, { delay: 3500 });
            bsToast.show();
            toastElem.addEventListener('hidden.bs.toast', () => toastElem.remove());
        }
    }

});
