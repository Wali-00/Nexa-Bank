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

            clearSession();


            alert(
                'Please login as a customer first.'
            );


            window.location.href =
                'login.html';


            return;
        }


        // ==========================================
        // HELPERS
        // ==========================================

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


        function signOut() {

            clearSession();


            window.location.href =
                'login.html';
        }


        // ==========================================
        // SESSION INFORMATION
        // ==========================================

        document.getElementById(
            'settings-customer-id'
        ).textContent =
            customerId;


        document.getElementById(
            'settings-user-id'
        ).textContent =
            userId;


        document.getElementById(
            'settings-role'
        ).textContent =
            role.toUpperCase();


        // ==========================================
        // LOAD CUSTOMER NAME
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
                    'SETTINGS CUSTOMER ERROR:',
                    error
                );
            }
        }


        // ==========================================
        // LOAD ACCOUNT NUMBER
        // ==========================================

        async function loadAccountNumber() {

            const element =
                document.getElementById(
                    'settings-account-number'
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
                    customerAccounts.length ===
                    0
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
                    'SETTINGS ACCOUNT ERROR:',
                    error
                );


                element.textContent =
                    'Unavailable';
            }
        }


        // ==========================================
        // THEME
        // ==========================================

        const themeSelect =
            document.getElementById(
                'theme-select'
            );


        const savedTheme =
            localStorage.getItem(
                'nexa_theme'
            )
            ||
            'light';


        themeSelect.value =
            savedTheme;


        applyTheme(
            savedTheme
        );


        themeSelect.addEventListener(
            'change',
            () => {

                const selectedTheme =
                    themeSelect.value;


                localStorage.setItem(
                    'nexa_theme',
                    selectedTheme
                );


                applyTheme(
                    selectedTheme
                );
            }
        );


        function applyTheme(theme) {

            if (
                theme ===
                'dark'
            ) {

                document.body.classList.add(
                    'nexa-dark-mode'
                );

            }

            else {

                document.body.classList.remove(
                    'nexa-dark-mode'
                );
            }
        }


        // ==========================================
        // NOTIFICATION PREFERENCE
        // ==========================================

        const notificationToggle =
            document.getElementById(
                'notification-toggle'
            );


        const savedNotificationPreference =
            localStorage.getItem(
                'nexa_notifications_enabled'
            );


        if (
            savedNotificationPreference ===
            null
        ) {

            notificationToggle.checked =
                true;

        }

        else {

            notificationToggle.checked =
                savedNotificationPreference
                ===
                'true';
        }


        notificationToggle.addEventListener(
            'change',
            () => {

                localStorage.setItem(
                    'nexa_notifications_enabled',
                    String(
                        notificationToggle.checked
                    )
                );
            }
        );


        // ==========================================
        // SIGN OUT BUTTONS
        // ==========================================

        const sidebarLogout =
            document.getElementById(
                'logoutBtn'
            );


        if (sidebarLogout) {

            sidebarLogout.addEventListener(
                'click',
                event => {

                    event.preventDefault();

                    signOut();
                }
            );
        }


        const settingsLogout =
            document.getElementById(
                'settings-logout-btn'
            );


        if (settingsLogout) {

            settingsLogout.addEventListener(
                'click',
                () => {

                    const confirmed =
                        confirm(
                            'Are you sure you want to sign out?'
                        );


                    if (!confirmed) {
                        return;
                    }


                    signOut();
                }
            );
        }


        // ==========================================
        // INITIALIZE
        // ==========================================

        loadCustomer();

        loadAccountNumber();

    }
);