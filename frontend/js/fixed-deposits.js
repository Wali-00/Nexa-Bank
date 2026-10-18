document.addEventListener(
    'DOMContentLoaded',
    () => {

        const API_BASE =
            'http://127.0.0.1:8000';


        // ==========================================
        // LOGIN
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
        // DATA
        // ==========================================

        let customerAccounts = [];

        let customerFixedDeposits = [];


        // ==========================================
        // HELPERS
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
        // LOAD CUSTOMER
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

            const select =
                document.getElementById(
                    'fd-account'
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


                customerAccounts =
                    accounts.filter(
                        account =>
                            String(
                                account.customer_id
                            )
                            ===
                            String(
                                customerId
                            )
                            &&
                            String(
                                account.status
                            ).toUpperCase()
                            ===
                            'ACTIVE'
                    );


                select.innerHTML = `
                    <option value="">
                        Select account
                    </option>
                `;


                customerAccounts.forEach(
                    account => {

                        const option =
                            document.createElement(
                                'option'
                            );


                        option.value =
                            account.account_id;


                        option.textContent =
                            `${account.account_number} — ৳${formatMoney(
                                account.available_balance
                            )}`;


                        select.appendChild(
                            option
                        );
                    }
                );


                if (
                    customerAccounts.length === 0
                ) {

                    select.innerHTML = `
                        <option value="">
                            No active accounts available
                        </option>
                    `;


                    document.getElementById(
                        'create-fd-btn'
                    ).disabled =
                        true;
                }

            }

            catch (error) {

                console.error(
                    'ACCOUNT LOAD ERROR:',
                    error
                );
            }
        }


        // ==========================================
        // UPDATE ACCOUNT BALANCE
        // ==========================================

        function updateAccountBalance() {

            const accountId =
                Number(
                    document.getElementById(
                        'fd-account'
                    ).value
                );


            const account =
                customerAccounts.find(
                    item =>
                        Number(
                            item.account_id
                        )
                        ===
                        accountId
                );


            document.getElementById(
                'fd-account-balance'
            ).textContent =
                account
                    ?
                    `৳${formatMoney(
                        account.available_balance
                    )}`
                    :
                    '৳0.00';
        }


        // ==========================================
        // FD PREVIEW
        // ==========================================

        function updatePreview() {

            const principal =
                Number(
                    document.getElementById(
                        'fd-principal'
                    ).value
                );


            const rate =
                Number(
                    document.getElementById(
                        'fd-interest-rate'
                    ).value
                );


            const startDateValue =
                document.getElementById(
                    'fd-start-date'
                ).value;


            const maturityDateValue =
                document.getElementById(
                    'fd-maturity-date'
                ).value;


            const preview =
                document.getElementById(
                    'fd-preview'
                );


            if (
                !principal ||
                principal <= 0 ||
                !Number.isFinite(rate) ||
                !startDateValue ||
                !maturityDateValue
            ) {

                preview.style.display =
                    'none';

                return;
            }


            const startDate =
                new Date(
                    `${startDateValue}T00:00:00`
                );


            const maturityDate =
                new Date(
                    `${maturityDateValue}T00:00:00`
                );


            const milliseconds =
                maturityDate -
                startDate;


            const days =
                Math.floor(
                    milliseconds /
                    (
                        1000 *
                        60 *
                        60 *
                        24
                    )
                );


            if (days <= 0) {

                preview.style.display =
                    'none';

                return;
            }


            // Same simple-interest idea
            // used by the backend.
            const years =
                days / 365;


            const estimatedInterest =
                principal *
                (rate / 100) *
                years;


            const estimatedMaturity =
                principal +
                estimatedInterest;


            document.getElementById(
                'preview-principal'
            ).textContent =
                `৳${formatMoney(
                    principal
                )}`;


            document.getElementById(
                'preview-rate'
            ).textContent =
                `${rate}%`;


            document.getElementById(
                'preview-term'
            ).textContent =
                `${days} days`;


            document.getElementById(
                'preview-maturity'
            ).textContent =
                `৳${formatMoney(
                    estimatedMaturity
                )}`;


            preview.style.display =
                'block';
        }


        // ==========================================
        // SHOW RECEIPT
        // ==========================================

        function showReceipt(result) {

            document.getElementById(
                'receipt-fd-id'
            ).textContent =
                result.fd_id;


            document.getElementById(
                'receipt-fd-principal'
            ).textContent =
                `৳${formatMoney(
                    result.principal_amount
                )}`;


            document.getElementById(
                'receipt-fd-maturity'
            ).textContent =
                `৳${formatMoney(
                    result.maturity_amount
                )}`;


            document.getElementById(
                'receipt-fd-status'
            ).textContent =
                result.status;


            const card =
                document.getElementById(
                    'fd-receipt-card'
                );


            card.style.display =
                'block';


            card.scrollIntoView({

                behavior:
                    'smooth',

                block:
                    'center'
            });
        }


        // ==========================================
        // CREATE FIXED DEPOSIT
        // ==========================================

        async function createFixedDeposit() {

            const accountId =
                Number(
                    document.getElementById(
                        'fd-account'
                    ).value
                );


            const principal =
                Number(
                    document.getElementById(
                        'fd-principal'
                    ).value
                );


            const interestRate =
                Number(
                    document.getElementById(
                        'fd-interest-rate'
                    ).value
                );


            const startDate =
                document.getElementById(
                    'fd-start-date'
                ).value;


            const maturityDate =
                document.getElementById(
                    'fd-maturity-date'
                ).value;


            const button =
                document.getElementById(
                    'create-fd-btn'
                );


            const message =
                document.getElementById(
                    'fd-message'
                );


            if (!accountId) {

                alert(
                    'Please select an account.'
                );

                return;
            }


            if (
                !Number.isFinite(principal)
                ||
                principal <= 0
            ) {

                alert(
                    'Please enter a valid principal amount.'
                );

                return;
            }


            if (
                !Number.isFinite(interestRate)
                ||
                interestRate < 0
            ) {

                alert(
                    'Please enter a valid interest rate.'
                );

                return;
            }


            if (
                !startDate ||
                !maturityDate
            ) {

                alert(
                    'Please select start and maturity dates.'
                );

                return;
            }


            if (
                maturityDate <=
                startDate
            ) {

                alert(
                    'Maturity date must be after start date.'
                );

                return;
            }


            const account =
                customerAccounts.find(
                    item =>
                        Number(
                            item.account_id
                        )
                        ===
                        accountId
                );


            if (
                !account
                ||
                principal >
                Number(
                    account.available_balance
                )
            ) {

                alert(
                    'Insufficient available balance.'
                );

                return;
            }


            button.disabled =
                true;


            button.textContent =
                'Creating Deposit...';


            message.textContent =
                '';


            try {

                const response =
                    await fetch(
                        `${API_BASE}/fixed-deposits/`,
                        {
                            method:
                                'POST',

                            headers: {
                                'Content-Type':
                                    'application/json'
                            },

                            body:
                                JSON.stringify({

                                    customer_id:
                                        Number(
                                            customerId
                                        ),

                                    account_id:
                                        accountId,

                                    principal_amount:
                                        principal,

                                    interest_rate:
                                        interestRate,

                                    start_date:
                                        startDate,

                                    maturity_date:
                                        maturityDate
                                })
                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.detail ||
                        'Unable to create fixed deposit.'
                    );
                }


                message.style.color =
                    '#16a34a';


                message.textContent =
                    '✓ Fixed deposit created successfully.';


                showReceipt(
                    result
                );


                document.getElementById(
                    'fixed-deposit-form'
                ).reset();


                document.getElementById(
                    'fd-preview'
                ).style.display =
                    'none';


                document.getElementById(
                    'fd-account-balance'
                ).textContent =
                    '৳0.00';


                await loadAccounts();

                await loadFixedDeposits();

            }

            catch (error) {

                console.error(
                    'FD CREATE ERROR:',
                    error
                );


                message.style.color =
                    '#dc2626';


                message.textContent =
                    '✕ ' + error.message;
            }

            finally {

                button.disabled =
                    false;


                button.textContent =
                    '📈 Create Fixed Deposit';
            }
        }


        // ==========================================
        // LOAD FIXED DEPOSITS
        // ==========================================

        async function loadFixedDeposits() {

            const container =
                document.getElementById(
                    'fixed-deposit-list'
                );


            try {

                const response =
                    await fetch(
                        `${API_BASE}/fixed-deposits/`
                    );


                const deposits =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        deposits.detail ||
                        'Failed to load fixed deposits.'
                    );
                }


                customerFixedDeposits =
                    deposits.filter(
                        fd =>
                            String(
                                fd.customer_id
                            )
                            ===
                            String(
                                customerId
                            )
                    );


                // ----------------------------------
                // Summary
                // ----------------------------------

                document.getElementById(
                    'total-fixed-deposits'
                ).textContent =
                    customerFixedDeposits.length;


                const activeDeposits =
                    customerFixedDeposits.filter(
                        fd =>
                            fd.status ===
                            'ACTIVE'
                    );


                document.getElementById(
                    'active-fixed-deposits'
                ).textContent =
                    activeDeposits.length;


                let totalPrincipal =
                    0;


                customerFixedDeposits.forEach(
                    fd => {

                        totalPrincipal +=
                            Number(
                                fd.principal_amount ||
                                0
                            );
                    }
                );


                document.getElementById(
                    'total-fd-principal'
                ).textContent =
                    formatMoney(
                        totalPrincipal
                    );


                if (
                    customerFixedDeposits.length
                    ===
                    0
                ) {

                    container.innerHTML = `
                        <p>
                            No fixed deposits found.
                        </p>
                    `;

                    return;
                }


                container.innerHTML =
                    '';


                customerFixedDeposits.forEach(
                    fd => {

                        const card =
                            document.createElement(
                                'div'
                            );


                        const statusClass =
                            String(
                                fd.status ||
                                ''
                            ).toLowerCase();


                        const account =
                            customerAccounts.find(
                                item =>
                                    Number(
                                        item.account_id
                                    )
                                    ===
                                    Number(
                                        fd.account_id
                                    )
                            );


                        card.className =
                            'fd-card';


                        card.innerHTML = `

                            <div class="fd-card-header">

                                <div>

                                    <h3>
                                        Fixed Deposit #${escapeHtml(
                            fd.fd_id
                        )}
                                    </h3>

                                    <p>
                                        ${escapeHtml(
                            account
                                ?
                                account.account_number
                                :
                                `Account #${fd.account_id}`
                        )}
                                    </p>

                                </div>


                                <span
                                    class="fd-status ${escapeHtml(
                            statusClass
                        )}"
                                >
                                    ${escapeHtml(
                            fd.status
                        )}
                                </span>

                            </div>


                            <div class="fd-details-grid">

                                <div>

                                    <span class="info-label">
                                        Principal
                                    </span>

                                    <strong>
                                        ৳${formatMoney(
                            fd.principal_amount
                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span class="info-label">
                                        Interest Rate
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                            fd.interest_rate
                        )}%
                                    </strong>

                                </div>


                                <div>

                                    <span class="info-label">
                                        Start Date
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                            formatDate(
                                fd.start_date
                            )
                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span class="info-label">
                                        Maturity Date
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                            formatDate(
                                fd.maturity_date
                            )
                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span class="info-label">
                                        Maturity Amount
                                    </span>

                                    <strong>
                                        ৳${formatMoney(
                            fd.maturity_amount
                        )}
                                    </strong>

                                </div>

                            </div>


                            ${fd.status === 'ACTIVE'

                                ?

                                `
                                    <div class="fd-actions">

                                        <button
                                            type="button"
                                            class="fd-mature-btn"
                                            data-fd-id="${fd.fd_id}"
                                        >
                                            ✓ Mature Deposit
                                        </button>


                                        <button
                                            type="button"
                                            class="fd-close-btn"
                                            data-fd-id="${fd.fd_id}"
                                        >
                                            Close Early
                                        </button>

                                    </div>
                                `

                                :

                                ''
                            }

                        `;


                        container.appendChild(
                            card
                        );
                    }
                );


                attachFixedDepositActions();

            }

            catch (error) {

                console.error(
                    'FD LOAD ERROR:',
                    error
                );


                container.innerHTML = `
                    <p>
                        Unable to load fixed deposits.
                    </p>
                `;
            }
        }


        // ==========================================
        // MATURE FIXED DEPOSIT
        // ==========================================

        async function matureFixedDeposit(
            fdId
        ) {

            try {

                const response =
                    await fetch(
                        `${API_BASE}/fixed-deposits/${fdId}/mature`,
                        {
                            method: 'POST'
                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.detail ||
                        'Unable to mature fixed deposit.'
                    );
                }


                alert(
                    `Fixed deposit matured successfully.\n\nCredited: ৳${formatMoney(
                        result.credited_amount
                    )}`
                );


                await loadAccounts();

                await loadFixedDeposits();

            }

            catch (error) {

                alert(
                    error.message
                );
            }
        }


        // ==========================================
        // PREMATURE CLOSE
        // ==========================================

        async function closeFixedDeposit(
            fdId
        ) {

            const confirmed =
                confirm(
                    'Close this fixed deposit before maturity?\n\nOnly the principal will be returned.'
                );


            if (!confirmed) {
                return;
            }


            try {

                const response =
                    await fetch(
                        `${API_BASE}/fixed-deposits/${fdId}/premature-close`,
                        {
                            method:
                                'POST'
                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.detail ||
                        'Unable to close fixed deposit.'
                    );
                }


                alert(
                    `Fixed deposit closed.\n\nReturned: ৳${formatMoney(
                        result.credited_amount
                    )}`
                );


                await loadAccounts();

                await loadFixedDeposits();

            }

            catch (error) {

                alert(
                    error.message
                );
            }
        }


        // ==========================================
        // FD ACTION BUTTONS
        // ==========================================

        function attachFixedDepositActions() {

            document
                .querySelectorAll(
                    '.fd-mature-btn'
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            'click',
                            () => {

                                matureFixedDeposit(
                                    button.dataset.fdId
                                );
                            }
                        );
                    }
                );


            document
                .querySelectorAll(
                    '.fd-close-btn'
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            'click',
                            () => {

                                closeFixedDeposit(
                                    button.dataset.fdId
                                );
                            }
                        );
                    }
                );
        }


        // ==========================================
        // EVENTS
        // ==========================================

        document.getElementById(
            'fd-account'
        ).addEventListener(
            'change',
            updateAccountBalance
        );


        [
            'fd-principal',
            'fd-interest-rate',
            'fd-start-date',
            'fd-maturity-date'
        ].forEach(
            id => {

                document.getElementById(
                    id
                ).addEventListener(
                    'input',
                    updatePreview
                );
            }
        );


        document.getElementById(
            'fixed-deposit-form'
        ).addEventListener(
            'submit',
            event => {

                event.preventDefault();

                createFixedDeposit();
            }
        );


        document.getElementById(
            'fixed-deposit-form'
        ).addEventListener(
            'reset',
            () => {

                setTimeout(
                    () => {

                        document.getElementById(
                            'fd-preview'
                        ).style.display =
                            'none';


                        document.getElementById(
                            'fd-account-balance'
                        ).textContent =
                            '৳0.00';


                        document.getElementById(
                            'fd-message'
                        ).textContent =
                            '';

                    },
                    0
                );
            }
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
        // INITIALIZE
        // ==========================================

        async function initializePage() {

            await loadCustomer();

            await loadAccounts();

            await loadFixedDeposits();
        }


        initializePage();

    }
);