// ============================================================
// NEXA BANK
// ACCOUNT OFFICER DASHBOARD
// ============================================================

const OFFICER_API_BASE =
    'http://127.0.0.1:8000';


// ============================================================
// GLOBAL DATA
// ============================================================

// Complete customer records belonging ONLY to officer branch
let officerAllCustomers = [];

// Currently displayed / filtered customers
let officerCustomerResults = [];

// Applications belonging ONLY to officer branch
let officerApplications = [];

// Logged-in officer information
let loggedInOfficerUserId = null;
let loggedInOfficerEmployeeId = null;
let loggedInOfficerBranchId = null;
let loggedInOfficerBranchName = null;


// ============================================================
// PAGE INITIALIZATION
// ============================================================

document.addEventListener(
    'DOMContentLoaded',
    async () => {

        console.log(
            'ACCOUNT OFFICER DASHBOARD LOADED'
        );

        verifyOfficerSession();

        initializeOfficerNavigation();

        initializeCustomerManagement();

        initializeOfficerLogout();

        // ----------------------------------------------------
        // IMPORTANT:
        // Applications are loaded first because the new
        // backend endpoint automatically returns the
        // logged-in officer's employee_id and branch_id.
        // ----------------------------------------------------

        await loadApplications();

        // ----------------------------------------------------
        // NOW LOAD ONLY CUSTOMERS FROM THAT BRANCH
        // ----------------------------------------------------

        await loadAllOfficerCustomers();

        showOfficerSection(
            'dashboard-section'
        );
    }
);


// ============================================================
// VERIFY ACCOUNT OFFICER SESSION
// ============================================================

function verifyOfficerSession() {

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

        clearOfficerSession();

        alert(
            'Please login as an Account Officer.'
        );

        window.location.href =
            'login.html';

        return;
    }


    /*
        Keep compatibility with the role values
        previously used in your project.
    */

    const allowedRoles = [
        'OFFICER',
        'ACCOUNT_OFFICER',
        'ACCOUNT OFFICER'
    ];


    if (
        role &&
        !allowedRoles.includes(role)
    ) {

        console.warn(
            'Unexpected Account Officer role:',
            role
        );
    }


    loggedInOfficerUserId =
        Number(
            userId
        );


    console.log(
        'ACCOUNT OFFICER USER ID:',
        loggedInOfficerUserId
    );
}


// ============================================================
// CLEAR SESSION
// ============================================================

function clearOfficerSession() {

    localStorage.removeItem(
        'user_id'
    );

    localStorage.removeItem(
        'customer_id'
    );

    localStorage.removeItem(
        'role'
    );
}


// ============================================================
// SECTION NAVIGATION
// ============================================================

function initializeOfficerNavigation() {

    const navigationLinks =
        document.querySelectorAll(
            '.officer-nav-link'
        );


    navigationLinks.forEach(
        link => {

            link.addEventListener(
                'click',
                event => {

                    /*
                        KYC has its own page.

                        Do not prevent normal navigation
                        when href points to another HTML file.
                    */

                    const href =
                        link.getAttribute(
                            'href'
                        );


                    if (
                        href &&
                        href !== '#'
                    ) {

                        return;
                    }


                    event.preventDefault();


                    const sectionId =
                        link.dataset.section;


                    if (!sectionId) {

                        return;
                    }


                    showOfficerSection(
                        sectionId
                    );
                }
            );
        }
    );


    // --------------------------------------------------------
    // DASHBOARD QUICK ACTIONS
    // --------------------------------------------------------

    const quickActions =
        document.querySelectorAll(
            '[data-open-section]'
        );


    quickActions.forEach(
        button => {

            button.addEventListener(
                'click',
                () => {

                    const sectionId =
                        button.dataset.openSection;


                    if (!sectionId) {

                        return;
                    }


                    showOfficerSection(
                        sectionId
                    );
                }
            );
        }
    );
}


// ============================================================
// SHOW SELECTED SECTION
// ============================================================

