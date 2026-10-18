// ============================================================
// NEXA BANK
// ADMIN DASHBOARD
// ============================================================

const ADMIN_API =
    'http://127.0.0.1:8000';


// ============================================================
// GLOBAL DATA
// ============================================================

let adminEmployee = null;

let adminUsers = [];

let adminEmployees = [];

let adminDepartments = [];

let adminPositions = [];

let adminCustomersRaw = [];

let adminCustomers = [];

let adminBranches = [];

let adminAccounts = [];

let adminTransactionsRaw = [];

let adminTransactionEntries = [];

let adminTransactions = [];

let adminLoanApplications = [];

let adminLoans = [];

let adminAuditLogs = [];

let adminNotifications = [];


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    'DOMContentLoaded',
    async () => {

        verifyAdminSession();

        initializeAdminNavigation();

        initializeAdminEvents();


        // ----------------------------------------------------
        // EMPLOYEES
        // ----------------------------------------------------

        await loadAdminEmployees();

        resolveAdminIdentity();


        // ----------------------------------------------------
        // BRANCHES
        // ----------------------------------------------------

        await loadAdminBranches();


        // ----------------------------------------------------
        // EMPLOYEE FORM DROPDOWNS
        // ----------------------------------------------------

        await loadAdminEmployeeDropdownData();


        // ----------------------------------------------------
        // OTHER ADMIN DATA
        // ----------------------------------------------------

        await loadAdminCustomers();

        await loadAdminAccounts();

        await loadAdminUsers();

        await loadAdminTransactions();

        await loadAdminLoans();

        await loadAdminAuditLogs();

        await loadAdminNotifications();


        // ----------------------------------------------------
        // DASHBOARD
        // ----------------------------------------------------

        updateAdminDashboard();

        updateAdminReports();


        showAdminSection(
            'admin-dashboard-section'
        );
    }
);


// ============================================================
// SESSION
// ============================================================

function verifyAdminSession() {

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
            'Please login first.'
        );


        window.location.href =
            'login.html';


        return;
    }


    if (
        role &&
        role !== 'ADMIN'
    ) {

        console.warn(
            'Unexpected Admin role:',
            role
        );
    }
}


// ============================================================
// NAVIGATION
// ============================================================

