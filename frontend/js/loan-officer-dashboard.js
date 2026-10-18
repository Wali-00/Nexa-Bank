// ============================================================
// NEXA BANK
// LOAN OFFICER DASHBOARD
// ============================================================

const LOAN_OFFICER_API =
    'http://127.0.0.1:8000';


// ============================================================
// GLOBAL DATA
// ============================================================

let loanApplications = [];

let loanTypes = [];

let createdLoans = [];

let loanPayments = [];

let loanCustomerRecords = [];

let selectedLoanApplication = null;

let selectedApprovedLoanApplication = null;

let selectedDisbursementAccount = null;

let selectedLoanPayment = null;

let selectedRepaymentAccount = null;

let loanOfficerEmployeeId = null;

let loanOfficerUserId = null;

let loanOfficerBranchId = null;

let loanOfficerBranchName = null;


// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener(
    'DOMContentLoaded',
    async () => {

        verifyLoanOfficerSession();

        initializeLoanOfficerNavigation();

        initializeLoanOfficerEvents();

        await loadLoanOfficerEmployeeId();

        await loadLoanTypes();

        await loadLoanCustomerRecords();

        await loadLoanApplications();

        await loadCreatedLoans();

        await loadLoanPayments();

        showLoanOfficerSection(
            'loan-dashboard-section'
        );
    }
);


// ============================================================
// SESSION
// ============================================================

function verifyLoanOfficerSession() {

    const userId =
        localStorage.getItem(
            'user_id'
        );


    const role =
        String(
            localStorage.getItem(
                'role'
            ) || ''
        )
            .trim()
            .toUpperCase();


    if (!userId) {

        alert(
            'Please login as a Loan Officer.'
        );


        window.location.href =
            'login.html';

        return;
    }


    const allowedRoles = [
        'LOAN',
        'LOAN_OFFICER',
        'LOAN OFFICER'
    ];


    if (
        role &&
        !allowedRoles.includes(role)
    ) {

        console.warn(
            'Unexpected Loan Officer role:',
            role
        );
    }


    loanOfficerUserId =
        Number(
            userId
        );
}


// ============================================================
// LOAD OFFICER EMPLOYEE ID
// ============================================================

async function loadLoanOfficerEmployeeId() {

    if (!loanOfficerUserId) {

        loanOfficerUserId =
            Number(
                localStorage.getItem(
                    'user_id'
                )
            );
    }


    try {

        const response =
            await fetch(
                `${LOAN_OFFICER_API}/employees/`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.detail ||
                'Unable to load employees.'
            );
        }


        const employee =
            (
                Array.isArray(result)
                    ? result
                    : []
            ).find(
                item =>
                    Number(
                        item.user_id
                    )
                    ===
                    Number(
                        loanOfficerUserId
                    )
            );


        if (!employee) {

            throw new Error(
                'Loan Officer employee record not found.'
            );
        }


        loanOfficerEmployeeId =
            Number(
                employee.employee_id
            );


        if (
            employee.branch_id != null
        ) {

            loanOfficerBranchId =
                Number(
                    employee.branch_id
                );
        }


        loanOfficerBranchName =
            employee.branch_name ||
            null;


        console.log(
            'LOAN OFFICER:',
            {
                user_id:
                    loanOfficerUserId,

                employee_id:
                    loanOfficerEmployeeId,

                branch_id:
                    loanOfficerBranchId,

                branch_name:
                    loanOfficerBranchName
            }
        );

    }

    catch (error) {

        console.error(
            'OFFICER LOOKUP ERROR:',
            error
        );
    }
}


// ============================================================
// LOAD LOAN TYPES
// ============================================================

async function loadLoanTypes() {

    try {

        const response =
            await fetch(
                `${LOAN_OFFICER_API}/loan-types/`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.detail ||
                'Unable to load loan types.'
            );
        }


        loanTypes =
            Array.isArray(result)
                ? result
                : [];

    }

    catch (error) {

        console.error(
            'LOAN TYPE ERROR:',
            error
        );


        loanTypes = [];
    }
}


// ============================================================
// CUSTOMER DATA FOR LOAN SEARCH
// ============================================================

async function loadLoanCustomerRecords() {

    try {

        if (!loanOfficerBranchId) {

            await loadLoanOfficerEmployeeId();
        }


        if (!loanOfficerBranchId) {

            throw new Error(
                'Unable to determine Loan Officer branch.'
            );
        }


        const response =
            await fetch(
                `${LOAN_OFFICER_API}/customers/management/all`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                formatApiError(
                    result,
                    'Unable to load customer information.'
                )
            );
        }


        const allCustomers =
            Array.isArray(result)
                ? result
                : [];


        loanCustomerRecords =
            allCustomers.filter(
                customer =>
                    Number(
                        customer.branch_id
                    )
                    ===
                    Number(
                        loanOfficerBranchId
                    )
            );


        console.log(
            'LOAN OFFICER BRANCH CUSTOMERS:',
            loanCustomerRecords
        );

    }

    catch (error) {

        console.error(
            'CUSTOMER LOAN DATA ERROR:',
            error
        );


        loanCustomerRecords = [];
    }
}


// ============================================================
// AUTO DETECT DISBURSEMENT ACCOUNT
// ============================================================

async function detectDisbursementAccount(
    customerId
) {

    const response =
        await fetch(
            `${LOAN_OFFICER_API}/accounts/customer/${customerId}/disbursement-account`
        );


    const result =
        await response.json();


    if (!response.ok) {

        throw new Error(
            formatApiError(
                result,
                'Unable to detect customer account.'
            )
        );
    }


    return result;
}


// ============================================================
// AUTO DETECT REPAYMENT ACCOUNT
// ============================================================

async function detectRepaymentAccount(
    customerId,
    requiredAmount
) {

    const response =
        await fetch(
            `${LOAN_OFFICER_API}/accounts/customer/${customerId}/repayment-account?required_amount=${encodeURIComponent(
                requiredAmount
            )}`
        );


    const result =
        await response.json();


    if (!response.ok) {

        throw new Error(
            formatApiError(
                result,
                'Unable to detect repayment account.'
            )
        );
    }


    return result;
}


// ============================================================
// NAVIGATION
// ============================================================

function initializeLoanOfficerNavigation() {

    document
        .querySelectorAll(
            '.loan-nav-link'
        )
        .forEach(
            link => {

                link.addEventListener(
                    'click',
                    event => {

                        event.preventDefault();


                        showLoanOfficerSection(
                            link.dataset.section
                        );
                    }
                );
            }
        );


    document
        .querySelectorAll(
            '[data-open-section]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    () => {

                        showLoanOfficerSection(
                            button.dataset.openSection
                        );
                    }
                );
            }
        );
}


// ============================================================
// SHOW SECTION
// ============================================================

function showLoanOfficerSection(
    sectionId
) {

    document
        .querySelectorAll(
            '.loan-section'
        )
        .forEach(
            section => {

                section.style.display =
                    'none';


                section.classList.remove(
                    'active-section'
                );
            }
        );


    const section =
        document.getElementById(
            sectionId
        );


    if (section) {

        section.style.display =
            'block';


        section.classList.add(
            'active-section'
        );
    }


    document
        .querySelectorAll(
            '.loan-nav-link'
        )
        .forEach(
            link => {

                link.classList.remove(
                    'active'
                );
            }
        );


    document
        .querySelector(
            `.loan-nav-link[data-section="${sectionId}"]`
        )
        ?.classList.add(
            'active'
        );


    if (
        sectionId ===
        'loan-applications-section'
    ) {

        loadLoanApplications();
    }


    if (
        sectionId ===
        'customer-loan-search-section'
    ) {

        prepareCustomerLoanSearch();
    }


    if (
        sectionId ===
        'approved-loans-section'
    ) {

        renderApprovedLoanApplications();
    }


    if (
        sectionId ===
        'created-loans-section'
    ) {

        loadCreatedLoans();
    }


    if (
        sectionId ===
        'active-loans-section'
    ) {

        updateActiveLoanStatistics();

        filterActiveLoans();
    }


    if (
        sectionId ===
        'repayment-monitoring-section'
    ) {

        loadLoanPayments();
    }


    if (
        sectionId ===
        'loan-reports-section'
    ) {

        updateLoanReports();
    }
}


