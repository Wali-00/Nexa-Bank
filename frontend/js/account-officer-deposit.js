document.addEventListener(
    'DOMContentLoaded',
    () => {

        const API_BASE =
            'http://127.0.0.1:8000';


        // ==========================================
        // LOGIN INFORMATION
        // ==========================================

        const userId =
            localStorage.getItem(
                'user_id'
            );

        const role =
            localStorage.getItem(
                'role'
            );


        if (
            !userId ||
            role !== 'officer'
        ) {

            alert(
                'Please login as an Account Officer.'
            );


            window.location.href =
                'login.html';


            return;
        }


        // ==========================================
        // ELEMENTS
        // ==========================================

        const accountNumberInput =
            document.getElementById(
                'deposit-account-number'
            );


        const searchButton =
            document.getElementById(
                'search-deposit-account-btn'
            );


        const searchMessage =
            document.getElementById(
                'deposit-search-message'
            );


        const accountPreview =
            document.getElementById(
                'deposit-account-preview'
            );


        const depositForm =
            document.getElementById(
                'officer-deposit-form'
            );


        const amountInput =
            document.getElementById(
                'officer-deposit-amount'
            );


        const descriptionInput =
            document.getElementById(
                'officer-deposit-description'
            );


        const confirmButton =
            document.getElementById(
                'confirm-deposit-btn'
            );


        const cancelButton =
            document.getElementById(
                'cancel-deposit-btn'
            );


        const resultMessage =
            document.getElementById(
                'deposit-result-message'
            );


        const receiptCard =
            document.getElementById(
                'deposit-receipt-card'
            );


        // ==========================================
        // CURRENT ACCOUNT
        // ==========================================

        let selectedAccount =
            null;


        // ==========================================
        // MONEY
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
        // RESET ACCOUNT SEARCH
        // ==========================================

        function resetDepositSection() {

            selectedAccount =
                null;


            accountPreview.style.display =
                'none';


            receiptCard.style.display =
                'none';


            depositForm.reset();


            searchMessage.textContent =
                '';


            resultMessage.textContent =
                '';
        }


        // ==========================================
        // SEARCH ACCOUNT
        // ==========================================

        async function searchAccount() {

            const accountNumber =
                accountNumberInput
                    .value
                    .trim();


            if (!accountNumber) {

                alert(
                    'Please enter an account number.'
                );

                return;
            }


            searchButton.disabled =
                true;


            searchButton.textContent =
                'Searching...';


            searchMessage.textContent =
                '';


            accountPreview.style.display =
                'none';


            selectedAccount =
                null;


            try {

                const response =
                    await fetch(
                        `${API_BASE}/account-transactions/account/${encodeURIComponent(
                            accountNumber
                        )}`
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.detail ||
                        'Account not found.'
                    );
                }


                selectedAccount =
                    result;


                // ----------------------------------
                // Account number
                // ----------------------------------

                document.getElementById(
                    'deposit-preview-account-number'
                ).textContent =
                    result.account_number;


                // ----------------------------------
                // Customer
                // ----------------------------------

                document.getElementById(
                    'deposit-customer-name'
                ).textContent =
                    result.customer_name;


                document.getElementById(
                    'deposit-preview-customer-id'
                ).textContent =
                    result.customer_id;


                // ----------------------------------
                // Account ID
                // ----------------------------------

                document.getElementById(
                    'deposit-preview-account-id'
                ).textContent =
                    result.account_id;


                // ----------------------------------
                // Balances
                // ----------------------------------

                document.getElementById(
                    'deposit-preview-balance'
                ).textContent =
                    `৳${formatMoney(
                        result.balance
                    )}`;


                document.getElementById(
                    'deposit-preview-available'
                ).textContent =
                    `৳${formatMoney(
                        result.available_balance
                    )}`;


                // ----------------------------------
                // Status
                // ----------------------------------

                document.getElementById(
                    'deposit-preview-customer-status'
                ).textContent =
                    result.customer_status;


                const accountStatus =
                    document.getElementById(
                        'deposit-account-status'
                    );


                accountStatus.textContent =
                    result.account_status;


                accountStatus.className =
                    `deposit-status-badge ${String(
                        result.account_status
                    ).toLowerCase()}`;


                // ----------------------------------
                // Show preview
                // ----------------------------------

                accountPreview.style.display =
                    'block';


                searchMessage.style.color =
                    '#16a34a';


                searchMessage.textContent =
                    '✓ Account found successfully.';


                // ----------------------------------
                // Prevent invalid deposit
                // ----------------------------------

                if (
                    result.account_status !==
                    'ACTIVE'
                    ||
                    result.customer_status !==
                    'ACTIVE'
                ) {

                    confirmButton.disabled =
                        true;


                    resultMessage.style.color =
                        '#dc2626';


                    resultMessage.textContent =
                        'Deposits can only be made to ACTIVE customers and accounts.';

                }

                else {

                    confirmButton.disabled =
                        false;


                    resultMessage.textContent =
                        '';
                }


                accountPreview.scrollIntoView({
                    behavior:
                        'smooth',

                    block:
                        'center'
                });

            }

            catch (error) {

                console.error(
                    'ACCOUNT SEARCH ERROR:',
                    error
                );


                searchMessage.style.color =
                    '#dc2626';


                searchMessage.textContent =
                    '✕ ' + error.message;
            }

            finally {

                searchButton.disabled =
                    false;


                searchButton.textContent =
                    '🔎 Search Account';
            }
        }


        // ==========================================
        // DEPOSIT MONEY
        // ==========================================

        async function depositMoney() {

            if (!selectedAccount) {

                alert(
                    'Please search and select an account first.'
                );

                return;
            }


            const amount =
                Number(
                    amountInput.value
                );


            const description =
                descriptionInput
                    .value
                    .trim();


            if (
                !Number.isFinite(amount)
                ||
                amount <= 0
            ) {

                alert(
                    'Please enter a valid deposit amount.'
                );

                return;
            }


            const confirmed =
                confirm(
                    `Deposit ৳${formatMoney(
                        amount
                    )} into account ${selectedAccount.account_number}?\n\nCustomer: ${selectedAccount.customer_name}`
                );


            if (!confirmed) {

                return;
            }


            confirmButton.disabled =
                true;


            confirmButton.textContent =
                'Processing Deposit...';


            resultMessage.textContent =
                '';


            try {

                const response =
                    await fetch(
                        `${API_BASE}/account-transactions/officer-deposit`,
                        {
                            method:
                                'POST',

                            headers: {
                                'Content-Type':
                                    'application/json'
                            },

                            body:
                                JSON.stringify({

                                    account_number:
                                        selectedAccount.account_number,

                                    amount:
                                        amount,

                                    initiated_by_user_id:
                                        Number(
                                            userId
                                        ),

                                    description:
                                        description
                                        ||
                                        'Cash deposit by Account Officer'
                                })
                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.detail ||
                        'Deposit could not be completed.'
                    );
                }


                // ==========================================
                // SUCCESS MESSAGE
                // ==========================================

                resultMessage.style.color =
                    '#16a34a';


                resultMessage.textContent =
                    '✓ Deposit completed successfully.';


                // ==========================================
                // RECEIPT
                // ==========================================

                showDepositReceipt(
                    result
                );


                // ==========================================
                // UPDATE PREVIEW BALANCE
                // ==========================================

                selectedAccount.balance =
                    result.new_balance;


                selectedAccount.available_balance =
                    result.available_balance;


                document.getElementById(
                    'deposit-preview-balance'
                ).textContent =
                    `৳${formatMoney(
                        result.new_balance
                    )}`;


                document.getElementById(
                    'deposit-preview-available'
                ).textContent =
                    `৳${formatMoney(
                        result.available_balance
                    )}`;


                // ==========================================
                // CLEAR DEPOSIT INPUTS ONLY
                // ==========================================

                amountInput.value =
                    '';


                descriptionInput.value =
                    '';

            }

            catch (error) {

                console.error(
                    'DEPOSIT ERROR:',
                    error
                );


                resultMessage.style.color =
                    '#dc2626';


                resultMessage.textContent =
                    '✕ ' + error.message;
            }

            finally {

                confirmButton.disabled =
                    false;


                confirmButton.textContent =
                    '💰 Add Money';
            }
        }


        // ==========================================
        // RECEIPT
        // ==========================================

        function showDepositReceipt(
            result
        ) {

            document.getElementById(
                'receipt-customer-name'
            ).textContent =
                result.customer_name;


            document.getElementById(
                'receipt-account-number'
            ).textContent =
                result.account_number;


            document.getElementById(
                'receipt-transaction-id'
            ).textContent =
                result.transaction_id;


            document.getElementById(
                'receipt-reference-number'
            ).textContent =
                result.reference_no;


            document.getElementById(
                'receipt-previous-balance'
            ).textContent =
                `৳${formatMoney(
                    result.previous_balance
                )}`;


            document.getElementById(
                'receipt-deposit-amount'
            ).textContent =
                `+৳${formatMoney(
                    result.deposit_amount
                )}`;


            document.getElementById(
                'receipt-new-balance'
            ).textContent =
                `৳${formatMoney(
                    result.new_balance
                )}`;


            document.getElementById(
                'receipt-deposit-status'
            ).textContent =
                result.status;


            receiptCard.style.display =
                'block';


            receiptCard.scrollIntoView({

                behavior:
                    'smooth',

                block:
                    'center'
            });
        }


        // ==========================================
        // EVENTS
        // ==========================================

        searchButton.addEventListener(
            'click',
            searchAccount
        );


        accountNumberInput.addEventListener(
            'keydown',
            event => {

                if (
                    event.key ===
                    'Enter'
                ) {

                    event.preventDefault();

                    searchAccount();
                }
            }
        );


        depositForm.addEventListener(
            'submit',
            event => {

                event.preventDefault();

                depositMoney();
            }
        );


        cancelButton.addEventListener(
            'click',
            () => {

                resetDepositSection();

                accountNumberInput.value =
                    '';
            }
        );

    }
);