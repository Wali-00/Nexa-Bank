// ============================================================
// NEXA BANK
// PRE-ACCOUNT APPLICATION STATUS
// ============================================================

const APPLICATION_STATUS_API =
    'http://127.0.0.1:8000';


let trackedApplication =
    null;


let trackedKyc =
    null;


// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener(
    'DOMContentLoaded',
    () => {

        initializeStatusPage();

    }
);


// ============================================================
// INITIALIZE PAGE
// ============================================================

async function initializeStatusPage() {

    const customerId =
        localStorage.getItem(
            'tracking_customer_id'
        );


    const applicationId =
        localStorage.getItem(
            'tracking_application_id'
        );


    if (
        !customerId ||
        !applicationId
    ) {

        alert(
            'No application tracking information was found.'
        );


        window.location.href =
            'login.html';


        return;
    }


    setStatusText(
        'status-customer-id',
        customerId
    );


    setStatusText(
        'status-application-id',
        applicationId
    );


    initializeStatusEvents();


    await loadApplicationStatus();
}


// ============================================================
// EVENTS
// ============================================================

function initializeStatusEvents() {

    const refreshButton =
        document.getElementById(
            'refresh-status-btn'
        );


    const resubmitButton =
        document.getElementById(
            'resubmit-kyc-btn'
        );


    const loginButton =
        document.getElementById(
            'go-login-btn'
        );


    if (refreshButton) {

        refreshButton.addEventListener(
            'click',
            loadApplicationStatus
        );
    }


    if (resubmitButton) {

        resubmitButton.addEventListener(
            'click',
            prepareKycResubmission
        );
    }


    if (loginButton) {

        loginButton.addEventListener(
            'click',
            () => {

                window.location.href =
                    'login.html';
            }
        );
    }
}


// ============================================================
// LOAD COMPLETE STATUS
// ============================================================

async function loadApplicationStatus() {

    const message =
        document.getElementById(
            'application-status-message'
        );


    const refreshButton =
        document.getElementById(
            'refresh-status-btn'
        );


    if (message) {

        message.textContent =
            'Loading latest application status...';


        message.style.color =
            '#64748b';
    }


    if (refreshButton) {

        refreshButton.disabled =
            true;


        refreshButton.textContent =
            'Refreshing...';
    }


    try {

        await loadTrackedApplication();

        await loadTrackedKyc();

        renderApplicationStatus();

        renderKycStatus();

        renderOverallNextStep();


        if (message) {

            message.style.color =
                '#16a34a';


            message.textContent =
                '✓ Status updated.';
        }

    }

    catch (error) {

        console.error(
            'APPLICATION STATUS ERROR:',
            error
        );


        if (message) {

            message.style.color =
                '#dc2626';


            message.textContent =
                '✕ '
                +
                error.message;
        }

    }

    finally {

        if (refreshButton) {

            refreshButton.disabled =
                false;


            refreshButton.textContent =
                '↻ Refresh Status';
        }
    }
}


// ============================================================
// LOAD ACCOUNT APPLICATION
// ============================================================

async function loadTrackedApplication() {

    const applicationId =
        Number(
            localStorage.getItem(
                'tracking_application_id'
            )
        );


    /*
        We already know your project has:

        GET /account-applications/

        So instead of assuming a separate
        GET /account-applications/{id} route,
        we load the existing list and find
        the tracked application safely.
    */

    const response =
        await fetch(
            `${APPLICATION_STATUS_API}/account-applications/`
        );


    const applications =
        await response.json();


    if (!response.ok) {

        throw new Error(
            applications.detail ||
            'Unable to load account application.'
        );
    }


    trackedApplication =
        applications.find(
            application =>
                Number(
                    application.application_id
                )
                ===
                applicationId
        );


    if (!trackedApplication) {

        throw new Error(
            'Tracked account application was not found.'
        );
    }
}


// ============================================================
// LOAD KYC
// ============================================================

