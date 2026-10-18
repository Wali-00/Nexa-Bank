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
        // LOCAL DATA
        // ====================================================

        let loanTypes = [];

        let customerLoans = [];

        let selectedPayment = null;


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


        function formatApiError(
            result,
            fallback
        ) {

            if (
                Array.isArray(
                    result?.detail
                )
            ) {

                return result.detail
                    .map(
                        error =>
                            `${error.loc?.join('.') || 'request'}: ${error.msg}`
                    )
                    .join('\n');
            }


            if (result?.detail) {

                return result.detail;
            }


            return fallback;
        }


        function getStatusClass(status) {

            return String(
                status ||
                ''
            )
                .toLowerCase()
                .replace(
                    /\s+/g,
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


        // ====================================================
        // LOAD LOAN TYPES
        // ====================================================

        async function loadLoanTypes() {

            const loanTypeSelect =
                document.getElementById(
                    'loan-type-id'
                );


            try {

                const response =
                    await fetch(
                        `${API_BASE}/loan-types/`
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.detail ||
                        'Failed to load loan types.'
                    );
                }


                loanTypes =
                    Array.isArray(result)
                        ? result
                        : [];


                loanTypeSelect.innerHTML = `
                    <option value="">
                        Select loan type
                    </option>
                `;


                loanTypes.forEach(
                    loanType => {

                        const option =
                            document.createElement(
                                'option'
                            );


                        option.value =
                            loanType.loan_type_id;


                        option.textContent =
                            `${loanType.type_name} — ${loanType.interest_rate}% interest`;


                        loanTypeSelect.appendChild(
                            option
                        );
                    }
                );


                if (
                    loanTypes.length ===
                    0
                ) {

                    loanTypeSelect.innerHTML = `
                        <option value="">
                            No loan types available
                        </option>
                    `;
                }

            }

            catch (error) {

                console.error(
                    'LOAN TYPE LOAD ERROR:',
                    error
                );


                loanTypeSelect.innerHTML = `
                    <option value="">
                        Unable to load loan types
                    </option>
                `;
            }
        }


        // ====================================================
        // GET SELECTED LOAN TYPE
        // ====================================================

        function getSelectedLoanType() {

            const selectedId =
                Number(
                    document.getElementById(
                        'loan-type-id'
                    ).value
                );


            return loanTypes.find(
                loanType =>
                    Number(
                        loanType.loan_type_id
                    )
                    ===
                    selectedId
            );
        }


        // ====================================================
        // SHOW LOAN TYPE DETAILS
        // ====================================================

        function showLoanTypeDetails() {

            const details =
                document.getElementById(
                    'loan-type-details'
                );


            const selectedLoan =
                getSelectedLoanType();


            if (!selectedLoan) {

                details.style.display =
                    'none';

                return;
            }


            document.getElementById(
                'selected-loan-name'
            ).textContent =
                selectedLoan.type_name;


            document.getElementById(
                'selected-interest-rate'
            ).textContent =
                `${selectedLoan.interest_rate}%`;


            document.getElementById(
                'selected-max-amount'
            ).textContent =
                `৳${formatMoney(
                    selectedLoan.max_amount
                )}`;


            document.getElementById(
                'selected-max-duration'
            ).textContent =
                `${selectedLoan.max_duration_months} months`;


            details.style.display =
                'block';


            const amountInput =
                document.getElementById(
                    'requested-amount'
                );


            const durationInput =
                document.getElementById(
                    'duration-months'
                );


            amountInput.max =
                selectedLoan.max_amount;


            durationInput.max =
                selectedLoan.max_duration_months;
        }


        // ====================================================
        // SUBMIT LOAN APPLICATION
        // ====================================================

        async function submitLoanApplication() {

            const loanTypeId =
                Number(
                    document.getElementById(
                        'loan-type-id'
                    ).value
                );


            const requestedAmount =
                Number(
                    document.getElementById(
                        'requested-amount'
                    ).value
                );


            const durationMonths =
                Number(
                    document.getElementById(
                        'duration-months'
                    ).value
                );


            const monthlyIncome =
                Number(
                    document.getElementById(
                        'monthly-income'
                    ).value
                );


            const employment =
                document.getElementById(
                    'employment'
                ).value.trim();


            const purpose =
                document.getElementById(
                    'loan-purpose'
                ).value.trim();


            const button =
                document.getElementById(
                    'submit-loan-btn'
                );


            const message =
                document.getElementById(
                    'loan-application-message'
                );


            // -----------------------------------------------
            // VALIDATION
            // -----------------------------------------------

            if (!loanTypeId) {

                alert(
                    'Please select a loan type.'
                );

                return;
            }


            if (
                !Number.isFinite(
                    requestedAmount
                )
                ||
                requestedAmount <= 0
            ) {

                alert(
                    'Please enter a valid requested amount.'
                );

                return;
            }


            if (
                !Number.isInteger(
                    durationMonths
                )
                ||
                durationMonths <= 0
            ) {

                alert(
                    'Please enter a valid loan duration.'
                );

                return;
            }


            if (
                !Number.isFinite(
                    monthlyIncome
                )
                ||
                monthlyIncome <= 0
            ) {

                alert(
                    'Please enter a valid monthly income.'
                );

                return;
            }


            if (!purpose) {

                alert(
                    'Please enter the purpose of the loan.'
                );

                return;
            }


            const selectedLoan =
                getSelectedLoanType();


            if (!selectedLoan) {

                alert(
                    'Selected loan type is invalid.'
                );

                return;
            }


            if (
                requestedAmount
                >
                Number(
                    selectedLoan.max_amount
                )
            ) {

                alert(
                    `Maximum amount for ${selectedLoan.type_name} is ৳${formatMoney(
                        selectedLoan.max_amount
                    )}.`
                );

                return;
            }


            if (
                durationMonths
                >
                Number(
                    selectedLoan.max_duration_months
                )
            ) {

                alert(
                    `Maximum duration for ${selectedLoan.type_name} is ${selectedLoan.max_duration_months} months.`
                );

                return;
            }


            button.disabled =
                true;


            button.textContent =
                'Submitting...';


            message.textContent =
                '';


            try {

                const response =
                    await fetch(
                        `${API_BASE}/loan-applications/`,
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

                                    loan_type_id:
                                        loanTypeId,

                                    requested_amount:
                                        requestedAmount,

                                    duration_months:
                                        durationMonths,

                                    purpose:
                                        purpose,

                                    monthly_income:
                                        monthlyIncome,

                                    employment:
                                        employment || null
                                })
                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        formatApiError(
                            result,
                            'Unable to submit loan application.'
                        )
                    );
                }


                message.style.color =
                    '#16a34a';


                message.textContent =
                    '✓ Loan application submitted successfully.';


                document.getElementById(
                    'loan-application-form'
                ).reset();


                document.getElementById(
                    'loan-type-details'
                ).style.display =
                    'none';


                await loadLoanApplications();

            }

            catch (error) {

                console.error(
                    'LOAN APPLICATION ERROR:',
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
                    'Submit Application';
            }
        }


        // ====================================================
        // LOAD LOAN APPLICATIONS
        // ====================================================

        async function loadLoanApplications() {

            const container =
                document.getElementById(
                    'loan-applications-list'
                );


            try {

                const response =
                    await fetch(
                        `${API_BASE}/loan-applications/`
                    );


                const applications =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        formatApiError(
                            applications,
                            'Failed to load loan applications.'
                        )
                    );
                }


                const customerApplications =
                    (
                        Array.isArray(
                            applications
                        )
                            ? applications
                            : []
                    ).filter(
                        application =>
                            String(
                                application.customer_id
                            )
                            ===
                            String(
                                customerId
                            )
                    );


                const totalElement =
                    document.getElementById(
                        'total-loan-applications'
                    );


                if (totalElement) {

                    totalElement.textContent =
                        customerApplications.length;
                }


                if (
                    customerApplications.length
                    ===
                    0
                ) {

                    container.innerHTML = `
                        <p>
                            No loan applications found.
                        </p>
                    `;

                    return;
                }


                container.innerHTML =
                    '';


                customerApplications.forEach(
                    application => {

                        const loanType =
                            loanTypes.find(
                                type =>
                                    Number(
                                        type.loan_type_id
                                    )
                                    ===
                                    Number(
                                        application.loan_type_id
                                    )
                            );


                        const loanTypeName =
                            loanType
                                ?
                                loanType.type_name
                                :
                                `Loan Type ${application.loan_type_id}`;


                        const statusClass =
                            getStatusClass(
                                application.status
                            );


                        const card =
                            document.createElement(
                                'div'
                            );


                        card.className =
                            'loan-card';


                        card.innerHTML = `

                            <div class="loan-card-header">

                                <div>

                                    <h3>
                                        ${escapeHtml(
                                            loanTypeName
                                        )}
                                    </h3>

                                    <p>
                                        Application #${escapeHtml(
                                            application.loan_application_id
                                        )}
                                    </p>

                                </div>


                                <span
                                    class="loan-status ${escapeHtml(
                                        statusClass
                                    )}"
                                >
                                    ${escapeHtml(
                                        application.status
                                    )}
                                </span>

                            </div>


                            <div class="loan-details-grid">

                                <div>

                                    <span class="info-label">
                                        Requested Amount
                                    </span>

                                    <strong>
                                        ৳${formatMoney(
                                            application.requested_amount
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span class="info-label">
                                        Duration
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            application.duration_months
                                        )}
                                        months
                                    </strong>

                                </div>


                                <div>

                                    <span class="info-label">
                                        Monthly Income
                                    </span>

                                    <strong>
                                        ৳${formatMoney(
                                            application.monthly_income
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span class="info-label">
                                        Submitted
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            formatDate(
                                                application.submitted_at
                                            )
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span class="info-label">
                                        Employment
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            application.employment ||
                                            '-'
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span class="info-label">
                                        Reviewed
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            formatDate(
                                                application.reviewed_at
                                            )
                                        )}
                                    </strong>

                                </div>


                                <div class="loan-full-width">

                                    <span class="info-label">
                                        Purpose
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            application.purpose
                                        )}
                                    </strong>

                                </div>


                                ${
                                    application.rejection_reason
                                        ?
                                        `
                                            <div class="loan-full-width">

                                                <span class="info-label">
                                                    Rejection Reason
                                                </span>

                                                <strong class="loan-rejection">
                                                    ${escapeHtml(
                                                        application.rejection_reason
                                                    )}
                                                </strong>

                                            </div>
                                        `
                                        :
                                        ''
                                }

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
                    'LOAN APPLICATION LOAD ERROR:',
                    error
                );


                container.innerHTML = `
                    <p>
                        Unable to load loan applications.
                    </p>
                `;
            }
        }


        // ====================================================
        // LOAD CUSTOMER LOANS
        // ====================================================

        async function loadLoans() {

            const container =
                document.getElementById(
                    'loans-list'
                );


            container.innerHTML = `
                <p>
                    Loading loans...
                </p>
            `;


            try {

                const response =
                    await fetch(
                        `${API_BASE}/loans/`
                    );


                const loans =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        formatApiError(
                            loans,
                            'Unable to load loans.'
                        )
                    );
                }


                customerLoans =
                    (
                        Array.isArray(loans)
                            ? loans
                            : []
                    ).filter(
                        loan =>
                            String(
                                loan.customer_id
                            )
                            ===
                            String(
                                customerId
                            )
                    );


                // -------------------------------------------
                // ACTIVE LOANS
                // -------------------------------------------

                const activeLoans =
                    customerLoans.filter(
                        loan =>
                            loan.status ===
                            'ACTIVE'
                    );


                const activeElement =
                    document.getElementById(
                        'active-loans'
                    );


                if (activeElement) {

                    activeElement.textContent =
                        activeLoans.length;
                }


                // -------------------------------------------
                // OUTSTANDING
                // -------------------------------------------

                let outstandingTotal =
                    0;


                customerLoans.forEach(
                    loan => {

                        outstandingTotal +=
                            Number(
                                loan.outstanding_amount ||
                                0
                            );
                    }
                );


                document.getElementById(
                    'total-outstanding'
                ).textContent =
                    formatMoney(
                        outstandingTotal
                    );


                // -------------------------------------------
                // EMPTY
                // -------------------------------------------

                if (
                    customerLoans.length ===
                    0
                ) {

                    container.innerHTML = `
                        <p>
                            No loans found.
                        </p>
                    `;

                    return;
                }


                container.innerHTML =
                    '';


                // -------------------------------------------
                // RENDER LOANS
                // -------------------------------------------

                customerLoans.forEach(
                    loan => {

                        const loanType =
                            loanTypes.find(
                                type =>
                                    Number(
                                        type.loan_type_id
                                    )
                                    ===
                                    Number(
                                        loan.loan_type_id
                                    )
                            );


                        const statusClass =
                            getStatusClass(
                                loan.status
                            );


                        const canViewInstallments =
                            [
                                'ACTIVE',
                                'DEFAULTED',
                                'COMPLETED'
                            ].includes(
                                loan.status
                            );


                        const card =
                            document.createElement(
                                'div'
                            );


                        card.className =
                            'loan-card';


                        card.dataset.loanId =
                            loan.loan_id;


                        card.innerHTML = `

                            <div class="loan-card-header">

                                <div>

                                    <h3>

                                        ${escapeHtml(
                                            loanType
                                                ?
                                                loanType.type_name
                                                :
                                                `Loan #${loan.loan_id}`
                                        )}

                                    </h3>

                                    <p>
                                        Loan #${escapeHtml(
                                            loan.loan_id
                                        )}
                                    </p>

                                </div>


                                <span
                                    class="loan-status ${escapeHtml(
                                        statusClass
                                    )}"
                                >
                                    ${escapeHtml(
                                        loan.status
                                    )}
                                </span>

                            </div>


                            <div class="loan-details-grid">

                                <div>

                                    <span class="info-label">
                                        Principal
                                    </span>

                                    <strong>
                                        ৳${formatMoney(
                                            loan.principal_amount
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span class="info-label">
                                        Outstanding
                                    </span>

                                    <strong>
                                        ৳${formatMoney(
                                            loan.outstanding_amount
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span class="info-label">
                                        Interest Rate
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            loan.interest_rate
                                        )}%
                                    </strong>

                                </div>


                                <div>

                                    <span class="info-label">
                                        Duration
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            loan.duration_months
                                        )}
                                        months
                                    </strong>

                                </div>


                                <div>

                                    <span class="info-label">
                                        Monthly EMI
                                    </span>

                                    <strong>
                                        ৳${formatMoney(
                                            loan.monthly_emi
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span class="info-label">
                                        Disbursement Date
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            formatDate(
                                                loan.disbursement_date
                                            )
                                        )}
                                    </strong>

                                </div>

                            </div>


                            ${
                                canViewInstallments
                                    ?
                                    `
                                        <div class="edit-actions">

                                            <button
                                                type="button"
                                                class="update-btn view-installments-btn"
                                                data-loan-id="${loan.loan_id}"
                                            >
                                                View Installments
                                            </button>

                                        </div>


                                        <div
                                            id="installments-${loan.loan_id}"
                                            class="loan-installments-container"
                                            style="display:none;"
                                        >
                                        </div>
                                    `
                                    :
                                    `
                                        <p class="loan-payment-info">
                                            Installments will become available
                                            after this loan is disbursed.
                                        </p>
                                    `
                            }

                        `;


                        container.appendChild(
                            card
                        );
                    }
                );


                bindInstallmentButtons();

            }

            catch (error) {

                console.error(
                    'LOAN LOAD ERROR:',
                    error
                );


                container.innerHTML = `
                    <p>
                        Unable to load loans.
                    </p>
                `;
            }
        }


        // ====================================================
        // BIND VIEW INSTALLMENT BUTTONS
        // ====================================================

        function bindInstallmentButtons() {

            document
                .querySelectorAll(
                    '.view-installments-btn'
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            'click',
                            async () => {

                                const loanId =
                                    Number(
                                        button.dataset.loanId
                                    );


                                const container =
                                    document.getElementById(
                                        `installments-${loanId}`
                                    );


                                if (
                                    container.style.display ===
                                    'block'
                                ) {

                                    container.style.display =
                                        'none';


                                    button.textContent =
                                        'View Installments';


                                    return;
                                }


                                await loadInstallments(
                                    loanId,
                                    container,
                                    button
                                );
                            }
                        );
                    }
                );
        }


        // ====================================================
        // LOAD CUSTOMER LOAN INSTALLMENTS
        // ====================================================

        async function loadInstallments(
            loanId,
            container,
            button
        ) {

            container.style.display =
                'block';


            container.innerHTML = `
                <p>
                    Loading installments...
                </p>
            `;


            button.disabled =
                true;


            button.textContent =
                'Loading...';


            try {

                const response =
                    await fetch(
                        `${API_BASE}/loan-payments/customer/${customerId}/loan/${loanId}`
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        formatApiError(
                            result,
                            'Unable to load installments.'
                        )
                    );
                }


                const installments =
                    Array.isArray(
                        result.installments
                    )
                        ?
                        result.installments
                        :
                        [];


                renderInstallments(
                    loanId,
                    installments,
                    container
                );


                button.textContent =
                    'Hide Installments';

            }

            catch (error) {

                console.error(
                    'INSTALLMENT LOAD ERROR:',
                    error
                );


                container.innerHTML = `
                    <p class="loan-payment-error">
                        ${escapeHtml(
                            error.message
                        )}
                    </p>
                `;


                button.textContent =
                    'View Installments';
            }

            finally {

                button.disabled =
                    false;
            }
        }


        // ====================================================
        // RENDER INSTALLMENTS
        // ====================================================

        function renderInstallments(
            loanId,
            installments,
            container
        ) {

            if (!installments.length) {

                container.innerHTML = `
                    <p>
                        No repayment schedule is available yet.
                    </p>
                `;

                return;
            }


            const unpaidInstallments =
                installments.filter(
                    installment =>
                        installment.status !==
                        'PAID'
                );


            const nextUnpaidPaymentId =
                unpaidInstallments.length
                    ?
                    Number(
                        unpaidInstallments[0]
                            .loan_payment_id
                    )
                    :
                    null;


            let html = `

                <div class="loan-installments-header">

                    <h3>
                        Repayment Schedule
                    </h3>

                    <span>
                        ${installments.length}
                        installment${installments.length === 1 ? '' : 's'}
                    </span>

                </div>


                <div class="table-container">

                    <table class="dashboard-table">

                        <thead>

                            <tr>

                                <th>
                                    #
                                </th>

                                <th>
                                    Due Date
                                </th>

                                <th>
                                    Amount Due
                                </th>

                                <th>
                                    Amount Paid
                                </th>

                                <th>
                                    Late Fee
                                </th>

                                <th>
                                    Total Due
                                </th>

                                <th>
                                    Status
                                </th>

                                <th>
                                    Payment Date
                                </th>

                                <th>
                                    Action
                                </th>

                            </tr>

                        </thead>


                        <tbody>
            `;


            installments.forEach(
                installment => {

                    const amountDue =
                        Number(
                            installment.amount_due ||
                            0
                        );


                    const amountPaid =
                        Number(
                            installment.amount_paid ||
                            0
                        );


                    const lateFee =
                        Number(
                            installment.late_fee ||
                            0
                        );


                    const remaining =
                        Math.max(
                            0,
                            amountDue -
                            amountPaid
                        );


                    const totalDue =
                        remaining +
                        lateFee;


                    const isPaid =
                        installment.status ===
                        'PAID';


                    const isNextUnpaid =
                        Number(
                            installment.loan_payment_id
                        )
                        ===
                        nextUnpaidPaymentId;


                    let actionHtml =
                        '-';


                    if (!isPaid) {

                        if (isNextUnpaid) {

                            actionHtml = `

                                <button
                                    type="button"
                                    class="update-btn customer-pay-installment-btn"
                                    data-loan-id="${loanId}"
                                    data-payment-id="${installment.loan_payment_id}"
                                >
                                    Pay Now
                                </button>
                            `;

                        } else {

                            actionHtml = `
                                <span class="loan-payment-waiting">
                                    Pay previous installment first
                                </span>
                            `;
                        }
                    }


                    html += `

                        <tr>

                            <td>
                                ${escapeHtml(
                                    installment.installment_no
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    formatDate(
                                        installment.due_date
                                    )
                                )}
                            </td>


                            <td>
                                ৳${formatMoney(
                                    amountDue
                                )}
                            </td>


                            <td>
                                ৳${formatMoney(
                                    amountPaid
                                )}
                            </td>


                            <td>
                                ৳${formatMoney(
                                    lateFee
                                )}
                            </td>


                            <td>

                                <strong>
                                    ৳${formatMoney(
                                        totalDue
                                    )}
                                </strong>

                            </td>


                            <td>

                                <span
                                    class="loan-status ${escapeHtml(
                                        getStatusClass(
                                            installment.status
                                        )
                                    )}"
                                >
                                    ${escapeHtml(
                                        installment.status
                                    )}
                                </span>

                            </td>


                            <td>
                                ${escapeHtml(
                                    formatDate(
                                        installment.payment_date
                                    )
                                )}
                            </td>


                            <td>
                                ${actionHtml}
                            </td>

                        </tr>
                    `;
                }
            );


            html += `

                        </tbody>

                    </table>

                </div>
            `;


            container.innerHTML =
                html;


            bindPaymentButtons(
                installments
            );
        }


        // ====================================================
        // BIND CUSTOMER PAYMENT BUTTONS
        // ====================================================

        function bindPaymentButtons(
            installments
        ) {

            document
                .querySelectorAll(
                    '.customer-pay-installment-btn'
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            'click',
                            () => {

                                const loanId =
                                    Number(
                                        button.dataset.loanId
                                    );


                                const paymentId =
                                    Number(
                                        button.dataset.paymentId
                                    );


                                const installment =
                                    installments.find(
                                        item =>
                                            Number(
                                                item.loan_payment_id
                                            )
                                            ===
                                            paymentId
                                    );


                                if (!installment) {

                                    alert(
                                        'Installment information could not be found.'
                                    );

                                    return;
                                }


                                openPaymentModal(
                                    loanId,
                                    installment
                                );
                            }
                        );
                    }
                );
        }


        // ====================================================
        // OPEN PAYMENT MODAL
        // ====================================================

        function openPaymentModal(
            loanId,
            installment
        ) {

            const amountDue =
                Number(
                    installment.amount_due ||
                    0
                );


            const amountPaid =
                Number(
                    installment.amount_paid ||
                    0
                );


            const lateFee =
                Number(
                    installment.late_fee ||
                    0
                );


            const remaining =
                Math.max(
                    0,
                    amountDue -
                    amountPaid
                );


            const total =
                remaining +
                lateFee;


            selectedPayment = {

                loan_id:
                    loanId,

                loan_payment_id:
                    Number(
                        installment.loan_payment_id
                    ),

                installment_no:
                    Number(
                        installment.installment_no
                    ),

                remaining:
                    remaining,

                late_fee:
                    lateFee,

                total:
                    total,

                due_date:
                    installment.due_date
            };


            document.getElementById(
                'customer-payment-loan-id'
            ).textContent =
                `#${loanId}`;


            document.getElementById(
                'customer-payment-installment-no'
            ).textContent =
                `#${installment.installment_no}`;


            document.getElementById(
                'customer-payment-installment-amount'
            ).textContent =
                `৳${formatMoney(
                    remaining
                )}`;


            document.getElementById(
                'customer-payment-late-fee'
            ).textContent =
                `৳${formatMoney(
                    lateFee
                )}`;


            document.getElementById(
                'customer-payment-total'
            ).textContent =
                `৳${formatMoney(
                    total
                )}`;


            document.getElementById(
                'customer-payment-due-date'
            ).textContent =
                formatDate(
                    installment.due_date
                );


            document.getElementById(
                'customer-payment-description'
            ).value =
                `Online payment for Loan #${loanId}, Installment #${installment.installment_no}`;


            const message =
                document.getElementById(
                    'customer-loan-payment-message'
                );


            message.textContent =
                '';


            document.getElementById(
                'customer-loan-payment-modal'
            ).style.display =
                'flex';
        }


        // ====================================================
        // CLOSE PAYMENT MODAL
        // ====================================================

        function closePaymentModal() {

            selectedPayment =
                null;


            document.getElementById(
                'customer-loan-payment-modal'
            ).style.display =
                'none';


            document.getElementById(
                'customer-loan-payment-message'
            ).textContent =
                '';
        }


        // ====================================================
        // PAY INSTALLMENT ONLINE
        // ====================================================

        async function submitCustomerLoanPayment() {

            if (!selectedPayment) {

                return;
            }


            const button =
                document.getElementById(
                    'confirm-customer-loan-payment-btn'
                );


            const message =
                document.getElementById(
                    'customer-loan-payment-message'
                );


            const description =
                document.getElementById(
                    'customer-payment-description'
                ).value.trim()
                ||
                'Online loan installment payment';


            const confirmed =
                confirm(
                    `Pay installment #${selectedPayment.installment_no}?\n\n`
                    +
                    `Total payment: ৳${formatMoney(
                        selectedPayment.total
                    )}\n\n`
                    +
                    `Nexa Bank will automatically debit one of your active accounts with sufficient balance.`
                );


            if (!confirmed) {

                return;
            }


            button.disabled =
                true;


            button.textContent =
                'Processing...';


            message.style.color =
                '#475569';


            message.textContent =
                'Processing your payment...';


            try {

                const response =
                    await fetch(
                        `${API_BASE}/loan-transactions/customer-payment`,
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

                                    user_id:
                                        Number(
                                            userId
                                        ),

                                    loan_id:
                                        Number(
                                            selectedPayment.loan_id
                                        ),

                                    loan_payment_id:
                                        Number(
                                            selectedPayment.loan_payment_id
                                        ),

                                    description:
                                        description
                                })
                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        formatApiError(
                            result,
                            'Loan payment failed.'
                        )
                    );
                }


                message.style.color =
                    '#16a34a';


                message.innerHTML = `

                    ✓ Payment successful.<br>

                    Reference:
                    <strong>
                        ${escapeHtml(
                            result.reference_no
                        )}
                    </strong>

                    <br>

                    Debited account:
                    <strong>
                        ${escapeHtml(
                            result.debited_account_number ||
                            result.account_number ||
                            '-'
                        )}
                    </strong>

                    <br>

                    Amount:
                    <strong>
                        ৳${formatMoney(
                            result.amount_paid
                        )}
                    </strong>
                `;


                const paidLoanId =
                    selectedPayment.loan_id;


                // Reload loan data so outstanding amount/status updates.
                await loadLoans();


                setTimeout(
                    async () => {

                        closePaymentModal();


                        // Find the refreshed loan card.
                        const installmentContainer =
                            document.getElementById(
                                `installments-${paidLoanId}`
                            );


                        const viewButton =
                            document.querySelector(
                                `.view-installments-btn[data-loan-id="${paidLoanId}"]`
                            );


                        if (
                            installmentContainer &&
                            viewButton
                        ) {

                            await loadInstallments(
                                paidLoanId,
                                installmentContainer,
                                viewButton
                            );
                        }

                    },
                    1200
                );

            }

            catch (error) {

                console.error(
                    'CUSTOMER LOAN PAYMENT ERROR:',
                    error
                );


                message.style.color =
                    '#dc2626';


                message.textContent =
                    '✕ ' +
                    error.message;
            }

            finally {

                button.disabled =
                    false;


                button.textContent =
                    '💳 Pay Now';
            }
        }


        // ====================================================
        // EVENTS
        // ====================================================

        document.getElementById(
            'loan-type-id'
        ).addEventListener(
            'change',
            showLoanTypeDetails
        );


        document.getElementById(
            'loan-application-form'
        ).addEventListener(
            'submit',
            event => {

                event.preventDefault();

                submitLoanApplication();
            }
        );


        document.getElementById(
            'loan-application-form'
        ).addEventListener(
            'reset',
            () => {

                setTimeout(
                    () => {

                        document.getElementById(
                            'loan-type-details'
                        ).style.display =
                            'none';

                    },
                    0
                );
            }
        );


        document.getElementById(
            'confirm-customer-loan-payment-btn'
        ).addEventListener(
            'click',
            submitCustomerLoanPayment
        );


        document.getElementById(
            'cancel-customer-loan-payment-btn'
        ).addEventListener(
            'click',
            closePaymentModal
        );


        document.getElementById(
            'close-customer-loan-payment-modal'
        ).addEventListener(
            'click',
            closePaymentModal
        );


        // Close modal if background clicked.
        document.getElementById(
            'customer-loan-payment-modal'
        ).addEventListener(
            'click',
            event => {

                if (
                    event.target.id ===
                    'customer-loan-payment-modal'
                ) {

                    closePaymentModal();
                }
            }
        );


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


                    clearSession();


                    window.location.href =
                        'login.html';
                }
            );
        }


        // ====================================================
        // INITIAL LOAD
        // ====================================================

        async function initializePage() {

            await loadCustomer();

            await loadLoanTypes();

            await loadLoanApplications();

            await loadLoans();
        }


        initializePage();

    }
);