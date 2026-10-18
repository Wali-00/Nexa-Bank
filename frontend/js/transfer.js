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
        // PAGE ELEMENTS
        // ==========================================

        const transferForm =
            document.getElementById(
                'transfer-form'
            );

        const senderSelect =
            document.getElementById(
                'sender-account'
            );

        const receiverInput =
            document.getElementById(
                'receiver-account'
            );

        const amountInput =
            document.getElementById(
                'transfer-amount'
            );

        const descriptionInput =
            document.getElementById(
                'transfer-description'
            );

        const senderBalanceElement =
            document.getElementById(
                'sender-balance'
            );

        const transferButton =
            document.getElementById(
                'transfer-btn'
            );

        const transferMessage =
            document.getElementById(
                'transfer-message'
            );

        const resultCard =
            document.getElementById(
                'transfer-result-card'
            );


        // ==========================================
        // LOCAL ACCOUNT DATA
        // ==========================================

        let customerAccounts = [];


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
        // LOAD CUSTOMER ACCOUNTS
        // ==========================================

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
                            account.status === 'ACTIVE'
                    );


                senderSelect.innerHTML = `
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


                        senderSelect.appendChild(
                            option
                        );
                    }
                );


                if (
                    customerAccounts.length === 0
                ) {

                    senderSelect.innerHTML = `
                        <option value="">
                            No active accounts available
                        </option>
                    `;


                    transferButton.disabled =
                        true;
                }

            }

            catch (error) {

                console.error(
                    'ACCOUNT LOAD ERROR:',
                    error
                );


                transferMessage.style.color =
                    '#dc2626';


                transferMessage.textContent =
                    'Unable to load your accounts.';
            }
        }


        // ==========================================
        // UPDATE AVAILABLE BALANCE
        // ==========================================

        function updateSenderBalance() {

            const senderAccountId =
                Number(
                    senderSelect.value
                );


            const account =
                customerAccounts.find(
                    account =>
                        Number(
                            account.account_id
                        )
                        ===
                        senderAccountId
                );


            if (!account) {

                senderBalanceElement.textContent =
                    '৳0.00';

                return;
            }


            senderBalanceElement.textContent =
                `৳${formatMoney(
                    account.available_balance
                )}`;
        }


        // ==========================================
        // RESET RESULT
        // ==========================================

        function hideResult() {

            if (resultCard) {

                resultCard.style.display =
                    'none';
            }
        }


        // ==========================================
        // SHOW TRANSFER RESULT
        // ==========================================

        function showTransferResult(
            result
        ) {

            document.getElementById(
                'result-transaction-id'
            ).textContent =
                result.transaction_id;


            document.getElementById(
                'result-reference-no'
            ).textContent =
                result.reference_no;


            document.getElementById(
                'result-sender-account'
            ).textContent =
                result.sender_account_id;


            document.getElementById(
                'result-receiver-account'
            ).textContent =
                result.receiver_account_id;


            document.getElementById(
                'result-amount'
            ).textContent =
                `৳${formatMoney(
                    result.amount
                )}`;


            document.getElementById(
                'result-status'
            ).textContent =
                result.status;


            resultCard.style.display =
                'block';


            resultCard.scrollIntoView({

                behavior:
                    'smooth',

                block:
                    'center'
            });
        }


        // ==========================================
        // SUBMIT TRANSFER
        // ==========================================

        async function submitTransfer() {

            const senderAccountId =
                Number(
                    senderSelect.value
                );


            const receiverAccountId =
                Number(
                    receiverInput.value
                );


            const amount =
                Number(
                    amountInput.value
                );


            const description =
                descriptionInput.value.trim();


            // ----------------------------------
            // Validate sender account
            // ----------------------------------

            if (!senderAccountId) {

                alert(
                    'Please select the sender account.'
                );

                return;
            }


            // ----------------------------------
            // Validate receiver
            // ----------------------------------

            if (!receiverAccountId) {

                alert(
                    'Please enter the receiver account ID.'
                );

                return;
            }


            // ----------------------------------
            // Prevent same-account transfer
            // ----------------------------------

            if (
                senderAccountId
                ===
                receiverAccountId
            ) {

                alert(
                    'Sender and receiver accounts cannot be the same.'
                );

                return;
            }


            // ----------------------------------
            // Validate amount
            // ----------------------------------

            if (
                !Number.isFinite(amount)
                ||
                amount <= 0
            ) {

                alert(
                    'Please enter a valid transfer amount.'
                );

                return;
            }


            // ----------------------------------
            // Check current frontend balance
            // Backend checks again securely.
            // ----------------------------------

            const senderAccount =
                customerAccounts.find(
                    account =>
                        Number(
                            account.account_id
                        )
                        ===
                        senderAccountId
                );


            if (
                !senderAccount
            ) {

                alert(
                    'Sender account is invalid.'
                );

                return;
            }


            if (
                amount >
                Number(
                    senderAccount.available_balance
                )
            ) {

                alert(
                    'Insufficient available balance.'
                );

                return;
            }


            // ==========================================
            // SEND REQUEST
            // ==========================================

            transferButton.disabled =
                true;


            transferButton.textContent =
                'Processing Transfer...';


            transferMessage.textContent =
                '';


            hideResult();


            try {

                const response =
                    await fetch(
                        `${API_BASE}/transfers/`,
                        {
                            method:
                                'POST',

                            headers: {
                                'Content-Type':
                                    'application/json'
                            },

                            body:
                                JSON.stringify({

                                    sender_account_id:
                                        senderAccountId,

                                    receiver_account_id:
                                        receiverAccountId,

                                    initiated_by_user_id:
                                        Number(
                                            userId
                                        ),

                                    amount:
                                        amount,

                                    description:
                                        description || null

                                })
                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.detail ||
                        'Transfer could not be completed.'
                    );
                }


                console.log(
                    'TRANSFER SUCCESS:',
                    result
                );


                // ----------------------------------
                // Success message
                // ----------------------------------

                transferMessage.style.color =
                    '#16a34a';


                transferMessage.textContent =
                    '✓ Transfer completed successfully.';


                // ----------------------------------
                // Receipt
                // ----------------------------------

                showTransferResult(
                    result
                );


                // ----------------------------------
                // Clear transfer inputs
                // ----------------------------------

                receiverInput.value =
                    '';

                amountInput.value =
                    '';

                descriptionInput.value =
                    '';


                // ----------------------------------
                // Refresh account balances
                // ----------------------------------

                await loadAccounts();


                // Keep sender selected if possible
                senderSelect.value =
                    String(
                        senderAccountId
                    );


                updateSenderBalance();

            }

            catch (error) {

                console.error(
                    'TRANSFER ERROR:',
                    error
                );


                transferMessage.style.color =
                    '#dc2626';


                transferMessage.textContent =
                    '✕ ' + error.message;
            }

            finally {

                transferButton.disabled =
                    false;


                transferButton.textContent =
                    '💸 Transfer Money';
            }
        }


        // ==========================================
        // EVENTS
        // ==========================================

        senderSelect.addEventListener(
            'change',
            () => {

                updateSenderBalance();

                hideResult();
            }
        );


        transferForm.addEventListener(
            'submit',
            event => {

                event.preventDefault();

                submitTransfer();
            }
        );


        transferForm.addEventListener(
            'reset',
            () => {

                setTimeout(
                    () => {

                        senderBalanceElement.textContent =
                            '৳0.00';

                        transferMessage.textContent =
                            '';

                        hideResult();

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
        // INITIAL LOAD
        // ==========================================

        loadCustomer();

        loadAccounts();

    }
);