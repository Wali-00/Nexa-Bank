// ============================================================
// NEXA BANK
// ACCOUNT OFFICER - KYC VERIFICATION
// ============================================================

const API_BASE =
    'http://127.0.0.1:8000';


// ============================================================
// GLOBAL VARIABLES
// ============================================================

let kycRecords = [];

let selectedKycId = null;

let officerEmployeeId = null;


// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener(
    'DOMContentLoaded',
    async () => {

        console.log(
            'KYC PAGE LOADED'
        );


        // ----------------------------------------------------
        // LOGIN CHECK
        // ----------------------------------------------------

        const userId =
            localStorage.getItem(
                'user_id'
            );


        const role =
            localStorage.getItem(
                'role'
            );


        console.log(
            'USER ID:',
            userId
        );


        console.log(
            'ROLE:',
            role
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


        // ----------------------------------------------------
        // INITIALIZE BUTTONS / EVENTS
        // ----------------------------------------------------

        initializeKycEvents();


        // ----------------------------------------------------
        // LOAD OFFICER EMPLOYEE ID
        // ----------------------------------------------------

        await loadOfficerEmployeeId();


        // ----------------------------------------------------
        // LOAD KYC RECORDS
        // ----------------------------------------------------

        await loadKycRecords();
    }
);


// ============================================================
// LOAD OFFICER EMPLOYEE ID
// ============================================================

async function loadOfficerEmployeeId() {

    const userId =
        Number(
            localStorage.getItem(
                'user_id'
            )
        );


    try {

        const response =
            await fetch(
                `${API_BASE}/employees/`
            );


        const result =
            await response.json();


        console.log(
            'EMPLOYEES RESPONSE:',
            result
        );


        if (!response.ok) {

            console.warn(
                'EMPLOYEE LOOKUP FAILED:',
                result
            );


            return;
        }


        const employees =
            Array.isArray(result)
                ? result
                : (
                    Array.isArray(result.employees)
                        ? result.employees
                        : []
                );


        const employee =
            employees.find(
                item =>
                    Number(
                        item.user_id
                    ) === userId
            );


        if (employee) {

            officerEmployeeId =
                Number(
                    employee.employee_id
                );


            console.log(
                'OFFICER EMPLOYEE ID:',
                officerEmployeeId
            );

        } else {

            console.warn(
                'No employee record found for logged-in user.'
            );
        }

    } catch (error) {

        console.error(
            'EMPLOYEE LOOKUP ERROR:',
            error
        );
    }
}


// ============================================================
// EVENTS
// ============================================================

function initializeKycEvents() {

    const refreshButton =
        document.getElementById(
            'kyc-refresh-btn'
        );


    const searchInput =
        document.getElementById(
            'kyc-search'
        );


    const statusFilter =
        document.getElementById(
            'kyc-status-filter'
        );


    const form =
        document.getElementById(
            'kyc-review-form'
        );


    const closeButton =
        document.getElementById(
            'close-kyc-modal'
        );


    const cancelButton =
        document.getElementById(
            'cancel-kyc-review'
        );


    const logoutButton =
        document.getElementById(
            'kyc-logout-btn'
        );


    // --------------------------------------------------------
    // REFRESH
    // --------------------------------------------------------

    if (refreshButton) {

        refreshButton.addEventListener(
            'click',
            loadKycRecords
        );
    }


    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    if (searchInput) {

        searchInput.addEventListener(
            'input',
            filterKycRecords
        );
    }


    // --------------------------------------------------------
    // STATUS FILTER
    // --------------------------------------------------------

    if (statusFilter) {

        statusFilter.addEventListener(
            'change',
            filterKycRecords
        );
    }


    // --------------------------------------------------------
    // REVIEW FORM
    // --------------------------------------------------------

    if (form) {

        form.addEventListener(
            'submit',
            event => {

                event.preventDefault();

                submitKycReview();
            }
        );
    }


    // --------------------------------------------------------
    // CLOSE MODAL
    // --------------------------------------------------------

    if (closeButton) {

        closeButton.addEventListener(
            'click',
            closeKycModal
        );
    }


    // --------------------------------------------------------
    // CANCEL REVIEW
    // --------------------------------------------------------

    if (cancelButton) {

        cancelButton.addEventListener(
            'click',
            closeKycModal
        );
    }


    // --------------------------------------------------------
    // LOGOUT
    // --------------------------------------------------------

    if (logoutButton) {

        logoutButton.addEventListener(
            'click',
            event => {

                event.preventDefault();


                localStorage.removeItem(
                    'user_id'
                );


                localStorage.removeItem(
                    'role'
                );


                localStorage.removeItem(
                    'customer_id'
                );


                window.location.href =
                    'login.html';
            }
        );
    }
}