function showOfficerSection(
    sectionId
) {

    const sections =
        document.querySelectorAll(
            '.officer-section'
        );


    // --------------------------------------------------------
    // HIDE ALL
    // --------------------------------------------------------

    sections.forEach(
        section => {

            section.classList.remove(
                'active-section'
            );

            section.style.display =
                'none';
        }
    );


    // --------------------------------------------------------
    // SHOW SELECTED
    // --------------------------------------------------------

    const selectedSection =
        document.getElementById(
            sectionId
        );


    if (!selectedSection) {

        console.error(
            'SECTION NOT FOUND:',
            sectionId
        );

        return;
    }


    selectedSection.style.display =
        'block';


    selectedSection.classList.add(
        'active-section'
    );


    // --------------------------------------------------------
    // SIDEBAR ACTIVE STATE
    // --------------------------------------------------------

    const navigationLinks =
        document.querySelectorAll(
            '.officer-nav-link'
        );


    navigationLinks.forEach(
        link => {

            link.classList.remove(
                'active'
            );
        }
    );


    const activeLink =
        document.querySelector(
            `.officer-nav-link[data-section="${sectionId}"]`
        );


    if (activeLink) {

        activeLink.classList.add(
            'active'
        );
    }


    // --------------------------------------------------------
    // SECTION-SPECIFIC REFRESH
    // --------------------------------------------------------

    if (
        sectionId ===
        'applications-section'
    ) {

        loadApplications();
    }


    if (
        sectionId ===
        'customer-management-section'
        &&
        officerAllCustomers.length === 0
    ) {

        loadAllOfficerCustomers();
    }


    // --------------------------------------------------------
    // SCROLL MAIN CONTENT TO TOP
    // --------------------------------------------------------

    const mainContent =
        document.querySelector(
            '.main-content'
        );


    if (mainContent) {

        mainContent.scrollTo(
            {
                top: 0,
                behavior: 'smooth'
            }
        );
    }
}


// ============================================================
// LOAD ACCOUNT APPLICATIONS
// ONLY LOGGED-IN OFFICER'S BRANCH
// ============================================================

