// ============================================================
// NEXA BANK
// BRANCH MANAGER DASHBOARD
// ============================================================

const BRANCH_MANAGER_API = 'http://127.0.0.1:8000';


// ============================================================
// GLOBAL DATA
// ============================================================

let managerEmployee = null;
let managerBranch = null;
let managerBranchId = null;

let allEmployees = [];

let allCustomerRecords = [];
let branchCustomers = [];

let allAccounts = [];
let branchAccounts = [];

let allTransactions = [];
let branchTransactions = [];
let allTransactionEntries = [];

let allLoans = [];
let branchLoans = [];

let loanTypes = [];


// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener(
    'DOMContentLoaded',
    async () => {

        verifyBranchManagerSession();

        initializeManagerNavigation();
        initializeManagerEvents();

        await loadManagerIdentity();
        await loadLoanTypes();

        await loadBranchCustomers();
        await loadBranchAccounts();
        await loadBranchTransactions();
        await loadBranchLoans();

        updateManagerDashboard();
        updateBranchOverview();
        updateBranchReports();

        showManagerSection(
            'manager-dashboard-section'
        );
    }
);


// ============================================================
// SESSION
// ============================================================

function verifyBranchManagerSession() {

    const userId = localStorage.getItem(
        'user_id'
    );

    const role = String(
        localStorage.getItem(
            'role'
        ) || ''
    )
        .trim()
        .toUpperCase();


    if (!userId) {

        alert(
            'Please login first.'
        );

        window.location.href =
            'login.html';

        return;
    }


    /*
        Accept the common role values we have used
        during development.

        If localStorage contains BRANCH_MANAGER,
        this will validate correctly.
    */

    const allowedRoles = [
        '',
        'BRANCH_MANAGER',
        'BRANCH MANAGER',
        'MANAGER',
        'BRANCH'
    ];


    if (
        role &&
        !allowedRoles.includes(role)
    ) {

        console.warn(
            'Unexpected Branch Manager role:',
            role
        );
    }
}


// ============================================================
// MANAGER IDENTITY
// ============================================================

async function loadManagerIdentity() {

    const userId = Number(
        localStorage.getItem(
            'user_id'
        )
    );


    try {

        // ----------------------------------------------------
        // 1. LOAD EMPLOYEES
        // ----------------------------------------------------

        const employeeResponse =
            await fetch(
                `${BRANCH_MANAGER_API}/employees/`
            );


        const employeeResult =
            await employeeResponse.json();


        if (!employeeResponse.ok) {

            throw new Error(
                formatManagerApiError(
                    employeeResult,
                    'Unable to load employee information.'
                )
            );
        }


        allEmployees =
            Array.isArray(employeeResult)
                ? employeeResult
                : [];


        // ----------------------------------------------------
        // 2. FIND LOGGED-IN MANAGER
        // ----------------------------------------------------

        managerEmployee =
            allEmployees.find(
                employee =>
                    Number(
                        employee.user_id
                    )
                    ===
                    userId
            );


        if (!managerEmployee) {

            throw new Error(
                'Branch Manager employee record was not found.'
            );
        }


        // ----------------------------------------------------
        // 3. GET MANAGER BRANCH ID
        // ----------------------------------------------------

        managerBranchId = Number(
            managerEmployee.branch_id
        );


        if (!managerBranchId) {

            throw new Error(
                'No branch is assigned to this manager.'
            );
        }


        // ----------------------------------------------------
        // 4. LOAD BRANCHES
        // ----------------------------------------------------

        const branchResponse =
            await fetch(
                `${BRANCH_MANAGER_API}/branches/`
            );


        const branchResult =
            await branchResponse.json();


        if (branchResponse.ok) {

            const branches =
                Array.isArray(branchResult)
                    ? branchResult
                    : [];


            managerBranch =
                branches.find(
                    branch =>
                        Number(
                            branch.branch_id
                        )
                        ===
                        managerBranchId
                )
                || null;
        }


        // ----------------------------------------------------
        // 5. RENDER IDENTITY
        // ----------------------------------------------------

        renderManagerIdentity();

    }

    catch (error) {

        console.error(
            'MANAGER IDENTITY ERROR:',
            error
        );


        alert(
            error.message
        );
    }
}


// ============================================================
// RENDER MANAGER IDENTITY
// ============================================================