// ============================================================
// EVENTS
// ============================================================

function initializeLoanOfficerEvents() {

    bindClick(
        'refresh-loan-applications-btn',
        loadLoanApplications
    );


    bindClick(
        'refresh-approved-loans-btn',
        loadLoanApplications
    );


    bindClick(
        'refresh-created-loans-btn',
        loadCreatedLoans
    );


    bindClick(
        'refresh-active-loans-btn',
        loadCreatedLoans
    );


    bindClick(
        'refresh-repayments-btn',
        loadLoanPayments
    );


    bindClick(
        'refresh-customer-loan-search-btn',
        async () => {

            await loadLoanCustomerRecords();

            await loadCreatedLoans();

            searchCustomerLoans();
        }
    );


    bindClick(
        'customer-loan-search-btn',
        searchCustomerLoans
    );


    bindClick(
        'refresh-loan-reports-btn',
        async () => {

            await loadLoanApplications();

            await loadCreatedLoans();

            await loadLoanPayments();

            updateLoanReports();
        }
    );


    document
        .getElementById(
            'loan-application-search'
        )
        ?.addEventListener(
            'input',
            filterLoanApplications
        );


    document
        .getElementById(
            'loan-status-filter'
        )
        ?.addEventListener(
            'change',
            filterLoanApplications
        );


    document
        .getElementById(
            'created-loan-search'
        )
        ?.addEventListener(
            'input',
            filterCreatedLoans
        );


    document
        .getElementById(
            'created-loan-status-filter'
        )
        ?.addEventListener(
            'change',
            filterCreatedLoans
        );


    document
        .getElementById(
            'active-loan-search'
        )
        ?.addEventListener(
            'input',
            filterActiveLoans
        );


    document
        .getElementById(
            'active-loan-status-filter'
        )
        ?.addEventListener(
            'change',
            filterActiveLoans
        );


    document
        .getElementById(
            'customer-loan-search-input'
        )
        ?.addEventListener(
            'input',
            event => {

                if (
                    !event.target.value.trim()
                ) {

                    prepareCustomerLoanSearch();

                    return;
                }


                searchCustomerLoans();
            }
        );


    document
        .getElementById(
            'customer-loan-search-input'
        )
        ?.addEventListener(
            'keydown',
            event => {

                if (
                    event.key ===
                    'Enter'
                ) {

                    event.preventDefault();

                    searchCustomerLoans();
                }
            }
        );


    document
        .getElementById(
            'repayment-search'
        )
        ?.addEventListener(
            'input',
            filterLoanPayments
        );


    document
        .getElementById(
            'repayment-status-filter'
        )
        ?.addEventListener(
            'change',
            filterLoanPayments
        );


    document
        .getElementById(
            'loan-review-form'
        )
        ?.addEventListener(
            'submit',
            event => {

                event.preventDefault();

                submitLoanReview();
            }
        );


    bindClick(
        'close-loan-review-modal',
        closeLoanReviewModal
    );


    bindClick(
        'cancel-loan-review-btn',
        closeLoanReviewModal
    );


    document
        .getElementById(
            'create-loan-form'
        )
        ?.addEventListener(
            'submit',
            event => {

                event.preventDefault();

                createLoanFromApplication();
            }
        );


    bindClick(
        'close-create-loan-modal',
        closeCreateLoanModal
    );


    bindClick(
        'cancel-create-loan-btn',
        closeCreateLoanModal
    );


    document
        .getElementById(
            'loan-payment-form'
        )
        ?.addEventListener(
            'submit',
            event => {

                event.preventDefault();

                submitLoanPayment();
            }
        );


    bindClick(
        'close-loan-payment-modal',
        closeLoanPaymentModal
    );


    bindClick(
        'cancel-loan-payment-btn',
        closeLoanPaymentModal
    );


    const logout =
        document.getElementById(
            'loan-logout-btn'
        );


    if (logout) {

        logout.addEventListener(
            'click',
            event => {

                event.preventDefault();


                if (
                    !confirm(
                        'Are you sure you want to logout?'
                    )
                ) {

                    return;
                }


                localStorage.removeItem(
                    'user_id'
                );


                localStorage.removeItem(
                    'customer_id'
                );


                localStorage.removeItem(
                    'role'
                );


                window.location.href =
                    'login.html';
            }
        );
    }
}


// ============================================================
// LOAD APPLICATIONS
// ============================================================

async function loadLoanApplications() {

    const body =
        document.getElementById(
            'loan-applications-body'
        );


    setTableLoading(
        body,
        8,
        'Loading loan applications...'
    );


    if (!loanOfficerUserId) {

        loanOfficerUserId =
            Number(
                localStorage.getItem(
                    'user_id'
                )
            );
    }


    try {

        const response =
            await fetch(
                `${LOAN_OFFICER_API}/loan-applications/officer/${loanOfficerUserId}`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                formatApiError(
                    result,
                    'Unable to load loan applications.'
                )
            );
        }


        loanOfficerEmployeeId =
            Number(
                result.employee_id
            );


        loanOfficerBranchId =
            Number(
                result.branch_id
            );


        loanOfficerBranchName =
            result.branch_name ||
            `Branch ${loanOfficerBranchId}`;


        loanApplications =
            Array.isArray(
                result.applications
            )
                ? result.applications
                : [];


        console.log(
            'LOAN OFFICER BRANCH:',
            {
                employee_id:
                    loanOfficerEmployeeId,

                branch_id:
                    loanOfficerBranchId,

                branch_name:
                    loanOfficerBranchName
            }
        );


        updateLoanStatistics();

        filterLoanApplications();

        renderApprovedLoanApplications();

        updateLoanReports();

    }

    catch (error) {

        loanApplications = [];


        showTableError(
            body,
            8,
            error.message
        );
    }
}


// ============================================================
// APPLICATION STATISTICS
// ============================================================

function updateLoanStatistics() {

    setLoanText(
        'loan-total-applications',
        loanApplications.length
    );


    setLoanText(
        'loan-submitted-applications',
        countStatus(
            loanApplications,
            'SUBMITTED'
        )
    );


    setLoanText(
        'loan-approved-applications',
        countStatus(
            loanApplications,
            'APPROVED'
        )
    );


    setLoanText(
        'loan-rejected-applications',
        countStatus(
            loanApplications,
            'REJECTED'
        )
    );
}


// ============================================================
// FILTER APPLICATIONS
// ============================================================

function filterLoanApplications() {

    const search =
        document.getElementById(
            'loan-application-search'
        )?.value
            .trim()
            .toLowerCase()
        ||
        '';


    const status =
        document.getElementById(
            'loan-status-filter'
        )?.value
        ||
        '';


    const filtered =
        loanApplications.filter(
            application => {

                const text = `
                    ${application.loan_application_id ?? ''}
                    ${application.customer_id ?? ''}
                    ${application.purpose ?? ''}
                    ${application.employment ?? ''}
                    ${application.status ?? ''}
                `.toLowerCase();


                return (
                    (
                        !search ||
                        text.includes(search)
                    )
                    &&
                    (
                        !status ||
                        application.status === status
                    )
                );
            }
        );


    renderLoanApplications(
        filtered
    );
}


// ============================================================
// RENDER APPLICATIONS
// ============================================================

