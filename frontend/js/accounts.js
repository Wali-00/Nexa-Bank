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


            return date.toLocaleDateString(
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
        // ACCOUNT TYPE NAME
        // ==========================================

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
                `Type ${accountTypeId}`
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
        // LOAD ACCOUNTS
        // ==========================================

        async function loadAccounts() {

            const container =
                document.getElementById(
                    'accounts-container'
                );


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
                        'Failed to load accounts.'
                    );
                }


                // ----------------------------------
                // Current customer accounts
                // ----------------------------------

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


                console.log(
                    'MY ACCOUNTS:',
                    customerAccounts
                );


                // ----------------------------------
                // Calculate summary
                // ----------------------------------

                let totalBalance = 0;

                let totalAvailableBalance = 0;


                customerAccounts.forEach(
                    account => {

                        totalBalance +=
                            Number(
                                account.balance || 0
                            );


                        totalAvailableBalance +=
                            Number(
                                account.available_balance || 0
                            );
                    }
                );


                // ----------------------------------
                // Total accounts
                // ----------------------------------

                const totalAccountsElement =
                    document.getElementById(
                        'total-accounts'
                    );


                if (totalAccountsElement) {

                    totalAccountsElement.textContent =
                        customerAccounts.length;
                }


                // ----------------------------------
                // Total balance
                // ----------------------------------

                const totalBalanceElement =
                    document.getElementById(
                        'accounts-total-balance'
                    );


                if (totalBalanceElement) {

                    totalBalanceElement.textContent =
                        formatMoney(
                            totalBalance
                        );
                }


                // ----------------------------------
                // Available balance
                // ----------------------------------

                const availableBalanceElement =
                    document.getElementById(
                        'accounts-available-balance'
                    );


                if (
                    availableBalanceElement
                ) {

                    availableBalanceElement.textContent =
                        formatMoney(
                            totalAvailableBalance
                        );
                }


                // ----------------------------------
                // No accounts
                // ----------------------------------

                if (
                    customerAccounts.length === 0
                ) {

                    container.innerHTML = `

                        <div class="info-item">

                            <span class="info-value">
                                No bank accounts found.
                            </span>

                        </div>

                    `;

                    return;
                }


                // ----------------------------------
                // Render accounts
                // ----------------------------------

                container.innerHTML = '';


                customerAccounts.forEach(
                    account => {

                        const card =
                            document.createElement(
                                'div'
                            );


                        card.className =
                            'account-detail-card';


                        card.innerHTML = `

                            <div class="section-header">

                                <div>

                                    <h3>
                                        ${escapeHtml(
                            getAccountTypeName(
                                account.account_type_id
                            )
                        )}
                                    </h3>

                                    <p>
                                        ${escapeHtml(
                            account.account_number
                        )}
                                    </p>

                                </div>


                                <span
                                    class="account-status-badge ${escapeHtml(
                            String(
                                account.status || ''
                            ).toLowerCase()
                        )}"
                                >
                                    ${escapeHtml(
                            account.status
                        )}
                                </span>

                            </div>


                            <div class="customer-grid">


                                <div class="info-item">

                                    <span class="info-label">
                                        Account ID
                                    </span>

                                    <span class="info-value">
                                        ${escapeHtml(
                            account.account_id
                        )}
                                    </span>

                                </div>


                                <div class="info-item">

                                    <span class="info-label">
                                        Account Type
                                    </span>

                                    <span class="info-value">
                                        ${escapeHtml(
                            getAccountTypeName(
                                account.account_type_id
                            )
                        )}
                                    </span>

                                </div>


                                <div class="info-item">

                                    <span class="info-label">
                                        Branch ID
                                    </span>

                                    <span class="info-value">
                                        ${escapeHtml(
                            account.branch_id
                        )}
                                    </span>

                                </div>


                                <div class="info-item">

                                    <span class="info-label">
                                        Opened Date
                                    </span>

                                    <span class="info-value">
                                        ${escapeHtml(
                            formatDate(
                                account.opened_date
                            )
                        )}
                                    </span>

                                </div>


                                <div class="info-item">

                                    <span class="info-label">
                                        Balance
                                    </span>

                                    <span class="info-value">
                                        ৳${formatMoney(
                            account.balance
                        )}
                                    </span>

                                </div>


                                <div class="info-item">

                                    <span class="info-label">
                                        Available Balance
                                    </span>

                                    <span class="info-value">
                                        ৳${formatMoney(
                            account.available_balance
                        )}
                                    </span>

                                </div>


                            </div>

                        `;


                        container.appendChild(
                            card
                        );
                    }
                );

            }

            catch (error) {

                console.error(
                    'ACCOUNT LOAD ERROR:',
                    error
                );


                if (container) {

                    container.innerHTML = `

                        <p>
                            Unable to load accounts.
                        </p>

                    `;
                }
            }
        }


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

        loadAccounts();

    }
);