async function loadApplications() {

    const tableBody =
        document.getElementById(
            'applications-body'
        );


    const databaseStatus =
        document.getElementById(
            'database-status'
        );


    if (!loggedInOfficerUserId) {

        loggedInOfficerUserId =
            Number(
                localStorage.getItem(
                    'user_id'
                )
            );
    }


    try {

        if (tableBody) {

            tableBody.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="message-row"
                    >
                        Loading applications...
                    </td>
                </tr>
            `;
        }


        // ----------------------------------------------------
        // NEW BRANCH-SCOPED ENDPOINT
        // ----------------------------------------------------

        const response =
            await fetch(
                `${OFFICER_API_BASE}/account-applications/officer/${loggedInOfficerUserId}`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                formatOfficerApiError(
                    result,
                    'Failed to load applications.'
                )
            );
        }


        // ----------------------------------------------------
        // SAVE OFFICER IDENTITY FROM BACKEND
        // ----------------------------------------------------

        loggedInOfficerEmployeeId =
            Number(
                result.employee_id
            );


        loggedInOfficerBranchId =
            Number(
                result.branch_id
            );


        loggedInOfficerBranchName =
            result.branch_name
            ||
            `Branch ${loggedInOfficerBranchId}`;


        officerApplications =
            Array.isArray(
                result.applications
            )
                ?
                result.applications
                :
                [];


        console.log(
            'ACCOUNT OFFICER:',
            {
                user_id:
                    loggedInOfficerUserId,

                employee_id:
                    loggedInOfficerEmployeeId,

                branch_id:
                    loggedInOfficerBranchId,

                branch_name:
                    loggedInOfficerBranchName
            }
        );


        console.log(
            'BRANCH ACCOUNT APPLICATIONS:',
            officerApplications
        );


        updateStatistics(
            officerApplications
        );


        if (!tableBody) {

            return;
        }


        if (
            officerApplications.length ===
            0
        ) {

            tableBody.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="message-row"
                    >
                        No account applications found for
                        ${escapeHtml(
                loggedInOfficerBranchName
            )}.
                    </td>
                </tr>
            `;


            if (databaseStatus) {

                databaseStatus.textContent =
                    `✓ Connected. No applications found for ${loggedInOfficerBranchName}.`;
            }


            return;
        }


        tableBody.innerHTML =
            '';


        officerApplications.forEach(
            application => {

                const row =
                    document.createElement(
                        'tr'
                    );


                const accountType =
                    application.account_type_name
                    ||
                    getAccountTypeName(
                        application.account_type_id
                    );


                const branch =
                    application.branch_name
                    ||
                    getBranchName(
                        application.branch_id
                    );


                const statusClass =
                    getStatusClass(
                        application.status
                    );


                const submittedDate =
                    formatDate(
                        application.submitted_at
                    );


                let actionHTML =
                    '';


                if (
                    application.status ===
                    'SUBMITTED'
                    ||
                    application.status ===
                    'UNDER_REVIEW'
                ) {

                    actionHTML = `

                        <div class="action-buttons">

                            <button
                                type="button"
                                class="approve-btn"
                                onclick="approveApplication(${application.application_id})"
                            >
                                ✓ Approve
                            </button>

                            <button
                                type="button"
                                class="reject-btn"
                                onclick="rejectApplication(${application.application_id})"
                            >
                                ✕ Reject
                            </button>

                        </div>
                    `;

                } else {

                    actionHTML = `

                        <span
                            style="
                                color:#6b7280;
                                font-size:12px;
                            "
                        >
                            No action
                        </span>
                    `;
                }


                row.innerHTML = `

                    <td>
                        #${escapeHtml(
                    application.application_id
                )}
                    </td>

                    <td>
                        ${escapeHtml(
                    application.customer_id
                )}
                    </td>

                    <td>
                        ${escapeHtml(
                    accountType
                )}
                    </td>

                    <td>
                        ${escapeHtml(
                    branch
                )}
                    </td>

                    <td>
                        ${escapeHtml(
                    submittedDate
                )}
                    </td>

                    <td>

                        <span
                            class="status ${escapeHtml(
                    statusClass
                )}"
                        >
                            ${escapeHtml(
                    application.status
                )}
                        </span>

                    </td>

                    <td>
                        ${actionHTML}
                    </td>
                `;


                tableBody.appendChild(
                    row
                );
            }
        );


        if (databaseStatus) {

            databaseStatus.textContent =
                `✓ ${loggedInOfficerBranchName}: applications loaded successfully.`;
        }

    }

    catch (error) {

        console.error(
            'APPLICATION LOAD ERROR:',
            error
        );


        officerApplications = [];


        if (tableBody) {

            tableBody.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="message-row"
                    >
                        Unable to load applications.
                    </td>
                </tr>
            `;
        }


        if (databaseStatus) {

            databaseStatus.textContent =
                '✗ Database connection error: '
                +
                error.message;
        }
    }
}


// ============================================================
// UPDATE DASHBOARD STATISTICS
// ============================================================

function updateStatistics(
    applications
) {

    const total =
        applications.length;


    const submitted =
        applications.filter(
            application =>
                application.status ===
                'SUBMITTED'
        ).length;


    const approved =
        applications.filter(
            application =>
                application.status ===
                'APPROVED'
        ).length;


    const rejected =
        applications.filter(
            application =>
                application.status ===
                'REJECTED'
        ).length;


    setTextContent(
        'total-applications',
        total
    );


    setTextContent(
        'submitted-applications',
        submitted
    );


    setTextContent(
        'approved-applications',
        approved
    );


    setTextContent(
        'rejected-applications',
        rejected
    );
}


// ============================================================
// SAFE TEXT UPDATE
// ============================================================

function setTextContent(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            value;
    }
}


// ============================================================
// ACCOUNT TYPE NAME
// ============================================================

function getAccountTypeName(
    accountTypeId
) {

    const accountTypes = {

        1: 'Savings',

        2: 'Current',

        3: 'Student',

        4: 'Business'

    };


    return (
        accountTypes[
        Number(
            accountTypeId
        )
        ]
        ||
        'Unknown'
    );
}


// ============================================================
// BRANCH NAME
// ============================================================

function getBranchName(
    branchId
) {

    // --------------------------------------------------------
    // USE LOGGED-IN BRANCH WHEN POSSIBLE
    // --------------------------------------------------------

    if (
        loggedInOfficerBranchId
        &&
        Number(
            branchId
        )
        ===
        Number(
            loggedInOfficerBranchId
        )
        &&
        loggedInOfficerBranchName
    ) {

        return loggedInOfficerBranchName;
    }


    const branches = {

        1: 'Dhanmondi',

        2: 'Gulshan',

        3: 'Uttara',

        4: 'Agrabad'

    };


    return (
        branches[
        Number(
            branchId
        )
        ]
        ||
        `Branch ${branchId ?? '-'}`
    );
}


// ============================================================
// APPLICATION STATUS CLASS
// ============================================================

function getStatusClass(
    status
) {

    if (
        status ===
        'SUBMITTED'
    ) {

        return 'status-submitted';
    }


    if (
        status ===
        'UNDER_REVIEW'
    ) {

        return 'status-review';
    }


    if (
        status ===
        'APPROVED'
    ) {

        return 'status-approved';
    }


    if (
        status ===
        'REJECTED'
    ) {

        return 'status-rejected';
    }


    return '';
}


// ============================================================
// DATE + TIME FORMAT
// ============================================================

function formatDate(
    dateString
) {

    if (!dateString) {

        return 'N/A';
    }


    const date =
        new Date(
            dateString
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return dateString;
    }


    return date.toLocaleString(
        'en-BD'
    );
}


// ============================================================
// SIMPLE DATE
// ============================================================

function formatSimpleDate(
    dateString
) {

    if (!dateString) {

        return '-';
    }


    const date =
        new Date(
            dateString
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return dateString;
    }


    return date.toLocaleDateString(
        'en-BD'
    );
}


// ============================================================
// FORMAT MONEY
// ============================================================

function formatOfficerMoney(
    value
) {

    return Number(
        value || 0
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


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(
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


// ============================================================
// API ERROR FORMATTER
// ============================================================

function formatOfficerApiError(
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


    if (result?.detail) {

        return result.detail;
    }


    return fallback;
}


// ============================================================
// APPROVE ACCOUNT APPLICATION
// ============================================================

async function approveApplication(
    applicationId
) {

    const confirmed =
        confirm(
            `Are you sure you want to approve application #${applicationId}?`
        );


    if (!confirmed) {

        return;
    }


    if (!loggedInOfficerUserId) {

        alert(
            'Account Officer session was not found.'
        );

        return;
    }


    try {

        // ----------------------------------------------------
        // officer_user_id IS NOW REQUIRED BY BACKEND
        // ----------------------------------------------------

        const response =
            await fetch(
                `${OFFICER_API_BASE}/account-applications/${applicationId}?officer_user_id=${loggedInOfficerUserId}`,
                {
                    method:
                        'PUT',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify(
                            {
                                status:
                                    'APPROVED',

                                /*
                                    Kept only for compatibility
                                    with your current schema.

                                    Backend now ignores this
                                    for authorization and resolves
                                    employee_id automatically.
                                */
                                reviewed_by:
                                    loggedInOfficerEmployeeId,

                                rejection_reason:
                                    null
                            }
                        )
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                formatOfficerApiError(
                    result,
                    'Failed to approve application.'
                )
            );
        }


        alert(
            `Application #${applicationId} approved successfully.`
        );


        await loadApplications();


        /*
            Account may have been created,
            so refresh customer information too.
        */

        await loadAllOfficerCustomers();

    }

    catch (error) {

        console.error(
            'APPROVE ERROR:',
            error
        );


        alert(
            'Unable to approve application.\n\n'
            +
            error.message
        );
    }
}


// ============================================================
// REJECT ACCOUNT APPLICATION
// ============================================================

async function rejectApplication(
    applicationId
) {

    const reason =
        prompt(
            `Enter rejection reason for application #${applicationId}:`
        );


    if (
        reason ===
        null
    ) {

        return;
    }


    if (
        !reason.trim()
    ) {

        alert(
            'Please provide a rejection reason.'
        );

        return;
    }


    const confirmed =
        confirm(
            `Are you sure you want to reject application #${applicationId}?`
        );


    if (!confirmed) {

        return;
    }


    if (!loggedInOfficerUserId) {

        alert(
            'Account Officer session was not found.'
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${OFFICER_API_BASE}/account-applications/${applicationId}?officer_user_id=${loggedInOfficerUserId}`,
                {
                    method:
                        'PUT',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify(
                            {
                                status:
                                    'REJECTED',

                                reviewed_by:
                                    loggedInOfficerEmployeeId,

                                rejection_reason:
                                    reason.trim()
                            }
                        )
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                formatOfficerApiError(
                    result,
                    'Failed to reject application.'
                )
            );
        }


        alert(
            `Application #${applicationId} rejected successfully.`
        );


        await loadApplications();

        await loadAllOfficerCustomers();

    }

    catch (error) {

        console.error(
            'REJECT ERROR:',
            error
        );


        alert(
            'Unable to reject application.\n\n'
            +
            error.message
        );
    }
}


// ============================================================
// CUSTOMER MANAGEMENT INITIALIZATION
// ============================================================

function initializeCustomerManagement() {

    const searchButton =
        document.getElementById(
            'officer-customer-search-btn'
        );


    const searchInput =
        document.getElementById(
            'officer-customer-search'
        );


    // --------------------------------------------------------
    // SEARCH BUTTON
    // --------------------------------------------------------

    if (searchButton) {

        searchButton.addEventListener(
            'click',
            filterOfficerCustomers
        );
    }


    // --------------------------------------------------------
    // LIVE SEARCH
    // --------------------------------------------------------

    if (searchInput) {

        searchInput.addEventListener(
            'input',
            filterOfficerCustomers
        );


        searchInput.addEventListener(
            'keydown',
            event => {

                if (
                    event.key ===
                    'Enter'
                ) {

                    event.preventDefault();

                    filterOfficerCustomers();
                }
            }
        );
    }


    /*
        IMPORTANT:

        We no longer call loadAllOfficerCustomers()
        here immediately.

        loadApplications() first determines the
        officer's branch, then customer data is loaded.
    */
}


// ============================================================
// LOAD CUSTOMER MANAGEMENT RECORDS
// ONLY OFFICER'S ASSIGNED BRANCH
// ============================================================

async function loadAllOfficerCustomers() {

    const message =
        document.getElementById(
            'customer-search-message'
        );


    const resultsContainer =
        document.getElementById(
            'customer-search-results'
        );


    const button =
        document.getElementById(
            'officer-customer-search-btn'
        );


    if (
        !message ||
        !resultsContainer
    ) {

        return;
    }


    // --------------------------------------------------------
    // MAKE SURE BRANCH HAS BEEN RESOLVED
    // --------------------------------------------------------

    if (!loggedInOfficerBranchId) {

        try {

            await loadApplications();

        }

        catch (error) {

            console.error(
                error
            );
        }
    }


    if (!loggedInOfficerBranchId) {

        message.style.color =
            '#dc2626';


        message.textContent =
            '✕ Unable to determine your assigned branch.';


        return;
    }


    // --------------------------------------------------------
    // LOADING STATE
    // --------------------------------------------------------

    resultsContainer.innerHTML = `

        <div class="customer-search-loading">
            Loading ${escapeHtml(
        loggedInOfficerBranchName ||
        'branch'
    )} customer records...
        </div>
    `;


    message.textContent =
        '';


    if (button) {

        button.disabled =
            true;


        button.textContent =
            'Loading...';
    }


    try {

        /*
            Currently we use your rich customer management
            endpoint because the existing customer cards need
            account/application/balance information.

            The result is immediately restricted to the
            Account Officer's backend-resolved branch.

            After we add the dedicated branch endpoint to
            customer.py, only this fetch URL needs to change.
        */

        const response =
            await fetch(
                `${OFFICER_API_BASE}/customers/management/officer/${loggedInOfficerUserId}`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                formatOfficerApiError(
                    result,
                    'Failed to load customers.'
                )
            );
        }


        // ========================================================
        // BACKEND ALREADY RETURNS ONLY THIS OFFICER'S BRANCH
        // ========================================================

        loggedInOfficerEmployeeId =
            Number(
                result.employee_id
            );


        loggedInOfficerBranchId =
            Number(
                result.branch_id
            );


        loggedInOfficerBranchName =
            result.branch_name
            ||
            `Branch ${loggedInOfficerBranchId}`;


        officerAllCustomers =
            Array.isArray(
                result.customers
            )
                ?
                result.customers
                :
                [];


        officerCustomerResults =
            [
                ...officerAllCustomers
            ];

        renderOfficerCustomerResults();


        message.style.color =
            '#64748b';


        message.textContent =
            `${officerAllCustomers.length} customer record(s) loaded from ${loggedInOfficerBranchName}.`;

    }

    catch (error) {

        console.error(
            'CUSTOMER LOAD ERROR:',
            error
        );


        officerAllCustomers =
            [];


        officerCustomerResults =
            [];


        message.style.color =
            '#dc2626';


        message.textContent =
            '✕ '
            +
            error.message;


        resultsContainer.innerHTML = `

            <div class="customer-empty-result">

                <div class="customer-empty-icon">
                    👤
                </div>

                <h3>
                    Unable to Load Customers
                </h3>

                <p>
                    Customer information could not be loaded.
                </p>

            </div>
        `;

    }

    finally {

        if (button) {

            button.disabled =
                false;


            button.textContent =
                '🔎 Search Customer';
        }
    }
}