function initializeAdminNavigation() {

    document
        .querySelectorAll(
            '.admin-nav-link'
        )
        .forEach(
            link => {

                link.addEventListener(
                    'click',
                    event => {

                        event.preventDefault();


                        showAdminSection(
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

                        showAdminSection(
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

function showAdminSection(
    sectionId
) {

    document
        .querySelectorAll(
            '.admin-section'
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


    const selected =
        document.getElementById(
            sectionId
        );


    if (selected) {

        selected.style.display =
            'block';


        selected.classList.add(
            'active-section'
        );
    }


    document
        .querySelectorAll(
            '.admin-nav-link'
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
            `.admin-nav-link[data-section="${sectionId}"]`
        )
        ?.classList.add(
            'active'
        );


    if (
        sectionId ===
        'admin-employees-section'
    ) {

        populateEmployeeBranchDropdown();

        populateEmployeeDepartmentDropdown();

        populateEmployeePositionDropdown();
    }


    if (
        sectionId ===
        'admin-reports-section'
    ) {

        updateAdminReports();
    }
}


// ============================================================
// EVENTS
// ============================================================

function initializeAdminEvents() {

    bindAdminClick(
        'refresh-admin-users-btn',
        loadAdminUsers
    );


    bindAdminClick(
        'refresh-admin-employees-btn',
        async () => {

            await loadAdminEmployees();

            await loadAdminEmployeeDropdownData();
        }
    );


    bindAdminClick(
        'refresh-admin-customers-btn',
        loadAdminCustomers
    );


    bindAdminClick(
        'refresh-admin-branches-btn',
        async () => {

            await loadAdminBranches();

            populateEmployeeBranchDropdown();
        }
    );


    bindAdminClick(
        'refresh-admin-accounts-btn',
        loadAdminAccounts
    );


    bindAdminClick(
        'refresh-admin-transactions-btn',
        loadAdminTransactions
    );


    bindAdminClick(
        'refresh-admin-loans-btn',
        loadAdminLoans
    );


    bindAdminClick(
        'refresh-admin-audit-btn',
        loadAdminAuditLogs
    );


    bindAdminClick(
        'refresh-admin-notifications-btn',
        loadAdminNotifications
    );


    bindAdminClick(
        'refresh-admin-reports-btn',
        refreshAdminSystem
    );


    // ========================================================
    // USER FILTERS
    // ========================================================

    bindInput(
        'admin-user-search',
        filterAdminUsers
    );


    bindChange(
        'admin-user-status-filter',
        filterAdminUsers
    );


    // ========================================================
    // EMPLOYEE FILTERS
    // ========================================================

    bindInput(
        'admin-employee-search',
        filterAdminEmployees
    );


    bindChange(
        'admin-employee-status-filter',
        filterAdminEmployees
    );


    // ========================================================
    // CUSTOMER FILTERS
    // ========================================================

    bindInput(
        'admin-customer-search',
        filterAdminCustomers
    );


    bindChange(
        'admin-customer-status-filter',
        filterAdminCustomers
    );


    // ========================================================
    // BRANCH FILTERS
    // ========================================================

    bindInput(
        'admin-branch-search',
        filterAdminBranches
    );


    bindChange(
        'admin-branch-status-filter',
        filterAdminBranches
    );


    // ========================================================
    // ACCOUNT FILTERS
    // ========================================================

    bindInput(
        'admin-account-search',
        filterAdminAccounts
    );


    bindChange(
        'admin-account-status-filter',
        filterAdminAccounts
    );


    // ========================================================
    // TRANSACTION FILTERS
    // ========================================================

    bindInput(
        'admin-transaction-search',
        filterAdminTransactions
    );


    bindChange(
        'admin-transaction-status-filter',
        filterAdminTransactions
    );


    // ========================================================
    // LOAN FILTERS
    // ========================================================

    bindInput(
        'admin-loan-search',
        filterAdminLoans
    );


    bindChange(
        'admin-loan-status-filter',
        filterAdminLoans
    );


    // ========================================================
    // AUDIT SEARCH
    // ========================================================

    bindInput(
        'admin-audit-search',
        filterAdminAuditLogs
    );


    // ========================================================
    // CREATE EMPLOYEE
    // ========================================================

    document
        .getElementById(
            'admin-create-employee-form'
        )
        ?.addEventListener(
            'submit',
            event => {

                event.preventDefault();


                createAdminEmployee();
            }
        );


    // ========================================================
    // BRANCH CREATE / UPDATE
    // ========================================================

    document
        .getElementById(
            'admin-branch-form'
        )
        ?.addEventListener(
            'submit',
            event => {

                event.preventDefault();


                saveAdminBranch();
            }
        );


    bindAdminClick(
        'cancel-branch-edit-btn',
        cancelBranchEdit
    );


    // ========================================================
    // LOGOUT
    // ========================================================

    document
        .getElementById(
            'admin-logout-btn'
        )
        ?.addEventListener(
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


// ============================================================
// REFRESH EVERYTHING
// ============================================================

async function refreshAdminSystem() {

    await loadAdminEmployees();

    resolveAdminIdentity();


    await loadAdminBranches();


    await loadAdminEmployeeDropdownData();


    await loadAdminCustomers();

    await loadAdminAccounts();

    await loadAdminUsers();

    await loadAdminTransactions();

    await loadAdminLoans();

    await loadAdminAuditLogs();

    await loadAdminNotifications();


    updateAdminDashboard();

    updateAdminReports();
}


// ============================================================
// EMPLOYEE DROPDOWN DATA
// ============================================================

async function loadAdminEmployeeDropdownData() {

    // Branch data is already loaded from /branches/

    populateEmployeeBranchDropdown();


    await Promise.all(
        [
            loadAdminDepartments(),
            loadAdminPositions()
        ]
    );


    populateEmployeeDepartmentDropdown();

    populateEmployeePositionDropdown();
}


// ============================================================
// LOAD DEPARTMENTS
// ============================================================

async function loadAdminDepartments() {

    try {

        const response =
            await fetch(
                `${ADMIN_API}/departments/`
            );


        if (!response.ok) {

            throw new Error(
                'Department endpoint unavailable.'
            );
        }


        const result =
            await response.json();


        adminDepartments =
            Array.isArray(result)
                ?
                result
                :
                [];

    }

    catch (error) {

        console.warn(
            'Using employee data for department dropdown:',
            error.message
        );


        // ----------------------------------------------------
        // FALLBACK:
        // BUILD DEPARTMENT LIST FROM EMPLOYEES
        // ----------------------------------------------------

        const map =
            new Map();


        adminEmployees.forEach(
            employee => {

                if (
                    employee.department_id == null
                    ||
                    !employee.department_name
                ) {

                    return;
                }


                map.set(
                    Number(
                        employee.department_id
                    ),
                    {
                        department_id:
                            Number(
                                employee.department_id
                            ),

                        department_name:
                            employee.department_name
                    }
                );
            }
        );


        adminDepartments =
            Array.from(
                map.values()
            );
    }
}


// ============================================================
// LOAD POSITIONS
// ============================================================

async function loadAdminPositions() {

    try {

        const response =
            await fetch(
                `${ADMIN_API}/positions/`
            );


        if (!response.ok) {

            throw new Error(
                'Position endpoint unavailable.'
            );
        }


        const result =
            await response.json();


        adminPositions =
            Array.isArray(result)
                ?
                result
                :
                [];

    }

    catch (error) {

        console.warn(
            'Using employee data for position dropdown:',
            error.message
        );


        // ----------------------------------------------------
        // FALLBACK:
        // BUILD POSITION LIST FROM EMPLOYEES
        // ----------------------------------------------------

        const map =
            new Map();


        adminEmployees.forEach(
            employee => {

                if (
                    employee.position_id == null
                    ||
                    !employee.position_name
                ) {

                    return;
                }


                map.set(
                    Number(
                        employee.position_id
                    ),
                    {
                        position_id:
                            Number(
                                employee.position_id
                            ),

                        position_name:
                            employee.position_name
                    }
                );
            }
        );


        adminPositions =
            Array.from(
                map.values()
            );
    }
}


// ============================================================
// BRANCH DROPDOWN
// ============================================================

function populateEmployeeBranchDropdown() {

    const select =
        document.getElementById(
            'employee-branch-id'
        );


    if (!select) {

        return;
    }


    const currentValue =
        select.value;


    select.innerHTML = `

        <option value="">
            Select Branch
        </option>
    `;


    const branches =
        [...adminBranches]
            .sort(
                (
                    a,
                    b
                ) =>
                    String(
                        a.branch_name ||
                        ''
                    ).localeCompare(
                        String(
                            b.branch_name ||
                            ''
                        )
                    )
            );


    branches.forEach(
        branch => {

            const option =
                document.createElement(
                    'option'
                );


            option.value =
                branch.branch_id;


            option.textContent =
                branch.branch_code
                    ?
                    `${branch.branch_name} (${branch.branch_code})`
                    :
                    branch.branch_name;


            if (
                branch.status
                &&
                branch.status !== 'ACTIVE'
            ) {

                option.textContent +=
                    ` - ${branch.status}`;
            }


            select.appendChild(
                option
            );
        }
    );


    if (
        currentValue
        &&
        [...select.options].some(
            option =>
                option.value ===
                currentValue
        )
    ) {

        select.value =
            currentValue;
    }
}


// ============================================================
// DEPARTMENT DROPDOWN
// ============================================================

function populateEmployeeDepartmentDropdown() {

    const select =
        document.getElementById(
            'employee-department-id'
        );


    if (!select) {

        return;
    }


    const currentValue =
        select.value;


    select.innerHTML = `

        <option value="">
            Select Department
        </option>
    `;


    const departments =
        [...adminDepartments]
            .sort(
                (
                    a,
                    b
                ) =>
                    String(
                        a.department_name ||
                        ''
                    ).localeCompare(
                        String(
                            b.department_name ||
                            ''
                        )
                    )
            );


    departments.forEach(
        department => {

            const option =
                document.createElement(
                    'option'
                );


            option.value =
                department.department_id;


            option.textContent =
                department.department_name;


            select.appendChild(
                option
            );
        }
    );


    if (
        currentValue
        &&
        [...select.options].some(
            option =>
                option.value ===
                currentValue
        )
    ) {

        select.value =
            currentValue;
    }
}


// ============================================================
// POSITION DROPDOWN
// ============================================================

function populateEmployeePositionDropdown() {

    const select =
        document.getElementById(
            'employee-position-id'
        );


    if (!select) {

        return;
    }


    const currentValue =
        select.value;


    select.innerHTML = `

        <option value="">
            Select Position
        </option>
    `;


    const positions =
        [...adminPositions]
            .sort(
                (
                    a,
                    b
                ) =>
                    String(
                        a.position_name ||
                        ''
                    ).localeCompare(
                        String(
                            b.position_name ||
                            ''
                        )
                    )
            );


    positions.forEach(
        position => {

            const option =
                document.createElement(
                    'option'
                );


            option.value =
                position.position_id;


            option.textContent =
                position.position_name;


            select.appendChild(
                option
            );
        }
    );


    if (
        currentValue
        &&
        [...select.options].some(
            option =>
                option.value ===
                currentValue
        )
    ) {

        select.value =
            currentValue;
    }
}


// ============================================================
// EMPLOYEES
// ============================================================

async function loadAdminEmployees() {

    const body =
        document.getElementById(
            'admin-employees-body'
        );


    setAdminTableMessage(
        body,
        7,
        'Loading employees...'
    );


    try {

        const response =
            await fetch(
                `${ADMIN_API}/employees/`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                adminApiError(
                    result,
                    'Unable to load employees.'
                )
            );
        }


        adminEmployees =
            Array.isArray(result)
                ?
                result
                :
                [];


        filterAdminEmployees();


        updateAdminDashboard();

        updateAdminReports();

    }

    catch (error) {

        console.error(
            'ADMIN EMPLOYEE ERROR:',
            error
        );


        showAdminTableError(
            body,
            7,
            error.message
        );
    }
}


// ============================================================
// ADMIN IDENTITY
// ============================================================

function resolveAdminIdentity() {

    const userId =
        Number(
            localStorage.getItem(
                'user_id'
            )
        );


    adminEmployee =
        adminEmployees.find(
            employee =>
                Number(
                    employee.user_id
                )
                ===
                userId
        );


    if (!adminEmployee) {

        return;
    }


    const name =
        `${adminEmployee.first_name || ''} ${adminEmployee.last_name || ''}`
            .trim()
        ||
        'Administrator';


    setAdminText(
        'admin-topbar-name',
        name
    );


    setAdminText(
        'admin-welcome-name',
        name
    );


    setAdminText(
        'admin-profile-name',
        name
    );


    setAdminText(
        'admin-profile-position',
        adminEmployee.position_name
        ||
        'Administrator'
    );


    setAdminText(
        'admin-profile-employee-id',
        adminEmployee.employee_id
        ||
        '-'
    );


    setAdminText(
        'admin-profile-user-id',
        adminEmployee.user_id
        ||
        '-'
    );


    setAdminText(
        'admin-profile-department',
        adminEmployee.department_name
        ||
        '-'
    );


    setAdminText(
        'admin-profile-position-name',
        adminEmployee.position_name
        ||
        '-'
    );


    setAdminText(
        'admin-profile-branch',
        adminEmployee.branch_name
        ||
        '-'
    );


    setAdminText(
        'admin-profile-status',
        adminEmployee.status
        ||
        '-'
    );
}


// ============================================================
// CREATE EMPLOYEE
// ============================================================

async function createAdminEmployee() {

    const message =
        document.getElementById(
            'admin-employee-message'
        );


    const button =
        document.getElementById(
            'admin-create-employee-btn'
        );


    const branchId =
        numberOf(
            'employee-branch-id'
        );


    const departmentId =
        numberOf(
            'employee-department-id'
        );


    const positionId =
        numberOf(
            'employee-position-id'
        );


    if (
        !branchId
        ||
        !departmentId
        ||
        !positionId
    ) {

        if (message) {

            message.style.color =
                '#dc2626';


            message.textContent =
                '✕ Please select branch, department and position.';
        }


        return;
    }


    const payload = {

        username:
            valueOf(
                'employee-username'
            ),

        email:
            valueOf(
                'employee-email'
            ),

        password:
            valueOf(
                'employee-password'
            ),

        role:
            valueOf(
                'employee-role'
            ),

        branch_id:
            branchId,

        department_id:
            departmentId,

        position_id:
            positionId,

        first_name:
            valueOf(
                'employee-first-name'
            ),

        last_name:
            valueOf(
                'employee-last-name'
            ),

        nid:
            valueOf(
                'employee-nid'
            ),

        phone:
            valueOf(
                'employee-phone'
            ),

        joining_date:
            valueOf(
                'employee-joining-date'
            ),

        salary:
            numberOf(
                'employee-salary'
            ),

        status:
            valueOf(
                'employee-status'
            )
    };


    if (button) {

        button.disabled =
            true;


        button.textContent =
            'Creating Employee...';
    }


    try {

        const response =
            await fetch(
                `${ADMIN_API}/employees/`,
                {
                    method:
                        'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                adminApiError(
                    result,
                    'Employee creation failed.'
                )
            );
        }


        if (message) {

            message.style.color =
                '#15803d';


            message.textContent =
                '✓ Employee created successfully.';
        }


        const form =
            document.getElementById(
                'admin-create-employee-form'
            );


        if (form) {

            form.reset();
        }


        // ----------------------------------------------------
        // RESTORE DROPDOWNS
        // ----------------------------------------------------

        populateEmployeeBranchDropdown();

        populateEmployeeDepartmentDropdown();

        populateEmployeePositionDropdown();


        await loadAdminEmployees();


        // Refresh fallback data too

        await loadAdminEmployeeDropdownData();

    }

    catch (error) {

        if (message) {

            message.style.color =
                '#dc2626';


            message.textContent =
                '✕ ' +
                error.message;
        }

    }

    finally {

        if (button) {

            button.disabled =
                false;


            button.textContent =
                '+ Create Employee';
        }
    }
}


// ============================================================
// FILTER EMPLOYEES
// ============================================================

function filterAdminEmployees() {

    const search =
        lowerValue(
            'admin-employee-search'
        );


    const status =
        valueOf(
            'admin-employee-status-filter'
        );


    const filtered =
        adminEmployees.filter(
            employee => {

                const text = `

                    ${employee.employee_id ?? ''}

                    ${employee.user_id ?? ''}

                    ${employee.first_name ?? ''}

                    ${employee.last_name ?? ''}

                    ${employee.department_name ?? ''}

                    ${employee.position_name ?? ''}

                    ${employee.branch_name ?? ''}

                    ${employee.status ?? ''}

                `.toLowerCase();


                return (
                    (
                        !search
                        ||
                        text.includes(
                            search
                        )
                    )
                    &&
                    (
                        !status
                        ||
                        employee.status ===
                        status
                    )
                );
            }
        );


    renderAdminEmployees(
        filtered
    );
}


// ============================================================
// RENDER EMPLOYEES
// ============================================================

function renderAdminEmployees(
    employees
) {

    const body =
        document.getElementById(
            'admin-employees-body'
        );


    if (!body) {

        return;
    }


    if (!employees.length) {

        setAdminTableMessage(
            body,
            7,
            'No employees found.'
        );


        return;
    }


    body.innerHTML =
        '';


    employees.forEach(
        employee => {

            const row =
                document.createElement(
                    'tr'
                );


            row.innerHTML = `

                <td>

                    #${escapeAdmin(
                        employee.employee_id
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        employee.department_name
                        ||
                        '-'
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        employee.position_name
                        ||
                        '-'
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        employee.branch_name
                        ||
                        '-'
                    )}

                </td>


                <td>

                    ${adminStatusBadge(
                        employee.status
                    )}

                </td>


                <td>

                    <select
                        class="admin-inline-select employee-status-change"
                        data-id="${employee.employee_id}"
                    >

                        <option
                            value="ACTIVE"
                            ${employee.status === 'ACTIVE' ? 'selected' : ''}
                        >
                            ACTIVE
                        </option>

                        <option
                            value="ON_LEAVE"
                            ${employee.status === 'ON_LEAVE' ? 'selected' : ''}
                        >
                            ON_LEAVE
                        </option>

                        <option
                            value="INACTIVE"
                            ${employee.status === 'INACTIVE' ? 'selected' : ''}
                        >
                            INACTIVE
                        </option>

                    </select>

                </td>
            `;


            body.appendChild(
                row
            );
        }
    );


    document
        .querySelectorAll(
            '.employee-status-change'
        )
        .forEach(
            select => {

                select.addEventListener(
                    'change',
                    () => {

                        updateAdminEmployeeStatus(
                            Number(
                                select.dataset.id
                            ),
                            select.value
                        );
                    }
                );
            }
        );
}


// ============================================================
// EMPLOYEE STATUS
// ============================================================

async function updateAdminEmployeeStatus(
    employeeId,
    status
) {

    try {

        const response =
            await fetch(
                `${ADMIN_API}/employees/${employeeId}/status?status=${encodeURIComponent(status)}`,
                {
                    method:
                        'PUT'
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                adminApiError(
                    result,
                    'Employee status update failed.'
                )
            );
        }


        await loadAdminEmployees();

    }

    catch (error) {

        alert(
            error.message
        );


        await loadAdminEmployees();
    }
}


// ============================================================
// USERS
// ============================================================

async function loadAdminUsers() {

    const body =
        document.getElementById(
            'admin-users-body'
        );


    setAdminTableMessage(
        body,
        5,
        'Loading users...'
    );


    try {

        const response =
            await fetch(
                `${ADMIN_API}/users/`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                adminApiError(
                    result,
                    'Unable to load users.'
                )
            );
        }


        adminUsers =
            Array.isArray(result)
                ?
                result
                :
                [];


        filterAdminUsers();

        updateAdminDashboard();

    }

    catch (error) {

        console.error(
            'ADMIN USER ERROR:',
            error
        );


        adminUsers =
            [];


        showAdminTableError(
            body,
            5,
            error.message
        );
    }
}


// ============================================================
// FILTER USERS
// ============================================================

function filterAdminUsers() {

    const search =
        lowerValue(
            'admin-user-search'
        );


    const status =
        valueOf(
            'admin-user-status-filter'
        );


    const filtered =
        adminUsers.filter(
            user => {

                const text = `

                    ${user.user_id ?? ''}

                    ${user.username ?? ''}

                    ${user.email ?? ''}

                    ${user.role_name ?? ''}

                    ${user.role ?? ''}

                `.toLowerCase();


                return (
                    (
                        !search
                        ||
                        text.includes(
                            search
                        )
                    )
                    &&
                    (
                        !status
                        ||
                        user.status ===
                        status
                    )
                );
            }
        );


    renderAdminUsers(
        filtered
    );
}


// ============================================================
// RENDER USERS
// ============================================================

function renderAdminUsers(
    users
) {

    const body =
        document.getElementById(
            'admin-users-body'
        );


    if (!body) {

        return;
    }


    if (!users.length) {

        setAdminTableMessage(
            body,
            5,
            'No users found.'
        );


        return;
    }


    body.innerHTML =
        '';


    users.forEach(
        user => {

            const row =
                document.createElement(
                    'tr'
                );


            row.innerHTML = `

                <td>
                    #${escapeAdmin(
                        user.user_id
                    )}
                </td>

                <td>
                    ${escapeAdmin(
                        user.username ||
                        '-'
                    )}
                </td>

                <td>
                    ${escapeAdmin(
                        user.email ||
                        '-'
                    )}
                </td>

                <td>
                    ${escapeAdmin(
                        user.role_name
                        ||
                        user.role
                        ||
                        '-'
                    )}
                </td>

                <td>
                    ${adminStatusBadge(
                        user.status
                    )}
                </td>
            `;


            body.appendChild(
                row
            );
        }
    );
}


// ============================================================
// CUSTOMERS
// ============================================================

async function loadAdminCustomers() {

    const body =
        document.getElementById(
            'admin-customers-body'
        );


    setAdminTableMessage(
        body,
        7,
        'Loading customers...'
    );


    try {

        const response =
            await fetch(
                `${ADMIN_API}/customers/management/all`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                adminApiError(
                    result,
                    'Unable to load customers.'
                )
            );
        }


        adminCustomersRaw =
            Array.isArray(result)
                ?
                result
                :
                [];


        const map =
            new Map();


        adminCustomersRaw.forEach(
            customer => {

                const id =
                    String(
                        customer.customer_id
                    );


                if (
                    !map.has(id)
                ) {

                    map.set(
                        id,
                        {
                            ...customer,

                            accounts:
                                []
                        }
                    );
                }


                if (
                    customer.account_id
                ) {

                    map
                        .get(id)
                        .accounts
                        .push(
                            {
                                account_id:
                                    customer.account_id,

                                account_number:
                                    customer.account_number,

                                balance:
                                    customer.balance,

                                status:
                                    customer.account_status
                            }
                        );
                }
            }
        );


        adminCustomers =
            Array.from(
                map.values()
            );


        filterAdminCustomers();


        updateAdminDashboard();

        updateAdminReports();

    }

    catch (error) {

        console.error(
            'ADMIN CUSTOMER ERROR:',
            error
        );


        showAdminTableError(
            body,
            7,
            error.message
        );
    }
}


// ============================================================
// FILTER CUSTOMERS
// ============================================================

function filterAdminCustomers() {

    const search =
        lowerValue(
            'admin-customer-search'
        );


    const status =
        valueOf(
            'admin-customer-status-filter'
        );


    const filtered =
        adminCustomers.filter(
            customer => {

                const accounts =
                    customer.accounts
                        .map(
                            account =>
                                account.account_number
                        )
                        .join(
                            ' '
                        );


                const text = `

                    ${customer.customer_id ?? ''}

                    ${customer.first_name ?? ''}

                    ${customer.last_name ?? ''}

                    ${customer.email ?? ''}

                    ${customer.phone ?? ''}

                    ${customer.nid ?? ''}

                    ${customer.branch_id ?? ''}

                    ${accounts}

                `.toLowerCase();


                return (
                    (
                        !search
                        ||
                        text.includes(
                            search
                        )
                    )
                    &&
                    (
                        !status
                        ||
                        customer.customer_status ===
                        status
                    )
                );
            }
        );


    renderAdminCustomers(
        filtered
    );
}


// ============================================================
// RENDER CUSTOMERS
// ============================================================

function renderAdminCustomers(
    customers
) {

    const body =
        document.getElementById(
            'admin-customers-body'
        );


    if (!body) {

        return;
    }


    if (!customers.length) {

        setAdminTableMessage(
            body,
            7,
            'No customers found.'
        );


        return;
    }


    body.innerHTML =
        '';


    customers.forEach(
        customer => {

            const totalBalance =
                customer.accounts.reduce(
                    (
                        total,
                        account
                    ) =>
                        total
                        +
                        Number(
                            account.balance
                            ||
                            0
                        ),
                    0
                );


            const accountNumbers =
                customer.accounts
                    .map(
                        account =>
                            account.account_number
                    )
                    .filter(
                        Boolean
                    )
                    .join(
                        ', '
                    );


            const row =
                document.createElement(
                    'tr'
                );


            row.innerHTML = `

                <td>

                    <strong>

                        ${escapeAdmin(
                            `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                        )}

                    </strong>

                    <br>

                    <small>

                        #${escapeAdmin(
                            customer.customer_id
                        )}

                    </small>

                </td>


                <td>

                    ${escapeAdmin(
                        customer.email ||
                        '-'
                    )}

                    <br>

                    <small>

                        ${escapeAdmin(
                            customer.phone ||
                            '-'
                        )}

                    </small>

                </td>


                <td>

                    ${escapeAdmin(
                        getAdminBranchName(
                            customer.branch_id
                        )
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        accountNumbers ||
                        'No account'
                    )}

                </td>


                <td>

                    ৳${formatAdminMoney(
                        totalBalance
                    )}

                </td>


                <td>

                    ${adminStatusBadge(
                        customer.customer_status
                    )}

                </td>


                <td>

                    <select
                        class="admin-inline-select customer-status-change"
                        data-id="${customer.customer_id}"
                    >

                        <option
                            value="ACTIVE"
                            ${customer.customer_status === 'ACTIVE' ? 'selected' : ''}
                        >
                            ACTIVE
                        </option>

                        <option
                            value="INACTIVE"
                            ${customer.customer_status === 'INACTIVE' ? 'selected' : ''}
                        >
                            INACTIVE
                        </option>

                        <option
                            value="BLOCKED"
                            ${customer.customer_status === 'BLOCKED' ? 'selected' : ''}
                        >
                            BLOCKED
                        </option>

                    </select>

                </td>
            `;


            body.appendChild(
                row
            );
        }
    );


    document
        .querySelectorAll(
            '.customer-status-change'
        )
        .forEach(
            select => {

                select.addEventListener(
                    'change',
                    () => {

                        updateAdminCustomerStatus(
                            Number(
                                select.dataset.id
                            ),
                            select.value
                        );
                    }
                );
            }
        );
}


// ============================================================
// CUSTOMER STATUS
// ============================================================

async function updateAdminCustomerStatus(
    customerId,
    status
) {

    try {

        const response =
            await fetch(
                `${ADMIN_API}/customers/${customerId}/status?status=${encodeURIComponent(status)}`,
                {
                    method:
                        'PUT'
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                adminApiError(
                    result,
                    'Customer status update failed.'
                )
            );
        }


        await loadAdminCustomers();

    }

    catch (error) {

        alert(
            error.message
        );


        await loadAdminCustomers();
    }
}


// ============================================================
// BRANCHES
// ============================================================

async function loadAdminBranches() {

    const body =
        document.getElementById(
            'admin-branches-body'
        );


    setAdminTableMessage(
        body,
        9,
        'Loading branches...'
    );


    try {

        const response =
            await fetch(
                `${ADMIN_API}/branches/`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                adminApiError(
                    result,
                    'Unable to load branches.'
                )
            );
        }


        adminBranches =
            Array.isArray(result)
                ?
                result
                :
                [];


        filterAdminBranches();


        // ----------------------------------------------------
        // UPDATE EMPLOYEE BRANCH DROPDOWN TOO
        // ----------------------------------------------------

        populateEmployeeBranchDropdown();


        updateAdminDashboard();

        updateAdminReports();

    }

    catch (error) {

        console.error(
            'ADMIN BRANCH ERROR:',
            error
        );


        showAdminTableError(
            body,
            9,
            error.message
        );
    }
}


// ============================================================
// SAVE BRANCH
// ============================================================

async function saveAdminBranch() {

    const branchId =
        valueOf(
            'branch-edit-id'
        );


    const message =
        document.getElementById(
            'admin-branch-message'
        );


    const managerEmployeeValue =
        valueOf(
            'branch-manager-employee-id'
        );


    const payload = {

        branch_code:
            valueOf(
                'branch-code'
            ),

        branch_name:
            valueOf(
                'branch-name'
            ),

        address:
            valueOf(
                'branch-address'
            ),

        city:
            valueOf(
                'branch-city'
            ),

        phone:
            valueOf(
                'branch-phone'
            )
            ||
            null,

        manager_employee_id:
            managerEmployeeValue
                ?
                Number(
                    managerEmployeeValue
                )
                :
                null,

        status:
            valueOf(
                'branch-status'
            )
    };


    const editing =
        Boolean(
            branchId
        );


    try {

        const response =
            await fetch(
                editing
                    ?
                    `${ADMIN_API}/branches/${branchId}`
                    :
                    `${ADMIN_API}/branches/`,
                {
                    method:
                        editing
                            ?
                            'PUT'
                            :
                            'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                adminApiError(
                    result,
                    editing
                        ?
                        'Branch update failed.'
                        :
                        'Branch creation failed.'
                )
            );
        }


        if (message) {

            message.style.color =
                '#15803d';


            message.textContent =
                editing
                    ?
                    '✓ Branch updated successfully.'
                    :
                    '✓ Branch created successfully.';
        }


        cancelBranchEdit();


        await loadAdminBranches();

    }

    catch (error) {

        if (message) {

            message.style.color =
                '#dc2626';


            message.textContent =
                '✕ ' +
                error.message;
        }
    }
}


// ============================================================
// FILTER BRANCHES
// ============================================================

function filterAdminBranches() {

    const search =
        lowerValue(
            'admin-branch-search'
        );


    const status =
        valueOf(
            'admin-branch-status-filter'
        );


    const filtered =
        adminBranches.filter(
            branch => {

                const text = `

                    ${branch.branch_id ?? ''}

                    ${branch.branch_code ?? ''}

                    ${branch.branch_name ?? ''}

                    ${branch.address ?? ''}

                    ${branch.city ?? ''}

                    ${branch.phone ?? ''}

                    ${branch.manager_employee_id ?? ''}

                    ${branch.manager_name ?? ''}

                `.toLowerCase();


                return (
                    (
                        !search
                        ||
                        text.includes(
                            search
                        )
                    )
                    &&
                    (
                        !status
                        ||
                        branch.status ===
                        status
                    )
                );
            }
        );


    renderAdminBranches(
        filtered
    );
}


// ============================================================
// RENDER BRANCHES
// ============================================================

function renderAdminBranches(
    branches
) {

    const body =
        document.getElementById(
            'admin-branches-body'
        );


    if (!body) {

        return;
    }


    if (!branches.length) {

        setAdminTableMessage(
            body,
            9,
            'No branches found.'
        );


        return;
    }


    body.innerHTML =
        '';


    branches.forEach(
        branch => {

            const managerDisplay =
                branch.manager_name
                    ?
                    `${branch.manager_name} (#${branch.manager_employee_id})`
                    :
                    branch.manager_employee_id
                        ?
                        `Employee #${branch.manager_employee_id}`
                        :
                        'Not assigned';


            const row =
                document.createElement(
                    'tr'
                );


            row.innerHTML = `

                <td>
                    #${escapeAdmin(
                        branch.branch_id
                    )}
                </td>

                <td>
                    ${escapeAdmin(
                        branch.branch_name ||
                        '-'
                    )}
                </td>

                <td>
                    ${escapeAdmin(
                        branch.branch_code ||
                        '-'
                    )}
                </td>

                <td>
                    ${escapeAdmin(
                        branch.city ||
                        '-'
                    )}
                </td>

                <td>
                    ${escapeAdmin(
                        branch.phone ||
                        '-'
                    )}
                </td>

                <td>
                    ${escapeAdmin(
                        managerDisplay
                    )}
                </td>

                <td class="admin-wrap-cell">
                    ${escapeAdmin(
                        branch.address ||
                        '-'
                    )}
                </td>

                <td>
                    ${adminStatusBadge(
                        branch.status
                    )}
                </td>

                <td>

                    <button
                        type="button"
                        class="admin-edit-btn edit-branch-btn"
                        data-id="${branch.branch_id}"
                    >
                        ✎ Edit
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
            '.edit-branch-btn'
        )
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    () => {

                        startBranchEdit(
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
// START BRANCH EDIT
// ============================================================

function startBranchEdit(
    branchId
) {

    const branch =
        adminBranches.find(
            item =>
                Number(
                    item.branch_id
                )
                ===
                Number(
                    branchId
                )
        );


    if (!branch) {

        return;
    }


    setInputValue(
        'branch-edit-id',
        branch.branch_id
    );


    setInputValue(
        'branch-name',
        branch.branch_name
    );


    setInputValue(
        'branch-code',
        branch.branch_code
    );


    setInputValue(
        'branch-city',
        branch.city
    );


    setInputValue(
        'branch-phone',
        branch.phone
    );


    setInputValue(
        'branch-manager-employee-id',
        branch.manager_employee_id
        ||
        ''
    );


    setInputValue(
        'branch-address',
        branch.address
    );


    setInputValue(
        'branch-status',
        branch.status
        ||
        'ACTIVE'
    );


    setAdminText(
        'branch-form-title',
        `Edit Branch #${branch.branch_id}`
    );


    setAdminText(
        'save-branch-btn',
        '✓ Update Branch'
    );


    const cancel =
        document.getElementById(
            'cancel-branch-edit-btn'
        );


    if (cancel) {

        cancel.style.display =
            'inline-block';
    }


    document
        .getElementById(
            'admin-branch-form'
        )
        ?.scrollIntoView(
            {
                behavior:
                    'smooth',

                block:
                    'start'
            }
        );
}


// ============================================================
// CANCEL BRANCH EDIT
// ============================================================

function cancelBranchEdit() {

    document
        .getElementById(
            'admin-branch-form'
        )
        ?.reset();


    setInputValue(
        'branch-edit-id',
        ''
    );


    setAdminText(
        'branch-form-title',
        'Add Branch'
    );


    setAdminText(
        'save-branch-btn',
        '+ Add Branch'
    );


    const cancel =
        document.getElementById(
            'cancel-branch-edit-btn'
        );


    if (cancel) {

        cancel.style.display =
            'none';
    }
}


// ============================================================
// ACCOUNTS
// ============================================================

async function loadAdminAccounts() {

    const body =
        document.getElementById(
            'admin-accounts-body'
        );


    setAdminTableMessage(
        body,
        8,
        'Loading accounts...'
    );


    try {

        const response =
            await fetch(
                `${ADMIN_API}/accounts/`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                adminApiError(
                    result,
                    'Unable to load accounts.'
                )
            );
        }


        adminAccounts =
            Array.isArray(result)
                ?
                result
                :
                [];


        filterAdminAccounts();


        updateAdminDashboard();

        updateAdminReports();

    }

    catch (error) {

        console.error(
            'ADMIN ACCOUNT ERROR:',
            error
        );


        showAdminTableError(
            body,
            8,
            error.message
        );
    }
}


// ============================================================
// FILTER ACCOUNTS
// ============================================================

function filterAdminAccounts() {

    const search =
        lowerValue(
            'admin-account-search'
        );


    const status =
        valueOf(
            'admin-account-status-filter'
        );


    const filtered =
        adminAccounts.filter(
            account => {

                const customer =
                    getAdminCustomer(
                        account.customer_id
                    );


                const text = `

                    ${account.account_id ?? ''}

                    ${account.account_number ?? ''}

                    ${account.customer_id ?? ''}

                    ${customer?.first_name ?? ''}

                    ${customer?.last_name ?? ''}

                    ${account.branch_id ?? ''}

                    ${getAdminBranchName(account.branch_id)}

                `.toLowerCase();


                return (
                    (
                        !search
                        ||
                        text.includes(
                            search
                        )
                    )
                    &&
                    (
                        !status
                        ||
                        account.status ===
                        status
                    )
                );
            }
        );


    renderAdminAccounts(
        filtered
    );
}


// ============================================================
// RENDER ACCOUNTS
// ============================================================

function renderAdminAccounts(
    accounts
) {

    const body =
        document.getElementById(
            'admin-accounts-body'
        );


    if (!body) {

        return;
    }


    if (!accounts.length) {

        setAdminTableMessage(
            body,
            8,
            'No accounts found.'
        );


        return;
    }


    body.innerHTML =
        '';


    accounts.forEach(
        account => {

            const customer =
                getAdminCustomer(
                    account.customer_id
                );


            const row =
                document.createElement(
                    'tr'
                );


            row.innerHTML = `

                <td>

                    #${escapeAdmin(
                        account.account_id
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        account.account_number ||
                        '-'
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        customer
                            ?
                            `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                            :
                            `Customer #${account.customer_id}`
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        getAdminBranchName(
                            account.branch_id
                        )
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        getAdminAccountType(
                            account.account_type_id
                        )
                    )}

                </td>


                <td>

                    ৳${formatAdminMoney(
                        account.balance
                    )}

                </td>


                <td>

                    ৳${formatAdminMoney(
                        account.available_balance
                    )}

                </td>


                <td>

                    ${adminStatusBadge(
                        account.status
                    )}

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
// ============================================================

async function loadAdminTransactions() {

    const body =
        document.getElementById(
            'admin-transactions-body'
        );


    setAdminTableMessage(
        body,
        8,
        'Loading transactions...'
    );


    try {

        const [
            transactionResponse,
            entryResponse
        ] =
            await Promise.all(
                [
                    fetch(
                        `${ADMIN_API}/transactions/`
                    ),

                    fetch(
                        `${ADMIN_API}/transaction-entries/`
                    )
                ]
            );


        const transactions =
            await transactionResponse.json();


        const entries =
            await entryResponse.json();


        if (!transactionResponse.ok) {

            throw new Error(
                adminApiError(
                    transactions,
                    'Unable to load transactions.'
                )
            );
        }


        if (!entryResponse.ok) {

            throw new Error(
                adminApiError(
                    entries,
                    'Unable to load transaction entries.'
                )
            );
        }


        adminTransactionsRaw =
            Array.isArray(
                transactions
            )
                ?
                transactions
                :
                [];


        adminTransactionEntries =
            Array.isArray(
                entries
            )
                ?
                entries
                :
                [];


        adminTransactions =
            [];


        adminTransactionEntries.forEach(
            entry => {

                const transaction =
                    adminTransactionsRaw.find(
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
                    adminAccounts.find(
                        item =>
                            Number(
                                item.account_id
                            )
                            ===
                            Number(
                                entry.account_id
                            )
                    );


                adminTransactions.push(
                    {
                        ...transaction,

                        account_id:
                            entry.account_id,

                        account_number:
                            account?.account_number
                            ||
                            entry.account_id,

                        entry_type:
                            entry.entry_type,

                        entry_amount:
                            entry.amount
                    }
                );
            }
        );


        adminTransactions.sort(
            (
                a,
                b
            ) =>
                new Date(
                    b.transaction_date
                    ||
                    0
                )
                -
                new Date(
                    a.transaction_date
                    ||
                    0
                )
        );


        filterAdminTransactions();


        updateAdminReports();

    }

    catch (error) {

        console.error(
            'ADMIN TRANSACTION ERROR:',
            error
        );


        showAdminTableError(
            body,
            8,
            error.message
        );
    }
}


// ============================================================
// FILTER TRANSACTIONS
// ============================================================

function filterAdminTransactions() {

    const search =
        lowerValue(
            'admin-transaction-search'
        );


    const status =
        valueOf(
            'admin-transaction-status-filter'
        );


    const filtered =
        adminTransactions.filter(
            transaction => {

                const text = `

                    ${transaction.transaction_id ?? ''}

                    ${transaction.reference_no ?? ''}

                    ${transaction.account_number ?? ''}

                    ${transaction.account_id ?? ''}

                    ${transaction.transaction_type_id ?? ''}

                    ${transaction.description ?? ''}

                    ${transaction.entry_type ?? ''}

                `.toLowerCase();


                return (
                    (
                        !search
                        ||
                        text.includes(
                            search
                        )
                    )
                    &&
                    (
                        !status
                        ||
                        transaction.status ===
                        status
                    )
                );
            }
        );


    renderAdminTransactions(
        filtered
    );
}


// ============================================================
// RENDER TRANSACTIONS
// ============================================================

function renderAdminTransactions(
    transactions
) {

    const body =
        document.getElementById(
            'admin-transactions-body'
        );


    if (!body) {

        return;
    }


    if (!transactions.length) {

        setAdminTableMessage(
            body,
            8,
            'No transactions found.'
        );


        return;
    }


    body.innerHTML =
        '';


    transactions.forEach(
        transaction => {

            const row =
                document.createElement(
                    'tr'
                );


            row.innerHTML = `

                <td>

                    #${escapeAdmin(
                        transaction.transaction_id
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        transaction.reference_no ||
                        '-'
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        getAdminTransactionType(
                            transaction
                        )
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        transaction.account_number ||
                        '-'
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        transaction.entry_type ||
                        '-'
                    )}

                </td>


                <td>

                    ৳${formatAdminMoney(
                        transaction.entry_amount
                        ??
                        transaction.amount
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        formatAdminDateTime(
                            transaction.transaction_date
                        )
                    )}

                </td>


                <td>

                    ${adminStatusBadge(
                        transaction.status
                    )}

                </td>
            `;


            body.appendChild(
                row
            );
        }
    );
}


// ============================================================
// LOANS
// ============================================================

async function loadAdminLoans() {

    const body =
        document.getElementById(
            'admin-loans-body'
        );


    setAdminTableMessage(
        body,
        8,
        'Loading loans...'
    );


    try {

        const [
            loanResponse,
            applicationResponse
        ] =
            await Promise.all(
                [
                    fetch(
                        `${ADMIN_API}/loans/`
                    ),

                    fetch(
                        `${ADMIN_API}/loan-applications/`
                    )
                ]
            );


        const loans =
            await loanResponse.json();


        const applications =
            await applicationResponse.json();


        if (!loanResponse.ok) {

            throw new Error(
                adminApiError(
                    loans,
                    'Unable to load loans.'
                )
            );
        }


        adminLoans =
            Array.isArray(
                loans
            )
                ?
                loans
                :
                [];


        adminLoanApplications =
            applicationResponse.ok
            &&
            Array.isArray(
                applications
            )
                ?
                applications
                :
                [];


        updateAdminLoanSummary();


        filterAdminLoans();


        updateAdminDashboard();

        updateAdminReports();

    }

    catch (error) {

        console.error(
            'ADMIN LOAN ERROR:',
            error
        );


        showAdminTableError(
            body,
            8,
            error.message
        );
    }
}


// ============================================================
// LOAN SUMMARY
// ============================================================

function updateAdminLoanSummary() {

    const outstanding =
        adminLoans.reduce(
            (
                total,
                loan
            ) =>
                total
                +
                Number(
                    loan.outstanding_amount
                    ||
                    0
                ),
            0
        );


    setAdminText(
        'admin-loan-app-count',
        adminLoanApplications.length
    );


    setAdminText(
        'admin-created-loan-count',
        adminLoans.length
    );


    setAdminText(
        'admin-active-loan-count',
        countAdminStatus(
            adminLoans,
            'ACTIVE'
        )
    );


    setAdminText(
        'admin-defaulted-loan-count',
        countAdminStatus(
            adminLoans,
            'DEFAULTED'
        )
    );


    setAdminText(
        'admin-loan-outstanding',
        `৳${formatAdminMoney(
            outstanding
        )}`
    );
}


// ============================================================
// FILTER LOANS
// ============================================================

function filterAdminLoans() {

    const search =
        lowerValue(
            'admin-loan-search'
        );


    const status =
        valueOf(
            'admin-loan-status-filter'
        );


    const filtered =
        adminLoans.filter(
            loan => {

                const text = `

                    ${loan.loan_id ?? ''}

                    ${loan.customer_id ?? ''}

                    ${loan.loan_type_name ?? ''}

                    ${loan.loan_type_id ?? ''}

                    ${loan.disbursement_account_number ?? ''}

                    ${loan.status ?? ''}

                `.toLowerCase();


                return (
                    (
                        !search
                        ||
                        text.includes(
                            search
                        )
                    )
                    &&
                    (
                        !status
                        ||
                        loan.status ===
                        status
                    )
                );
            }
        );


    renderAdminLoans(
        filtered
    );
}


// ============================================================
// RENDER LOANS
// ============================================================

function renderAdminLoans(
    loans
) {

    const body =
        document.getElementById(
            'admin-loans-body'
        );


    if (!body) {

        return;
    }


    if (!loans.length) {

        setAdminTableMessage(
            body,
            8,
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

                    #${escapeAdmin(
                        loan.loan_id
                    )}

                </td>


                <td>

                    #${escapeAdmin(
                        loan.customer_id
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        loan.loan_type_name
                        ||
                        `Loan Type ${loan.loan_type_id}`
                    )}

                </td>


                <td>

                    ৳${formatAdminMoney(
                        loan.principal_amount
                    )}

                </td>


                <td>

                    ৳${formatAdminMoney(
                        loan.outstanding_amount
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        loan.interest_rate
                        ??
                        '-'
                    )}%

                </td>


                <td>

                    ৳${formatAdminMoney(
                        loan.monthly_emi
                    )}

                </td>


                <td>

                    ${adminStatusBadge(
                        loan.status
                    )}

                </td>
            `;


            body.appendChild(
                row
            );
        }
    );
}


// ============================================================
// AUDIT LOGS
// ============================================================

async function loadAdminAuditLogs() {

    const body =
        document.getElementById(
            'admin-audit-body'
        );


    setAdminTableMessage(
        body,
        6,
        'Loading audit logs...'
    );


    try {

        const response =
            await fetch(
                `${ADMIN_API}/audit-logs/`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                adminApiError(
                    result,
                    'Unable to load audit logs.'
                )
            );
        }


        adminAuditLogs =
            Array.isArray(result)
                ?
                result
                :
                [];


        filterAdminAuditLogs();

    }

    catch (error) {

        console.error(
            'ADMIN AUDIT ERROR:',
            error
        );


        showAdminTableError(
            body,
            6,
            error.message
        );
    }
}


// ============================================================
// FILTER AUDIT LOGS
// ============================================================

function filterAdminAuditLogs() {

    const search =
        lowerValue(
            'admin-audit-search'
        );


    const filtered =
        adminAuditLogs.filter(
            log => {

                const text = `

                    ${log.audit_log_id ?? ''}

                    ${log.log_id ?? ''}

                    ${log.user_id ?? ''}

                    ${log.action ?? ''}

                    ${log.entity_type ?? ''}

                    ${log.entity_id ?? ''}

                `.toLowerCase();


                return (
                    !search
                    ||
                    text.includes(
                        search
                    )
                );
            }
        );


    renderAdminAuditLogs(
        filtered
    );
}


// ============================================================
// RENDER AUDIT LOGS
// ============================================================

function renderAdminAuditLogs(
    logs
) {

    const body =
        document.getElementById(
            'admin-audit-body'
        );


    if (!body) {

        return;
    }


    if (!logs.length) {

        setAdminTableMessage(
            body,
            6,
            'No audit logs found.'
        );


        return;
    }


    body.innerHTML =
        '';


    logs.forEach(
        log => {

            const row =
                document.createElement(
                    'tr'
                );


            row.innerHTML = `

                <td>

                    #${escapeAdmin(
                        log.audit_log_id
                        ??
                        log.log_id
                        ??
                        '-'
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        log.user_id
                        ??
                        '-'
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        log.action
                        ||
                        '-'
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        log.entity_type
                        ||
                        '-'
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        log.entity_id
                        ??
                        '-'
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        formatAdminDateTime(
                            log.created_at
                            ??
                            log.timestamp
                        )
                    )}

                </td>
            `;


            body.appendChild(
                row
            );
        }
    );
}


// ============================================================
// NOTIFICATIONS
// ============================================================

async function loadAdminNotifications() {

    const body =
        document.getElementById(
            'admin-notifications-body'
        );


    setAdminTableMessage(
        body,
        6,
        'Loading system events...'
    );


    try {

        const response =
            await fetch(
                `${ADMIN_API}/notifications/`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                adminApiError(
                    result,
                    'Unable to load system events.'
                )
            );
        }


        adminNotifications =
            Array.isArray(result)
                ?
                result
                :
                [];


        renderAdminNotifications(
            adminNotifications
        );

    }

    catch (error) {

        console.error(
            'ADMIN NOTIFICATION ERROR:',
            error
        );


        showAdminTableError(
            body,
            6,
            error.message
        );
    }
}


// ============================================================
// RENDER NOTIFICATIONS
// ============================================================

function renderAdminNotifications(
    notifications
) {

    const body =
        document.getElementById(
            'admin-notifications-body'
        );


    if (!body) {

        return;
    }


    if (!notifications.length) {

        setAdminTableMessage(
            body,
            6,
            'No system events found.'
        );


        return;
    }


    body.innerHTML =
        '';


    notifications.forEach(
        notification => {

            const row =
                document.createElement(
                    'tr'
                );


            row.innerHTML = `

                <td>

                    #${escapeAdmin(
                        notification.notification_id
                        ??
                        '-'
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        notification.username
                        ||
                        notification.user_id
                        ||
                        '-'
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        notification.title
                        ||
                        '-'
                    )}

                </td>


                <td class="admin-wrap-cell">

                    ${escapeAdmin(
                        notification.message
                        ||
                        '-'
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        notification.notification_type
                        ||
                        '-'
                    )}

                </td>


                <td>

                    ${escapeAdmin(
                        formatAdminDateTime(
                            notification.created_at
                        )
                    )}

                </td>
            `;


            body.appendChild(
                row
            );
        }
    );
}


// ============================================================
// DASHBOARD
// ============================================================

function updateAdminDashboard() {

    const deposits =
        adminAccounts.reduce(
            (
                total,
                account
            ) =>
                total
                +
                Number(
                    account.balance
                    ||
                    0
                ),
            0
        );


    const outstanding =
        adminLoans.reduce(
            (
                total,
                loan
            ) =>
                total
                +
                Number(
                    loan.outstanding_amount
                    ||
                    0
                ),
            0
        );


    const activeUsers =
        adminUsers.filter(
            user =>
                user.status ===
                'ACTIVE'
        ).length;


    setAdminText(
        'admin-total-customers',
        adminCustomers.length
    );


    setAdminText(
        'admin-total-employees',
        adminEmployees.length
    );


    setAdminText(
        'admin-total-branches',
        adminBranches.length
    );


    setAdminText(
        'admin-total-accounts',
        adminAccounts.length
    );


    setAdminText(
        'admin-total-deposits',
        `৳${formatAdminMoney(
            deposits
        )}`
    );


    setAdminText(
        'admin-total-loans',
        adminLoans.length
    );


    setAdminText(
        'admin-total-outstanding',
        `৳${formatAdminMoney(
            outstanding
        )}`
    );


    setAdminText(
        'admin-active-users',
        activeUsers
    );
}


// ============================================================
// REPORTS
// ============================================================

function updateAdminReports() {

    const activeCustomers =
        adminCustomers.filter(
            customer =>
                customer.customer_status ===
                'ACTIVE'
        ).length;


    const deposits =
        adminAccounts.reduce(
            (
                total,
                account
            ) =>
                total
                +
                Number(
                    account.balance
                    ||
                    0
                ),
            0
        );


    const principal =
        adminLoans.reduce(
            (
                total,
                loan
            ) =>
                total
                +
                Number(
                    loan.principal_amount
                    ||
                    0
                ),
            0
        );


    const outstanding =
        adminLoans.reduce(
            (
                total,
                loan
            ) =>
                total
                +
                Number(
                    loan.outstanding_amount
                    ||
                    0
                ),
            0
        );


    setAdminText(
        'report-admin-customers',
        adminCustomers.length
    );


    setAdminText(
        'report-admin-active-customers',
        activeCustomers
    );


    setAdminText(
        'report-admin-employees',
        adminEmployees.length
    );


    setAdminText(
        'report-admin-branches',
        adminBranches.length
    );


    setAdminText(
        'report-admin-accounts',
        adminAccounts.length
    );


    setAdminText(
        'report-admin-deposits',
        `৳${formatAdminMoney(
            deposits
        )}`
    );


    setAdminText(
        'report-admin-loans',
        adminLoans.length
    );


    setAdminText(
        'report-admin-principal',
        `৳${formatAdminMoney(
            principal
        )}`
    );


    setAdminText(
        'report-admin-outstanding',
        `৳${formatAdminMoney(
            outstanding
        )}`
    );


    setAdminText(
        'report-admin-transactions',
        adminTransactions.length
    );
}


// ============================================================
// CUSTOMER LOOKUP
// ============================================================

function getAdminCustomer(
    customerId
) {

    return adminCustomers.find(
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
// BRANCH LOOKUP
// ============================================================

function getAdminBranchName(
    branchId
) {

    const branch =
        adminBranches.find(
            item =>
                Number(
                    item.branch_id
                )
                ===
                Number(
                    branchId
                )
        );


    return branch
        ?
        branch.branch_name
        :
        `Branch #${branchId ?? '-'}`;
}