// ============================================================
// LOAD KYC RECORDS
// ============================================================

async function loadKycRecords() {

    const container =
        document.getElementById(
            'kyc-records-container'
        );


    if (!container) {

        console.error(
            'KYC container not found.'
        );


        return;
    }


    container.innerHTML = `
        <div class="customer-search-loading">
            Loading KYC records...
        </div>
    `;


    try {

        console.log(
            'LOADING KYC RECORDS...'
        );


        const response =
            await fetch(
                `${API_BASE}/kyc-verifications/`
            );


        const result =
            await response.json();


        console.log(
            'KYC RESPONSE:',
            result
        );


        if (!response.ok) {

            throw new Error(
                result.detail ||
                'Unable to load KYC records.'
            );
        }


        kycRecords =
            Array.isArray(result)
                ? result
                : [];


        updateKycStatistics();


        filterKycRecords();

    } catch (error) {

        console.error(
            'KYC LOAD ERROR:',
            error
        );


        container.innerHTML = `
            <div class="customer-empty-result">

                <h3>
                    Unable to Load KYC Records
                </h3>

                <p>
                    ${escapeHtml(
                        error.message
                    )}
                </p>

            </div>
        `;
    }
}


// ============================================================
// KYC STATISTICS
// ============================================================

function updateKycStatistics() {

    setText(
        'kyc-total',
        kycRecords.length
    );


    setText(
        'kyc-pending',
        kycRecords.filter(
            item =>
                item.status === 'PENDING'
        ).length
    );


    setText(
        'kyc-verified',
        kycRecords.filter(
            item =>
                item.status === 'VERIFIED'
        ).length
    );


    setText(
        'kyc-rejected',
        kycRecords.filter(
            item =>
                item.status === 'REJECTED'
        ).length
    );
}


// ============================================================
// FILTER KYC RECORDS
// ============================================================

function filterKycRecords() {

    const searchInput =
        document.getElementById(
            'kyc-search'
        );


    const statusInput =
        document.getElementById(
            'kyc-status-filter'
        );


    const searchValue =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : '';


    const statusValue =
        statusInput
            ? statusInput.value
            : '';


    const filtered =
        kycRecords.filter(
            record => {

                const searchableText = `
                    ${record.kyc_id ?? ''}
                    ${record.customer_id ?? ''}
                    ${record.application_id ?? ''}
                    ${record.status ?? ''}
                `.toLowerCase();


                const searchMatches =
                    !searchValue ||
                    searchableText.includes(
                        searchValue
                    );


                const statusMatches =
                    !statusValue ||
                    record.status === statusValue;


                return (
                    searchMatches &&
                    statusMatches
                );
            }
        );


    renderKycRecords(
        filtered
    );
}


// ============================================================
// RENDER KYC RECORDS
// ============================================================

