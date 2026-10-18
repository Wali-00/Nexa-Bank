const KYC_UPLOAD_API =
    'http://127.0.0.1:8000';


// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener(
    'DOMContentLoaded',
    () => {

        initializeKycUploadPage();

    }
);


// ============================================================
// INITIALIZE PAGE
// ============================================================

function initializeKycUploadPage() {

    const customerId =
        localStorage.getItem(
            'pending_customer_id'
        );


    const applicationId =
        localStorage.getItem(
            'pending_application_id'
        );


    if (
        !customerId ||
        !applicationId
    ) {

        alert(
            'No pending account application was found.'
        );


        window.location.href =
            'index.html';


        return;
    }


    initializeKycUploadEvents();
}


// ============================================================
// EVENTS
// ============================================================

function initializeKycUploadEvents() {

    const form =
        document.getElementById(
            'kyc-submit-form'
        );


    const cancelButton =
        document.getElementById(
            'cancel-kyc-btn'
        );


    const statusButton =
        document.getElementById(
            'go-status-btn'
        );


    const nidInput =
        document.getElementById(
            'nid-document'
        );


    const photoInput =
        document.getElementById(
            'photo-document'
        );


    const addressInput =
        document.getElementById(
            'address-document'
        );


    if (form) {

        form.addEventListener(
            'submit',
            event => {

                event.preventDefault();

                submitKycFiles();
            }
        );
    }


    if (cancelButton) {

        cancelButton.addEventListener(
            'click',
            () => {

                const confirmed =
                    confirm(
                        'Leave KYC submission? Your application will remain incomplete.'
                    );


                if (!confirmed) {

                    return;
                }


                window.location.href =
                    'application-status.html';
            }
        );
    }


    if (statusButton) {

        statusButton.addEventListener(
            'click',
            () => {

                window.location.href =
                    'application-status.html';
            }
        );
    }


    if (nidInput) {

        nidInput.addEventListener(
            'change',
            () => {

                handleSelectedFile(
                    nidInput,
                    'nid-file-name',
                    'nid-preview'
                );
            }
        );
    }


    if (photoInput) {

        photoInput.addEventListener(
            'change',
            () => {

                handleSelectedFile(
                    photoInput,
                    'photo-file-name',
                    'photo-preview'
                );
            }
        );
    }


    if (addressInput) {

        addressInput.addEventListener(
            'change',
            () => {

                handleSelectedFile(
                    addressInput,
                    'address-file-name',
                    'address-preview'
                );
            }
        );
    }
}


// ============================================================
// FILE PREVIEW
// ============================================================

function handleSelectedFile(
    input,
    fileNameElementId,
    previewElementId
) {

    const fileNameElement =
        document.getElementById(
            fileNameElementId
        );


    const previewElement =
        document.getElementById(
            previewElementId
        );


    if (
        !fileNameElement ||
        !previewElement
    ) {

        return;
    }


    const file =
        input.files[0];


    if (!file) {

        fileNameElement.textContent =
            'No file selected';


        previewElement.innerHTML =
            '';


        return;
    }


    // 5 MB limit
    const maxSize =
        5 * 1024 * 1024;


    if (
        file.size >
        maxSize
    ) {

        alert(
            'Maximum allowed file size is 5 MB.'
        );


        input.value =
            '';


        fileNameElement.textContent =
            'No file selected';


        previewElement.innerHTML =
            '';


        return;
    }


    fileNameElement.textContent =
        file.name;


    previewElement.innerHTML =
        '';


    // --------------------------------------------------------
    // IMAGE PREVIEW
    // --------------------------------------------------------

    if (
        file.type.startsWith(
            'image/'
        )
    ) {

        const image =
            document.createElement(
                'img'
            );


        const objectUrl =
            URL.createObjectURL(
                file
            );


        image.src =
            objectUrl;


        image.onload =
            () => {

                URL.revokeObjectURL(
                    objectUrl
                );
            };


        previewElement.appendChild(
            image
        );

    }

    // --------------------------------------------------------
    // PDF PREVIEW
    // --------------------------------------------------------

    else if (
        file.type ===
        'application/pdf'
    ) {

        previewElement.innerHTML = `
            <div class="kyc-pdf-preview">
                📄 PDF selected
            </div>
        `;
    }
}


// ============================================================
// SUBMIT KYC FILES
// ============================================================

async function submitKycFiles() {

    const customerId =
        localStorage.getItem(
            'pending_customer_id'
        );


    const applicationId =
        localStorage.getItem(
            'pending_application_id'
        );


    if (
        !customerId ||
        !applicationId
    ) {

        alert(
            'Application information is missing.'
        );

        return;
    }


    const nidInput =
        document.getElementById(
            'nid-document'
        );


    const photoInput =
        document.getElementById(
            'photo-document'
        );


    const addressInput =
        document.getElementById(
            'address-document'
        );


    const button =
        document.getElementById(
            'submit-kyc-btn'
        );


    const message =
        document.getElementById(
            'kyc-submit-message'
        );


    const nidFile =
        nidInput?.files[0];


    const photoFile =
        photoInput?.files[0];


    const addressFile =
        addressInput?.files[0];


    if (
        !nidFile ||
        !photoFile ||
        !addressFile
    ) {

        alert(
            'Please select all three required KYC documents.'
        );

        return;
    }


    // ========================================================
    // FORM DATA
    // ========================================================

    const formData =
        new FormData();


    formData.append(
        'customer_id',
        customerId
    );


    formData.append(
        'application_id',
        applicationId
    );


    formData.append(
        'nid_document',
        nidFile
    );


    formData.append(
        'photo_document',
        photoFile
    );


    formData.append(
        'address_document',
        addressFile
    );


    button.disabled =
        true;


    button.textContent =
        'Uploading Documents...';


    message.textContent =
        '';


    try {

        const response =
            await fetch(
                `${KYC_UPLOAD_API}/kyc-verifications/submit-files`,
                {
                    method:
                        'POST',

                    body:
                        formData
                }
            );


        const result =
            await response.json();


        console.log(
            'KYC UPLOAD RESULT:',
            result
        );


        if (!response.ok) {

            throw new Error(
                result.detail ||
                'KYC submission failed.'
            );
        }


        message.style.color =
            '#16a34a';


        message.textContent =
            '✓ KYC documents uploaded successfully.';


        // ====================================================
        // STORE TRACKING DATA
        // ====================================================

        localStorage.setItem(
            'tracking_customer_id',
            customerId
        );


        localStorage.setItem(
            'tracking_application_id',
            applicationId
        );


        localStorage.setItem(
            'tracking_kyc_id',
            result.kyc_id
        );


        // ====================================================
        // REMOVE TEMPORARY KYC SUBMISSION DATA
        // ====================================================

        localStorage.removeItem(
            'pending_customer_id'
        );


        localStorage.removeItem(
            'pending_application_id'
        );


        // ====================================================
        // SHOW SUCCESS BOX
        // ====================================================

        const form =
            document.getElementById(
                'kyc-submit-form'
            );


        const successBox =
            document.getElementById(
                'kyc-success-box'
            );


        if (form) {

            form.style.display =
                'none';
        }


        if (successBox) {

            successBox.style.display =
                'block';
        }

    }

    catch (error) {

        console.error(
            'KYC UPLOAD ERROR:',
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
            '✓ Submit KYC';
    }
}

function getKycDocumentUrl(path) {

    if (!path) {
        return '#';
    }


    const cleanedPath =
        String(path)
            .replace(/\\/g, '/')
            .replace(/^\/+/, '');


    return (
        `http://127.0.0.1:8000/${cleanedPath}`
    );
}