// ============================================================
// ACCOUNT TYPE
// ============================================================

function getAdminAccountType(
    typeId
) {

    const map = {

        1:
            'Savings',

        2:
            'Current',

        3:
            'Student',

        4:
            'Business'
    };


    return (
        map[
            Number(
                typeId
            )
        ]
        ||
        `Type ${typeId ?? '-'}`
    );
}


// ============================================================
// TRANSACTION TYPE
// ============================================================

function getAdminTransactionType(
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


    const map = {

        1:
            'Deposit',

        2:
            'Withdrawal',

        3:
            'Transfer',

        4:
            'Bill Payment',

        5:
            'Loan Disbursement',

        6:
            'Loan Payment'
    };


    return (
        map[
            Number(
                transaction.transaction_type_id
            )
        ]
        ||
        `Type ${transaction.transaction_type_id ?? '-'}`
    );
}


// ============================================================
// INPUT VALUE
// ============================================================

function valueOf(
    id
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        return '';
    }


    return String(
        element.value
        ??
        ''
    ).trim();
}


// ============================================================
// NUMBER VALUE
// ============================================================

function numberOf(
    id
) {

    return Number(
        valueOf(
            id
        )
    );
}


// ============================================================
// LOWER VALUE
// ============================================================

function lowerValue(
    id
) {

    return valueOf(
        id
    ).toLowerCase();
}