async function loadTrackedKyc() {

    const applicationId =
        Number(
            localStorage.getItem(
                'tracking_application_id'
            )
        );


    /*
        Use the working:
        GET /kyc-verifications/

        and locate the KYC linked to this
        account application.
    */

    const response =
        await fetch(
            `${APPLICATION_STATUS_API}/kyc-verifications/`
        );


    const records =
        await response.json();


    if (!response.ok) {

        throw new Error(
            records.detail ||
            'Unable to load KYC information.'
        );
    }


    const matchingRecords =
        records.filter(
            record =>
                Number(
                    record.application_id
                )
                ===
                applicationId
        );


    /*
        If the customer resubmits KYC later,
        there may eventually be more than one
        linked record.

        Use the newest KYC ID.
    */

    matchingRecords.sort(
        (
            first,
            second
        ) =>
            Number(
                second.kyc_id
            )
            -
            Number(
                first.kyc_id
            )
    );


    trackedKyc =
        matchingRecords.length
            ?
            matchingRecords[0]
            :
            null;


    if (trackedKyc) {

        localStorage.setItem(
            'tracking_kyc_id',
            trackedKyc.kyc_id
        );


        setStatusText(
            'status-kyc-id',
            trackedKyc.kyc_id
        );

    } else {

        setStatusText(
            'status-kyc-id',
            'Not Submitted'
        );
    }
}


// ============================================================
// RENDER APPLICATION
// ============================================================

function renderApplicationStatus() {

    if (!trackedApplication) {

        return;
    }


    setStatusText(
        'detail-application-id',
        trackedApplication.application_id
    );


    setStatusText(
        'detail-customer-id',
        trackedApplication.customer_id
    );


    setStatusText(
        'detail-account-type',
        getApplicationAccountType(
            trackedApplication.account_type_id
        )
    );


    setStatusText(
        'detail-branch',
        getApplicationBranch(
            trackedApplication.branch_id
        )
    );


    setStatusText(
        'detail-submitted-at',
        formatApplicationStatusDate(
            trackedApplication.submitted_at
        )
    );


    setStatusText(
        'detail-rejection-reason',
        trackedApplication.rejection_reason
        ||
        '-'
    );


    // --------------------------------------------------------
    // Application badge
    // --------------------------------------------------------

    const badge =
        document.getElementById(
            'application-status-badge'
        );


    if (badge) {

        badge.textContent =
            trackedApplication.status;


        badge.className =
            `application-status-badge ${String(
                trackedApplication.status ||
                ''
            ).toLowerCase()}`;
    }


    // --------------------------------------------------------
    // Progress
    // --------------------------------------------------------

    const applicationText =
        document.getElementById(
            'progress-application-text'
        );


    if (applicationText) {

        applicationText.textContent =
            getApplicationProgressText(
                trackedApplication.status
            );
    }


    const applicationStep =
        document.getElementById(
            'progress-application'
        );


    if (applicationStep) {

        applicationStep.classList.add(
            'complete'
        );
    }


    const firstLine =
        document.getElementById(
            'line-registration-application'
        );


    if (firstLine) {

        firstLine.classList.add(
            'complete'
        );
    }
}


// ============================================================
// RENDER KYC
// ============================================================

