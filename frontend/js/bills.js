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
        // LOCAL DATA
        // ==========================================

        let customerAccounts = [];

        let billers = [];


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
                    'bill-account'
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
                        'pay-bill-btn'
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
        // UPDATE BALANCE
        // ==========================================

        function updateAccountBalance() {

            const accountId =
                Number(
                    document.getElementById(
                        'bill-account'
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
                'bill-account-balance'
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
        // LOAD BILLERS
        // ==========================================

        async function loadBillers() {

            const select =
                document.getElementById(
                    'biller-id'
                );


            try {

                const response =
                    await fetch(
                        `${API_BASE}/billers/`
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.detail ||
                        'Failed to load billers.'
                    );
                }


                billers =
                    result.filter(
                        biller =>
                            String(
                                biller.status
                            ).toUpperCase()
                            ===
                            'ACTIVE'
                    );


                select.innerHTML = `

                    <option value="">
                        Select biller
                    </option>

                `;


                billers.forEach(
                    biller => {

                        const option =
                            document.createElement(
                                'option'
                            );


                        option.value =
                            biller.biller_id;


                        option.textContent =
                            `${biller.biller_name} — ${biller.category}`;


                        select.appendChild(
                            option
                        );
                    }
                );


                if (
                    billers.length === 0
                ) {

                    select.innerHTML = `

                        <option value="">
                            No active billers available
                        </option>

                    `;
                }

            }

            catch (error) {

                console.error(
                    'BILLER LOAD ERROR:',
                    error
                );


                select.innerHTML = `

                    <option value="">
                        Unable to load billers
                    </option>

                `;
            }
        }


        // ==========================================
        // SHOW RECEIPT
        // ==========================================

        function showReceipt(result) {

            document.getElementById(
                'receipt-bill-payment-id'
            ).textContent =
                result.bill_payment_id;


            document.getElementById(
                'receipt-transaction-id'
            ).textContent =
                result.transaction_id;


            document.getElementById(
                'receipt-reference-no'
            ).textContent =
                result.reference_no;


            document.getElementById(
                'receipt-amount'
            ).textContent =
                `৳${formatMoney(
                    result.amount
                )}`;


            document.getElementById(
                'receipt-status'
            ).textContent =
                result.status;


            const card =
                document.getElementById(
                    'bill-receipt-card'
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
        // SUBMIT PAYMENT
        // ==========================================

        async function submitBillPayment() {

            const accountId =
                Number(
                    document.getElementById(
                        'bill-account'
                    ).value
                );


            const billerId =
                Number(
                    document.getElementById(
                        'biller-id'
                    ).value
                );


            const reference =
                document.getElementById(
                    'customer-reference'
                ).value.trim();


            const amount =
                Number(
                    document.getElementById(
                        'bill-amount'
                    ).value
                );


            const message =
                document.getElementById(
                    'bill-payment-message'
                );


            const button =
                document.getElementById(
                    'pay-bill-btn'
                );


            if (!accountId) {

                alert(
                    'Please select an account.'
                );

                return;
            }


            if (!billerId) {

                alert(
                    'Please select a biller.'
                );

                return;
            }


            if (!reference) {

                alert(
                    'Please enter the customer reference.'
                );

                return;
            }


            if (
                !Number.isFinite(amount)
                ||
                amount <= 0
            ) {

                alert(
                    'Please enter a valid payment amount.'
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
                amount >
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
                'Processing Payment...';


            message.textContent =
                '';


            try {

                const response =
                    await fetch(
                        `${API_BASE}/bill-payments/`,
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

                                    biller_id:
                                        billerId,

                                    customer_reference:
                                        reference,

                                    amount:
                                        amount,

                                    initiated_by_user_id:
                                        Number(
                                            userId
                                        )
                                })
                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.detail ||
                        'Bill payment failed.'
                    );
                }


                message.style.color =
                    '#16a34a';


                message.textContent =
                    '✓ Bill payment completed successfully.';


                showReceipt(
                    result
                );


                document.getElementById(
                    'customer-reference'
                ).value =
                    '';


                document.getElementById(
                    'bill-amount'
                ).value =
                    '';


                await loadAccounts();


                document.getElementById(
                    'bill-account'
                ).value =
                    String(
                        accountId
                    );


                updateAccountBalance();


                await loadBillPayments();

            }

            catch (error) {

                console.error(
                    'BILL PAYMENT ERROR:',
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
                    '🧾 Pay Bill';
            }
        }


        // ==========================================
        // LOAD PAYMENT HISTORY
        // ==========================================

        async function loadBillPayments() {

            const tableBody =
                document.getElementById(
                    'bill-payments-body'
                );


            try {

                const response =
                    await fetch(
                        `${API_BASE}/bill-payments/`
                    );


                const payments =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        payments.detail ||
                        'Failed to load bill payments.'
                    );
                }


                const customerPayments =
                    payments.filter(
                        payment =>
                            String(
                                payment.customer_id
                            )
                            ===
                            String(
                                customerId
                            )
                    );


                document.getElementById(
                    'total-bill-payments'
                ).textContent =
                    customerPayments.length;


                let totalPaid =
                    0;


                customerPayments.forEach(
                    payment => {

                        totalPaid +=
                            Number(
                                payment.amount || 0
                            );
                    }
                );


                document.getElementById(
                    'total-bill-amount'
                ).textContent =
                    formatMoney(
                        totalPaid
                    );


                if (
                    customerPayments.length
                    ===
                    0
                ) {

                    tableBody.innerHTML = `

                        <tr>
                            <td colspan="6">
                                No bill payments found.
                            </td>
                        </tr>

                    `;

                    return;
                }


                customerPayments.sort(
                    (a, b) =>
                        Number(
                            b.bill_payment_id
                        )
                        -
                        Number(
                            a.bill_payment_id
                        )
                );


                tableBody.innerHTML =
                    '';


                customerPayments
                    .slice(0, 10)
                    .forEach(
                        payment => {

                            const biller =
                                billers.find(
                                    item =>
                                        Number(
                                            item.biller_id
                                        )
                                        ===
                                        Number(
                                            payment.biller_id
                                        )
                                );


                            const account =
                                customerAccounts.find(
                                    item =>
                                        Number(
                                            item.account_id
                                        )
                                        ===
                                        Number(
                                            payment.account_id
                                        )
                                );


                            const row =
                                document.createElement(
                                    'tr'
                                );


                            row.innerHTML = `

                                <td>
                                    ${escapeHtml(
                                formatDate(
                                    payment.payment_date
                                )
                            )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                biller
                                    ?
                                    biller.biller_name
                                    :
                                    `Biller #${payment.biller_id}`
                            )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                payment.customer_reference
                            )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                account
                                    ?
                                    account.account_number
                                    :
                                    `Account #${payment.account_id}`
                            )}
                                </td>

                                <td>
                                    ৳${formatMoney(
                                payment.amount
                            )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                payment.status
                            )}
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
                    'BILL HISTORY ERROR:',
                    error
                );


                tableBody.innerHTML = `

                    <tr>
                        <td colspan="6">
                            Unable to load bill payments.
                        </td>
                    </tr>

                `;
            }
        }


        // ==========================================
        // EVENTS
        // ==========================================

        document.getElementById(
            'bill-account'
        ).addEventListener(
            'change',
            updateAccountBalance
        );


        document.getElementById(
            'bill-payment-form'
        ).addEventListener(
            'submit',
            event => {

                event.preventDefault();

                submitBillPayment();
            }
        );


        document.getElementById(
            'bill-payment-form'
        ).addEventListener(
            'reset',
            () => {

                setTimeout(
                    () => {

                        document.getElementById(
                            'bill-account-balance'
                        ).textContent =
                            '৳0.00';


                        document.getElementById(
                            'bill-payment-message'
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

            await loadBillers();

            await loadBillPayments();
        }


        initializePage();

    }
);