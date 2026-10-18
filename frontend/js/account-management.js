// ============================================================
// NEXA BANK
// ACCOUNT OFFICER - ACCOUNT MANAGEMENT
// ============================================================

const ACCOUNT_API_BASE =
    'http://127.0.0.1:8000';


let allManagedAccounts =
    [];


let selectedManagedAccount =
    null;


// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener(
    'DOMContentLoaded',
    () => {

        initializeAccountManagementEvents();

        loadManagedAccounts();

    }
);


// ============================================================
// EVENTS
// ============================================================

function initializeAccountManagementEvents() {

    const searchButton =
        document.getElementById(
            'account-management-search-btn'
        );


    const searchInput =
        document.getElementById(
            'account-management-search'
        );


    const refreshButton =
        document.getElementById(
            'refresh-accounts-btn'
        );


    const statusForm =
        document.getElementById(
            'account-status-form'
        );


    const closeModal =
        document.getElementById(
            'close-account-status-modal'
        );


    const cancelModal =
        document.getElementById(
            'cancel-account-status-btn'
        );


    if (searchButton) {

        searchButton.addEventListener(
            'click',
            searchManagedAccount
        );
    }


    if (searchInput) {

        searchInput.addEventListener(
            'keydown',
            event => {

                if (
                    event.key ===
                    'Enter'
                ) {

                    event.preventDefault();

                    searchManagedAccount();
                }
            }
        );
    }


    if (refreshButton) {

        refreshButton.addEventListener(
            'click',
            loadManagedAccounts
        );
    }


    if (statusForm) {

        statusForm.addEventListener(
            'submit',
            event => {

                event.preventDefault();

                updateManagedAccountStatus();
            }
        );
    }


    if (closeModal) {

        closeModal.addEventListener(
            'click',
            closeAccountStatusModal
        );
    }


    if (cancelModal) {

        cancelModal.addEventListener(
            'click',
            closeAccountStatusModal
        );
    }
}


// ============================================================
// LOAD ALL ACCOUNTS
// ============================================================

async function loadManagedAccounts() {

    const body =
        document.getElementById(
            'account-management-body'
        );


    if (!body) {

        return;
    }


    body.innerHTML = `
        <tr>
            <td
                colspan="9"
                class="message-row"
            >
                Loading accounts...
            </td>
        </tr>
    `;


    try {

        const response =
            await fetch(
                `${ACCOUNT_API_BASE}/accounts/`
            );


        const accounts =
            await response.json();


        if (!response.ok) {

            throw new Error(
                accounts.detail ||
                'Unable to load accounts.'
            );
        }


        allManagedAccounts =
            Array.isArray(accounts)
                ? accounts
                : [];


        updateAccountManagementStatistics();


        renderManagedAccounts();

    }

    catch (error) {

        console.error(
            'ACCOUNT MANAGEMENT LOAD ERROR:',
            error
        );


        body.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="message-row"
                >
                    ${escapeAccountHtml(
            error.message
        )}
                </td>
            </tr>
        `;
    }
}


// ============================================================
// STATISTICS
// ============================================================

function updateAccountManagementStatistics() {

    setAccountText(
        'account-total-count',
        allManagedAccounts.length
    );


    setAccountText(
        'account-active-count',
        allManagedAccounts.filter(
            account =>
                account.status ===
                'ACTIVE'
        ).length
    );


    setAccountText(
        'account-frozen-count',
        allManagedAccounts.filter(
            account =>
                account.status ===
                'FROZEN'
        ).length
    );


    setAccountText(
        'account-closed-count',
        allManagedAccounts.filter(
            account =>
                account.status ===
                'CLOSED'
        ).length
    );
}


// ============================================================
// RENDER ALL ACCOUNTS
// ============================================================

function renderManagedAccounts() {

    const body =
        document.getElementById(
            'account-management-body'
        );


    if (!body) {

        return;
    }


    if (
        allManagedAccounts.length ===
        0
    ) {

        body.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="message-row"
                >
                    No accounts found.
                </td>
            </tr>
        `;

        return;
    }


    body.innerHTML =
        '';


    allManagedAccounts.forEach(
        account => {

            const row =
                document.createElement(
                    'tr'
                );


            const statusClass =
                String(
                    account.status ||
                    ''
                )
                    .toLowerCase();


            row.innerHTML = `

                <td>
                    #${escapeAccountHtml(
                account.account_id
            )}
                </td>


                <td>
                    <strong class="customer-account-number">
                        ${escapeAccountHtml(
                account.account_number
            )}
                    </strong>
                </td>


                <td>
                    ${escapeAccountHtml(
                account.customer_id
            )}
                </td>


                <td>
                    ${escapeAccountHtml(
                getManagedAccountType(
                    account.account_type_id
                )
            )}
                </td>


                <td>
                    ${escapeAccountHtml(
                getManagedBranch(
                    account.branch_id
                )
            )}
                </td>


                <td>
                    ৳${formatAccountMoney(
                account.balance
            )}
                </td>


                <td>
                    ৳${formatAccountMoney(
                account.available_balance
            )}
                </td>


                <td>

                    <span
                        class="account-management-status ${escapeAccountHtml(
                statusClass
            )}"
                    >
                        ${escapeAccountHtml(
                account.status
            )}
                    </span>

                </td>


                <td>

                    <button
                        type="button"
                        class="account-manage-btn"
                        data-account-id="${escapeAccountHtml(
                account.account_id
            )}"
                    >
                        Manage
                    </button>

                </td>

            `;


            body.appendChild(
                row
            );
        }
    );


    attachManagedAccountButtons();
}