function renderKycRecords(records) {

    const container =
        document.getElementById(
            'kyc-records-container'
        );


    if (!container) {

        return;
    }


    // --------------------------------------------------------
    // NO RECORDS
    // --------------------------------------------------------

    if (records.length === 0) {

        container.innerHTML = `
            <div class="customer-empty-result">

                <div class="customer-empty-icon">
                    ✓
                </div>

                <h3>
                    No KYC Records Found
                </h3>

                <p>
                    There are currently no KYC records
                    matching this filter.
                </p>

            </div>
        `;


        return;
    }


    container.innerHTML =
        '';


    // --------------------------------------------------------
    // BUILD EACH KYC CARD
    // --------------------------------------------------------

    records.forEach(
        record => {

            const card =
                document.createElement(
                    'div'
                );


            card.className =
                'kyc-record-card';


            const statusClass =
                String(
                    record.status ||
                    ''
                ).toLowerCase();


            card.innerHTML = `

                <!-- ==========================================
                     KYC HEADER
                =========================================== -->

                <div class="kyc-card-header">

                    <div>

                        <span class="officer-customer-label">
                            KYC Verification
                        </span>

                        <h3>
                            KYC #${escapeHtml(
                                record.kyc_id
                            )}
                        </h3>

                        <p>
                            Customer ID:
                            #${escapeHtml(
                                record.customer_id
                            )}
                        </p>

                    </div>


                    <span
                        class="kyc-status ${escapeHtml(
                            statusClass
                        )}"
                    >
                        ${escapeHtml(
                            record.status
                        )}
                    </span>

                </div>


                <!-- ==========================================
                     KYC INFORMATION
                =========================================== -->

                <div class="kyc-info-grid">


                    <!-- APPLICATION ID -->

                    <div>

                        <span>
                            Application ID
                        </span>

                        <strong>
                            ${escapeHtml(
                                record.application_id ??
                                '-'
                            )}
                        </strong>

                    </div>


                    <!-- NID DOCUMENT -->

                    <div>

                        <span>
                            NID Document
                        </span>

                        ${
                            record.nid_document
                                ?
                                `
                                    <a
                                        href="${getKycDocumentUrl(
                                            record.nid_document
                                        )}"
                                        target="_blank"
                                        class="kyc-document-link"
                                    >
                                        🪪 View NID
                                    </a>
                                `
                                :
                                `
                                    <strong>
                                        Not provided
                                    </strong>
                                `
                        }

                    </div>


                    <!-- CUSTOMER PHOTO -->

                    <div>

                        <span>
                            Customer Photo
                        </span>

                        ${
                            record.photo_document
                                ?
                                `
                                    <a
                                        href="${getKycDocumentUrl(
                                            record.photo_document
                                        )}"
                                        target="_blank"
                                        class="kyc-document-link"
                                    >
                                        📷 View Photo
                                    </a>
                                `
                                :
                                `
                                    <strong>
                                        Not provided
                                    </strong>
                                `
                        }

                    </div>


                    <!-- ADDRESS PROOF -->

                    <div>

                        <span>
                            Address Proof
                        </span>

                        ${
                            record.address_document
                                ?
                                `
                                    <a
                                        href="${getKycDocumentUrl(
                                            record.address_document
                                        )}"
                                        target="_blank"
                                        class="kyc-document-link"
                                    >
                                        🏠 View Address Proof
                                    </a>
                                `
                                :
                                `
                                    <strong>
                                        Not provided
                                    </strong>
                                `
                        }

                    </div>


                    <!-- VERIFIED BY -->

                    <div>

                        <span>
                            Verified By
                        </span>

                        <strong>
                            ${escapeHtml(
                                record.verified_by ??
                                'Not reviewed'
                            )}
                        </strong>

                    </div>


                    <!-- VERIFIED AT -->

                    <div>

                        <span>
                            Verified At
                        </span>

                        <strong>
                            ${escapeHtml(
                                formatDate(
                                    record.verified_at
                                )
                            )}
                        </strong>

                    </div>


                    <!-- REMARKS -->

                    <div class="kyc-full-width">

                        <span>
                            Remarks
                        </span>

                        <strong>
                            ${escapeHtml(
                                record.remarks ||
                                'No remarks'
                            )}
                        </strong>

                    </div>

                </div>


                <!-- ==========================================
                     ACTIONS
                =========================================== -->

                <div class="officer-customer-actions">

                    <button
                        type="button"
                        class="approve-btn kyc-review-btn"
                        data-kyc-id="${escapeHtml(
                            record.kyc_id
                        )}"
                    >
                        📝 Review KYC
                    </button>

                </div>
            `;


            container.appendChild(
                card
            );
        }
    );


    // --------------------------------------------------------
    // REVIEW BUTTON EVENTS
    // --------------------------------------------------------

    document
        .querySelectorAll(
            '.kyc-review-btn'
        )
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    () => {

                        openKycReview(
                            Number(
                                button.dataset
                                    .kycId
                            )
                        );
                    }
                );
            }
        );
}


// ============================================================
// OPEN KYC REVIEW MODAL
// ============================================================