// ============================================================
// FILTER CUSTOMER LIST LOCALLY
// ============================================================

function filterOfficerCustomers() {

    const input =
        document.getElementById(
            'officer-customer-search'
        );


    const message =
        document.getElementById(
            'customer-search-message'
        );


    if (
        !input ||
        !message
    ) {

        return;
    }


    const query =
        input.value
            .trim()
            .toLowerCase();


    // --------------------------------------------------------
    // EMPTY SEARCH
    // SHOW ALL BRANCH CUSTOMERS AGAIN
    // --------------------------------------------------------

    if (!query) {

        officerCustomerResults =
            [
                ...officerAllCustomers
            ];


        renderOfficerCustomerResults();


        message.style.color =
            '#64748b';


        message.textContent =
            `${officerCustomerResults.length} ${loggedInOfficerBranchName || ''} customer record(s).`;


        return;
    }


    // --------------------------------------------------------
    // FILTER
    // --------------------------------------------------------

    officerCustomerResults =
        officerAllCustomers.filter(
            customer => {

                const firstName =
                    String(
                        customer.first_name ||
                        ''
                    ).toLowerCase();


                const lastName =
                    String(
                        customer.last_name ||
                        ''
                    ).toLowerCase();


                const fullName =
                    `${firstName} ${lastName}`
                        .trim();


                const customerId =
                    String(
                        customer.customer_id ||
                        ''
                    ).toLowerCase();


                const email =
                    String(
                        customer.email ||
                        ''
                    ).toLowerCase();


                const phone =
                    String(
                        customer.phone ||
                        ''
                    ).toLowerCase();


                const nid =
                    String(
                        customer.nid ||
                        customer.nid_number ||
                        ''
                    ).toLowerCase();


                const accountNumber =
                    String(
                        customer.account_number ||
                        ''
                    ).toLowerCase();


                const occupation =
                    String(
                        customer.occupation ||
                        ''
                    ).toLowerCase();


                const address =
                    String(
                        customer.address ||
                        ''
                    ).toLowerCase();


                const customerStatus =
                    String(
                        customer.customer_status ||
                        ''
                    ).toLowerCase();


                const accountStatus =
                    String(
                        customer.account_status ||
                        ''
                    ).toLowerCase();


                const applicationStatus =
                    String(
                        customer.application_status ||
                        ''
                    ).toLowerCase();


                return (

                    firstName.includes(
                        query
                    )

                    ||

                    lastName.includes(
                        query
                    )

                    ||

                    fullName.includes(
                        query
                    )

                    ||

                    customerId.includes(
                        query
                    )

                    ||

                    email.includes(
                        query
                    )

                    ||

                    phone.includes(
                        query
                    )

                    ||

                    nid.includes(
                        query
                    )

                    ||

                    accountNumber.includes(
                        query
                    )

                    ||

                    occupation.includes(
                        query
                    )

                    ||

                    address.includes(
                        query
                    )

                    ||

                    customerStatus.includes(
                        query
                    )

                    ||

                    accountStatus.includes(
                        query
                    )

                    ||

                    applicationStatus.includes(
                        query
                    )
                );
            }
        );


    renderOfficerCustomerResults();


    if (
        officerCustomerResults.length ===
        0
    ) {

        message.style.color =
            '#64748b';


        message.textContent =
            'No matching customers found.';

    } else {

        message.style.color =
            '#16a34a';


        message.textContent =
            `${officerCustomerResults.length} matching customer(s) found.`;
    }
}