// ============================================================
// SET INPUT VALUE
// ============================================================

function setInputValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.value =
            value
            ??
            '';
    }
}


// ============================================================
// SET TEXT
// ============================================================

function setAdminText(
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
// MONEY
// ============================================================

function formatAdminMoney(
    value
) {

    return Number(
        value
        ||
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


// ============================================================
// DATE + TIME
// ============================================================

function formatAdminDateTime(
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
// ESCAPE HTML
// ============================================================

function escapeAdmin(
    value
) {

    const div =
        document.createElement(
            'div'
        );


    div.textContent =
        value
        ??
        '';


    return div.innerHTML;
}


// ============================================================
// STATUS CLASS
// ============================================================

function adminStatusClass(
    status
) {

    return String(
        status
        ||
        ''
    )
        .toLowerCase()
        .replace(
            /\s+/g,
            '_'
        );
}


// ============================================================
// STATUS BADGE
// ============================================================

function adminStatusBadge(
    status
) {

    return `

        <span
            class="admin-status ${adminStatusClass(
                status
            )}"
        >

            ${escapeAdmin(
                status
                ||
                '-'
            )}

        </span>
    `;
}


// ============================================================
// COUNT STATUS
// ============================================================

function countAdminStatus(
    records,
    status
) {

    return records.filter(
        record =>
            String(
                record.status
                ||
                ''
            )
                .toUpperCase()
            ===
            status
    ).length;
}


// ============================================================
// CLICK BINDER
// ============================================================

function bindAdminClick(
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
// INPUT BINDER
// ============================================================

function bindInput(
    id,
    callback
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.addEventListener(
            'input',
            callback
        );
    }
}


// ============================================================
// CHANGE BINDER
// ============================================================

function bindChange(
    id,
    callback
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.addEventListener(
            'change',
            callback
        );
    }
}


// ============================================================
// TABLE MESSAGE
// ============================================================

function setAdminTableMessage(
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
                class="admin-message-row"
            >

                ${escapeAdmin(
                    message
                )}

            </td>

        </tr>
    `;
}


// ============================================================
// TABLE ERROR
// ============================================================

function showAdminTableError(
    body,
    colspan,
    message
) {

    setAdminTableMessage(
        body,
        colspan,
        `Error: ${message}`
    );
}


// ============================================================
// API ERROR
// ============================================================

function adminApiError(
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
            .join(
                '\n'
            );
    }


    if (
        result?.detail
    ) {

        return result.detail;
    }


    return fallback;
}