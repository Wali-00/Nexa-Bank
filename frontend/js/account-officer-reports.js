// ============================================================
// NEXA BANK
// ACCOUNT OFFICER REPORTS
// ============================================================

const REPORT_API_BASE =
    'http://127.0.0.1:8000';


let reportCustomers =
    [];


let reportAccounts =
    [];


let reportApplications =
    [];


let reportKyc =
    [];


let reportTransactions =
    [];


// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener(
    'DOMContentLoaded',
    () => {

        initializeReportEvents();

        loadOfficerReports();

    }
);


// ============================================================
// EVENTS
// ============================================================

function initializeReportEvents() {

    const refreshButton =
        document.getElementById(
            'refresh-reports-btn'
        );


    if (refreshButton) {

        refreshButton.addEventListener(
            'click',
            loadOfficerReports
        );
    }
}


// ============================================================
// LOAD ALL REPORT DATA
// ============================================================

async function loadOfficerReports() {

    const statusMessage =
        document.getElementById(
            'reports-status-message'
        );


    const refreshButton =
        document.getElementById(
            'refresh-reports-btn'
        );


    if (statusMessage) {

        statusMessage.textContent =
            'Loading report data...';
    }


    if (refreshButton) {

        refreshButton.disabled =
            true;


        refreshButton.textContent =
            'Loading...';
    }


    try {

        const [
            customersResponse,
            accountsResponse,
            applicationsResponse,
            kycResponse,
            transactionsResponse

        ] = await Promise.all([

            fetch(
                `${REPORT_API_BASE}/customers/`
            ),

            fetch(
                `${REPORT_API_BASE}/accounts/`
            ),

            fetch(
                `${REPORT_API_BASE}/account-applications/`
            ),

            fetch(
                `${REPORT_API_BASE}/kyc-verifications/`
            ),

            fetch(
                `${REPORT_API_BASE}/transactions/`
            )

        ]);


        // ----------------------------------------------------
        // Parse JSON
        // ----------------------------------------------------

        const customers =
            await customersResponse.json();


        const accounts =
            await accountsResponse.json();


        const applications =
            await applicationsResponse.json();


        const kyc =
            await kycResponse.json();


        const transactions =
            await transactionsResponse.json();


        // ----------------------------------------------------
        // Validate requests
        // ----------------------------------------------------

        if (!customersResponse.ok) {

            throw new Error(
                customers.detail ||
                'Failed to load customers.'
            );
        }


        if (!accountsResponse.ok) {

            throw new Error(
                accounts.detail ||
                'Failed to load accounts.'
            );
        }


        if (!applicationsResponse.ok) {

            throw new Error(
                applications.detail ||
                'Failed to load account applications.'
            );
        }


        if (!kycResponse.ok) {

            throw new Error(
                kyc.detail ||
                'Failed to load KYC records.'
            );
        }


        if (!transactionsResponse.ok) {

            throw new Error(
                transactions.detail ||
                'Failed to load transactions.'
            );
        }


        // ----------------------------------------------------
        // Store data
        // ----------------------------------------------------

        reportCustomers =
            Array.isArray(
                customers
            )
                ?
                customers
                :
                [];


        reportAccounts =
            Array.isArray(
                accounts
            )
                ?
                accounts
                :
                [];


        reportApplications =
            Array.isArray(
                applications
            )
                ?
                applications
                :
                [];


        reportKyc =
            Array.isArray(
                kyc
            )
                ?
                kyc
                :
                [];


        reportTransactions =
            Array.isArray(
                transactions
            )
                ?
                transactions
                :
                [];


        // ----------------------------------------------------
        // Build reports
        // ----------------------------------------------------

        updateMainReportSummary();

        updateAccountStatusReport();

        updateApplicationReport();

        updateKycReport();

        renderAccountTypeReport();

        renderRecentTransactionReport();


        if (statusMessage) {

            statusMessage.textContent =
                '✓ Reports loaded successfully.';
        }

    }

    catch (error) {

        console.error(
            'REPORT LOAD ERROR:',
            error
        );


        if (statusMessage) {

            statusMessage.textContent =
                '✕ Report loading failed: '
                +
                error.message;
        }

    }

    finally {

        if (refreshButton) {

            refreshButton.disabled =
                false;


            refreshButton.textContent =
                '↻ Refresh Reports';
        }
    }
}


// ============================================================
// MAIN SUMMARY
// ============================================================

function updateMainReportSummary() {

    const totalBalance =
        reportAccounts.reduce(
            (
                total,
                account
            ) => {

                return (
                    total
                    +
                    Number(
                        account.balance ||
                        0
                    )
                );

            },
            0
        );


    setReportText(
        'report-total-customers',
        reportCustomers.length
    );


    setReportText(
        'report-total-accounts',
        reportAccounts.length
    );


    setReportText(
        'report-total-balance',
        `৳${formatReportMoney(
            totalBalance
        )}`
    );


    setReportText(
        'report-total-transactions',
        reportTransactions.length
    );
}


// ============================================================
// ACCOUNT STATUS
// ============================================================

function updateAccountStatusReport() {

    setReportText(
        'report-active-accounts',
        countReportStatus(
            reportAccounts,
            'ACTIVE'
        )
    );


    setReportText(
        'report-pending-accounts',
        countReportStatus(
            reportAccounts,
            'PENDING'
        )
    );


    setReportText(
        'report-frozen-accounts',
        countReportStatus(
            reportAccounts,
            'FROZEN'
        )
    );


    setReportText(
        'report-closed-accounts',
        countReportStatus(
            reportAccounts,
            'CLOSED'
        )
    );
}


