document.addEventListener('DOMContentLoaded', () => {

    const form =
        document.querySelector(
            '.signup-form'
        );

    const submitBtn =
        document.querySelector(
            '.submit-btn'
        );


    if (!form || !submitBtn) {

        console.log(
            'Form or submit button not found.'
        );

        return;
    }


    submitBtn.addEventListener(
        'click',
        async () => {

            // =================================================
            // GET FORM FIELDS
            // =================================================

            // Get all text/date/password inputs
            // except checkbox
            const fields =
                form.querySelectorAll(
                    'input:not([type="checkbox"])'
                );


            const selects =
                form.querySelectorAll(
                    'select'
                );


            // =================================================
            // CUSTOMER INFORMATION
            // =================================================

            const firstName =
                fields[0].value.trim();


            const lastName =
                fields[1].value.trim();


            const email =
                fields[2].value.trim();


            const phone =
                fields[3].value.trim();


            const dateOfBirth =
                document.getElementById(
                    'dateOfBirth'
                ).value;


            const nid =
                fields[5].value.trim();


            const address =
                fields[6].value.trim();


            // =================================================
            // PASSWORD INFORMATION
            // =================================================

            const password =
                fields[7].value;


            const confirmPassword =
                fields[8].value;


            // =================================================
            // TERMS CHECKBOX
            // =================================================

            const termsCheckbox =
                form.querySelector(
                    'input[type="checkbox"]'
                );


            const terms =
                termsCheckbox.checked;


            // =================================================
            // SELECT FIELDS
            // =================================================

            const branch =
                selects[0].value;


            const accountType =
                selects[1].value;


            // =================================================
            // DEBUG INFORMATION
            // =================================================

            console.log(
                'First Name:',
                firstName
            );

            console.log(
                'Last Name:',
                lastName
            );

            console.log(
                'Email:',
                email
            );

            console.log(
                'Phone:',
                phone
            );

            console.log(
                'Date of Birth:',
                dateOfBirth
            );

            console.log(
                'NID:',
                nid
            );

            console.log(
                'Address:',
                address
            );

            console.log(
                'Branch:',
                branch
            );

            console.log(
                'Account Type:',
                accountType
            );

            console.log(
                'Password entered:',
                password
                    ? 'YES'
                    : 'NO'
            );

            console.log(
                'Confirm Password entered:',
                confirmPassword
                    ? 'YES'
                    : 'NO'
            );

            console.log(
                'Terms:',
                terms
            );


            // =================================================
            // VALIDATION
            // =================================================

            if (!firstName) {

                alert(
                    'Please enter your first name.'
                );

                return;
            }


            if (!lastName) {

                alert(
                    'Please enter your last name.'
                );

                return;
            }


            if (!email) {

                alert(
                    'Please enter your email.'
                );

                return;
            }


            if (!phone) {

                alert(
                    'Please enter your phone number.'
                );

                return;
            }


            if (!dateOfBirth) {

                alert(
                    'Please select your date of birth.'
                );

                return;
            }


            if (!nid) {

                alert(
                    'Please enter your NID number.'
                );

                return;
            }


            if (!address) {

                alert(
                    'Please enter your address.'
                );

                return;
            }


            if (
                !branch ||
                branch ===
                'Select nearest branch'
            ) {

                alert(
                    'Please select a branch.'
                );

                return;
            }


            if (
                !accountType ||
                accountType ===
                'Select account type'
            ) {

                alert(
                    'Please select an account type.'
                );

                return;
            }


            if (
                !password ||
                !confirmPassword
            ) {

                alert(
                    'Please enter your password and confirm password.'
                );

                return;
            }


            if (
                password !==
                confirmPassword
            ) {

                alert(
                    'Password and Confirm Password do not match.'
                );

                return;
            }


            if (!terms) {

                alert(
                    'Please agree to the Terms of Service and KYC consent.'
                );

                return;
            }


            // =================================================
            // BRANCH ID
            // =================================================

            let branchId;


            if (
                branch ===
                'Dhanmondi Branch'
            ) {

                branchId = 1;

            }

            else if (
                branch ===
                'Gulshan Branch'
            ) {

                branchId = 2;

            }

            else if (
                branch ===
                'Uttara Branch'
            ) {

                branchId = 3;

            }

            else if (
                branch ===
                'Agrabad Branch'
            ) {

                branchId = 4;

            }

            else {

                alert(
                    'Invalid branch selected.'
                );

                return;
            }


            // =================================================
            // ACCOUNT TYPE ID
            // =================================================

            let accountTypeId;


            if (
                accountType ===
                'Savings'
            ) {

                accountTypeId = 1;

            }

            else if (
                accountType ===
                'Current'
            ) {

                accountTypeId = 2;

            }

            else if (
                accountType ===
                'Student'
            ) {

                accountTypeId = 3;

            }

            else if (
                accountType ===
                'Business'
            ) {

                accountTypeId = 4;

            }

            else {

                alert(
                    'Invalid account type selected.'
                );

                return;
            }


            // =================================================
            // USER DATA
            // =================================================

            const userData = {

                username:
                    email,

                email:
                    email,

                password:
                    password
            };


            // =================================================
            // DISABLE SUBMIT BUTTON
            // =================================================

            submitBtn.disabled =
                true;


            submitBtn.textContent =
                'Submitting...';


            try {

                // =================================================
                // 1. CREATE USER
                // =================================================

                const userResponse =
                    await fetch(
                        'http://127.0.0.1:8000/users/',
                        {
                            method:
                                'POST',

                            headers: {
                                'Content-Type':
                                    'application/json'
                            },

                            body:
                                JSON.stringify(
                                    userData
                                )
                        }
                    );


                const userResult =
                    await userResponse.json();


                if (!userResponse.ok) {

                    throw new Error(
                        userResult.detail ||
                        'Failed to create user.'
                    );
                }


                console.log(
                    'USER CREATED:',
                    userResult
                );


                // =================================================
                // 2. CREATE CUSTOMER
                // =================================================

                const customerData = {

                    user_id:
                        userResult.user_id,

                    branch_id:
                        branchId,

                    first_name:
                        firstName,

                    last_name:
                        lastName,

                    date_of_birth:
                        dateOfBirth,

                    nid:
                        nid,

                    phone:
                        phone,

                    email:
                        email,

                    address:
                        address,

                    occupation:
                        null
                };


                console.log(
                    'CUSTOMER DATA:',
                    customerData
                );


                const customerResponse =
                    await fetch(
                        'http://127.0.0.1:8000/customers/',
                        {
                            method:
                                'POST',

                            headers: {
                                'Content-Type':
                                    'application/json'
                            },

                            body:
                                JSON.stringify(
                                    customerData
                                )
                        }
                    );


                const customerResult =
                    await customerResponse.json();


                if (!customerResponse.ok) {

                    throw new Error(
                        customerResult.detail ||
                        'Failed to create customer.'
                    );
                }


                console.log(
                    'CUSTOMER CREATED:',
                    customerResult
                );


                const customerId =
                    customerResult.customer_id;


                // =================================================
                // 3. CREATE ACCOUNT APPLICATION
                // =================================================

                const applicationData = {

                    customer_id:
                        customerId,

                    account_type_id:
                        accountTypeId,

                    branch_id:
                        branchId
                };


                console.log(
                    'ACCOUNT APPLICATION DATA:',
                    applicationData
                );


                const applicationResponse =
                    await fetch(
                        'http://127.0.0.1:8000/account-applications/',
                        {
                            method:
                                'POST',

                            headers: {
                                'Content-Type':
                                    'application/json'
                            },

                            body:
                                JSON.stringify(
                                    applicationData
                                )
                        }
                    );


                const applicationResult =
                    await applicationResponse.json();


                if (
                    !applicationResponse.ok
                ) {

                    throw new Error(
                        applicationResult.detail ||
                        'Failed to submit account application.'
                    );
                }


                console.log(
                    'ACCOUNT APPLICATION CREATED:',
                    applicationResult
                );


                // =================================================
                // 4. SAVE APPLICATION INFORMATION FOR KYC
                // =================================================

                localStorage.setItem(
                    'pending_customer_id',
                    customerId
                );


                localStorage.setItem(
                    'pending_application_id',
                    applicationResult.application_id
                );


                console.log(
                    'PENDING CUSTOMER ID SAVED:',
                    customerId
                );


                console.log(
                    'PENDING APPLICATION ID SAVED:',
                    applicationResult.application_id
                );


                // =================================================
                // 5. ALSO SAVE TRACKING INFORMATION
                // =================================================
                // This will later be useful for the
                // application-status page.
                // =================================================

                localStorage.setItem(
                    'tracking_customer_id',
                    customerId
                );


                localStorage.setItem(
                    'tracking_application_id',
                    applicationResult.application_id
                );


                // =================================================
                // SUCCESS
                // =================================================

                alert(
                    'Account application submitted successfully!\n\n'
                    +
                    'Customer ID: '
                    +
                    customerId
                    +
                    '\n'
                    +
                    'Application ID: '
                    +
                    applicationResult.application_id
                    +
                    '\n\n'
                    +
                    'Next, please complete your KYC verification.'
                );


                // =================================================
                // CLEAR FORM
                // =================================================

                fields.forEach(
                    field => {

                        field.value =
                            '';
                    }
                );


                selects.forEach(
                    select => {

                        select.selectedIndex =
                            0;
                    }
                );


                termsCheckbox.checked =
                    false;


                // =================================================
                // 6. REDIRECT TO KYC SUBMISSION
                // =================================================

                window.location.href =
                    'kyc-submit.html';

            }

            catch (error) {

                console.error(
                    'REGISTRATION ERROR:',
                    error
                );


                alert(
                    'Unable to submit your application.\n\n'
                    +
                    error.message
                );

            }

            finally {

                submitBtn.disabled =
                    false;


                submitBtn.textContent =
                    'Submit Application';
            }

        }
    );

});