// ============================================================
// MANAGE BUTTONS
// ============================================================

function attachManagedAccountButtons() {

    document
        .querySelectorAll(
            '.account-manage-btn'
        )
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    () => {

                        const accountId =
                            Number(
                                button.dataset
                                    .accountId
                            );


                        const account =
                            allManagedAccounts.find(
                                item =>
                                    Number(
                                        item.account_id
                                    )
                                    ===
                                    accountId
                            );


                        if (account) {

                            openAccountStatusModal(
                                account
                            );
                        }
                    }
                );
            }
        );
}


async function searchManagedAccount() {

    console.log('SEARCH ACCOUNT BUTTON CLICKED');


    const input =
        document.getElementById(
            'account-management-search'
        );


    const button =
        document.getElementById(
            'account-management-search-btn'
        );


    const message =
        document.getElementById(
            'account-management-message'
        );


    const resultContainer =
        document.getElementById(
            'account-management-result'
        );


    if (
        !input ||
        !button ||
        !message ||
        !resultContainer
    ) {

        console.error(
            'Account Management HTML elements not found.'
        );

        return;
    }


    const accountNumber =
        input.value.trim();


    if (!accountNumber) {

        alert(
            'Please enter an account number.'
        );

        input.focus();

        return;
    }


    console.log(
        'SEARCHING ACCOUNT:',
        accountNumber
    );


    button.disabled =
        true;


    button.textContent =
        'Searching...';


    message.textContent =
        '';


    resultContainer.innerHTML = `
        <div class="customer-search-loading">
            Searching account...
        </div>
    `;


    try {

        const url =
            `${ACCOUNT_API_BASE}/account-transactions/account/${encodeURIComponent(
                accountNumber
            )}`;


        console.log(
            'REQUEST URL:',
            url
        );


        const response =
            await fetch(
                url
            );


        const result =
            await response.json();


        console.log(
            'ACCOUNT SEARCH RESPONSE:',
            result
        );


        if (!response.ok) {

            throw new Error(
                result.detail ||
                'Account not found.'
            );
        }


        message.style.color =
            '#16a34a';


        message.textContent =
            '✓ Account found successfully.';


        renderManagedAccountSearchResult(
            result
        );

    }

    catch (error) {

        console.error(
            'ACCOUNT SEARCH ERROR:',
            error
        );


        message.style.color =
            '#dc2626';


        message.textContent =
            '✕ '
            +
            error.message;


        resultContainer.innerHTML =
            '';

    }

    finally {

        button.disabled =
            false;


        button.textContent =
            '🔎 Search Account';
    }
}


// ============================================================
// RENDER SEARCH RESULT
// ============================================================