function renderManagerIdentity() {

    if (!managerEmployee) {

        return;
    }


    const fullName =
        `${managerEmployee.first_name || ''} ${managerEmployee.last_name || ''}`
            .trim()
        || 'Branch Manager';


    const branchName =
        managerBranch?.branch_name
        || managerEmployee.branch_name
        || `Branch #${managerBranchId}`;


    // TOPBAR

    setManagerText(
        'manager-topbar-name',
        fullName
    );


    setManagerText(
        'manager-welcome-name',
        `Welcome, ${fullName}`
    );


    setManagerText(
        'manager-topbar-branch',
        branchName
    );


    // PROFILE

    setManagerText(
        'profile-manager-name',
        fullName
    );


    setManagerText(
        'profile-manager-position',
        managerEmployee.position_name
        || 'Branch Manager'
    );


    setManagerText(
        'profile-employee-id',
        managerEmployee.employee_id
        || '-'
    );


    setManagerText(
        'profile-user-id',
        managerEmployee.user_id
        || '-'
    );


    setManagerText(
        'profile-department',
        managerEmployee.department_name
        || '-'
    );


    setManagerText(
        'profile-position',
        managerEmployee.position_name
        || 'Branch Manager'
    );


    setManagerText(
        'profile-branch',
        branchName
    );


    setManagerText(
        'profile-status',
        managerEmployee.status
        || '-'
    );
}


// ============================================================
// LOAD LOAN TYPES
// ============================================================