function renderLoanApplications(
    applications
) {

    const body =
        document.getElementById(
            'loan-applications-body'
        );


    if (!body) {

        return;
    }


    if (!applications.length) {

        setTableLoading(
            body,
            8,
            'No loan applications found.'
        );

        return;
    }


    body.innerHTML =
        '';


    applications.forEach(
        application => {

            const row =
                document.createElement(
                    'tr'
                );


            row.innerHTML = `

                <td>
                    #${escapeLoanHtml(
                application.loan_application_id
            )}
                </td>

                <td>
                    ${escapeLoanHtml(
                application.customer_id
            )}
                </td>

                <td>
                    ${escapeLoanHtml(
                getLoanTypeName(
                    application.loan_type_id
                )
            )}
                </td>

                <td>
                    ৳${formatLoanMoney(
                application.requested_amount
            )}
                </td>

                <td>
                    ${escapeLoanHtml(
                application.duration_months
            )}
                    months
                </td>

                <td>
                    ৳${formatLoanMoney(
                application.monthly_income
            )}
                </td>

                <td>

                    <span
                        class="loan-status ${statusClass(
                application.status
            )}"
                    >
                        ${escapeLoanHtml(
                application.status
            )}
                    </span>

                </td>

                <td>

                    <button
                        type="button"
                        class="loan-review-btn"
                        data-id="${application.loan_application_id}"
                    >
                        Review
                    </button>

                </td>
            `;


            body.appendChild(
                row
            );
        }
    );


    document
        .querySelectorAll(
            '.loan-review-btn'
        )
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    () => {

                        openLoanReviewModal(
                            Number(
                                button.dataset.id
                            )
                        );
                    }
                );
            }
        );
}


// ============================================================
// REVIEW MODAL
// ============================================================

function openLoanReviewModal(
    applicationId
) {

    const application =
        loanApplications.find(
            item =>
                Number(
                    item.loan_application_id
                )
                ===
                Number(
                    applicationId
                )
        );


    if (!application) {

        return;
    }


    selectedLoanApplication =
        application;


    setLoanText(
        'review-loan-application-id',
        application.loan_application_id
    );


    setLoanText(
        'review-loan-customer-id',
        application.customer_id
    );


    setLoanText(
        'review-loan-amount',
        `৳${formatLoanMoney(
            application.requested_amount
        )}`
    );


    setLoanText(
        'review-loan-status',
        application.status
    );


    setLoanText(
        'review-loan-duration',
        `${application.duration_months} months`
    );


    setLoanText(
        'review-loan-income',
        `৳${formatLoanMoney(
            application.monthly_income
        )}`
    );


    setLoanText(
        'review-loan-employment',
        application.employment ||
        '-'
    );


    setLoanText(
        'review-loan-purpose',
        application.purpose ||
        '-'
    );


    document.getElementById(
        'new-loan-status'
    ).value =
        application.status;


    document.getElementById(
        'loan-rejection-reason'
    ).value =
        application.rejection_reason ||
        '';


    setLoanText(
        'loan-review-message',
        ''
    );


    showModal(
        'loan-review-modal'
    );
}


// ============================================================
// SUBMIT REVIEW
// ============================================================

async function submitLoanReview() {

    if (!selectedLoanApplication) {

        return;
    }


    if (!loanOfficerUserId) {

        loanOfficerUserId =
            Number(
                localStorage.getItem(
                    'user_id'
                )
            );
    }


    if (!loanOfficerUserId) {

        alert(
            'Loan Officer login information could not be identified.'
        );

        return;
    }


    const status =
        document.getElementById(
            'new-loan-status'
        ).value;


    const reason =
        document.getElementById(
            'loan-rejection-reason'
        )
            .value
            .trim();


    if (
        status === 'REJECTED'
        &&
        !reason
    ) {

        alert(
            'Please enter a rejection reason.'
        );

        return;
    }


    const button =
        document.getElementById(
            'save-loan-review-btn'
        );


    const message =
        document.getElementById(
            'loan-review-message'
        );


    button.disabled =
        true;


    button.textContent =
        'Saving...';


    try {

        const response =
            await fetch(
                `${LOAN_OFFICER_API}/loan-applications/${selectedLoanApplication.loan_application_id}/review?officer_user_id=${loanOfficerUserId}`,
                {
                    method:
                        'PUT',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify({

                            status:
                                status,

                            assigned_officer_id:
                                loanOfficerEmployeeId,

                            rejection_reason:
                                status ===
                                    'REJECTED'
                                    ? reason
                                    : null
                        })
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                formatApiError(
                    result,
                    'Loan review failed.'
                )
            );
        }


        message.style.color =
            '#16a34a';


        message.textContent =
            '✓ Application updated successfully.';


        await loadLoanApplications();


        setTimeout(
            closeLoanReviewModal,
            700
        );

    }

    catch (error) {

        message.style.color =
            '#dc2626';


        message.textContent =
            '✕ ' +
            error.message;

    }

    finally {

        button.disabled =
            false;


        button.textContent =
            '✓ Save Review';
    }
}


// ============================================================
// CLOSE REVIEW MODAL
// ============================================================

function closeLoanReviewModal() {

    hideModal(
        'loan-review-modal'
    );


    selectedLoanApplication =
        null;
}


// ============================================================
// APPROVED APPLICATIONS
// ============================================================

function renderApprovedLoanApplications() {

    const container =
        document.getElementById(
            'approved-loan-container'
        );


    if (!container) {

        return;
    }


    const approved =
        loanApplications.filter(
            application =>
                application.status ===
                'APPROVED'
        );


    if (!approved.length) {

        container.innerHTML = `
            <div class="loan-empty-state">
                No approved loan applications found.
            </div>
        `;

        return;
    }


    container.innerHTML =
        '';


    approved.forEach(
        application => {

            const card =
                document.createElement(
                    'div'
                );


            card.className =
                'approved-loan-card';


            card.innerHTML = `

                <div class="approved-loan-header">

                    <div>

                        <span class="loan-small-label">
                            Approved Application
                        </span>

                        <h3>
                            #${application.loan_application_id}
                        </h3>

                        <p>
                            Customer ID:
                            ${application.customer_id}
                        </p>

                    </div>


                    <span class="loan-status approved">
                        APPROVED
                    </span>

                </div>


                <div class="approved-loan-grid">

                    <div>
                        <span>Loan Type</span>

                        <strong>
                            ${escapeLoanHtml(
                getLoanTypeName(
                    application.loan_type_id
                )
            )}
                        </strong>
                    </div>


                    <div>
                        <span>Requested Amount</span>

                        <strong>
                            ৳${formatLoanMoney(
                application.requested_amount
            )}
                        </strong>
                    </div>


                    <div>
                        <span>Duration</span>

                        <strong>
                            ${application.duration_months}
                            months
                        </strong>
                    </div>


                    <div>
                        <span>Monthly Income</span>

                        <strong>
                            ৳${formatLoanMoney(
                application.monthly_income
            )}
                        </strong>
                    </div>


                    <div>
                        <span>Employment</span>

                        <strong>
                            ${escapeLoanHtml(
                application.employment ||
                '-'
            )}
                        </strong>
                    </div>


                    <div>
                        <span>Purpose</span>

                        <strong>
                            ${escapeLoanHtml(
                application.purpose ||
                '-'
            )}
                        </strong>
                    </div>

                </div>


                <div class="approved-loan-actions">

                    <button
                        type="button"
                        class="create-loan-btn"
                        data-id="${application.loan_application_id}"
                    >
                        💰 Create Loan
                    </button>

                </div>
            `;


            container.appendChild(
                card
            );
        }
    );


    document
        .querySelectorAll(
            '.create-loan-btn'
        )
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    () => {

                        openCreateLoanModal(
                            Number(
                                button.dataset.id
                            )
                        );
                    }
                );
            }
        );
}


// ============================================================
// OPEN CREATE LOAN MODAL
// ============================================================