// ============================================================
// APPLICATION REPORT
// ============================================================

function updateApplicationReport() {

    setReportText(
        'report-total-applications',
        reportApplications.length
    );


    setReportText(
        'report-submitted-applications',
        countReportStatus(
            reportApplications,
            'SUBMITTED'
        )
    );


    setReportText(
        'report-review-applications',
        countReportStatus(
            reportApplications,
            'UNDER_REVIEW'
        )
    );


    setReportText(
        'report-approved-applications',
        countReportStatus(
            reportApplications,
            'APPROVED'
        )
    );


    setReportText(
        'report-rejected-applications',
        countReportStatus(
            reportApplications,
            'REJECTED'
        )
    );
}


// ============================================================
// KYC REPORT
// ============================================================

function updateKycReport() {

    setReportText(
        'report-total-kyc',
        reportKyc.length
    );


    setReportText(
        'report-pending-kyc',
        countReportStatus(
            reportKyc,
            'PENDING'
        )
    );


    setReportText(
        'report-verified-kyc',
        countReportStatus(
            reportKyc,
            'VERIFIED'
        )
    );


    setReportText(
        'report-document-kyc',
        countReportStatus(
            reportKyc,
            'DOCUMENT_REQUIRED'
        )
    );


    setReportText(
        'report-rejected-kyc',
        countReportStatus(
            reportKyc,
            'REJECTED'
        )
    );
}


// ============================================================
// ACCOUNT TYPE REPORT
// ============================================================

function renderAccountTypeReport() {

    const body =
        document.getElementById(
            'report-account-type-body'
        );


    if (!body) {

        return;
    }


    const accountTypes = {

        1: {
            name:
                'Savings',

            count:
                0,

            balance:
                0,

            available:
                0
        },


        2: {
            name:
                'Current',

            count:
                0,

            balance:
                0,

            available:
                0
        },


        3: {
            name:
                'Student',

            count:
                0,

            balance:
                0,

            available:
                0
        },


        4: {
            name:
                'Business',

            count:
                0,

            balance:
                0,

            available:
                0
        }

    };


    reportAccounts.forEach(
        account => {

            const typeId =
                Number(
                    account.account_type_id
                );


            if (!accountTypes[typeId]) {

                accountTypes[typeId] = {

                    name:
                        `Type ${typeId}`,

                    count:
                        0,

                    balance:
                        0,

                    available:
                        0

                };
            }


            accountTypes[
                typeId
            ].count++;


            accountTypes[
                typeId
            ].balance +=
                Number(
                    account.balance ||
                    0
                );


            accountTypes[
                typeId
            ].available +=
                Number(
                    account.available_balance ||
                    0
                );
        }
    );


    body.innerHTML =
        '';


    Object.values(
        accountTypes
    ).forEach(
        type => {

            const row =
                document.createElement(
                    'tr'
                );


            row.innerHTML = `

                <td>
                    ${escapeReportHtml(
                type.name
            )}
                </td>


                <td>
                    ${type.count}
                </td>


                <td>
                    ৳${formatReportMoney(
                type.balance
            )}
                </td>


                <td>
                    ৳${formatReportMoney(
                type.available
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
// RECENT TRANSACTIONS
// ============================================================

function renderRecentTransactionReport() {

    const body =
        document.getElementById(
            'report-transaction-body'
        );


    if (!body) {

        return;
    }


    if (
        reportTransactions.length ===
        0
    ) {

        body.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="message-row"
                >
                    No transactions found.
                </td>

            </tr>

        `;


        return;
    }


    const transactions =
        [...reportTransactions];


    transactions.sort(
        (
            first,
            second
        ) => {

            const firstDate =
                new Date(
                    first.transaction_date ||
                    0
                );


            const secondDate =
                new Date(
                    second.transaction_date ||
                    0
                );


            return (
                secondDate
                -
                firstDate
            );
        }
    );


    const recentTransactions =
        transactions.slice(
            0,
            10
        );


    body.innerHTML =
        '';


    recentTransactions.forEach(
        transaction => {

            const row =
                document.createElement(
                    'tr'
                );


            const statusClass =
                String(
                    transaction.status ||
                    ''
                )
                    .toLowerCase();


            row.innerHTML = `

                <td>
                    #${escapeReportHtml(
                transaction.transaction_id
            )}
                </td>


                <td>
                    ${escapeReportHtml(
                transaction.reference_no ||
                '-'
            )}
                </td>


                <td>
                    ${escapeReportHtml(
                transaction.transaction_type_id
                ??
                '-'
            )}
                </td>


                <td>
                    ৳${formatReportMoney(
                transaction.amount
            )}
                </td>


                <td>

                    <span
                        class="report-transaction-status ${escapeReportHtml(
                statusClass
            )}"
                    >
                        ${escapeReportHtml(
                transaction.status ||
                '-'
            )}
                    </span>

                </td>


                <td>
                    ${escapeReportHtml(
                formatReportDate(
                    transaction.transaction_date
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
// STATUS COUNTER
// ============================================================

function countReportStatus(
    records,
    status
) {

    return records.filter(
        record =>
            String(
                record.status ||
                ''
            )
                .toUpperCase()
            ===
            status
    ).length;
}


// ============================================================
// HELPERS
// ============================================================

function setReportText(
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


function formatReportMoney(
    value
) {

    return Number(
        value ||
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


function formatReportDate(
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


function escapeReportHtml(
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