function openKycReview(
    kycId
) {

    const record =
        kycRecords.find(
            item =>
                Number(
                    item.kyc_id
                ) === Number(
                    kycId
                )
        );


    if (!record) {

        alert(
            'KYC record not found.'
        );


        return;
    }


    selectedKycId =
        record.kyc_id;


    // --------------------------------------------------------
    // POPULATE MODAL DATA
    // --------------------------------------------------------

    setText(
        'review-kyc-id',
        record.kyc_id
    );


    setText(
        'review-customer-id',
        record.customer_id
    );


    setText(
        'review-application-id',
        record.application_id ??
        '-'
    );


    setText(
        'review-current-status',
        record.status
    );


    // --------------------------------------------------------
    // STATUS SELECT
    // --------------------------------------------------------

    const statusInput =
        document.getElementById(
            'review-status'
        );


    if (statusInput) {

        statusInput.value =
            record.status;
    }


    // --------------------------------------------------------
    // REMARKS
    // --------------------------------------------------------

    const remarksInput =
        document.getElementById(
            'review-remarks'
        );


    if (remarksInput) {

        remarksInput.value =
            record.remarks ||
            '';
    }


    // --------------------------------------------------------
    // CLEAR MESSAGE
    // --------------------------------------------------------

    const message =
        document.getElementById(
            'kyc-review-message'
        );


    if (message) {

        message.textContent =
            '';
    }


    // --------------------------------------------------------
    // SHOW MODAL
    // --------------------------------------------------------

    const modal =
        document.getElementById(
            'kyc-review-modal'
        );


    if (modal) {

        modal.classList.add(
            'show'
        );
    }
}


// ============================================================
// CLOSE KYC REVIEW MODAL
// ============================================================

function closeKycModal() {

    const modal =
        document.getElementById(
            'kyc-review-modal'
        );


    if (modal) {

        modal.classList.remove(
            'show'
        );
    }


    selectedKycId =
        null;
}


// ============================================================
// SUBMIT KYC REVIEW
// ============================================================

async function submitKycReview() {

    // --------------------------------------------------------
    // KYC SELECTED?
    // --------------------------------------------------------

    if (!selectedKycId) {

        alert(
            'No KYC record selected.'
        );


        return;
    }


    // --------------------------------------------------------
    // OFFICER EMPLOYEE ID AVAILABLE?
    // --------------------------------------------------------

    if (!officerEmployeeId) {

        alert(
            'Your employee record could not be identified. Please check the employees table.'
        );


        return;
    }


    // --------------------------------------------------------
    // REVIEW STATUS
    // --------------------------------------------------------

    const status =
        document.getElementById(
            'review-status'
        ).value;


    // --------------------------------------------------------
    // REVIEW REMARKS
    // --------------------------------------------------------

    const remarks =
        document.getElementById(
            'review-remarks'
        )
            .value
            .trim();


    // --------------------------------------------------------
    // REMARKS REQUIRED FOR REJECT / DOCUMENT REQUIRED
    // --------------------------------------------------------

    if (
        (
            status === 'REJECTED' ||
            status === 'DOCUMENT_REQUIRED'
        ) &&
        !remarks
    ) {

        alert(
            'Please enter remarks for this review status.'
        );


        return;
    }


    const button =
        document.getElementById(
            'submit-kyc-review'
        );


    const message =
        document.getElementById(
            'kyc-review-message'
        );


    button.disabled =
        true;


    button.textContent =
        'Saving...';


    message.textContent =
        '';


    try {

        // ----------------------------------------------------
        // UPDATE KYC
        // ----------------------------------------------------

        const response =
            await fetch(
                `${API_BASE}/kyc-verifications/${selectedKycId}/review`,
                {
                    method:
                        'PUT',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify({

                            status:
                                status,

                            verified_by:
                                officerEmployeeId,

                            remarks:
                                remarks || null
                        })
                }
            );


        const result =
            await response.json();


        console.log(
            'KYC REVIEW RESULT:',
            result
        );


        if (!response.ok) {

            throw new Error(
                result.detail ||
                'KYC review failed.'
            );
        }


        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------

        message.style.color =
            '#16a34a';


        message.textContent =
            '✓ KYC updated successfully.';


        await loadKycRecords();


        setTimeout(
            () => {

                closeKycModal();

            },
            700
        );

    } catch (error) {

        console.error(
            'KYC REVIEW ERROR:',
            error
        );


        message.style.color =
            '#dc2626';


        message.textContent =
            '✕ '
            +
            error.message;

    } finally {

        button.disabled =
            false;


        button.textContent =
            '✓ Save Review';
    }
}


// ============================================================
// HELPERS
// ============================================================


// ============================================================
// SET TEXT
// ============================================================

function setText(
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


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(value) {

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


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

    const div =
        document.createElement(
            'div'
        );


    div.textContent =
        value ?? '';


    return div.innerHTML;
}

// ============================================================
// BUILD KYC DOCUMENT URL
// ============================================================

function getKycDocumentUrl(path) {

    if (!path) {

        return '#';
    }


    const cleanedPath =
        String(path)
            .replace(/\\/g, '/')
            .replace(/^\/+/, '');


    return (
        `${API_BASE}/${cleanedPath}`
    );
}