// ============================================================
// KEEP OLD FUNCTION NAME COMPATIBLE
// ============================================================

function searchOfficerCustomers() {

    filterOfficerCustomers();
}


// ============================================================
// RENDER CUSTOMER RESULTS
// ============================================================

function renderOfficerCustomerResults() {

    const container =
        document.getElementById(
            'customer-search-results'
        );


    if (!container) {

        return;
    }


    // --------------------------------------------------------
    // EMPTY RESULT
    // --------------------------------------------------------

    if (
        officerCustomerResults.length ===
        0
    ) {

        container.innerHTML = `

            <div class="customer-empty-result">

                <div class="customer-empty-icon">
                    👤
                </div>

                <h3>
                    No Customers Found
                </h3>

                <p>
                    No customer matches the current search
                    in your assigned branch.
                </p>

            </div>
        `;


        return;
    }


    container.innerHTML =
        '';


    // --------------------------------------------------------
    // RENDER CUSTOMER CARDS
    // --------------------------------------------------------

    officerCustomerResults.forEach(
        customer => {

            /*
                Extra safety.

                Even if data is accidentally inserted into the
                array, don't render another branch.
            */

            if (
                Number(
                    customer.branch_id
                )
                !==
                Number(
                    loggedInOfficerBranchId
                )
            ) {

                return;
            }


            const card =
                document.createElement(
                    'div'
                );


            card.className =
                'officer-customer-card';


            const fullName =
                `${customer.first_name || ''} ${customer.last_name || ''}`
                    .trim();


            const customerStatus =
                String(
                    customer.customer_status ||
                    ''
                );


            const accountStatus =
                String(
                    customer.account_status ||
                    ''
                );


            const applicationStatus =
                String(
                    customer.application_status ||
                    ''
                );


            const customerStatusClass =
                customerStatus
                    .toLowerCase();


            const accountStatusClass =
                accountStatus
                    .toLowerCase();


            const applicationStatusClass =
                applicationStatus
                    .toLowerCase();


            card.innerHTML = `

                <div class="officer-customer-header">

                    <div>

                        <span class="officer-customer-label">
                            Customer
                        </span>

                        <h3>
                            ${escapeHtml(
                fullName ||
                'Unnamed Customer'
            )}
                        </h3>

                        <p>
                            Customer ID:
                            #${escapeHtml(
                customer.customer_id
            )}
                        </p>

                    </div>


                    <span
                        class="officer-customer-status ${escapeHtml(
                customerStatusClass
            )}"
                    >
                        ${escapeHtml(
                customerStatus ||
                '-'
            )}
                    </span>

                </div>


                <div class="officer-customer-grid">


                    <div>

                        <span>
                            Email
                        </span>

                        <strong>
                            ${escapeHtml(
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
                            ${escapeHtml(
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
                            ${escapeHtml(
                customer.nid ||
                customer.nid_number ||
                '-'
            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Branch
                        </span>

                        <strong>
                            ${escapeHtml(
                customer.branch_name
                ||
                getBranchName(
                    customer.branch_id
                )
            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Occupation
                        </span>

                        <strong>
                            ${escapeHtml(
                customer.occupation ||
                'Not provided'
            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Account Number
                        </span>

                        <strong class="customer-account-number">
                            ${escapeHtml(
                customer.account_number ||
                'No account'
            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Account Type
                        </span>

                        <strong>

                            ${customer.account_type_id
                    ?
                    escapeHtml(
                        getAccountTypeName(
                            customer.account_type_id
                        )
                    )
                    :
                    '-'
                }

                        </strong>

                    </div>


                    <div>

                        <span>
                            Current Balance
                        </span>

                        <strong>

                            ${customer.account_id
                    ?
                    `৳${formatOfficerMoney(
                        customer.balance
                    )}`
                    :
                    '-'
                }

                        </strong>

                    </div>


                    <div>

                        <span>
                            Available Balance
                        </span>

                        <strong>

                            ${customer.account_id
                    ?
                    `৳${formatOfficerMoney(
                        customer.available_balance
                    )}`
                    :
                    '-'
                }

                        </strong>

                    </div>


                    <div>

                        <span>
                            Account Status
                        </span>

                        ${customer.account_status
                    ?
                    `
                                    <strong
                                        class="customer-mini-status ${escapeHtml(
                        accountStatusClass
                    )}"
                                    >
                                        ${escapeHtml(
                        customer.account_status
                    )}
                                    </strong>
                                `
                    :
                    `
                                    <strong>
                                        No Account
                                    </strong>
                                `
                }

                    </div>


                    <div>

                        <span>
                            Latest Application
                        </span>

                        ${customer.application_status
                    ?
                    `
                                    <strong
                                        class="customer-mini-status ${escapeHtml(
                        applicationStatusClass
                    )}"
                                    >
                                        ${escapeHtml(
                        customer.application_status
                    )}
                                    </strong>
                                `
                    :
                    `
                                    <strong>
                                        No Application
                                    </strong>
                                `
                }

                    </div>


                    <div>

                        <span>
                            Account Opened
                        </span>

                        <strong>

                            ${customer.opened_date
                    ?
                    escapeHtml(
                        formatSimpleDate(
                            customer.opened_date
                        )
                    )
                    :
                    '-'
                }

                        </strong>

                    </div>


                    <div class="customer-address-box">

                        <span>
                            Address
                        </span>

                        <strong>
                            ${escapeHtml(
                    customer.address ||
                    '-'
                )}
                        </strong>

                    </div>

                </div>


                <div class="officer-customer-actions">


                    ${customer.account_number
                    &&
                    customer.account_status ===
                    'ACTIVE'
                    &&
                    customer.customer_status ===
                    'ACTIVE'
                    ?
                    `
                                <button
                                    type="button"
                                    class="customer-deposit-action"
                                    data-account-number="${escapeHtml(
                        customer.account_number
                    )}"
                                    data-branch-id="${escapeHtml(
                        customer.branch_id
                    )}"
                                >
                                    💰 Add Money
                                </button>
                            `
                    :
                    ''
                }


                    ${customer.account_number
                    ?
                    `
                                <button
                                    type="button"
                                    class="customer-copy-account"
                                    data-account-number="${escapeHtml(
                        customer.account_number
                    )}"
                                >
                                    📋 Copy Account No.
                                </button>
                            `
                    :
                    ''
                }


                    <button
                        type="button"
                        class="customer-close-result"
                    >
                        ✕ Hide
                    </button>

                </div>
            `;


            container.appendChild(
                card
            );
        }
    );


    attachOfficerCustomerActions();
}