function renderManagedAccountSearchResult(
    account
) {

    const container =
        document.getElementById(
            'account-management-result'
        );


    if (!container) {

        return;
    }


    container.innerHTML = `

        <div class="officer-customer-card account-management-card">

            <div class="officer-customer-header">

                <div>

                    <span class="officer-customer-label">
                        Account
                    </span>


                    <h3>
                        ${escapeAccountHtml(
        account.account_number
    )}
                    </h3>


                    <p>
                        Customer:
                        ${escapeAccountHtml(
        account.customer_name
    )}
                    </p>

                </div>


                <span
                    class="account-management-status ${escapeAccountHtml(
        String(
            account.account_status ||
            ''
        ).toLowerCase()
    )}"
                >
                    ${escapeAccountHtml(
        account.account_status
    )}
                </span>

            </div>


            <div class="officer-customer-grid">


                <div>

                    <span>
                        Account ID
                    </span>

                    <strong>
                        ${escapeAccountHtml(
        account.account_id
    )}
                    </strong>

                </div>


                <div>

                    <span>
                        Customer ID
                    </span>

                    <strong>
                        ${escapeAccountHtml(
        account.customer_id
    )}
                    </strong>

                </div>


                <div>

                    <span>
                        Customer Status
                    </span>

                    <strong>
                        ${escapeAccountHtml(
        account.customer_status
    )}
                    </strong>

                </div>


                <div>

                    <span>
                        Current Balance
                    </span>

                    <strong>
                        ৳${formatAccountMoney(
        account.balance
    )}
                    </strong>

                </div>


                <div>

                    <span>
                        Available Balance
                    </span>

                    <strong>
                        ৳${formatAccountMoney(
        account.available_balance
    )}
                    </strong>

                </div>


                <div>

                    <span>
                        Branch
                    </span>

                    <strong>
                        ${escapeAccountHtml(
        getManagedBranch(
            account.branch_id
        )
    )}
                    </strong>

                </div>

            </div>


            <div class="officer-customer-actions">


                <button
                    type="button"
                    class="account-search-manage-btn"
                >
                    ⚙ Manage Status
                </button>


                ${account.account_status ===
            'ACTIVE'
            ?

            `
                        <button
                            type="button"
                            class="customer-deposit-action account-search-deposit-btn"
                        >
                            💰 Add Money
                        </button>
                    `

            :

            ''
        }


                <button
                    type="button"
                    class="customer-close-result"
                    id="close-account-search-result"
                >
                    ✕ Close
                </button>

            </div>

        </div>

    `;


    // --------------------------------------------------------
    // Manage
    // --------------------------------------------------------

    container
        .querySelector(
            '.account-search-manage-btn'
        )
        ?.addEventListener(
            'click',
            () => {

                /*
                    Convert lookup result to the same shape
                    as /accounts/ results.
                */

                openAccountStatusModal({

                    account_id:
                        account.account_id,

                    account_number:
                        account.account_number,

                    customer_id:
                        account.customer_id,

                    account_type_id:
                        account.account_type_id,

                    branch_id:
                        account.branch_id,

                    balance:
                        account.balance,

                    available_balance:
                        account.available_balance,

                    status:
                        account.account_status

                });
            }
        );


    // --------------------------------------------------------
    // Add Money
    // --------------------------------------------------------

    container
        .querySelector(
            '.account-search-deposit-btn'
        )
        ?.addEventListener(
            'click',
            () => {

                const depositInput =
                    document.getElementById(
                        'deposit-account-number'
                    );


                if (depositInput) {

                    depositInput.value =
                        account.account_number;


                    if (
                        typeof showOfficerSection ===
                        'function'
                    ) {

                        showOfficerSection(
                            'deposit-section'
                        );
                    }


                    if (
                        typeof window
                            .searchOfficerDepositAccount
                        ===
                        'function'
                    ) {

                        setTimeout(
                            () => {

                                window
                                    .searchOfficerDepositAccount();

                            },
                            150
                        );
                    }
                }
            }
        );


    // --------------------------------------------------------
    // Close result
    // --------------------------------------------------------

    document
        .getElementById(
            'close-account-search-result'
        )
        ?.addEventListener(
            'click',
            clearManagedAccountSearch
        );
}


// ============================================================
// CLEAR SEARCH RESULT
// ============================================================

function clearManagedAccountSearch() {

    const input =
        document.getElementById(
            'account-management-search'
        );


    const message =
        document.getElementById(
            'account-management-message'
        );


    const container =
        document.getElementById(
            'account-management-result'
        );


    if (input) {

        input.value =
            '';

        input.focus();
    }


    if (message) {

        message.textContent =
            '';
    }


    if (container) {

        container.innerHTML =
            '';
    }
}


