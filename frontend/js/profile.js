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

        let currentCustomer =
            null;


        // ==========================================
        // FORMAT DATE
        // ==========================================

        function formatDate(value) {

            if (!value) {
                return '-';
            }


            const date =
                new Date(
                    `${value}T00:00:00`
                );


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
                        'Failed to load customer profile.'
                    );
                }


                currentCustomer =
                    customer;


                renderCustomer(
                    customer
                );

            }

            catch (error) {

                console.error(
                    'PROFILE LOAD ERROR:',
                    error
                );


                alert(
                    'Unable to load profile.\n\n'
                    +
                    error.message
                );
            }
        }


        // ==========================================
        // RENDER CUSTOMER
        // ==========================================

        function renderCustomer(customer) {

            const fullName =
                `${customer.first_name} ${customer.last_name}`;


            document.getElementById(
                'topbar-name'
            ).textContent =
                fullName;


            document.getElementById(
                'profile-full-name'
            ).textContent =
                fullName;


            document.getElementById(
                'profile-email'
            ).textContent =
                customer.email;


            document.getElementById(
                'profile-status'
            ).textContent =
                customer.status;


            document.getElementById(
                'profile-status'
            ).className =
                `profile-status-badge ${String(
                    customer.status ||
                    ''
                ).toLowerCase()}`;


            document.getElementById(
                'profile-customer-id'
            ).textContent =
                customer.customer_id;


            document.getElementById(
                'profile-branch-id'
            ).textContent =
                customer.branch_id;


            document.getElementById(
                'profile-first-name'
            ).textContent =
                customer.first_name;


            document.getElementById(
                'profile-last-name'
            ).textContent =
                customer.last_name;


            document.getElementById(
                'profile-dob'
            ).textContent =
                formatDate(
                    customer.date_of_birth
                );


            document.getElementById(
                'profile-nid'
            ).textContent =
                customer.nid;


            document.getElementById(
                'profile-phone'
            ).textContent =
                customer.phone;


            document.getElementById(
                'profile-email-detail'
            ).textContent =
                customer.email;


            document.getElementById(
                'profile-occupation'
            ).textContent =
                customer.occupation ||
                'Not provided';


            document.getElementById(
                'profile-address'
            ).textContent =
                customer.address;
        }


        // ==========================================
        // LOAD ACCOUNT NUMBER
        // ==========================================

        async function loadAccountNumber() {

            const element =
                document.getElementById(
                    'profile-account-number'
                );


            try {

                const response =
                    await fetch(
                        `${API_BASE}/accounts/`
                    );


                const accounts =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        accounts.detail ||
                        'Unable to load account.'
                    );
                }


                const customerAccounts =
                    accounts.filter(
                        account =>
                            String(
                                account.customer_id
                            )
                            ===
                            String(
                                customerId
                            )
                    );


                if (
                    customerAccounts.length === 0
                ) {

                    element.textContent =
                        'No account found';

                    return;
                }


                element.textContent =
                    customerAccounts[0]
                        .account_number;

            }

            catch (error) {

                console.error(
                    'ACCOUNT NUMBER ERROR:',
                    error
                );


                element.textContent =
                    'Unavailable';
            }
        }


        // ==========================================
        // OPEN EDIT FORM
        // ==========================================

        function openEditForm() {

            if (!currentCustomer) {
                return;
            }


            document.getElementById(
                'edit-profile-first-name'
            ).value =
                currentCustomer.first_name;


            document.getElementById(
                'edit-profile-last-name'
            ).value =
                currentCustomer.last_name;


            document.getElementById(
                'edit-profile-dob'
            ).value =
                currentCustomer.date_of_birth;


            document.getElementById(
                'edit-profile-phone'
            ).value =
                currentCustomer.phone;


            document.getElementById(
                'edit-profile-email'
            ).value =
                currentCustomer.email;


            document.getElementById(
                'edit-profile-occupation'
            ).value =
                currentCustomer.occupation ||
                '';


            document.getElementById(
                'edit-profile-address'
            ).value =
                currentCustomer.address;


            const editCard =
                document.getElementById(
                    'profile-edit-card'
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
        // CLOSE EDIT FORM
        // ==========================================

        function closeEditForm() {

            document.getElementById(
                'profile-edit-card'
            ).style.display =
                'none';


            document.getElementById(
                'profile-update-message'
            ).textContent =
                '';
        }


        // ==========================================
        // UPDATE CUSTOMER
        // ==========================================

        async function updateCustomer() {

            const firstName =
                document.getElementById(
                    'edit-profile-first-name'
                ).value.trim();


            const lastName =
                document.getElementById(
                    'edit-profile-last-name'
                ).value.trim();


            const dateOfBirth =
                document.getElementById(
                    'edit-profile-dob'
                ).value;


            const phone =
                document.getElementById(
                    'edit-profile-phone'
                ).value.trim();


            const email =
                document.getElementById(
                    'edit-profile-email'
                ).value.trim();


            const occupation =
                document.getElementById(
                    'edit-profile-occupation'
                ).value.trim();


            const address =
                document.getElementById(
                    'edit-profile-address'
                ).value.trim();


            const button =
                document.getElementById(
                    'save-profile-btn'
                );


            const message =
                document.getElementById(
                    'profile-update-message'
                );


            if (
                !firstName ||
                !lastName ||
                !dateOfBirth ||
                !phone ||
                !email ||
                !address
            ) {

                alert(
                    'Please fill in all required fields.'
                );

                return;
            }


            button.disabled =
                true;


            button.textContent =
                'Saving...';


            message.textContent =
                '';


            try {

                const response =
                    await fetch(
                        `${API_BASE}/customers/${customerId}`,
                        {
                            method:
                                'PUT',

                            headers: {
                                'Content-Type':
                                    'application/json'
                            },

                            body:
                                JSON.stringify({

                                    first_name:
                                        firstName,

                                    last_name:
                                        lastName,

                                    date_of_birth:
                                        dateOfBirth,

                                    phone:
                                        phone,

                                    email:
                                        email,

                                    address:
                                        address,

                                    occupation:
                                        occupation || null
                                })
                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.detail ||
                        'Unable to update profile.'
                    );
                }


                currentCustomer =
                    result;


                renderCustomer(
                    result
                );


                message.style.color =
                    '#16a34a';


                message.textContent =
                    '✓ Profile updated successfully.';


                setTimeout(
                    closeEditForm,
                    700
                );

            }

            catch (error) {

                console.error(
                    'PROFILE UPDATE ERROR:',
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
                    '✓ Save Changes';
            }
        }


        // ==========================================
        // EVENTS
        // ==========================================

        document.getElementById(
            'open-profile-edit'
        ).addEventListener(
            'click',
            openEditForm
        );


        document.getElementById(
            'cancel-profile-edit'
        ).addEventListener(
            'click',
            closeEditForm
        );


        document.getElementById(
            'profile-edit-form'
        ).addEventListener(
            'submit',
            event => {

                event.preventDefault();

                updateCustomer();
            }
        );


        // ==========================================
        // LOGOUT
        // ==========================================

        document.getElementById(
            'logoutBtn'
        ).addEventListener(
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


        // ==========================================
        // INITIAL LOAD
        // ==========================================

        loadCustomer();

        loadAccountNumber();

    }
);