async function openCreateLoanModal(
    applicationId
) {

    const application =
        loanApplications.find(
            item =>
                Number(
                    item.loan_application_id
                )
                ===
                Number(
                    applicationId
                )
        );


    if (
        !application ||
        application.status !==
        'APPROVED'
    ) {

        return;
    }


    selectedApprovedLoanApplication =
        application;


    selectedDisbursementAccount =
        null;


    setLoanText(
        'create-loan-application-id',
        application.loan_application_id
    );


    setLoanText(
        'create-loan-customer-id',
        application.customer_id
    );


    setLoanText(
        'create-loan-requested-amount',
        `৳${formatLoanMoney(
            application.requested_amount
        )}`
    );


    setLoanText(
        'create-loan-duration',
        `${application.duration_months} months`
    );


    const preview =
        document.getElementById(
            'loan-auto-account-preview'
        );


    const message =
        document.getElementById(
            'loan-auto-account-message'
        );


    const createButton =
        document.getElementById(
            'confirm-create-loan-btn'
        );


    preview.style.display =
        'none';


    createButton.disabled =
        true;


    message.style.color =
        '#475569';


    message.textContent =
        'Detecting customer account...';


    setLoanText(
        'create-loan-message',
        ''
    );


    showModal(
        'create-loan-modal'
    );


    try {

        const account =
            await detectDisbursementAccount(
                application.customer_id
            );


        selectedDisbursementAccount =
            account;


        setLoanText(
            'loan-auto-account-number',
            account.account_number
        );


        setLoanText(
            'loan-auto-account-id',
            account.account_id
        );


        setLoanText(
            'loan-auto-account-balance',
            `৳${formatLoanMoney(
                account.available_balance
            )}`
        );


        setLoanText(
            'loan-auto-account-status',
            account.status
        );


        preview.style.display =
            'grid';


        message.style.color =
            '#16a34a';


        message.textContent =
            '✓ Customer account detected automatically.';


        createButton.disabled =
            false;

    }

    catch (error) {

        selectedDisbursementAccount =
            null;


        message.style.color =
            '#dc2626';


        message.textContent =
            '✕ ' +
            error.message;


        createButton.disabled =
            true;
    }
}


// ============================================================
// CREATE LOAN
// ============================================================

async function createLoanFromApplication() {

    if (
        !selectedApprovedLoanApplication
    ) {

        return;
    }


    if (
        !selectedDisbursementAccount
    ) {

        alert(
            'No eligible disbursement account was detected.'
        );

        return;
    }


    if (!loanOfficerUserId) {

        loanOfficerUserId =
            Number(
                localStorage.getItem(
                    'user_id'
                )
            );
    }


    if (!loanOfficerUserId) {

        alert(
            'Loan Officer login information could not be identified.'
        );

        return;
    }


    const button =
        document.getElementById(
            'confirm-create-loan-btn'
        );


    const message =
        document.getElementById(
            'create-loan-message'
        );


    if (
        !confirm(
            `Create this loan?\n\n`
            +
            `Application: #${selectedApprovedLoanApplication.loan_application_id}\n`
            +
            `Customer: ${selectedApprovedLoanApplication.customer_id}\n`
            +
            `Account: ${selectedDisbursementAccount.account_number}\n`
            +
            `Amount: ৳${formatLoanMoney(
                selectedApprovedLoanApplication.requested_amount
            )}`
        )
    ) {

        return;
    }


    button.disabled =
        true;


    button.textContent =
        'Creating Loan...';


    try {

        const response =
            await fetch(
                `${LOAN_OFFICER_API}/loan-applications/${selectedApprovedLoanApplication.loan_application_id}/create-loan?officer_user_id=${loanOfficerUserId}`,
                {
                    method:
                        'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify({

                            disbursement_account_id:
                                Number(
                                    selectedDisbursementAccount
                                        .account_id
                                )
                        })
                }
            );


        const result =
            await response.json();


        console.log(
            'CREATE LOAN RESPONSE:',
            result
        );


        if (!response.ok) {

            throw new Error(
                formatApiError(
                    result,
                    'Unable to create loan.'
                )
            );
        }


        message.style.color =
            '#16a34a';


        message.textContent =
            `✓ Loan created successfully. Loan ID: ${result.loan.loan_id}`;


        await loadCreatedLoans();


        setTimeout(
            closeCreateLoanModal,
            900
        );

    }

    catch (error) {

        message.style.color =
            '#dc2626';


        message.textContent =
            '✕ ' +
            error.message;

    }

    finally {

        button.disabled =
            false;


        button.textContent =
            '💰 Create Loan';
    }
}


// ============================================================
// CLOSE CREATE LOAN MODAL
// ============================================================

function closeCreateLoanModal() {

    hideModal(
        'create-loan-modal'
    );


    selectedApprovedLoanApplication =
        null;


    selectedDisbursementAccount =
        null;
}


// ============================================================
// LOAD CREATED LOANS
// ============================================================

async function loadCreatedLoans() {

    const body =
        document.getElementById(
            'created-loans-body'
        );


    setTableLoading(
        body,
        9,
        'Loading loans...'
    );


    try {

        const response =
            await fetch(
                `${LOAN_OFFICER_API}/loans/`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                formatApiError(
                    result,
                    'Unable to load loans.'
                )
            );
        }


        const allLoans =
            Array.isArray(result)
                ? result
                : [];


        const branchCustomerIds =
            new Set(
                loanCustomerRecords.map(
                    customer =>
                        String(
                            customer.customer_id
                        )
                )
            );


        createdLoans =
            allLoans.filter(
                loan =>
                    branchCustomerIds.has(
                        String(
                            loan.customer_id
                        )
                    )
            );


        updateCreatedLoanStatistics();

        filterCreatedLoans();

        updateActiveLoanStatistics();

        filterActiveLoans();

        updateLoanReports();

    }

    catch (error) {

        showTableError(
            body,
            9,
            error.message
        );
    }
}


// ============================================================
// CREATED LOAN STATISTICS
// ============================================================

function updateCreatedLoanStatistics() {

    setLoanText(
        'loan-created-count',
        createdLoans.length
    );


    setLoanText(
        'loan-awaiting-disbursement-count',
        countStatus(
            createdLoans,
            'APPROVED'
        )
    );


    setLoanText(
        'loan-active-count',
        countStatus(
            createdLoans,
            'ACTIVE'
        )
    );


    setLoanText(
        'loan-completed-count',
        countStatus(
            createdLoans,
            'COMPLETED'
        )
    );
}


// ============================================================
// FILTER CREATED LOANS
// ============================================================

function filterCreatedLoans() {

    const search =
        document.getElementById(
            'created-loan-search'
        )?.value
            .trim()
            .toLowerCase()
        ||
        '';


    const status =
        document.getElementById(
            'created-loan-status-filter'
        )?.value
        ||
        '';


    const filtered =
        createdLoans.filter(
            loan => {

                const text = `
                    ${loan.loan_id ?? ''}
                    ${loan.customer_id ?? ''}
                    ${loan.loan_type_name ?? ''}
                    ${loan.disbursement_account_number ?? ''}
                    ${loan.status ?? ''}
                `.toLowerCase();


                return (
                    (
                        !search ||
                        text.includes(search)
                    )
                    &&
                    (
                        !status ||
                        loan.status === status
                    )
                );
            }
        );


    renderCreatedLoans(
        filtered
    );
}


// ============================================================
// RENDER CREATED LOANS
// ============================================================

function renderCreatedLoans(
    loans
) {

    const body =
        document.getElementById(
            'created-loans-body'
        );


    if (!body) {

        return;
    }


    if (!loans.length) {

        setTableLoading(
            body,
            9,
            'No loans found.'
        );

        return;
    }


    body.innerHTML =
        '';


    loans.forEach(
        loan => {

            const row =
                document.createElement(
                    'tr'
                );


            row.innerHTML = `

                <td>
                    #${loan.loan_id}
                </td>

                <td>
                    ${loan.customer_id}
                </td>

                <td>
                    ${escapeLoanHtml(
                loan.loan_type_name ||
                getLoanTypeName(
                    loan.loan_type_id
                )
            )}
                </td>

                <td>
                    ৳${formatLoanMoney(
                loan.principal_amount
            )}
                </td>

                <td>
                    ৳${formatLoanMoney(
                loan.outstanding_amount
            )}
                </td>

                <td>
                    ৳${formatLoanMoney(
                loan.monthly_emi
            )}
                </td>

                <td>
                    ${escapeLoanHtml(
                loan.disbursement_account_number ||
                loan.disbursement_account_id ||
                '-'
            )}
                </td>

                <td>

                    <span
                        class="loan-status ${statusClass(
                loan.status
            )}"
                    >
                        ${escapeLoanHtml(
                loan.status
            )}
                    </span>

                </td>

                <td>

                    ${loan.status ===
                    'APPROVED'
                    ?
                    `
                            <button
                                type="button"
                                class="disburse-loan-btn"
                                data-id="${loan.loan_id}"
                            >
                                💸 Disburse
                            </button>
                        `
                    :
                    (
                        loan.status ===
                            'ACTIVE'
                            ?
                            '✓ Disbursed'
                            :
                            '-'
                    )
                }

                </td>

            `;


            body.appendChild(
                row
            );
        }
    );


    document
        .querySelectorAll(
            '.disburse-loan-btn'
        )
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    () => {

                        const loan =
                            createdLoans.find(
                                item =>
                                    Number(
                                        item.loan_id
                                    )
                                    ===
                                    Number(
                                        button.dataset.id
                                    )
                            );


                        if (loan) {

                            disburseLoan(
                                loan
                            );
                        }
                    }
                );
            }
        );
}