function renderKycStatus() {

    const badge =
        document.getElementById(
            'kyc-status-badge'
        );


    const resubmitButton =
        document.getElementById(
            'resubmit-kyc-btn'
        );


    if (!trackedKyc) {

        setStatusText(
            'detail-kyc-id',
            'Not Submitted'
        );


        setStatusText(
            'detail-kyc-status',
            'NOT SUBMITTED'
        );


        setStatusText(
            'detail-verified-by',
            '-'
        );


        setStatusText(
            'detail-verified-at',
            '-'
        );


        setStatusText(
            'detail-kyc-remarks',
            'KYC has not been submitted yet.'
        );


        if (badge) {

            badge.textContent =
                'NOT SUBMITTED';


            badge.className =
                'application-status-badge not-submitted';
        }


        if (resubmitButton) {

            resubmitButton.style.display =
                'inline-block';


            resubmitButton.textContent =
                '📄 Submit KYC';
        }


        return;
    }


    setStatusText(
        'detail-kyc-id',
        trackedKyc.kyc_id
    );


    setStatusText(
        'detail-kyc-status',
        trackedKyc.status
    );


    setStatusText(
        'detail-verified-by',
        trackedKyc.verified_by
        ??
        'Not reviewed'
    );


    setStatusText(
        'detail-verified-at',
        formatApplicationStatusDate(
            trackedKyc.verified_at
        )
    );


    setStatusText(
        'detail-kyc-remarks',
        trackedKyc.remarks
        ||
        'No remarks'
    );


    if (badge) {

        badge.textContent =
            trackedKyc.status;


        badge.className =
            `application-status-badge ${String(
                trackedKyc.status ||
                ''
            ).toLowerCase()}`;
    }


    // --------------------------------------------------------
    // Progress
    // --------------------------------------------------------

    setStatusText(
        'progress-kyc-text',
        getKycProgressText(
            trackedKyc.status
        )
    );


    const applicationKycLine =
        document.getElementById(
            'line-application-kyc'
        );


    if (applicationKycLine) {

        applicationKycLine.classList.add(
            'complete'
        );
    }


    const kycStep =
        document.getElementById(
            'progress-kyc'
        );


    if (kycStep) {

        if (
            trackedKyc.status ===
            'VERIFIED'
        ) {

            kycStep.classList.add(
                'complete'
            );

        }

        else if (
            trackedKyc.status ===
            'REJECTED'
            ||
            trackedKyc.status ===
            'DOCUMENT_REQUIRED'
        ) {

            kycStep.classList.add(
                'attention'
            );

        }

        else {

            kycStep.classList.add(
                'current'
            );
        }
    }


    // --------------------------------------------------------
    // Resubmit button
    // --------------------------------------------------------

    if (resubmitButton) {

        if (
            trackedKyc.status ===
            'DOCUMENT_REQUIRED'
            ||
            trackedKyc.status ===
            'REJECTED'
        ) {

            resubmitButton.style.display =
                'inline-block';


            resubmitButton.textContent =
                '📄 Resubmit KYC';

        } else {

            resubmitButton.style.display =
                'none';
        }
    }
}


// ============================================================
// OVERALL NEXT STEP
// ============================================================

function renderOverallNextStep() {

    const title =
        document.getElementById(
            'next-step-title'
        );


    const message =
        document.getElementById(
            'next-step-message'
        );


    const icon =
        document.getElementById(
            'next-step-icon'
        );


    const box =
        document.getElementById(
            'application-next-step'
        );


    if (
        !title ||
        !message ||
        !icon ||
        !box
    ) {

        return;
    }


    box.className =
        'application-next-step';


    // --------------------------------------------------------
    // Application rejected
    // --------------------------------------------------------

    if (
        trackedApplication.status ===
        'REJECTED'
    ) {

        icon.textContent =
            '✕';


        title.textContent =
            'Account Application Rejected';


        message.textContent =
            trackedApplication.rejection_reason
            ||
            'Your account application was not approved.';


        box.classList.add(
            'next-step-danger'
        );


        return;
    }


    // --------------------------------------------------------
    // No KYC
    // --------------------------------------------------------

    if (!trackedKyc) {

        icon.textContent =
            '📄';


        title.textContent =
            'KYC Submission Required';


        message.textContent =
            'Submit your KYC documents so Nexa Bank can continue reviewing your application.';


        box.classList.add(
            'next-step-warning'
        );


        return;
    }


    // --------------------------------------------------------
    // Documents required
    // --------------------------------------------------------

    if (
        trackedKyc.status ===
        'DOCUMENT_REQUIRED'
    ) {

        icon.textContent =
            '📄';


        title.textContent =
            'Additional Documents Required';


        message.textContent =
            trackedKyc.remarks
            ||
            'Please provide the additional KYC documents requested by the Account Officer.';


        box.classList.add(
            'next-step-warning'
        );


        return;
    }


    // --------------------------------------------------------
    // KYC rejected
    // --------------------------------------------------------

    if (
        trackedKyc.status ===
        'REJECTED'
    ) {

        icon.textContent =
            '⚠';


        title.textContent =
            'KYC Needs Attention';


        message.textContent =
            trackedKyc.remarks
            ||
            'Your KYC verification was rejected. Please submit corrected information.';


        box.classList.add(
            'next-step-danger'
        );


        return;
    }


    // --------------------------------------------------------
    // KYC pending
    // --------------------------------------------------------

    if (
        trackedKyc.status ===
        'PENDING'
    ) {

        icon.textContent =
            '⏳';


        title.textContent =
            'KYC Review In Progress';


        message.textContent =
            'Your documents have been submitted successfully and are waiting for Account Officer review.';


        box.classList.add(
            'next-step-info'
        );


        return;
    }


    // --------------------------------------------------------
    // KYC verified, application not approved
    // --------------------------------------------------------

    if (
        trackedKyc.status ===
        'VERIFIED'
        &&
        trackedApplication.status !==
        'APPROVED'
    ) {

        icon.textContent =
            '✓';


        title.textContent =
            'KYC Verified';


        message.textContent =
            'Your KYC has been verified. Your account application is now waiting for final approval.';


        box.classList.add(
            'next-step-success'
        );


        setStatusText(
            'progress-account-text',
            'Waiting for final approval'
        );


        const kycAccountLine =
            document.getElementById(
                'line-kyc-account'
            );


        if (kycAccountLine) {

            kycAccountLine.classList.add(
                'complete'
            );
        }


        return;
    }


    // --------------------------------------------------------
    // Everything approved
    // --------------------------------------------------------

    if (
        trackedKyc.status ===
        'VERIFIED'
        &&
        trackedApplication.status ===
        'APPROVED'
    ) {

        icon.textContent =
            '✓';


        title.textContent =
            'Application Approved';


        message.textContent =
            'Your account application has been approved. You can now proceed to login.';


        box.classList.add(
            'next-step-success'
        );


        setStatusText(
            'progress-account-text',
            'Approved'
        );


        const accountStep =
            document.getElementById(
                'progress-account'
            );


        if (accountStep) {

            accountStep.classList.add(
                'complete'
            );
        }


        const kycAccountLine =
            document.getElementById(
                'line-kyc-account'
            );


        if (kycAccountLine) {

            kycAccountLine.classList.add(
                'complete'
            );
        }


        return;
    }


    icon.textContent =
        '⏳';


    title.textContent =
        'Application Processing';


    message.textContent =
        'Your application is currently being processed.';
}