// ============================================================
// CUSTOMER RESULT ACTIONS
// ============================================================

function attachOfficerCustomerActions() {


    // --------------------------------------------------------
    // ADD MONEY
    // --------------------------------------------------------

    document
        .querySelectorAll(
            '.customer-deposit-action'
        )
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    () => {

                        const accountNumber =
                            button.dataset.accountNumber;


                        const customerBranchId =
                            Number(
                                button.dataset.branchId
                            );


                        /*
                            Extra frontend protection.

                            The backend transaction/deposit
                            endpoint should also validate branch
                            ownership later.
                        */

                        if (
                            customerBranchId !==
                            Number(
                                loggedInOfficerBranchId
                            )
                        ) {

                            alert(
                                'You cannot work with an account from another branch.'
                            );

                            return;
                        }


                        openDepositForCustomer(
                            accountNumber
                        );
                    }
                );
            }
        );


    // --------------------------------------------------------
    // COPY ACCOUNT NUMBER
    // --------------------------------------------------------

    document
        .querySelectorAll(
            '.customer-copy-account'
        )
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    async () => {

                        const accountNumber =
                            button.dataset.accountNumber;


                        try {

                            await navigator
                                .clipboard
                                .writeText(
                                    accountNumber
                                );


                            const oldText =
                                button.textContent;


                            button.textContent =
                                '✓ Copied';


                            setTimeout(
                                () => {

                                    button.textContent =
                                        oldText;

                                },
                                1200
                            );

                        }

                        catch (error) {

                            alert(
                                `Account Number: ${accountNumber}`
                            );
                        }
                    }
                );
            }
        );


    // --------------------------------------------------------
    // HIDE ONE CUSTOMER CARD
    // --------------------------------------------------------

    document
        .querySelectorAll(
            '.customer-close-result'
        )
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    () => {

                        const card =
                            button.closest(
                                '.officer-customer-card'
                            );


                        if (card) {

                            card.remove();
                        }


                        const remainingCards =
                            document.querySelectorAll(
                                '.officer-customer-card'
                            );


                        const message =
                            document.getElementById(
                                'customer-search-message'
                            );


                        if (message) {

                            message.style.color =
                                '#64748b';


                            message.textContent =
                                `${remainingCards.length} customer record(s) currently visible.`;
                        }
                    }
                );
            }
        );
}