// ============================================================
// DISBURSE LOAN
// ============================================================

async function disburseLoan(
    loan
) {

    const userId =
        Number(
            localStorage.getItem(
                'user_id'
            )
        );


    if (
        !confirm(
            `Disburse Loan #${loan.loan_id}?\n\n`
            +
            `Customer: ${loan.customer_id}\n`
            +
            `Amount: ৳${formatLoanMoney(
                loan.principal_amount
            )}\n`
            +
            `Account: ${loan.disbursement_account_number || loan.disbursement_account_id}`
        )
    ) {

        return;
    }


    try {

        const response =
            await fetch(
                `${LOAN_OFFICER_API}/loan-transactions/disburse`,
                {
                    method:
                        'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify({

                            loan_id:
                                Number(
                                    loan.loan_id
                                ),

                            initiated_by_user_id:
                                userId,

                            description:
                                'Loan disbursement by Loan Officer'
                        })
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                formatApiError(
                    result,
                    'Loan disbursement failed.'
                )
            );
        }


        alert(
            `Loan disbursed successfully.\n\n`
            +
            `Reference: ${result.reference_no}`
        );


        await loadCreatedLoans();

        await loadLoanPayments();

    }

    catch (error) {

        alert(
            error.message
        );
    }
}


// ============================================================
// CUSTOMER LOAN SEARCH EMPTY STATE
// ============================================================

function prepareCustomerLoanSearch() {

    const input =
        document.getElementById(
            'customer-loan-search-input'
        );


    const container =
        document.getElementById(
            'customer-loan-search-results'
        );


    const message =
        document.getElementById(
            'customer-loan-search-message'
        );


    if (!container) {

        return;
    }


    if (
        input &&
        input.value.trim()
    ) {

        searchCustomerLoans();

        return;
    }


    if (message) {

        message.style.color =
            '#64748b';


        message.textContent =
            `${getUniqueLoanCustomerCount()} customer(s) available for loan search.`;
    }


    container.innerHTML = `
        <div class="loan-empty-state">
            Enter customer ID, name, email, phone, NID,
            account number or loan ID to search.
        </div>
    `;
}


// ============================================================
// UNIQUE CUSTOMER COUNT
// ============================================================

function getUniqueLoanCustomerCount() {

    const ids =
        new Set();


    loanCustomerRecords.forEach(
        customer => {

            if (
                customer.customer_id !=
                null
            ) {

                ids.add(
                    String(
                        customer.customer_id
                    )
                );
            }
        }
    );


    return ids.size;
}


// ============================================================
// SEARCH CUSTOMER LOANS
// ============================================================

function searchCustomerLoans() {

    const input =
        document.getElementById(
            'customer-loan-search-input'
        );


    const container =
        document.getElementById(
            'customer-loan-search-results'
        );


    const message =
        document.getElementById(
            'customer-loan-search-message'
        );


    if (
        !input ||
        !container
    ) {

        return;
    }


    const query =
        input.value
            .trim()
            .toLowerCase();


    if (!query) {

        prepareCustomerLoanSearch();

        return;
    }


    const matchedCustomerIds =
        new Set();


    loanCustomerRecords.forEach(
        customer => {

            const text = `
                ${customer.customer_id ?? ''}
                ${customer.first_name ?? ''}
                ${customer.last_name ?? ''}
                ${customer.first_name ?? ''} ${customer.last_name ?? ''}
                ${customer.email ?? ''}
                ${customer.phone ?? ''}
                ${customer.nid ?? customer.nid_number ?? ''}
                ${customer.account_number ?? ''}
                ${customer.occupation ?? ''}
                ${customer.customer_status ?? ''}
                ${customer.account_status ?? ''}
            `.toLowerCase();


            if (
                text.includes(
                    query
                )
            ) {

                matchedCustomerIds.add(
                    String(
                        customer.customer_id
                    )
                );
            }
        }
    );


    createdLoans.forEach(
        loan => {

            const text = `
                ${loan.loan_id ?? ''}
                ${loan.customer_id ?? ''}
                ${loan.loan_type_name ?? ''}
                ${getLoanTypeName(
                loan.loan_type_id
            )}
                ${loan.disbursement_account_number ?? ''}
                ${loan.disbursement_account_id ?? ''}
                ${loan.status ?? ''}
            `.toLowerCase();


            if (
                text.includes(
                    query
                )
            ) {

                matchedCustomerIds.add(
                    String(
                        loan.customer_id
                    )
                );
            }
        }
    );


    const customerIds =
        Array.from(
            matchedCustomerIds
        );


    if (!customerIds.length) {

        if (message) {

            message.style.color =
                '#64748b';


            message.textContent =
                'No matching customer or loan found.';
        }


        container.innerHTML = `
            <div class="loan-empty-state">
                No matching customer or loan found.
            </div>
        `;


        return;
    }


    if (message) {

        message.style.color =
            '#16a34a';


        message.textContent =
            `${customerIds.length} matching customer(s) found.`;
    }


    renderCustomerLoanSearchResults(
        customerIds
    );
}


// ============================================================
// RENDER CUSTOMER LOAN SEARCH
// ============================================================

function renderCustomerLoanSearchResults(
    customerIds
) {

    const container =
        document.getElementById(
            'customer-loan-search-results'
        );


    if (!container) {

        return;
    }


    container.innerHTML =
        '';


    customerIds.forEach(
        customerId => {

            const customerRows =
                loanCustomerRecords.filter(
                    item =>
                        String(
                            item.customer_id
                        )
                        ===
                        String(
                            customerId
                        )
                );


            const customer =
                customerRows[0]
                ||
                {
                    customer_id:
                        customerId
                };


            const loans =
                createdLoans.filter(
                    loan =>
                        String(
                            loan.customer_id
                        )
                        ===
                        String(
                            customerId
                        )
                );


            const accountNumbers =
                Array.from(
                    new Set(
                        customerRows
                            .map(
                                row =>
                                    row.account_number
                            )
                            .filter(
                                Boolean
                            )
                    )
                );


            const fullName =
                `${customer.first_name || ''} ${customer.last_name || ''}`
                    .trim()
                ||
                `Customer #${customerId}`;


            const card =
                document.createElement(
                    'div'
                );


            card.className =
                'approved-loan-card';


            card.innerHTML = `

                <div class="approved-loan-header">

                    <div>

                        <span class="loan-small-label">
                            Customer Loan Profile
                        </span>

                        <h3>
                            ${escapeLoanHtml(
                fullName
            )}
                        </h3>

                        <p>
                            Customer ID:
                            #${escapeLoanHtml(
                customerId
            )}
                        </p>

                    </div>


                    <span
                        class="loan-status ${statusClass(
                customer.customer_status ||
                'ACTIVE'
            )}"
                    >
                        ${escapeLoanHtml(
                customer.customer_status ||
                'CUSTOMER'
            )}
                    </span>

                </div>


                <div class="approved-loan-grid">

                    <div>

                        <span>
                            Email
                        </span>

                        <strong>
                            ${escapeLoanHtml(
                customer.email ||
                '-'
            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Phone
                        </span>

                        <strong>
                            ${escapeLoanHtml(
                customer.phone ||
                '-'
            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            NID
                        </span>

                        <strong>
                            ${escapeLoanHtml(
                customer.nid ||
                customer.nid_number ||
                '-'
            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Accounts
                        </span>

                        <strong>
                            ${escapeLoanHtml(
                accountNumbers.length
                    ?
                    accountNumbers.join(
                        ', '
                    )
                    :
                    '-'
            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Occupation
                        </span>

                        <strong>
                            ${escapeLoanHtml(
                customer.occupation ||
                '-'
            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Total Created Loans
                        </span>

                        <strong>
                            ${loans.length}
                        </strong>

                    </div>

                </div>


                ${loans.length
                    ?
                    buildCustomerLoanTable(
                        loans
                    )
                    :
                    `
                        <div class="loan-empty-state">
                            This customer currently has no created loans.
                        </div>
                    `
                }
            `;


            container.appendChild(
                card
            );
        }
    );


    bindOpenRepaymentButtons();
}