async function loadLoanTypes() {

    try {

        const response =
            await fetch(
                `${BRANCH_MANAGER_API}/loan-types/`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                formatManagerApiError(
                    result,
                    'Unable to load loan types.'
                )
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
// NAVIGATION
// ============================================================

function initializeManagerNavigation() {

    document
        .querySelectorAll(
            '.manager-nav-link'
        )
        .forEach(
            link => {

                link.addEventListener(
                    'click',
                    event => {

                        event.preventDefault();


                        const sectionId =
                            link.dataset.section;


                        if (!sectionId) {

                            return;
                        }


                        showManagerSection(
                            sectionId
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

                        const sectionId =
                            button.dataset.openSection;


                        if (!sectionId) {

                            return;
                        }


                        showManagerSection(
                            sectionId
                        );
                    }
                );
            }
        );
}


// ============================================================
// SHOW SECTION
// ============================================================

function showManagerSection(
    sectionId
) {

    document
        .querySelectorAll(
            '.manager-section'
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


    // --------------------------------------------------------
    // SIDEBAR ACTIVE STATE
    // --------------------------------------------------------

    document
        .querySelectorAll(
            '.manager-nav-link'
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
            `.manager-nav-link[data-section="${sectionId}"]`
        )
        ?.classList.add(
            'active'
        );


    // --------------------------------------------------------
    // SECTION-SPECIFIC RENDERING
    // --------------------------------------------------------

    if (
        sectionId ===
        'branch-overview-section'
    ) {

        updateBranchOverview();
    }


    if (
        sectionId ===
        'branch-customers-section'
    ) {

        filterBranchCustomers();
    }


    if (
        sectionId ===
        'branch-accounts-section'
    ) {

        filterBranchAccounts();
    }


    if (
        sectionId ===
        'branch-transactions-section'
    ) {

        filterBranchTransactions();
    }


    if (
        sectionId ===
        'branch-loans-section'
    ) {

        filterBranchLoans();
    }


    if (
        sectionId ===
        'branch-reports-section'
    ) {

        updateBranchReports();
    }


    // --------------------------------------------------------
    // SCROLL TO TOP
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
// EVENTS
// ============================================================

function initializeManagerEvents() {

    // --------------------------------------------------------
    // REFRESH BUTTONS
    // --------------------------------------------------------

    bindManagerClick(
        'refresh-branch-overview-btn',
        refreshAllManagerData
    );


    bindManagerClick(
        'refresh-branch-customers-btn',
        loadBranchCustomers
    );


    bindManagerClick(
        'refresh-branch-accounts-btn',
        loadBranchAccounts
    );


    bindManagerClick(
        'refresh-branch-transactions-btn',
        loadBranchTransactions
    );


    bindManagerClick(
        'refresh-branch-loans-btn',
        loadBranchLoans
    );


    bindManagerClick(
        'refresh-branch-reports-btn',
        refreshAllManagerData
    );


    // --------------------------------------------------------
    // CUSTOMER FILTERS
    // --------------------------------------------------------

    document
        .getElementById(
            'branch-customer-search'
        )
        ?.addEventListener(
            'input',
            filterBranchCustomers
        );


    document
        .getElementById(
            'branch-customer-status-filter'
        )
        ?.addEventListener(
            'change',
            filterBranchCustomers
        );


    // --------------------------------------------------------
    // ACCOUNT FILTERS
    // --------------------------------------------------------

    document
        .getElementById(
            'branch-account-search'
        )
        ?.addEventListener(
            'input',
            filterBranchAccounts
        );


    document
        .getElementById(
            'branch-account-status-filter'
        )
        ?.addEventListener(
            'change',
            filterBranchAccounts
        );


    // --------------------------------------------------------
    // TRANSACTION FILTERS
    // --------------------------------------------------------

    document
        .getElementById(
            'branch-transaction-search'
        )
        ?.addEventListener(
            'input',
            filterBranchTransactions
        );


    document
        .getElementById(
            'branch-transaction-status-filter'
        )
        ?.addEventListener(
            'change',
            filterBranchTransactions
        );


    // --------------------------------------------------------
    // LOAN FILTERS
    // --------------------------------------------------------

    document
        .getElementById(
            'branch-loan-search'
        )
        ?.addEventListener(
            'input',
            filterBranchLoans
        );


    document
        .getElementById(
            'branch-loan-status-filter'
        )
        ?.addEventListener(
            'change',
            filterBranchLoans
        );


    // --------------------------------------------------------
    // LOGOUT
    // --------------------------------------------------------

    const logout =
        document.getElementById(
            'branch-manager-logout-btn'
        );


    if (logout) {

        logout.addEventListener(
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
// REFRESH EVERYTHING
// ============================================================

async function refreshAllManagerData() {

    await loadManagerIdentity();

    await loadBranchCustomers();
    await loadBranchAccounts();
    await loadBranchTransactions();
    await loadBranchLoans();

    updateManagerDashboard();
    updateBranchOverview();
    updateBranchReports();
}


// ============================================================
// CUSTOMERS
// ============================================================

async function loadBranchCustomers() {

    const body =
        document.getElementById(
            'branch-customers-body'
        );


    setManagerTableMessage(
        body,
        7,
        'Loading customers...'
    );


    try {

        const response =
            await fetch(
                `${BRANCH_MANAGER_API}/customers/management/all`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                formatManagerApiError(
                    result,
                    'Unable to load customers.'
                )
            );
        }


        allCustomerRecords =
            Array.isArray(result)
                ? result
                : [];


        // ----------------------------------------------------
        // ONE CUSTOMER MAY APPEAR MULTIPLE TIMES
        // IF THEY HAVE MULTIPLE ACCOUNTS
        // ----------------------------------------------------

        const customerMap =
            new Map();


        allCustomerRecords.forEach(
            customer => {

                if (
                    Number(
                        customer.branch_id
                    )
                    !==
                    Number(
                        managerBranchId
                    )
                ) {

                    return;
                }


                const id =
                    String(
                        customer.customer_id
                    );


                if (
                    !customerMap.has(id)
                ) {

                    customerMap.set(
                        id,
                        customer
                    );
                }
            }
        );


        branchCustomers =
            Array.from(
                customerMap.values()
            );


        filterBranchCustomers();

        updateManagerDashboard();
        updateBranchOverview();
        updateBranchReports();

    }

    catch (error) {

        console.error(
            'BRANCH CUSTOMER ERROR:',
            error
        );


        branchCustomers = [];


        showManagerTableError(
            body,
            7,
            error.message
        );
    }
}


// ============================================================
// FILTER CUSTOMERS
// ============================================================

function filterBranchCustomers() {

    const search =
        document.getElementById(
            'branch-customer-search'
        )?.value
            .trim()
            .toLowerCase()
        || '';


    const status =
        document.getElementById(
            'branch-customer-status-filter'
        )?.value
        || '';


    const filtered =
        branchCustomers.filter(
            customer => {

                const text = `
                    ${customer.customer_id ?? ''}
                    ${customer.first_name ?? ''}
                    ${customer.last_name ?? ''}
                    ${customer.first_name ?? ''} ${customer.last_name ?? ''}
                    ${customer.email ?? ''}
                    ${customer.phone ?? ''}
                    ${customer.nid ?? ''}
                    ${customer.occupation ?? ''}
                    ${customer.customer_status ?? ''}
                `.toLowerCase();


                return (
                    (
                        !search ||
                        text.includes(search)
                    )
                    &&
                    (
                        !status ||
                        customer.customer_status ===
                        status
                    )
                );
            }
        );


    renderBranchCustomers(
        filtered
    );
}


// ============================================================
// RENDER CUSTOMERS
// ============================================================

function renderBranchCustomers(
    customers
) {

    const body =
        document.getElementById(
            'branch-customers-body'
        );


    if (!body) {

        return;
    }


    if (!customers.length) {

        setManagerTableMessage(
            body,
            7,
            'No customers found.'
        );

        return;
    }


    body.innerHTML = '';


    customers.forEach(
        customer => {

            const row =
                document.createElement(
                    'tr'
                );


            const fullName =
                `${customer.first_name || ''} ${customer.last_name || ''}`
                    .trim();


            row.innerHTML = `

                <td>
                    #${escapeManagerHtml(
                customer.customer_id
            )}
                </td>

                <td>
                    ${escapeManagerHtml(
                fullName || '-'
            )}
                </td>

                <td>
                    ${escapeManagerHtml(
                customer.email || '-'
            )}
                </td>

                <td>
                    ${escapeManagerHtml(
                customer.phone || '-'
            )}
                </td>

                <td>
                    ${escapeManagerHtml(
                customer.nid || '-'
            )}
                </td>

                <td>
                    ${escapeManagerHtml(
                customer.occupation || '-'
            )}
                </td>

                <td>

                    <span
                        class="manager-status ${managerStatusClass(
                customer.customer_status
            )}"
                    >
                        ${escapeManagerHtml(
                customer.customer_status
                || '-'
            )}
                    </span>

                </td>
            `;


            body.appendChild(
                row
            );
        }
    );
}


// ============================================================
// ACCOUNTS
// ============================================================

async function loadBranchAccounts() {

    const body =
        document.getElementById(
            'branch-accounts-body'
        );


    setManagerTableMessage(
        body,
        8,
        'Loading accounts...'
    );


    try {

        const response =
            await fetch(
                `${BRANCH_MANAGER_API}/accounts/`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                formatManagerApiError(
                    result,
                    'Unable to load accounts.'
                )
            );
        }


        allAccounts =
            Array.isArray(result)
                ? result
                : [];


        // ----------------------------------------------------
        // PRIMARY FILTER:
        // ACCOUNT.BRANCH_ID
        // ----------------------------------------------------

        branchAccounts =
            allAccounts.filter(
                account => {

                    if (
                        account.branch_id != null
                    ) {

                        return (
                            Number(
                                account.branch_id
                            )
                            ===
                            Number(
                                managerBranchId
                            )
                        );
                    }


                    /*
                        Fallback for older account responses
                        without branch_id.
                    */

                    return branchCustomers.some(
                        customer =>
                            Number(
                                customer.customer_id
                            )
                            ===
                            Number(
                                account.customer_id
                            )
                    );
                }
            );


        filterBranchAccounts();

        updateManagerDashboard();
        updateBranchOverview();
        updateBranchReports();

    }

    catch (error) {

        console.error(
            'BRANCH ACCOUNT ERROR:',
            error
        );


        branchAccounts = [];


        showManagerTableError(
            body,
            8,
            error.message
        );
    }
}


// ============================================================
// FILTER ACCOUNTS
// ============================================================

function filterBranchAccounts() {

    const search =
        document.getElementById(
            'branch-account-search'
        )?.value
            .trim()
            .toLowerCase()
        || '';


    const status =
        document.getElementById(
            'branch-account-status-filter'
        )?.value
        || '';


    const filtered =
        branchAccounts.filter(
            account => {

                const customer =
                    getManagerCustomer(
                        account.customer_id
                    );


                const text = `
                    ${account.account_id ?? ''}
                    ${account.account_number ?? ''}
                    ${account.customer_id ?? ''}
                    ${customer?.first_name ?? ''}
                    ${customer?.last_name ?? ''}
                    ${account.status ?? ''}
                `.toLowerCase();


                return (
                    (
                        !search ||
                        text.includes(search)
                    )
                    &&
                    (
                        !status ||
                        account.status ===
                        status
                    )
                );
            }
        );


    renderBranchAccounts(
        filtered
    );
}


// ============================================================
// RENDER ACCOUNTS
// ============================================================

function renderBranchAccounts(
    accounts
) {

    const body =
        document.getElementById(
            'branch-accounts-body'
        );


    if (!body) {

        return;
    }


    if (!accounts.length) {

        setManagerTableMessage(
            body,
            8,
            'No accounts found.'
        );

        return;
    }


    body.innerHTML = '';


    accounts.forEach(
        account => {

            const customer =
                getManagerCustomer(
                    account.customer_id
                );


            const customerName =
                customer
                    ?
                    `${customer.first_name || ''} ${customer.last_name || ''}`
                        .trim()
                    :
                    `Customer #${account.customer_id}`;


            const row =
                document.createElement(
                    'tr'
                );


            row.innerHTML = `

                <td>
                    #${escapeManagerHtml(
                account.account_id
            )}
                </td>

                <td>
                    ${escapeManagerHtml(
                account.account_number || '-'
            )}
                </td>

                <td>
                    ${escapeManagerHtml(
                customerName
            )}
                </td>

                <td>
                    ${escapeManagerHtml(
                getManagerAccountType(
                    account.account_type_id
                )
            )}
                </td>

                <td>
                    ৳${formatManagerMoney(
                account.balance
            )}
                </td>

                <td>
                    ৳${formatManagerMoney(
                account.available_balance
            )}
                </td>

                <td>
                    ${escapeManagerHtml(
                formatManagerDate(
                    account.opened_date
                )
            )}
                </td>

                <td>

                    <span
                        class="manager-status ${managerStatusClass(
                account.status
            )}"
                    >
                        ${escapeManagerHtml(
                account.status || '-'
            )}
                    </span>

                </td>
            `;


            body.appendChild(
                row
            );
        }
    );
}


// ============================================================
// TRANSACTIONS
//
// IMPORTANT DATABASE RELATION:
//
// transactions
//      ↓
// transaction_entries
//      ↓
// accounts
//      ↓
// branch_id
// ============================================================

async function loadBranchTransactions() {

    const body =
        document.getElementById(
            'branch-transactions-body'
        );


    setManagerTableMessage(
        body,
        8,
        'Loading transactions...'
    );


    try {

        // ----------------------------------------------------
        // 1. CHECK BRANCH ACCOUNTS
        // ----------------------------------------------------

        if (
            branchAccounts.length ===
            0
        ) {

            branchTransactions = [];

            renderBranchTransactions(
                []
            );

            return;
        }


        const branchAccountIds =
            branchAccounts.map(
                account =>
                    Number(
                        account.account_id
                    )
            );


        // ----------------------------------------------------
        // 2. LOAD TRANSACTION ENTRIES
        // ----------------------------------------------------

        const entryResponse =
            await fetch(
                `${BRANCH_MANAGER_API}/transaction-entries/`
            );


        const entryResult =
            await entryResponse.json();


        if (!entryResponse.ok) {

            throw new Error(
                formatManagerApiError(
                    entryResult,
                    'Unable to load transaction entries.'
                )
            );
        }


        allTransactionEntries =
            Array.isArray(
                entryResult
            )
                ? entryResult
                : [];


        // ----------------------------------------------------
        // 3. FILTER ENTRIES TO MANAGER'S BRANCH
        // ----------------------------------------------------

        const branchEntries =
            allTransactionEntries.filter(
                entry =>
                    branchAccountIds.includes(
                        Number(
                            entry.account_id
                        )
                    )
            );


        // ----------------------------------------------------
        // 4. LOAD TRANSACTIONS
        // ----------------------------------------------------

        const transactionResponse =
            await fetch(
                `${BRANCH_MANAGER_API}/transactions/`
            );


        const transactionResult =
            await transactionResponse.json();


        if (!transactionResponse.ok) {

            throw new Error(
                formatManagerApiError(
                    transactionResult,
                    'Unable to load transactions.'
                )
            );
        }


        allTransactions =
            Array.isArray(
                transactionResult
            )
                ? transactionResult
                : [];


        // ----------------------------------------------------
        // 5. JOIN TRANSACTIONS WITH BRANCH ENTRIES
        // ----------------------------------------------------

        const joinedRows = [];


        branchEntries.forEach(
            entry => {

                const transaction =
                    allTransactions.find(
                        item =>
                            Number(
                                item.transaction_id
                            )
                            ===
                            Number(
                                entry.transaction_id
                            )
                    );


                if (!transaction) {

                    return;
                }


                const account =
                    branchAccounts.find(
                        item =>
                            Number(
                                item.account_id
                            )
                            ===
                            Number(
                                entry.account_id
                            )
                    );


                const customer =
                    account
                        ?
                        getManagerCustomer(
                            account.customer_id
                        )
                        :
                        null;


                joinedRows.push(
                    {
                        ...transaction,

                        account_id:
                            entry.account_id,

                        account_number:
                            account?.account_number
                            || entry.account_id,

                        customer_id:
                            account?.customer_id
                            || null,

                        customer_name:
                            customer
                                ?
                                `${customer.first_name || ''} ${customer.last_name || ''}`
                                    .trim()
                                :
                                '',

                        entry_type:
                            entry.entry_type,

                        entry_amount:
                            entry.amount
                    }
                );
            }
        );


        // ----------------------------------------------------
        // 6. SORT NEWEST FIRST
        // ----------------------------------------------------

        joinedRows.sort(
            (
                a,
                b
            ) => {

                const dateA =
                    new Date(
                        a.transaction_date ||
                        0
                    );


                const dateB =
                    new Date(
                        b.transaction_date ||
                        0
                    );


                return (
                    dateB -
                    dateA
                );
            }
        );


        branchTransactions =
            joinedRows;


        filterBranchTransactions();

    }

    catch (error) {

        console.error(
            'BRANCH TRANSACTION ERROR:',
            error
        );


        branchTransactions = [];


        showManagerTableError(
            body,
            8,
            error.message
        );
    }
}


// ============================================================
// FILTER TRANSACTIONS
// ============================================================

function filterBranchTransactions() {

    const search =
        document.getElementById(
            'branch-transaction-search'
        )?.value
            .trim()
            .toLowerCase()
        || '';


    const status =
        document.getElementById(
            'branch-transaction-status-filter'
        )?.value
        || '';


    const filtered =
        branchTransactions.filter(
            transaction => {

                const text = `
                    ${transaction.transaction_id ?? ''}
                    ${transaction.reference_no ?? ''}
                    ${transaction.account_number ?? ''}
                    ${transaction.account_id ?? ''}
                    ${transaction.customer_id ?? ''}
                    ${transaction.customer_name ?? ''}
                    ${transaction.transaction_type_name ?? ''}
                    ${transaction.transaction_type ?? ''}
                    ${transaction.transaction_type_id ?? ''}
                    ${transaction.entry_type ?? ''}
                    ${transaction.description ?? ''}
                    ${transaction.status ?? ''}
                `.toLowerCase();


                return (
                    (
                        !search ||
                        text.includes(search)
                    )
                    &&
                    (
                        !status ||
                        transaction.status ===
                        status
                    )
                );
            }
        );


    renderBranchTransactions(
        filtered
    );
}


// ============================================================
// RENDER TRANSACTIONS
// ============================================================

function renderBranchTransactions(
    transactions
) {

    const body =
        document.getElementById(
            'branch-transactions-body'
        );


    if (!body) {

        return;
    }


    if (!transactions.length) {

        setManagerTableMessage(
            body,
            8,
            'No branch transactions found.'
        );

        return;
    }


    body.innerHTML = '';


    transactions.forEach(
        transaction => {

            const row =
                document.createElement(
                    'tr'
                );


            const transactionType =
                getManagerTransactionType(
                    transaction
                );


            row.innerHTML = `

                <td>
                    #${escapeManagerHtml(
                transaction.transaction_id
            )}
                </td>

                <td>
                    ${escapeManagerHtml(
                transaction.reference_no || '-'
            )}
                </td>

                <td>
                    ${escapeManagerHtml(
                transactionType
            )}
                </td>

                <td>

                    ${escapeManagerHtml(
                transaction.account_number
                || transaction.account_id
                || '-'
            )}

                    ${transaction.entry_type
                    ?
                    `
                                <br>

                                <small
                                    class="transaction-entry-type"
                                >
                                    ${escapeManagerHtml(
                        transaction.entry_type
                    )}
                                </small>
                            `
                    :
                    ''
                }

                </td>

                <td>

                    ${transaction.entry_type ===
                    'DEBIT'
                    ?
                    '- '
                    :
                    transaction.entry_type ===
                        'CREDIT'
                        ?
                        '+ '
                        :
                        ''
                }

                    ৳${formatManagerMoney(
                    transaction.entry_amount
                    ??
                    transaction.amount
                )}

                </td>

                <td>
                    ৳${formatManagerMoney(
                    transaction.fee
                )}
                </td>

                <td>
                    ${escapeManagerHtml(
                    formatManagerDateTime(
                        transaction.transaction_date
                    )
                )}
                </td>

                <td>

                    <span
                        class="manager-status ${managerStatusClass(
                    transaction.status
                )}"
                    >
                        ${escapeManagerHtml(
                    transaction.status || '-'
                )}
                    </span>

                </td>
            `;


            body.appendChild(
                row
            );
        }
    );
}


// ============================================================
// TRANSACTION TYPE NAME
// ============================================================

function getManagerTransactionType(
    transaction
) {

    if (
        transaction.transaction_type_name
    ) {

        return transaction
            .transaction_type_name;
    }


    if (
        transaction.transaction_type
    ) {

        return transaction
            .transaction_type;
    }


    const typeId =
        Number(
            transaction
                .transaction_type_id
        );


    const types = {
        1: 'Deposit',
        2: 'Withdrawal',
        3: 'Transfer',
        4: 'Bill Payment',
        5: 'Loan Disbursement',
        6: 'Loan Payment'
    };


    return (
        types[typeId]
        ||
        `Type ${typeId || '-'}`
    );
}


// ============================================================
// LOANS
// ============================================================

async function loadBranchLoans() {

    const body =
        document.getElementById(
            'branch-loans-body'
        );


    setManagerTableMessage(
        body,
        8,
        'Loading loans...'
    );


    try {

        const response =
            await fetch(
                `${BRANCH_MANAGER_API}/loans/`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                formatManagerApiError(
                    result,
                    'Unable to load loans.'
                )
            );
        }


        allLoans =
            Array.isArray(result)
                ? result
                : [];


        const customerIds =
            new Set(
                branchCustomers.map(
                    customer =>
                        String(
                            customer.customer_id
                        )
                )
            );


        branchLoans =
            allLoans.filter(
                loan =>
                    customerIds.has(
                        String(
                            loan.customer_id
                        )
                    )
            );


        filterBranchLoans();

        updateManagerDashboard();
        updateBranchOverview();
        updateBranchReports();

    }

    catch (error) {

        console.error(
            'BRANCH LOAN ERROR:',
            error
        );


        branchLoans = [];


        showManagerTableError(
            body,
            8,
            error.message
        );
    }
}


// ============================================================
// FILTER LOANS
// ============================================================

function filterBranchLoans() {

    const search =
        document.getElementById(
            'branch-loan-search'
        )?.value
            .trim()
            .toLowerCase()
        || '';


    const status =
        document.getElementById(
            'branch-loan-status-filter'
        )?.value
        || '';


    const filtered =
        branchLoans.filter(
            loan => {

                const customer =
                    getManagerCustomer(
                        loan.customer_id
                    );


                const text = `
                    ${loan.loan_id ?? ''}
                    ${loan.customer_id ?? ''}
                    ${customer?.first_name ?? ''}
                    ${customer?.last_name ?? ''}
                    ${loan.loan_type_name ?? ''}
                    ${getManagerLoanType(loan.loan_type_id)}
                    ${loan.disbursement_account_number ?? ''}
                    ${loan.disbursement_account_id ?? ''}
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
                        loan.status ===
                        status
                    )
                );
            }
        );


    renderBranchLoans(
        filtered
    );
}


// ============================================================
// RENDER LOANS
// ============================================================

function renderBranchLoans(
    loans
) {

    const body =
        document.getElementById(
            'branch-loans-body'
        );


    if (!body) {

        return;
    }


    if (!loans.length) {

        setManagerTableMessage(
            body,
            8,
            'No loans found.'
        );

        return;
    }


    body.innerHTML = '';


    loans.forEach(
        loan => {

            const customer =
                getManagerCustomer(
                    loan.customer_id
                );


            const customerName =
                customer
                    ?
                    `${customer.first_name || ''} ${customer.last_name || ''}`
                        .trim()
                    :
                    `Customer #${loan.customer_id}`;


            const row =
                document.createElement(
                    'tr'
                );


            row.innerHTML = `

                <td>
                    #${escapeManagerHtml(
                loan.loan_id
            )}
                </td>

                <td>
                    ${escapeManagerHtml(
                customerName
            )}
                </td>

                <td>
                    ${escapeManagerHtml(
                loan.loan_type_name
                ||
                getManagerLoanType(
                    loan.loan_type_id
                )
            )}
                </td>

                <td>
                    ৳${formatManagerMoney(
                loan.principal_amount
            )}
                </td>

                <td>
                    ৳${formatManagerMoney(
                loan.outstanding_amount
            )}
                </td>

                <td>
                    ${escapeManagerHtml(
                loan.interest_rate ?? '-'
            )}%
                </td>

                <td>
                    ৳${formatManagerMoney(
                loan.monthly_emi
            )}
                </td>

                <td>

                    <span
                        class="manager-status ${managerStatusClass(
                loan.status
            )}"
                    >
                        ${escapeManagerHtml(
                loan.status || '-'
            )}
                    </span>

                </td>
            `;


            body.appendChild(
                row
            );
        }
    );
}


// ============================================================
// DASHBOARD STATISTICS
// ============================================================

function updateManagerDashboard() {

    const activeAccounts =
        branchAccounts.filter(
            account =>
                account.status ===
                'ACTIVE'
        ).length;


    const activeLoans =
        branchLoans.filter(
            loan =>
                loan.status ===
                'ACTIVE'
        ).length;


    const totalBalance =
        branchAccounts.reduce(
            (
                total,
                account
            ) =>
                total
                +
                Number(
                    account.balance || 0
                ),
            0
        );


    const outstanding =
        branchLoans.reduce(
            (
                total,
                loan
            ) =>
                total
                +
                Number(
                    loan.outstanding_amount
                    || 0
                ),
            0
        );


    const employees =
        allEmployees.filter(
            employee =>
                Number(
                    employee.branch_id
                )
                ===
                Number(
                    managerBranchId
                )
        );


    setManagerText(
        'manager-total-customers',
        branchCustomers.length
    );


    setManagerText(
        'manager-active-accounts',
        activeAccounts
    );


    setManagerText(
        'manager-active-loans',
        activeLoans
    );


    setManagerText(
        'manager-total-balance',
        `৳${formatManagerMoney(
            totalBalance
        )}`
    );


    setManagerText(
        'manager-total-accounts',
        branchAccounts.length
    );


    setManagerText(
        'manager-total-loans',
        branchLoans.length
    );


    setManagerText(
        'manager-loan-outstanding',
        `৳${formatManagerMoney(
            outstanding
        )}`
    );


    setManagerText(
        'manager-employee-count',
        employees.length
    );
}


// ============================================================
// BRANCH OVERVIEW
// ============================================================

function updateBranchOverview() {

    const branchName =
        managerBranch?.branch_name
        ||
        managerEmployee?.branch_name
        ||
        '-';


    const branchEmployees =
        allEmployees.filter(
            employee =>
                Number(
                    employee.branch_id
                )
                ===
                Number(
                    managerBranchId
                )
        );


    setManagerText(
        'overview-branch-id',
        managerBranchId || '-'
    );


    setManagerText(
        'overview-branch-name',
        branchName
    );


    setManagerText(
        'overview-branch-code',
        managerBranch?.branch_code
        || '-'
    );


    setManagerText(
        'overview-branch-phone',
        managerBranch?.phone
        ||
        managerBranch?.contact_number
        ||
        '-'
    );


    setManagerText(
        'overview-branch-email',
        managerBranch?.email
        || '-'
    );


    setManagerText(
        'overview-branch-address',
        managerBranch?.address
        || '-'
    );


    setManagerText(
        'overview-branch-status',
        managerBranch?.status
        || '-'
    );


    setManagerText(
        'overview-customer-count',
        branchCustomers.length
    );


    setManagerText(
        'overview-account-count',
        branchAccounts.length
    );


    setManagerText(
        'overview-employee-count',
        branchEmployees.length
    );


    setManagerText(
        'overview-loan-count',
        branchLoans.length
    );
}


// ============================================================
// REPORTS
// ============================================================

function updateBranchReports() {

    const activeCustomers =
        branchCustomers.filter(
            customer =>
                customer.customer_status ===
                'ACTIVE'
        ).length;


    const deposits =
        branchAccounts.reduce(
            (
                total,
                account
            ) =>
                total
                +
                Number(
                    account.balance || 0
                ),
            0
        );


    const activeLoans =
        branchLoans.filter(
            loan =>
                loan.status ===
                'ACTIVE'
        ).length;


    const loanPrincipal =
        branchLoans.reduce(
            (
                total,
                loan
            ) =>
                total
                +
                Number(
                    loan.principal_amount
                    || 0
                ),
            0
        );


    const loanOutstanding =
        branchLoans.reduce(
            (
                total,
                loan
            ) =>
                total
                +
                Number(
                    loan.outstanding_amount
                    || 0
                ),
            0
        );


    setManagerText(
        'report-total-customers',
        branchCustomers.length
    );


    setManagerText(
        'report-active-customers',
        activeCustomers
    );


    setManagerText(
        'report-total-accounts',
        branchAccounts.length
    );


    setManagerText(
        'report-total-deposits',
        `৳${formatManagerMoney(
            deposits
        )}`
    );


    setManagerText(
        'report-total-loans',
        branchLoans.length
    );


    setManagerText(
        'report-active-loans',
        activeLoans
    );


    setManagerText(
        'report-loan-principal',
        `৳${formatManagerMoney(
            loanPrincipal
        )}`
    );


    setManagerText(
        'report-loan-outstanding',
        `৳${formatManagerMoney(
            loanOutstanding
        )}`
    );
}


// ============================================================
// CUSTOMER LOOKUP
// ============================================================

function getManagerCustomer(
    customerId
) {

    return branchCustomers.find(
        customer =>
            Number(
                customer.customer_id
            )
            ===
            Number(
                customerId
            )
    );
}


// ============================================================
// LOAN TYPE LOOKUP
// ============================================================

function getManagerLoanType(
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
// ACCOUNT TYPE
// ============================================================

function getManagerAccountType(
    accountTypeId
) {

    const map = {
        1: 'Savings',
        2: 'Current',
        3: 'Student',
        4: 'Business'
    };


    return (
        map[
        Number(
            accountTypeId
        )
        ]
        ||
        `Type ${accountTypeId ?? '-'}`
    );
}


// ============================================================
// HELPERS
// ============================================================

function setManagerText(
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


// ============================================================
// MONEY FORMAT
// ============================================================

function formatManagerMoney(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        'en-BD',
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}


// ============================================================
// DATE FORMAT
// ============================================================

function formatManagerDate(
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


// ============================================================
// DATE + TIME FORMAT
// ============================================================

function formatManagerDateTime(
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


    return date.toLocaleString(
        'en-BD'
    );
}


// ============================================================
// STATUS CLASS
// ============================================================

function managerStatusClass(
    status
) {

    return String(
        status || ''
    )
        .toLowerCase()
        .replace(
            /\s+/g,
            '_'
        );
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeManagerHtml(
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
// BUTTON BINDING
// ============================================================

function bindManagerClick(
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


// ============================================================
// TABLE MESSAGE
// ============================================================

function setManagerTableMessage(
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
                ${escapeManagerHtml(
        message
    )}
            </td>

        </tr>
    `;
}


// ============================================================
// TABLE ERROR
// ============================================================

function showManagerTableError(
    body,
    colspan,
    message
) {

    setManagerTableMessage(
        body,
        colspan,
        `Error: ${message}`
    );
}


// ============================================================
// API ERROR
// ============================================================

function formatManagerApiError(
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