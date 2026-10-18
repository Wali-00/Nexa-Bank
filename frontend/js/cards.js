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

        let customerCards = [];


        // ==========================================
        // HELPERS
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
        // LOAD CARDS
        // ==========================================

        async function loadCards() {

            const container =
                document.getElementById(
                    'cards-container'
                );


            try {

                const response =
                    await fetch(
                        `${API_BASE}/cards/`
                    );


                const cards =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        cards.detail ||
                        'Failed to load cards.'
                    );
                }


                customerCards =
                    cards.filter(
                        card =>
                            String(
                                card.customer_id
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
                    'total-cards'
                ).textContent =
                    customerCards.length;


                const activeCards =
                    customerCards.filter(
                        card =>
                            String(
                                card.status
                            ).toUpperCase()
                            ===
                            'ACTIVE'
                    );


                document.getElementById(
                    'active-cards'
                ).textContent =
                    activeCards.length;


                // ----------------------------------
                // Empty
                // ----------------------------------

                if (
                    customerCards.length === 0
                ) {

                    container.innerHTML = `
                        <div class="empty-card-message">

                            <h3>
                                No cards found
                            </h3>

                            <p>
                                You currently have no
                                Nexa Bank cards.
                            </p>

                        </div>
                    `;

                    return;
                }


                // ----------------------------------
                // Render cards
                // ----------------------------------

                container.innerHTML =
                    '';


                customerCards.forEach(
                    card => {

                        const cardElement =
                            document.createElement(
                                'div'
                            );


                        const statusClass =
                            String(
                                card.status ||
                                ''
                            ).toLowerCase();


                        const cardTypeClass =
                            String(
                                card.card_type ||
                                ''
                            ).toLowerCase();


                        cardElement.className =
                            `bank-card ${cardTypeClass}`;


                        cardElement.innerHTML = `

                            <div class="bank-card-top">

                                <div>

                                    <span class="bank-card-bank">
                                        NEXA BANK
                                    </span>

                                    <div class="bank-card-chip">
                                        ▰
                                    </div>

                                </div>


                                <span
                                    class="card-status ${escapeHtml(
                            statusClass
                        )}"
                                >
                                    ${escapeHtml(
                            card.status
                        )}
                                </span>

                            </div>


                            <div class="bank-card-number">

                                •••• &nbsp;
                                •••• &nbsp;
                                •••• &nbsp;
                                ••••

                            </div>


                            <div class="bank-card-bottom">

                                <div>

                                    <span>
                                        CARD TYPE
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                            card.card_type
                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        EXPIRES
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                            formatDate(
                                card.expiry_date
                            )
                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        ACCOUNT
                                    </span>

                                    <strong>
                                        #${escapeHtml(
                            card.account_id
                        )}
                                    </strong>

                                </div>

                            </div>


                            <div class="bank-card-meta">

                                Issued:
                                ${escapeHtml(
                            formatDate(
                                card.issued_date
                            )
                        )}

                            </div>

                        `;


                        container.appendChild(
                            cardElement
                        );
                    }
                );

            }

            catch (error) {

                console.error(
                    'CARD LOAD ERROR:',
                    error
                );


                container.innerHTML = `
                    <p>
                        Unable to load cards.
                    </p>
                `;
            }
        }


        // ==========================================
        // LOAD CARD TRANSACTIONS
        // ==========================================

        async function loadCardTransactions() {

            const tableBody =
                document.getElementById(
                    'card-transactions-body'
                );


            try {

                if (
                    customerCards.length === 0
                ) {

                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="7">
                                No card transactions found.
                            </td>
                        </tr>
                    `;

                    document.getElementById(
                        'total-card-transactions'
                    ).textContent =
                        0;

                    return;
                }


                const cardIds =
                    customerCards.map(
                        card =>
                            Number(
                                card.card_id
                            )
                    );


                // ----------------------------------
                // Card transaction records
                // ----------------------------------

                const cardTransactionResponse =
                    await fetch(
                        `${API_BASE}/card-transactions/`
                    );


                const cardTransactions =
                    await cardTransactionResponse.json();


                if (
                    !cardTransactionResponse.ok
                ) {

                    throw new Error(
                        cardTransactions.detail ||
                        'Failed to load card transactions.'
                    );
                }


                const customerCardTransactions =
                    cardTransactions.filter(
                        item =>
                            cardIds.includes(
                                Number(
                                    item.card_id
                                )
                            )
                    );


                document.getElementById(
                    'total-card-transactions'
                ).textContent =
                    customerCardTransactions.length;


                if (
                    customerCardTransactions.length
                    ===
                    0
                ) {

                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="7">
                                No card transactions found.
                            </td>
                        </tr>
                    `;

                    return;
                }


                // ----------------------------------
                // Transactions
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
                // Entries
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
                        'Failed to load entries.'
                    );
                }


                const rows = [];


                customerCardTransactions.forEach(
                    cardTransaction => {

                        const transaction =
                            transactions.find(
                                item =>
                                    Number(
                                        item.transaction_id
                                    )
                                    ===
                                    Number(
                                        cardTransaction.transaction_id
                                    )
                            );


                        if (!transaction) {
                            return;
                        }


                        const card =
                            customerCards.find(
                                item =>
                                    Number(
                                        item.card_id
                                    )
                                    ===
                                    Number(
                                        cardTransaction.card_id
                                    )
                            );


                        const entry =
                            entries.find(
                                item =>
                                    Number(
                                        item.transaction_id
                                    )
                                    ===
                                    Number(
                                        transaction.transaction_id
                                    )
                                    &&
                                    card
                                    &&
                                    Number(
                                        item.account_id
                                    )
                                    ===
                                    Number(
                                        card.account_id
                                    )
                            );


                        rows.push({

                            ...cardTransaction,

                            transaction_date:
                                transaction.transaction_date,

                            transaction_status:
                                transaction.status,

                            amount:
                                entry
                                    ?
                                    entry.amount
                                    :
                                    transaction.amount,

                            entry_type:
                                entry
                                    ?
                                    entry.entry_type
                                    :
                                    'DEBIT'
                        });
                    }
                );


                rows.sort(
                    (a, b) =>
                        Number(
                            b.card_transaction_id
                        )
                        -
                        Number(
                            a.card_transaction_id
                        )
                );


                const recentRows =
                    rows.slice(
                        0,
                        10
                    );


                tableBody.innerHTML =
                    '';


                recentRows.forEach(
                    rowData => {

                        const row =
                            document.createElement(
                                'tr'
                            );


                        const entryClass =
                            String(
                                rowData.entry_type ||
                                ''
                            ).toLowerCase();


                        row.innerHTML = `

                            <td>
                                ${escapeHtml(
                            formatDateTime(
                                rowData.transaction_date
                            )
                        )}
                            </td>


                            <td>
                                Card #${escapeHtml(
                            rowData.card_id
                        )}
                            </td>


                            <td>
                                ${escapeHtml(
                            rowData.merchant_name ||
                            '-'
                        )}
                            </td>


                            <td>
                                ${escapeHtml(
                            rowData.merchant_category ||
                            '-'
                        )}
                            </td>


                            <td>

                                <span
                                    class="entry-badge ${escapeHtml(
                            entryClass
                        )}"
                                >
                                    ${escapeHtml(
                            rowData.entry_type
                        )}
                                </span>

                            </td>


                            <td>
                                ৳${formatMoney(
                            rowData.amount
                        )}
                            </td>


                            <td>
                                ${escapeHtml(
                            rowData.transaction_status
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
                    'CARD TRANSACTION ERROR:',
                    error
                );


                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7">
                            Unable to load card activity.
                        </td>
                    </tr>
                `;
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
        // INITIALIZE
        // ==========================================

        async function initializePage() {

            await loadCustomer();

            await loadCards();

            await loadCardTransactions();
        }


        initializePage();

    }
);