// ============================================================
// CUSTOMER LOAN TABLE
// ============================================================

function buildCustomerLoanTable(
    loans
) {

    const rows =
        loans.map(
            loan => `

                <tr>

                    <td>
                        #${escapeLoanHtml(
                loan.loan_id
            )}
                    </td>

                    <td>
                        ${escapeLoanHtml(
                loan.loan_type_name ||
                getLoanTypeName(
                    loan.loan_type_id
                )
            )}
                    </td>

                    <td>
                        ৳${formatLoanMoney(
                loan.principal_amount
            )}
                    </td>

                    <td>
                        ৳${formatLoanMoney(
                loan.outstanding_amount
            )}
                    </td>

                    <td>
                        ৳${formatLoanMoney(
                loan.monthly_emi
            )}
                    </td>

                    <td>

                        <span
                            class="loan-status ${statusClass(
                loan.status
            )}"
                        >
                            ${escapeLoanHtml(
                loan.status
            )}
                        </span>

                    </td>

                    <td>

                        <button
                            type="button"
                            class="loan-review-btn open-loan-repayments-btn"
                            data-loan-id="${loan.loan_id}"
                        >
                            View Repayments
                        </button>

                    </td>

                </tr>
            `
        )
            .join('');


    return `

        <div
            class="table-wrapper"
            style="margin-top:18px;"
        >

            <table class="applications-table">

                <thead>

                    <tr>
                        <th>Loan ID</th>
                        <th>Loan Type</th>
                        <th>Principal</th>
                        <th>Outstanding</th>
                        <th>EMI</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>

                </thead>

                <tbody>
                    ${rows}
                </tbody>

            </table>

        </div>
    `;
}


// ============================================================
// ACTIVE LOAN STATISTICS
// ============================================================

function updateActiveLoanStatistics() {

    const portfolio =
        createdLoans.filter(
            loan =>
                loan.status ===
                'ACTIVE'
                ||
                loan.status ===
                'DEFAULTED'
        );


    const active =
        portfolio.filter(
            loan =>
                loan.status ===
                'ACTIVE'
        ).length;


    const defaulted =
        portfolio.filter(
            loan =>
                loan.status ===
                'DEFAULTED'
        ).length;


    const principal =
        portfolio.reduce(
            (
                total,
                loan
            ) =>
                total
                +
                Number(
                    loan.principal_amount ||
                    0
                ),
            0
        );


    const outstanding =
        portfolio.reduce(
            (
                total,
                loan
            ) =>
                total
                +
                Number(
                    loan.outstanding_amount ||
                    0
                ),
            0
        );


    setLoanText(
        'active-loan-total',
        active
    );


    setLoanText(
        'defaulted-loan-total',
        defaulted
    );


    setLoanText(
        'active-loan-principal-total',
        `৳${formatLoanMoney(
            principal
        )}`
    );


    setLoanText(
        'active-loan-outstanding-total',
        `৳${formatLoanMoney(
            outstanding
        )}`
    );
}


// ============================================================
// FILTER ACTIVE LOANS
// ============================================================

function filterActiveLoans() {

    const search =
        document.getElementById(
            'active-loan-search'
        )?.value
            .trim()
            .toLowerCase()
        ||
        '';


    const status =
        document.getElementById(
            'active-loan-status-filter'
        )?.value
        ||
        '';


    const filtered =
        createdLoans.filter(
            loan => {

                if (
                    loan.status !==
                    'ACTIVE'
                    &&
                    loan.status !==
                    'DEFAULTED'
                ) {

                    return false;
                }


                const customer =
                    getLoanCustomerSummary(
                        loan.customer_id
                    );


                const text = `
                    ${loan.loan_id ?? ''}
                    ${loan.customer_id ?? ''}
                    ${customer.full_name ?? ''}
                    ${customer.email ?? ''}
                    ${customer.phone ?? ''}
                    ${loan.loan_type_name ?? ''}
                    ${getLoanTypeName(
                    loan.loan_type_id
                )}
                    ${loan.disbursement_account_number ?? ''}
                    ${loan.disbursement_account_id ?? ''}
                    ${loan.status ?? ''}
                `.toLowerCase();


                return (
                    (
                        !search ||
                        text.includes(
                            search
                        )
                    )
                    &&
                    (
                        !status ||
                        loan.status ===
                        status
                    )
                );
            }
        );


    renderActiveLoans(
        filtered
    );
}


// ============================================================
// RENDER ACTIVE LOANS
// ============================================================

function renderActiveLoans(
    loans
) {

    const body =
        document.getElementById(
            'active-loans-body'
        );


    if (!body) {

        return;
    }


    if (!loans.length) {

        setTableLoading(
            body,
            11,
            'No active or defaulted loans found.'
        );

        return;
    }


    body.innerHTML =
        '';


    loans.forEach(
        loan => {

            const customer =
                getLoanCustomerSummary(
                    loan.customer_id
                );


            const row =
                document.createElement(
                    'tr'
                );


            row.innerHTML = `

                <td>
                    #${escapeLoanHtml(
                loan.loan_id
            )}
                </td>

                <td>

                    ${escapeLoanHtml(
                customer.full_name ||
                `Customer #${loan.customer_id}`
            )}

                    <br>

                    <small>
                        #${escapeLoanHtml(
                loan.customer_id
            )}
                    </small>

                </td>

                <td>
                    ${escapeLoanHtml(
                loan.loan_type_name ||
                getLoanTypeName(
                    loan.loan_type_id
                )
            )}
                </td>

                <td>
                    ৳${formatLoanMoney(
                loan.principal_amount
            )}
                </td>

                <td>
                    ৳${formatLoanMoney(
                loan.outstanding_amount
            )}
                </td>

                <td>
                    ${escapeLoanHtml(
                loan.interest_rate ??
                '-'
            )}%
                </td>

                <td>
                    ৳${formatLoanMoney(
                loan.monthly_emi
            )}
                </td>

                <td>
                    ${escapeLoanHtml(
                loan.disbursement_account_number ||
                loan.disbursement_account_id ||
                '-'
            )}
                </td>

                <td>
                    ${escapeLoanHtml(
                formatLoanDate(
                    loan.disbursement_date
                )
            )}
                </td>

                <td>

                    <span
                        class="loan-status ${statusClass(
                loan.status
            )}"
                    >
                        ${escapeLoanHtml(
                loan.status
            )}
                    </span>

                </td>

                <td>

                    <button
                        type="button"
                        class="loan-review-btn open-loan-repayments-btn"
                        data-loan-id="${loan.loan_id}"
                    >
                        View Repayments
                    </button>

                </td>

            `;


            body.appendChild(
                row
            );
        }
    );


    bindOpenRepaymentButtons();
}


// ============================================================
// CUSTOMER SUMMARY
// ============================================================

function getLoanCustomerSummary(
    customerId
) {

    const customer =
        loanCustomerRecords.find(
            item =>
                String(
                    item.customer_id
                )
                ===
                String(
                    customerId
                )
        );


    if (!customer) {

        return {

            full_name:
                `Customer #${customerId}`,

            email:
                '',

            phone:
                ''
        };
    }


    return {

        full_name:
            `${customer.first_name || ''} ${customer.last_name || ''}`
                .trim(),

        email:
            customer.email ||
            '',

        phone:
            customer.phone ||
            ''
    };
}


