document.addEventListener(
    'DOMContentLoaded',
    () => {

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

        let customerBeneficiaries = [];


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
        // LOAD BENEFICIARIES
        // ==========================================

        async function loadBeneficiaries() {

            const container =
                document.getElementById(
                    'beneficiary-list'
                );


            try {

                const response =
                    await fetch(
                        `${API_BASE}/beneficiaries/`
                    );


                const beneficiaries =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        beneficiaries.detail ||
                        'Failed to load beneficiaries.'
                    );
                }


                customerBeneficiaries =
                    beneficiaries.filter(
                        beneficiary =>
                            String(
                                beneficiary.customer_id
                            )
                            ===
                            String(
                                customerId
                            )
                    );


                updateSummary();

                renderBeneficiaries();

            }

            catch (error) {

                console.error(
                    'BENEFICIARY LOAD ERROR:',
                    error
                );


                container.innerHTML = `
                    <p>
                        Unable to load Nominees.
                    </p>
                `;
            }
        }


        // ==========================================
        // SUMMARY
        // ==========================================

        function updateSummary() {

            const total =
                customerBeneficiaries.length;


            const active =
                customerBeneficiaries.filter(
                    beneficiary =>
                        String(
                            beneficiary.status
                        ).toUpperCase()
                        ===
                        'ACTIVE'
                ).length;


            const totalElement =
                document.getElementById(
                    'total-beneficiaries'
                );


            const activeElement =
                document.getElementById(
                    'active-beneficiaries'
                );


            if (totalElement) {

                totalElement.textContent =
                    total;
            }


            if (activeElement) {

                activeElement.textContent =
                    active;
            }
        }


        // ==========================================
        // RENDER BENEFICIARIES
        // ==========================================

        function renderBeneficiaries() {

            const container =
                document.getElementById(
                    'beneficiary-list'
                );


            if (
                customerBeneficiaries.length
                ===
                0
            ) {

                container.innerHTML = `
                    <div class="info-item">
                        <span class="info-value">
                            No Nominees added yet.
                        </span>
                    </div>
                `;

                return;
            }


            container.innerHTML = '';


            customerBeneficiaries.forEach(
                beneficiary => {

                    const card =
                        document.createElement(
                            'div'
                        );


                    card.className =
                        'beneficiary-card';


                    const statusClass =
                        String(
                            beneficiary.status ||
                            ''
                        ).toLowerCase();


                    card.innerHTML = `

                        <div class="beneficiary-card-header">

                            <div>

                                <h3>
                                    ${escapeHtml(
                        beneficiary.beneficiary_name
                    )}
                                </h3>

                                <p>
                                    ${escapeHtml(
                        beneficiary.nickname
                        ||
                        'No nickname'
                    )
                        }
                                </p>

                            </div>


                            <span
                                class="beneficiary-status ${escapeHtml(
                            statusClass
                        )}"
                            >
                                ${escapeHtml(
                            beneficiary.status
                        )}
                            </span>

                        </div>


                        <div class="beneficiary-details">

                            <div>

                                <span class="info-label">
                                    Bank
                                </span>

                                <strong>
                                    ${escapeHtml(
                            beneficiary.bank_name
                        )}
                                </strong>

                            </div>


                            <div>

                                <span class="info-label">
                                    Account Number
                                </span>

                                <strong>
                                    ${escapeHtml(
                            beneficiary.account_number
                        )}
                                </strong>

                            </div>

                        </div>


                        <div class="beneficiary-actions">

                            <button
                                type="button"
                                class="edit-btn beneficiary-edit-btn"
                                data-beneficiary-id="${beneficiary.beneficiary_id}"
                            >
                                ✏️ Edit
                            </button>

                        </div>

                    `;


                    container.appendChild(
                        card
                    );
                }
            );


            // ----------------------------------
            // Edit buttons
            // ----------------------------------

            const editButtons =
                container.querySelectorAll(
                    '.beneficiary-edit-btn'
                );


            editButtons.forEach(
                button => {

                    button.addEventListener(
                        'click',
                        () => {

                            const beneficiaryId =
                                button.dataset
                                    .beneficiaryId;


                            openEditBeneficiary(
                                beneficiaryId
                            );
                        }
                    );
                }
            );
        }


        // ==========================================
        // CREATE BENEFICIARY
        // ==========================================

        async function createBeneficiary() {

            const name =
                document.getElementById(
                    'beneficiary-name'
                ).value.trim();


            const bank =
                document.getElementById(
                    'bank-name'
                ).value.trim();


            const accountNumber =
                document.getElementById(
                    'account-number'
                ).value.trim();


            const nickname =
                document.getElementById(
                    'nickname'
                ).value.trim();


            const button =
                document.getElementById(
                    'add-beneficiary-btn'
                );


            const message =
                document.getElementById(
                    'beneficiary-message'
                );


            if (
                !name ||
                !bank ||
                !accountNumber
            ) {

                alert(
                    'Please fill in all required fields.'
                );

                return;
            }


            button.disabled = true;

            button.textContent =
                'Adding...';


            message.textContent =
                '';


            try {

                const response =
                    await fetch(
                        `${API_BASE}/beneficiaries/`,
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

                                    beneficiary_name:
                                        name,

                                    bank_name:
                                        bank,

                                    account_number:
                                        accountNumber,

                                    nickname:
                                        nickname || null

                                })
                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.detail ||
                        'Unable to add Nominee.'
                    );
                }


                message.style.color =
                    '#16a34a';


                message.textContent =
                    '✓ Nominee added successfully.';


                document.getElementById(
                    'beneficiary-form'
                ).reset();


                await loadBeneficiaries();

            }

            catch (error) {

                console.error(
                    'BENEFICIARY CREATE ERROR:',
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
                    '+ Add Nominee';
            }
        }


        // ==========================================
        // OPEN EDIT
        // ==========================================

        function openEditBeneficiary(
            beneficiaryId
        ) {

            const beneficiary =
                customerBeneficiaries.find(
                    item =>
                        Number(
                            item.beneficiary_id
                        )
                        ===
                        Number(
                            beneficiaryId
                        )
                );


            if (!beneficiary) {

                alert(
                    'Beneficiary not found.'
                );

                return;
            }


            document.getElementById(
                'edit-beneficiary-id'
            ).value =
                beneficiary.beneficiary_id;


            document.getElementById(
                'edit-beneficiary-name'
            ).value =
                beneficiary.beneficiary_name;


            document.getElementById(
                'edit-bank-name'
            ).value =
                beneficiary.bank_name;


            document.getElementById(
                'edit-account-number'
            ).value =
                beneficiary.account_number;


            document.getElementById(
                'edit-nickname'
            ).value =
                beneficiary.nickname || '';


            document.getElementById(
                'edit-status'
            ).value =
                beneficiary.status;


            const editCard =
                document.getElementById(
                    'edit-beneficiary-card'
                );


            editCard.style.display =
                'block';


            editCard.scrollIntoView({

                behavior:
                    'smooth',

                block:
                    'center'
            });
        }


        // ==========================================
        // CLOSE EDIT
        // ==========================================

        function closeEditBeneficiary() {

            const editCard =
                document.getElementById(
                    'edit-beneficiary-card'
                );


            editCard.style.display =
                'none';


            document.getElementById(
                'edit-beneficiary-form'
            ).reset();
        }


        // ==========================================
        // UPDATE BENEFICIARY
        // ==========================================

        async function updateBeneficiary() {

            const beneficiaryId =
                document.getElementById(
                    'edit-beneficiary-id'
                ).value;


            const name =
                document.getElementById(
                    'edit-beneficiary-name'
                ).value.trim();


            const bank =
                document.getElementById(
                    'edit-bank-name'
                ).value.trim();


            const accountNumber =
                document.getElementById(
                    'edit-account-number'
                ).value.trim();


            const nickname =
                document.getElementById(
                    'edit-nickname'
                ).value.trim();


            const status =
                document.getElementById(
                    'edit-status'
                ).value;


            if (
                !beneficiaryId ||
                !name ||
                !bank ||
                !accountNumber
            ) {

                alert(
                    'Please fill in all required fields.'
                );

                return;
            }


            try {

                const response =
                    await fetch(
                        `${API_BASE}/beneficiaries/${beneficiaryId}`,
                        {
                            method:
                                'PUT',

                            headers: {
                                'Content-Type':
                                    'application/json'
                            },

                            body:
                                JSON.stringify({

                                    beneficiary_name:
                                        name,

                                    bank_name:
                                        bank,

                                    account_number:
                                        accountNumber,

                                    nickname:
                                        nickname || null,

                                    status:
                                        status

                                })
                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.detail ||
                        'Unable to update beneficiary.'
                    );
                }


                alert(
                    'Beneficiary updated successfully.'
                );


                closeEditBeneficiary();

                await loadBeneficiaries();

            }

            catch (error) {

                console.error(
                    'BENEFICIARY UPDATE ERROR:',
                    error
                );


                alert(
                    'Unable to update beneficiary.\n\n'
                    +
                    error.message
                );
            }
        }


        // ==========================================
        // FORM EVENTS
        // ==========================================

        const createForm =
            document.getElementById(
                'beneficiary-form'
            );


        createForm.addEventListener(
            'submit',
            event => {

                event.preventDefault();

                createBeneficiary();
            }
        );


        const editForm =
            document.getElementById(
                'edit-beneficiary-form'
            );


        editForm.addEventListener(
            'submit',
            event => {

                event.preventDefault();

                updateBeneficiary();
            }
        );


        const cancelEditButton =
            document.getElementById(
                'cancel-beneficiary-edit'
            );


        cancelEditButton.addEventListener(
            'click',
            closeEditBeneficiary
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

        loadBeneficiaries();

    }
);