// ============================================================
// PREPARE KYC RESUBMISSION
// ============================================================

function prepareKycResubmission() {

    const customerId =
        localStorage.getItem(
            'tracking_customer_id'
        );


    const applicationId =
        localStorage.getItem(
            'tracking_application_id'
        );


    if (
        !customerId ||
        !applicationId
    ) {

        alert(
            'Application tracking information is missing.'
        );

        return;
    }


    localStorage.setItem(
        'pending_customer_id',
        customerId
    );


    localStorage.setItem(
        'pending_application_id',
        applicationId
    );


    window.location.href =
        'kyc-submit.html';
}


// ============================================================
// ACCOUNT TYPE
// ============================================================

function getApplicationAccountType(
    id
) {

    const types = {
        1: 'Savings',
        2: 'Current',
        3: 'Student',
        4: 'Business'
    };


    return (
        types[
        Number(id)
        ]
        ||
        `Type ${id ?? '-'}`
    );
}


// ============================================================
// BRANCH
// ============================================================

function getApplicationBranch(id) {

    const branches = {
        1: 'Dhanmondi',
        2: 'Gulshan',
        3: 'Uttara',
        4: 'Agrabad'
    };


    return (
        branches[
        Number(id)
        ]
        ||
        `Branch ${id ?? '-'}`
    );
}


// ============================================================
// APPLICATION PROGRESS TEXT
// ============================================================

function getApplicationProgressText(
    status
) {

    if (status === 'SUBMITTED') {
        return 'Submitted';
    }


    if (status === 'UNDER_REVIEW') {
        return 'Under review';
    }


    if (status === 'APPROVED') {
        return 'Approved';
    }


    if (status === 'REJECTED') {
        return 'Rejected';
    }


    return status || '-';
}


// ============================================================
// KYC PROGRESS TEXT
// ============================================================

function getKycProgressText(status) {

    if (status === 'PENDING') {
        return 'Waiting for review';
    }


    if (status === 'VERIFIED') {
        return 'Verified';
    }


    if (status === 'REJECTED') {
        return 'Rejected';
    }


    if (
        status ===
        'DOCUMENT_REQUIRED'
    ) {

        return 'Documents required';
    }


    return status || '-';
}


// ============================================================
// DATE
// ============================================================

function formatApplicationStatusDate(
    value
) {

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


// ============================================================
// SAFE TEXT
// ============================================================

function setStatusText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;
    }
}