// ============================================================
// VIEW REPAYMENTS FROM OTHER SECTIONS
// ============================================================

function bindOpenRepaymentButtons() {

    document
        .querySelectorAll(
            '.open-loan-repayments-btn'
        )
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    async () => {

                        await openRepaymentsForLoan(
                            Number(
                                button.dataset.loanId
                            )
                        );
                    }
                );
            }
        );
}


async function openRepaymentsForLoan(
    loanId
) {

    showLoanOfficerSection(
        'repayment-monitoring-section'
    );


    await loadLoanPayments();


    const search =
        document.getElementById(
            'repayment-search'
        );


    const status =
        document.getElementById(
            'repayment-status-filter'
        );


    if (search) {

        search.value =
            String(
                loanId
            );
    }


    if (status) {

        status.value =
            '';
    }


    filterLoanPayments();
}


// ============================================================
// LOAD PAYMENTS
// ============================================================

async function loadLoanPayments() {

    const body =
        document.getElementById(
            'repayment-body'
        );


    setTableLoading(
        body,
        10,
        'Loading repayment information...'
    );


    try {

        const response =
            await fetch(
                `${LOAN_OFFICER_API}/loan-payments/`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                formatApiError(
                    result,
                    'Unable to load loan payments.'
                )
            );
        }


        const allPayments =
            Array.isArray(result)
                ? result
                : [];


        const branchLoanIds =
            new Set(
                createdLoans.map(
                    loan =>
                        String(
                            loan.loan_id
                        )
                )
            );


        loanPayments =
            allPayments.filter(
                payment =>
                    branchLoanIds.has(
                        String(
                            payment.loan_id
                        )
                    )
            );


        updateRepaymentStatistics();

        filterLoanPayments();

        updateLoanReports();

    }

    catch (error) {

        showTableError(
            body,
            10,
            error.message
        );
    }
}


// ============================================================
// REPAYMENT STATISTICS
// ============================================================

function updateRepaymentStatistics() {

    setLoanText(
        'repayment-total-count',
        loanPayments.length
    );


    setLoanText(
        'repayment-pending-count',
        countStatus(
            loanPayments,
            'PENDING'
        )
    );


    setLoanText(
        'repayment-paid-count',
        countStatus(
            loanPayments,
            'PAID'
        )
    );


    setLoanText(
        'repayment-overdue-count',
        countStatus(
            loanPayments,
            'OVERDUE'
        )
    );
}


// ============================================================
// FILTER PAYMENTS
// ============================================================

function filterLoanPayments() {

    const search =
        document.getElementById(
            'repayment-search'
        )?.value
            .trim()
            .toLowerCase()
        ||
        '';


    const status =
        document.getElementById(
            'repayment-status-filter'
        )?.value
        ||
        '';


    const filtered =
        loanPayments.filter(
            payment => {

                const text = `
                    ${payment.loan_payment_id ?? ''}
                    ${payment.loan_id ?? ''}
                    ${payment.installment_no ?? ''}
                    ${payment.status ?? ''}
                `.toLowerCase();


                return (
                    (
                        !search ||
                        text.includes(
                            search
                        )
                    )
                    &&
                    (
                        !status ||
                        payment.status ===
                        status
                    )
                );
            }
        );


    renderLoanPayments(
        filtered
    );
}


// ============================================================
// RENDER PAYMENTS
// ============================================================

function renderLoanPayments(
    payments
) {

    const body =
        document.getElementById(
            'repayment-body'
        );


    if (!body) {

        return;
    }


    if (!payments.length) {

        setTableLoading(
            body,
            10,
            'No loan installments found.'
        );

        return;
    }


    body.innerHTML =
        '';


    payments.forEach(
        payment => {

            const row =
                document.createElement(
                    'tr'
                );


            row.innerHTML = `

                <td>
                    #${payment.loan_payment_id}
                </td>

                <td>
                    #${payment.loan_id}
                </td>

                <td>
                    ${payment.installment_no}
                </td>

                <td>
                    ${escapeLoanHtml(
                formatLoanDate(
                    payment.due_date
                )
            )}
                </td>

                <td>
                    ৳${formatLoanMoney(
                payment.amount_due
            )}
                </td>

                <td>
                    ৳${formatLoanMoney(
                payment.amount_paid
            )}
                </td>

                <td>
                    ৳${formatLoanMoney(
                payment.late_fee
            )}
                </td>

                <td>

                    <span
                        class="loan-status ${statusClass(
                payment.status
            )}"
                    >
                        ${escapeLoanHtml(
                payment.status
            )}
                    </span>

                </td>

                <td>
                    ${escapeLoanHtml(
                formatLoanDate(
                    payment.payment_date
                )
            )}
                </td>

                <td>

                    ${payment.status !==
                    'PAID'
                    ?
                    `
                            <button
                                type="button"
                                class="repayment-pay-btn"
                                data-id="${payment.loan_payment_id}"
                            >
                                💳 Pay
                            </button>
                        `
                    :
                    '✓ Paid'
                }

                </td>

            `;


            body.appendChild(
                row
            );
        }
    );


    document
        .querySelectorAll(
            '.repayment-pay-btn'
        )
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    () => {

                        openLoanPaymentModal(
                            Number(
                                button.dataset.id
                            )
                        );
                    }
                );
            }
        );
}


// ============================================================
// OPEN PAYMENT MODAL
// ============================================================

async function openLoanPaymentModal(
    paymentId
) {

    const payment =
        loanPayments.find(
            item =>
                Number(
                    item.loan_payment_id
                )
                ===
                Number(
                    paymentId
                )
        );


    if (!payment) {

        return;
    }


    const loan =
        createdLoans.find(
            item =>
                Number(
                    item.loan_id
                )
                ===
                Number(
                    payment.loan_id
                )
        );


    if (!loan) {

        alert(
            'Loan information could not be found.'
        );

        return;
    }


    selectedLoanPayment =
        payment;


    selectedRepaymentAccount =
        null;


    const remaining =
        Number(
            payment.amount_due ||
            0
        )
        -
        Number(
            payment.amount_paid ||
            0
        );


    const lateFee =
        Number(
            payment.late_fee ||
            0
        );


    const totalDue =
        remaining +
        lateFee;


    setLoanText(
        'payment-loan-id',
        payment.loan_id
    );


    setLoanText(
        'payment-installment-no',
        payment.installment_no
    );


    setLoanText(
        'payment-amount-due',
        `৳${formatLoanMoney(
            remaining
        )}`
    );


    setLoanText(
        'payment-late-fee',
        `৳${formatLoanMoney(
            lateFee
        )}`
    );


    setLoanText(
        'payment-total-due',
        `৳${formatLoanMoney(
            totalDue
        )}`
    );


    document.getElementById(
        'payment-description'
    ).value =
        'Loan installment payment';


    const preview =
        document.getElementById(
            'payment-auto-account-preview'
        );


    const message =
        document.getElementById(
            'payment-auto-account-message'
        );


    const payButton =
        document.getElementById(
            'confirm-loan-payment-btn'
        );


    preview.style.display =
        'none';


    payButton.disabled =
        true;


    message.style.color =
        '#475569';


    message.textContent =
        'Detecting repayment account...';


    setLoanText(
        'loan-payment-message',
        ''
    );


    showModal(
        'loan-payment-modal'
    );


    try {

        const account =
            await detectRepaymentAccount(
                loan.customer_id,
                totalDue
            );


        selectedRepaymentAccount =
            account;


        setLoanText(
            'payment-auto-account-number',
            account.account_number
        );


        setLoanText(
            'payment-auto-account-id',
            account.account_id
        );


        setLoanText(
            'payment-auto-account-balance',
            `৳${formatLoanMoney(
                account.available_balance
            )}`
        );


        setLoanText(
            'payment-auto-account-status',
            account.status
        );


        preview.style.display =
            'grid';


        message.style.color =
            '#16a34a';


        message.textContent =
            '✓ Repayment account detected automatically.';


        payButton.disabled =
            false;

    }

    catch (error) {

        selectedRepaymentAccount =
            null;


        message.style.color =
            '#dc2626';


        message.textContent =
            '✕ ' +
            error.message;


        payButton.disabled =
            true;
    }
}


