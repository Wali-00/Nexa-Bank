document.addEventListener(
    'DOMContentLoaded',
    () => {

        const API_BASE =
            'http://127.0.0.1:8000';


        // ====================================================
        // LOGIN DATA
        // ====================================================

        const customerId =
            localStorage.getItem(
                'customer_id'
            );


        const userId =
            localStorage.getItem(
                'user_id'
            );


        const role =
            localStorage.getItem(
                'role'
            );


        // ====================================================
        // AUTH CHECK
        // ====================================================

        if (
            !customerId ||
            !userId ||
            role !== 'customer'
        ) {

            clearSession();

            alert(
                'Please login as a customer first.'
            );

            window.location.href =
                'login.html';

            return;
        }


        // ====================================================
        // DATA
        // ====================================================

        let customerAccounts = [];

        let dashboardLoading = false;

        let logoutInProgress = false;


        // ====================================================
        // HELPERS
        // ====================================================

        function clearSession() {

            localStorage.removeItem(
                'customer_id'
            );

            localStorage.removeItem(
                'user_id'
            );

            localStorage.removeItem(
                'role'
            );
        }


        function formatMoney(value) {

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


        function formatDate(value) {

            if (!value) {

                return '-';
            }


            const date =
                new Date(value);


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


        function formatDateTime(value) {

            if (!value) {

                return '-';
            }


            const date =
                new Date(value);


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


        function escapeHtml(value) {

            const div =
                document.createElement(
                    'div'
                );


            div.textContent =
                value ?? '';


            return div.innerHTML;
        }


        // ====================================================
        // SAFE TEXT SETTER
        // ====================================================

        function setText(
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


        // ====================================================
        // SAFE STATUS SETTER
        // ====================================================

        function setStatus(
            elementId,
            status,
            baseClass
        ) {

            const element =
                document.getElementById(
                    elementId
                );


            if (!element) {

                return;
            }


            const safeStatus =
                String(
                    status || ''
                )
                    .trim()
                    .toLowerCase()
                    .replace(
                        /\s+/g,
                        '-'
                    )
                    .replace(
                        /_/g,
                        '-'
                    );


            element.textContent =
                status || '-';


            element.className =
                `${baseClass} ${safeStatus}`;
        }


        // ====================================================
        // TABLE MESSAGE
        // ====================================================

        function setTransactionTableMessage(
            message,
            type = 'normal'
        ) {

            const tableBody =
                document.getElementById(
                    'recent-transactions-body'
                );


            if (!tableBody) {

                return;
            }


            let messageClass =
                'dashboard-table-message';


            if (
                type === 'error'
            ) {

                messageClass +=
                    ' error';
            }


            if (
                type === 'loading'
            ) {

                messageClass +=
                    ' loading';
            }


            if (
                type === 'empty'
            ) {

                messageClass +=
                    ' empty';
            }


            tableBody.innerHTML = `

                <tr>

                    <td
                        colspan="6"
                        class="${messageClass}"
                    >
                        ${escapeHtml(
                            message
                        )}
                    </td>

                </tr>
            `;
        }


        // ====================================================
        // ACCOUNT TYPE
        // ====================================================

        function getAccountTypeName(
            accountTypeId
        ) {

            const types = {

                1: 'Savings',

                2: 'Current',

                3: 'Student',

                4: 'Business'

            };


            return (
                types[
                    Number(
                        accountTypeId
                    )
                ]
                ||
                `Type ${accountTypeId}`
            );
        }


        // ====================================================
        // TRANSACTION TYPE
        // ====================================================

        function getTransactionTypeName(
            transactionTypeId
        ) {

            const types = {

                1: 'Deposit',

                2: 'Withdrawal',

                3: 'Transfer',

                4: 'Bill Payment',

                5: 'Loan Disbursement',

                6: 'Loan Payment',

                7: 'Card Payment'

            };


            return (
                types[
                    Number(
                        transactionTypeId
                    )
                ]
                ||
                'Transaction'
            );
        }


        // ====================================================
        // RESET ACCOUNT DISPLAY
        // ====================================================

        function showNoAccountState() {

            setText(
                'total-balance',
                '0.00'
            );


            setText(
                'account-number',
                'No account'
            );


            setText(
                'welcome-account-number',
                'No account'
            );


            setText(
                'overview-account-number',
                'No account'
            );


            setText(
                'overview-account-type',
                '-'
            );


            setText(
                'overview-balance',
                '৳0.00'
            );


            setText(
                'overview-available-balance',
                '৳0.00'
            );


            setStatus(
                'overview-account-status',
                'NO ACCOUNT',
                'dashboard-status'
            );


            setText(
                'overview-opened-date',
                '-'
            );
        }


        // ====================================================
        // ACCOUNT LOAD ERROR STATE
        // ====================================================

        function showAccountErrorState() {

            setText(
                'total-balance',
                '-'
            );


            setText(
                'account-number',
                'Unavailable'
            );


            setText(
                'welcome-account-number',
                'Unavailable'
            );


            setText(
                'overview-account-number',
                'Unavailable'
            );


            setText(
                'overview-account-type',
                '-'
            );


            setText(
                'overview-balance',
                '-'
            );


            setText(
                'overview-available-balance',
                '-'
            );


            setStatus(
                'overview-account-status',
                'UNAVAILABLE',
                'dashboard-status'
            );


            setText(
                'overview-opened-date',
                '-'
            );
        }


        // ====================================================
        // LOAD CUSTOMER
        // ====================================================

        async function loadCustomer() {

            try {

                const response =
                    await fetch(
                        `${API_BASE}/customers/${customerId}`
                    );


                const customer =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        customer.detail ||
                        'Unable to load customer.'
                    );
                }


                const fullName =
                    `${customer.first_name || ''} ${customer.last_name || ''}`
                        .trim();


                setText(
                    'topbar-name',
                    fullName ||
                    'Customer'
                );


                setText(
                    'welcome-name',
                    customer.first_name ||
                    'Customer'
                );


                setText(
                    'customer-id',
                    customer.customer_id
                );


                setStatus(
                    'customer-status',
                    customer.status,
                    'dashboard-status'
                );

            }

            catch (error) {

                console.error(
                    'CUSTOMER LOAD ERROR:',
                    error
                );


                setText(
                    'topbar-name',
                    'Customer'
                );


                setText(
                    'welcome-name',
                    'Customer'
                );


                setText(
                    'customer-id',
                    customerId
                );


                setStatus(
                    'customer-status',
                    'UNAVAILABLE',
                    'dashboard-status'
                );
            }
        }


        // ====================================================
        // LOAD ACCOUNTS
        // ====================================================

        async function loadAccounts() {

            try {

                const response =
                    await fetch(
                        `${API_BASE}/accounts/`
                    );


                const accounts =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        accounts.detail ||
                        'Unable to load accounts.'
                    );
                }


                customerAccounts =
                    (
                        Array.isArray(accounts)
                            ?
                            accounts
                            :
                            []
                    ).filter(
                        account =>
                            String(
                                account.customer_id
                            )
                            ===
                            String(
                                customerId
                            )
                    );


                // --------------------------------------------
                // TOTAL AVAILABLE BALANCE
                // --------------------------------------------

                let totalBalance =
                    0;


                customerAccounts.forEach(
                    account => {

                        totalBalance +=
                            Number(
                                account.available_balance ||
                                0
                            );
                    }
                );


                setText(
                    'total-balance',
                    formatMoney(
                        totalBalance
                    )
                );


                // --------------------------------------------
                // NO ACCOUNT
                // --------------------------------------------

                if (
                    customerAccounts.length ===
                    0
                ) {

                    showNoAccountState();

                    return;
                }


                // --------------------------------------------
                // PRIMARY ACCOUNT
                //
                // Preserve existing behavior:
                // first matching account is primary.
                // --------------------------------------------

                const account =
                    customerAccounts[0];


                setText(
                    'account-number',
                    account.account_number
                );


                setText(
                    'welcome-account-number',
                    account.account_number
                );


                setText(
                    'overview-account-number',
                    account.account_number
                );


                setText(
                    'overview-account-type',
                    getAccountTypeName(
                        account.account_type_id
                    )
                );


                setText(
                    'overview-balance',
                    `৳${formatMoney(
                        account.balance
                    )}`
                );


                setText(
                    'overview-available-balance',
                    `৳${formatMoney(
                        account.available_balance
                    )}`
                );


                setStatus(
                    'overview-account-status',
                    account.status,
                    'dashboard-status'
                );


                setText(
                    'overview-opened-date',
                    formatDate(
                        account.opened_date
                    )
                );

            }

            catch (error) {

                console.error(
                    'ACCOUNT LOAD ERROR:',
                    error
                );


                customerAccounts =
                    [];


                showAccountErrorState();
            }
        }


        // ====================================================
        // LOAD RECENT TRANSACTIONS
        // ====================================================

        async function loadRecentTransactions() {

            const tableBody =
                document.getElementById(
                    'recent-transactions-body'
                );


            if (!tableBody) {

                return;
            }


            // --------------------------------------------
            // LOADING STATE
            // --------------------------------------------

            setTransactionTableMessage(
                'Loading recent transactions...',
                'loading'
            );


            try {

                // ----------------------------------------
                // Ensure account data exists
                // ----------------------------------------

                if (
                    customerAccounts.length ===
                    0
                ) {

                    setTransactionTableMessage(
                        'No account transactions available.',
                        'empty'
                    );

                    return;
                }


                const accountIds =
                    customerAccounts.map(
                        account =>
                            Number(
                                account.account_id
                            )
                    );


                // ----------------------------------------
                // TRANSACTION ENTRIES
                // ----------------------------------------

                const entryResponse =
                    await fetch(
                        `${API_BASE}/transaction-entries/`
                    );


                const entries =
                    await entryResponse.json();


                if (!entryResponse.ok) {

                    throw new Error(
                        entries.detail ||
                        'Unable to load transaction entries.'
                    );
                }


                const customerEntries =
                    (
                        Array.isArray(entries)
                            ?
                            entries
                            :
                            []
                    ).filter(
                        entry =>
                            accountIds.includes(
                                Number(
                                    entry.account_id
                                )
                            )
                    );


                // ----------------------------------------
                // TRANSACTIONS
                // ----------------------------------------

                const transactionResponse =
                    await fetch(
                        `${API_BASE}/transactions/`
                    );


                const transactions =
                    await transactionResponse.json();


                if (!transactionResponse.ok) {

                    throw new Error(
                        transactions.detail ||
                        'Unable to load transactions.'
                    );
                }


                // ----------------------------------------
                // JOIN
                //
                // Existing transaction logic preserved.
                // ----------------------------------------

                const rows = [];


                customerEntries.forEach(
                    entry => {

                        const transaction =
                            (
                                Array.isArray(
                                    transactions
                                )
                                    ?
                                    transactions
                                    :
                                    []
                            ).find(
                                item =>
                                    Number(
                                        item.transaction_id
                                    )
                                    ===
                                    Number(
                                        entry.transaction_id
                                    )
                            );


                        if (transaction) {

                            rows.push({

                                ...transaction,

                                entry_type:
                                    entry.entry_type,

                                entry_amount:
                                    entry.amount,

                                account_id:
                                    entry.account_id

                            });
                        }
                    }
                );


                // ----------------------------------------
                // NEWEST FIRST
                // ----------------------------------------

                rows.sort(
                    (a, b) =>
                        Number(
                            b.transaction_id
                        )
                        -
                        Number(
                            a.transaction_id
                        )
                );


                // ----------------------------------------
                // RECENT FIVE
                // ----------------------------------------

                const recent =
                    rows.slice(
                        0,
                        5
                    );


                // ----------------------------------------
                // EMPTY STATE
                // ----------------------------------------

                if (
                    recent.length ===
                    0
                ) {

                    setTransactionTableMessage(
                        'No transactions yet.',
                        'empty'
                    );

                    return;
                }


                // ----------------------------------------
                // RENDER
                // ----------------------------------------

                tableBody.innerHTML =
                    '';


                recent.forEach(
                    transaction => {

                        const row =
                            document.createElement(
                                'tr'
                            );


                        const entryClass =
                            String(
                                transaction.entry_type ||
                                ''
                            )
                                .trim()
                                .toLowerCase();


                        const transactionStatusClass =
                            String(
                                transaction.status ||
                                ''
                            )
                                .trim()
                                .toLowerCase()
                                .replace(
                                    /\s+/g,
                                    '-'
                                )
                                .replace(
                                    /_/g,
                                    '-'
                                );


                        const isCredit =
                            String(
                                transaction.entry_type ||
                                ''
                            ).toUpperCase()
                            ===
                            'CREDIT';


                        row.innerHTML = `

                            <td>

                                ${escapeHtml(
                                    formatDateTime(
                                        transaction.transaction_date
                                    )
                                )}

                            </td>


                            <td class="transaction-reference">

                                ${escapeHtml(
                                    transaction.reference_no ||
                                    '-'
                                )}

                            </td>


                            <td>

                                ${escapeHtml(
                                    getTransactionTypeName(
                                        transaction.transaction_type_id
                                    )
                                )}

                            </td>


                            <td>

                                <span
                                    class="entry-badge ${escapeHtml(
                                        entryClass
                                    )}"
                                >

                                    ${escapeHtml(
                                        transaction.entry_type ||
                                        '-'
                                    )}

                                </span>

                            </td>


                            <td
                                class="transaction-amount ${escapeHtml(
                                    entryClass
                                )}"
                            >

                                ${
                                    isCredit
                                        ?
                                        '+'
                                        :
                                        '-'
                                }

                                ৳${formatMoney(
                                    transaction.entry_amount
                                )}

                            </td>


                            <td>

                                <span
                                    class="transaction-status ${escapeHtml(
                                        transactionStatusClass
                                    )}"
                                >

                                    ${escapeHtml(
                                        transaction.status ||
                                        '-'
                                    )}

                                </span>

                            </td>
                        `;


                        tableBody.appendChild(
                            row
                        );
                    }
                );

            }

            catch (error) {

                console.error(
                    'RECENT TRANSACTION ERROR:',
                    error
                );


                setTransactionTableMessage(
                    'Unable to load transactions.',
                    'error'
                );
            }
        }


        // ====================================================
        // LOGOUT
        // ====================================================

        const logoutButton =
            document.getElementById(
                'logoutBtn'
            );


        if (logoutButton) {

            logoutButton.addEventListener(
                'click',
                event => {

                    event.preventDefault();


                    // Prevent accidental double click
                    if (logoutInProgress) {

                        return;
                    }


                    logoutInProgress =
                        true;


                    logoutButton.disabled =
                        true;


                    clearSession();


                    window.location.href =
                        'login.html';
                }
            );
        }


        // ====================================================
        // INITIALIZE
        // ====================================================

        async function initializeDashboard() {

            if (dashboardLoading) {

                return;
            }


            dashboardLoading =
                true;


            try {

                // --------------------------------------------
                // Preserve existing load order
                // --------------------------------------------

                await loadCustomer();

                await loadAccounts();

                await loadRecentTransactions();

            }

            finally {

                dashboardLoading =
                    false;
            }
        }


        initializeDashboard();

    }
);