// ============================================================
// OPEN ADD MONEY SECTION FROM CUSTOMER MANAGEMENT
// ============================================================

function openDepositForCustomer(
    accountNumber
) {

    const depositAccountInput =
        document.getElementById(
            'deposit-account-number'
        );


    if (!depositAccountInput) {

        alert(
            'Deposit section is currently unavailable.'
        );


        return;
    }


    // --------------------------------------------------------
    // INSERT ACCOUNT NUMBER
    // --------------------------------------------------------

    depositAccountInput.value =
        accountNumber;


    // --------------------------------------------------------
    // OPEN DEPOSIT SECTION
    // --------------------------------------------------------

    showOfficerSection(
        'deposit-section'
    );


    // --------------------------------------------------------
    // AUTOMATICALLY SEARCH ACCOUNT
    // --------------------------------------------------------

    if (
        typeof window
            .searchOfficerDepositAccount
        ===
        'function'
    ) {

        setTimeout(
            () => {

                window
                    .searchOfficerDepositAccount();

            },
            150
        );

    } else {

        depositAccountInput.focus();
    }
}


// ============================================================
// LOGOUT
// ============================================================

function initializeOfficerLogout() {

    const logoutButton =
        document.getElementById(
            'officer-logout-btn'
        );


    if (!logoutButton) {

        return;
    }


    logoutButton.addEventListener(
        'click',
        event => {

            event.preventDefault();


            const confirmed =
                confirm(
                    'Are you sure you want to logout?'
                );


            if (!confirmed) {

                return;
            }


            clearOfficerSession();


            window.location.href =
                'login.html';
        }
    );
}