// ============================================================
// OPEN STATUS MODAL
// ============================================================

function openAccountStatusModal(
    account
) {

    selectedManagedAccount =
        account;


    setAccountText(
        'status-account-id',
        account.account_id
    );


    setAccountText(
        'status-account-number',
        account.account_number
    );


    setAccountText(
        'status-current-status',
        account.status
    );


    setAccountText(
        'status-available-balance',
        `৳${formatAccountMoney(
            account.available_balance
        )}`
    );


    const statusSelect =
        document.getElementById(
            'new-account-status'
        );


    if (statusSelect) {

        statusSelect.value =
            account.status;
    }


    const message =
        document.getElementById(
            'account-status-message'
        );


    if (message) {

        message.textContent =
            '';
    }


    document
        .getElementById(
            'account-status-modal'
        )
        ?.classList.add(
            'show'
        );
}


// ============================================================
// CLOSE STATUS MODAL
// ============================================================

function closeAccountStatusModal() {

    document
        .getElementById(
            'account-status-modal'
        )
        ?.classList.remove(
            'show'
        );


    selectedManagedAccount =
        null;
}


// ============================================================
// UPDATE ACCOUNT STATUS
// ============================================================

async function updateManagedAccountStatus() {

    if (!selectedManagedAccount) {

        alert(
            'No account selected.'
        );

        return;
    }


    const status =
        document.getElementById(
            'new-account-status'
        ).value;


    const button =
        document.getElementById(
            'save-account-status-btn'
        );


    const message =
        document.getElementById(
            'account-status-message'
        );


    if (
        status ===
        selectedManagedAccount.status
    ) {

        alert(
            'Please select a different account status.'
        );

        return;
    }


    const confirmed =
        confirm(
            `Change account ${selectedManagedAccount.account_number} from ${selectedManagedAccount.status} to ${status}?`
        );


    if (!confirmed) {

        return;
    }


    button.disabled =
        true;


    button.textContent =
        'Updating...';


    message.textContent =
        '';


    try {

        /*
            IMPORTANT:
            account.py requires all three values:
            balance
            available_balance
            status

            We preserve both balances exactly.
        */

        const response =
            await fetch(
                `${ACCOUNT_API_BASE}/accounts/${selectedManagedAccount.account_id}`,
                {
                    method:
                        'PUT',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify({

                            balance:
                                selectedManagedAccount
                                    .balance,

                            available_balance:
                                selectedManagedAccount
                                    .available_balance,

                            status:
                                status
                        })
                }
            );


        const updatedAccount =
            await response.json();


        if (!response.ok) {

            throw new Error(
                updatedAccount.detail ||
                'Account status update failed.'
            );
        }


        message.style.color =
            '#16a34a';


        message.textContent =
            '✓ Account status updated successfully.';


        await loadManagedAccounts();


        setTimeout(
            () => {

                closeAccountStatusModal();

                clearManagedAccountSearch();

            },
            700
        );

    }

    catch (error) {

        console.error(
            'ACCOUNT UPDATE ERROR:',
            error
        );


        message.style.color =
            '#dc2626';


        message.textContent =
            '✕ '
            +
            error.message;

    }

    finally {

        button.disabled =
            false;


        button.textContent =
            '✓ Update Status';
    }
}


// ============================================================
// ACCOUNT TYPE
// ============================================================

function getManagedAccountType(
    typeId
) {

    const types = {

        1: 'Savings',
        2: 'Current',
        3: 'Student',
        4: 'Business'

    };


    return (
        types[
        Number(typeId)
        ]
        ||
        `Type ${typeId ?? '-'}`
    );
}


// ============================================================
// BRANCH
// ============================================================

function getManagedBranch(
    branchId
) {

    const branches = {

        1: 'Dhanmondi',
        2: 'Gulshan',
        3: 'Uttara',
        4: 'Agrabad'

    };


    return (
        branches[
        Number(branchId)
        ]
        ||
        `Branch ${branchId ?? '-'}`
    );
}


// ============================================================
// HELPERS
// ============================================================

function formatAccountMoney(
    value
) {

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


function setAccountText(
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


function escapeAccountHtml(
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