// ============================================================
// SUBMIT PAYMENT
// ============================================================

async function submitLoanPayment() {

    if (!selectedLoanPayment) {

        return;
    }


    if (!selectedRepaymentAccount) {

        alert(
            'No suitable repayment account was detected.'
        );

        return;
    }


    const remaining =
        Number(
            selectedLoanPayment
                .amount_due ||
            0
        )
        -
        Number(
            selectedLoanPayment
                .amount_paid ||
            0
        );


    const lateFee =
        Number(
            selectedLoanPayment
                .late_fee ||
            0
        );


    const totalPayment =
        remaining +
        lateFee;


    const userId =
        Number(
            localStorage.getItem(
                'user_id'
            )
        );


    const description =
        document.getElementById(
            'payment-description'
        )
            ?.value
            .trim()
        ||
        'Loan installment payment';


    const button =
        document.getElementById(
            'confirm-loan-payment-btn'
        );


    const message =
        document.getElementById(
            'loan-payment-message'
        );


    if (
        !confirm(
            `Process installment payment?\n\n`
            +
            `Loan: #${selectedLoanPayment.loan_id}\n`
            +
            `Installment: ${selectedLoanPayment.installment_no}\n`
            +
            `Account: ${selectedRepaymentAccount.account_number}\n`
            +
            `Amount: ৳${formatLoanMoney(
                totalPayment
            )}`
        )
    ) {

        return;
    }


    button.disabled =
        true;


    button.textContent =
        'Processing Payment...';


    try {

        const response =
            await fetch(
                `${LOAN_OFFICER_API}/loan-transactions/payment`,
                {
                    method:
                        'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify({

                            loan_id:
                                Number(
                                    selectedLoanPayment
                                        .loan_id
                                ),

                            loan_payment_id:
                                Number(
                                    selectedLoanPayment
                                        .loan_payment_id
                                ),

                            account_id:
                                Number(
                                    selectedRepaymentAccount
                                        .account_id
                                ),

                            amount:
                                totalPayment,

                            initiated_by_user_id:
                                userId,

                            description:
                                description
                        })
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                formatApiError(
                    result,
                    'Loan payment failed.'
                )
            );
        }


        message.style.color =
            '#16a34a';


        message.textContent =
            `✓ Payment completed. Reference: ${result.reference_no}`;


        await loadLoanPayments();

        await loadCreatedLoans();


        setTimeout(
            closeLoanPaymentModal,
            900
        );

    }

    catch (error) {

        message.style.color =
            '#dc2626';


        message.textContent =
            '✕ ' +
            error.message;

    }

    finally {

        button.disabled =
            false;


        button.textContent =
            '💳 Pay Installment';
    }
}


// ============================================================
// CLOSE PAYMENT MODAL
// ============================================================

function closeLoanPaymentModal() {

    hideModal(
        'loan-payment-modal'
    );


    selectedLoanPayment =
        null;


    selectedRepaymentAccount =
        null;
}


// ============================================================
// REPORTS
// ============================================================

function updateLoanReports() {

    const totalRequested =
        loanApplications.reduce(
            (
                total,
                item
            ) =>
                total
                +
                Number(
                    item.requested_amount ||
                    0
                ),
            0
        );


    const approvedAmount =
        loanApplications
            .filter(
                item =>
                    item.status ===
                    'APPROVED'
            )
            .reduce(
                (
                    total,
                    item
                ) =>
                    total
                    +
                    Number(
                        item.requested_amount ||
                        0
                    ),
                0
            );


    const outstanding =
        createdLoans
            .filter(
                item =>
                    item.status ===
                    'ACTIVE'
            )
            .reduce(
                (
                    total,
                    item
                ) =>
                    total
                    +
                    Number(
                        item.outstanding_amount ||
                        0
                    ),
                0
            );


    setLoanText(
        'loan-report-total-requested',
        `৳${formatLoanMoney(
            totalRequested
        )}`
    );


    setLoanText(
        'loan-report-approved-amount',
        `৳${formatLoanMoney(
            approvedAmount
        )}`
    );


    setLoanText(
        'loan-report-outstanding',
        `৳${formatLoanMoney(
            outstanding
        )}`
    );


    setLoanText(
        'loan-report-under-review',
        countStatus(
            loanApplications,
            'UNDER_REVIEW'
        )
    );


    setLoanText(
        'loan-report-rejected',
        countStatus(
            loanApplications,
            'REJECTED'
        )
    );


    setLoanText(
        'loan-report-active',
        countStatus(
            createdLoans,
            'ACTIVE'
        )
    );


    setLoanText(
        'loan-report-paid-installments',
        countStatus(
            loanPayments,
            'PAID'
        )
    );


    setLoanText(
        'loan-report-pending-installments',
        countStatus(
            loanPayments,
            'PENDING'
        )
    );
}


// ============================================================
// LOAN TYPE
// ============================================================

function getLoanTypeName(
    loanTypeId
) {

    const type =
        loanTypes.find(
            item =>
                Number(
                    item.loan_type_id
                )
                ===
                Number(
                    loanTypeId
                )
        );


    return type
        ?
        type.type_name
        :
        `Loan Type ${loanTypeId ?? '-'}`;
}


// ============================================================
// HELPERS
// ============================================================

function countStatus(
    records,
    status
) {

    return records.filter(
        item =>
            String(
                item.status ||
                ''
            ).toUpperCase()
            ===
            status
    ).length;
}


function setLoanText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;
    }
}


function formatLoanMoney(
    value
) {

    return Number(
        value ||
        0
    ).toLocaleString(
        'en-BD',
        {
            minimumFractionDigits:
                2,

            maximumFractionDigits:
                2
        }
    );
}


function formatLoanDate(
    value
) {

    if (!value) {

        return '-';
    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;
    }


    return date.toLocaleDateString(
        'en-BD'
    );
}


function statusClass(
    status
) {

    return String(
        status ||
        ''
    )
        .toLowerCase()
        .replace(
            /\s+/g,
            '_'
        );
}


function escapeLoanHtml(
    value
) {

    const div =
        document.createElement(
            'div'
        );


    div.textContent =
        value ?? '';


    return div.innerHTML;
}


function formatApiError(
    result,
    fallback
) {

    if (
        Array.isArray(
            result?.detail
        )
    ) {

        return result.detail
            .map(
                error =>
                    `${error.loc?.join('.') || 'request'}: ${error.msg}`
            )
            .join('\n');
    }


    if (
        result?.detail
    ) {

        return result.detail;
    }


    return fallback;
}


function showModal(
    id
) {

    document
        .getElementById(
            id
        )
        ?.classList.add(
            'show'
        );
}


function hideModal(
    id
) {

    document
        .getElementById(
            id
        )
        ?.classList.remove(
            'show'
        );
}


function bindClick(
    id,
    callback
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.addEventListener(
            'click',
            callback
        );
    }
}


function setTableLoading(
    body,
    colspan,
    message
) {

    if (!body) {

        return;
    }


    body.innerHTML = `
        <tr>

            <td
                colspan="${colspan}"
                class="message-row"
            >
                ${escapeLoanHtml(
        message
    )}
            </td>

        </tr>
    `;
}


function showTableError(
    body,
    colspan,
    message
) {

    setTableLoading(
        body,
        colspan,
        `Error: ${message}`
    );
}