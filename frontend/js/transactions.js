document.addEventListener(
    'DOMContentLoaded',
    () => {

        // ==========================================
        // API
        // ==========================================

        const API_BASE =
            'http://127.0.0.1:8000';


        // ==========================================
        // LOGIN DATA
        // ==========================================

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


        // ==========================================
        // AUTH CHECK
        // ==========================================

        if (
            !customerId ||
            !userId ||
            role !== 'customer'
        ) {

            localStorage.removeItem(
                'customer_id'
            );

            localStorage.removeItem(
                'user_id'
            );

            localStorage.removeItem(
                'role'
            );


            alert(
                'Please login as a customer first.'
            );


            window.location.href =
                'login.html';


            return;
        }


        // ==========================================
        // LOCAL DATA
        // ==========================================

        let allCustomerTransactions = [];


        // ==========================================
        // FORMAT MONEY
        // ==========================================

        function formatMoney(value) {

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


        // ==========================================
        // FORMAT DATE
        // ==========================================

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


            return date.toLocaleString(
                'en-BD'
            );
        }


        // ==========================================
        // SAFE HTML
        // ==========================================

        function escapeHtml(value) {

            const div =
                document.createElement(
                    'div'
                );

            div.textContent =
                value ?? '';

            return div.innerHTML;
        }


        // ==========================================
        // TRANSACTION TYPE
        // ==========================================

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


        // ==========================================
        // LOAD CUSTOMER NAME
        // ==========================================

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
                        'Failed to load customer.'
                    );
                }


                const topbarName =
                    document.getElementById(
                        'topbar-name'
                    );


                if (topbarName) {

                    topbarName.textContent =
                        `${customer.first_name} ${customer.last_name}`;
                }

            }

            catch (error) {

                console.error(
                    'CUSTOMER LOAD ERROR:',
                    error
                );
            }
        }


        // ==========================================
        // LOAD TRANSACTIONS
        // ==========================================

        async function loadTransactions() {

            const tableBody =
                document.getElementById(
                    'transactions-body'
                );


            try {

                // ----------------------------------
                // 1. Accounts
                // ----------------------------------

                const accountResponse =
                    await fetch(
                        `${API_BASE}/accounts/`
                    );


                const accounts =
                    await accountResponse.json();


                if (!accountResponse.ok) {

                    throw new Error(
                        accounts.detail ||
                        'Failed to load accounts.'
                    );
                }


                const customerAccounts =
                    accounts.filter(
                        account =>
                            String(
                                account.customer_id
                            )
                            ===
                            String(
                                customerId
                            )
                    );


                const customerAccountIds =
                    customerAccounts.map(
                        account =>
                            Number(
                                account.account_id
                            )
                    );


                const accountMap = {};


                customerAccounts.forEach(
                    account => {

                        accountMap[
                            Number(account.account_id)
                        ] =
                            account.account_number;
                    }
                );


                if (
                    customerAccountIds.length === 0
                ) {

                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="9">
                                No accounts found.
                            </td>
                        </tr>
                    `;


                    updateSummary([]);

                    return;
                }


                // ----------------------------------
                // 2. Entries
                // ----------------------------------

                const entryResponse =
                    await fetch(
                        `${API_BASE}/transaction-entries/`
                    );


                const entries =
                    await entryResponse.json();


                if (!entryResponse.ok) {

                    throw new Error(
                        entries.detail ||
                        'Failed to load transaction entries.'
                    );
                }


                const customerEntries =
                    entries.filter(
                        entry =>
                            customerAccountIds.includes(
                                Number(
                                    entry.account_id
                                )
                            )
                    );


                // ----------------------------------
                // 3. Transactions
                // ----------------------------------

                const transactionResponse =
                    await fetch(
                        `${API_BASE}/transactions/`
                    );


                const transactions =
                    await transactionResponse.json();


                if (!transactionResponse.ok) {

                    throw new Error(
                        transactions.detail ||
                        'Failed to load transactions.'
                    );
                }


                // ----------------------------------
                // 4. Join
                // ----------------------------------

                allCustomerTransactions = [];


                customerEntries.forEach(
                    entry => {

                        const transaction =
                            transactions.find(
                                txn =>
                                    Number(
                                        txn.transaction_id
                                    )
                                    ===
                                    Number(
                                        entry.transaction_id
                                    )
                            );


                        if (transaction) {

                            allCustomerTransactions.push({

                                transaction_id:
                                    transaction.transaction_id,

                                transaction_type_id:
                                    transaction.transaction_type_id,

                                reference_no:
                                    transaction.reference_no,

                                initiated_by_user_id:
                                    transaction.initiated_by_user_id,

                                transaction_date:
                                    transaction.transaction_date,

                                status:
                                    transaction.status,

                                fee:
                                    transaction.fee,

                                description:
                                    transaction.description,

                                account_id:
                                    entry.account_id,

                                account_number:
                                    accountMap[
                                    Number(
                                        entry.account_id
                                    )
                                    ]
                                    ||
                                    entry.account_id,

                                entry_type:
                                    entry.entry_type,

                                amount:
                                    entry.amount
                            });
                        }
                    }
                );


                // ----------------------------------
                // Newest first
                // ----------------------------------

                allCustomerTransactions.sort(
                    (a, b) =>
                        Number(
                            b.transaction_id
                        )
                        -
                        Number(
                            a.transaction_id
                        )
                );


                updateSummary(
                    allCustomerTransactions
                );


                applyFilters();

            }

            catch (error) {

                console.error(
                    'TRANSACTION LOAD ERROR:',
                    error
                );


                tableBody.innerHTML = `
                    <tr>
                        <td colspan="9">
                            Unable to load transactions.
                        </td>
                    </tr>
                `;
            }
        }


        // ==========================================
        // UPDATE SUMMARY
        // ==========================================

        function updateSummary(transactions) {

            let totalCredit = 0;

            let totalDebit = 0;


            transactions.forEach(
                transaction => {

                    if (
                        transaction.entry_type
                        ===
                        'CREDIT'
                    ) {

                        totalCredit +=
                            Number(
                                transaction.amount || 0
                            );
                    }


                    if (
                        transaction.entry_type
                        ===
                        'DEBIT'
                    ) {

                        totalDebit +=
                            Number(
                                transaction.amount || 0
                            );
                    }
                }
            );


            const totalTransactionsElement =
                document.getElementById(
                    'total-transactions'
                );


            if (totalTransactionsElement) {

                totalTransactionsElement.textContent =
                    transactions.length;
            }


            const totalCreditElement =
                document.getElementById(
                    'total-credit'
                );


            if (totalCreditElement) {

                totalCreditElement.textContent =
                    formatMoney(
                        totalCredit
                    );
            }


            const totalDebitElement =
                document.getElementById(
                    'total-debit'
                );


            if (totalDebitElement) {

                totalDebitElement.textContent =
                    formatMoney(
                        totalDebit
                    );
            }
        }


        // ==========================================
        // FILTERS
        // ==========================================

        function applyFilters() {

            const searchValue =
                document.getElementById(
                    'search-reference'
                ).value
                    .trim()
                    .toLowerCase();


            const entryFilter =
                document.getElementById(
                    'entry-filter'
                ).value;


            const typeFilter =
                document.getElementById(
                    'type-filter'
                ).value;


            const statusFilter =
                document.getElementById(
                    'status-filter'
                ).value;


            const filtered =
                allCustomerTransactions.filter(
                    transaction => {

                        const referenceMatches =
                            !searchValue
                            ||
                            String(
                                transaction.reference_no ||
                                ''
                            )
                                .toLowerCase()
                                .includes(
                                    searchValue
                                );


                        const entryMatches =
                            entryFilter === 'ALL'
                            ||
                            transaction.entry_type
                            ===
                            entryFilter;


                        const typeMatches =
                            typeFilter === 'ALL'
                            ||
                            String(
                                transaction.transaction_type_id
                            )
                            ===
                            String(
                                typeFilter
                            );


                        const statusMatches =
                            statusFilter === 'ALL'
                            ||
                            transaction.status
                            ===
                            statusFilter;


                        return (
                            referenceMatches
                            &&
                            entryMatches
                            &&
                            typeMatches
                            &&
                            statusMatches
                        );
                    }
                );


            renderTransactions(
                filtered
            );
        }


        // ==========================================
        // RENDER
        // ==========================================

        function renderTransactions(
            transactions
        ) {

            const tableBody =
                document.getElementById(
                    'transactions-body'
                );


            if (
                transactions.length === 0
            ) {

                tableBody.innerHTML = `
                    <tr>
                        <td colspan="9">
                            No matching transactions found.
                        </td>
                    </tr>
                `;

                return;
            }


            tableBody.innerHTML = '';


            transactions.forEach(
                transaction => {

                    const row =
                        document.createElement(
                            'tr'
                        );


                    const entryClass =
                        String(
                            transaction.entry_type ||
                            ''
                        ).toLowerCase();


                    row.innerHTML = `

                        <td>
                            ${escapeHtml(
                        formatDate(
                            transaction.transaction_date
                        )
                    )}
                        </td>


                        <td>
                            ${escapeHtml(
                        transaction.reference_no
                    )}
                        </td>


                        <td>
                            ${escapeHtml(
                        transaction.account_number
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
                        transaction.entry_type
                    )}
                            </span>

                        </td>


                        <td>
                            ৳${formatMoney(
                        transaction.amount
                    )}
                        </td>


                        <td>
                            ৳${formatMoney(
                        transaction.fee
                    )}
                        </td>


                        <td>
                            ${escapeHtml(
                        transaction.status
                    )}
                        </td>


                        <td>
                            ${escapeHtml(
                        transaction.description ||
                        '-'
                    )}
                        </td>

                    `;


                    tableBody.appendChild(
                        row
                    );
                }
            );
        }


        // ==========================================
        // FILTER EVENTS
        // ==========================================

        const searchInput =
            document.getElementById(
                'search-reference'
            );


        const entryFilter =
            document.getElementById(
                'entry-filter'
            );


        const typeFilter =
            document.getElementById(
                'type-filter'
            );


        const statusFilter =
            document.getElementById(
                'status-filter'
            );


        searchInput.addEventListener(
            'input',
            applyFilters
        );


        entryFilter.addEventListener(
            'change',
            applyFilters
        );


        typeFilter.addEventListener(
            'change',
            applyFilters
        );


        statusFilter.addEventListener(
            'change',
            applyFilters
        );


        // ==========================================
        // LOGOUT
        // ==========================================

        const logoutButton =
            document.getElementById(
                'logoutBtn'
            );


        if (logoutButton) {

            logoutButton.addEventListener(
                'click',
                event => {

                    event.preventDefault();


                    localStorage.removeItem(
                        'customer_id'
                    );

                    localStorage.removeItem(
                        'user_id'
                    );

                    localStorage.removeItem(
                        'role'
                    );


                    window.location.href =
                        'login.html';
                }
            );
        }


        // ==========================================
        // INITIAL LOAD
        // ==========================================

        loadCustomer();

        loadTransactions();

    }
);