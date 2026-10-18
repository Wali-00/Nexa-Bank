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

        let notifications = [];

        let activeFilter =
            'ALL';


        // ==========================================
        // HELPERS
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


        function formatDateTime(value) {

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
        // LOAD NOTIFICATIONS
        // ==========================================

        async function loadNotifications() {

            const container =
                document.getElementById(
                    'notifications-list'
                );


            try {

                const response =
                    await fetch(
                        `${API_BASE}/notifications/user/${userId}`
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.detail ||
                        'Failed to load notifications.'
                    );
                }


                notifications =
                    result;


                updateSummary();

                renderNotifications();

            }

            catch (error) {

                console.error(
                    'NOTIFICATION LOAD ERROR:',
                    error
                );


                container.innerHTML = `
                    <p>
                        Unable to load notifications.
                    </p>
                `;
            }
        }


        // ==========================================
        // UPDATE SUMMARY
        // ==========================================

        function updateSummary() {

            const total =
                notifications.length;


            const unread =
                notifications.filter(
                    notification =>
                        !Boolean(
                            notification.is_read
                        )
                ).length;


            const read =
                total - unread;


            document.getElementById(
                'total-notifications'
            ).textContent =
                total;


            document.getElementById(
                'unread-notifications'
            ).textContent =
                unread;


            document.getElementById(
                'read-notifications'
            ).textContent =
                read;
        }


        // ==========================================
        // GET FILTERED NOTIFICATIONS
        // ==========================================

        function getFilteredNotifications() {

            if (
                activeFilter ===
                'UNREAD'
            ) {

                return notifications.filter(
                    notification =>
                        !Boolean(
                            notification.is_read
                        )
                );
            }


            if (
                activeFilter ===
                'READ'
            ) {

                return notifications.filter(
                    notification =>
                        Boolean(
                            notification.is_read
                        )
                );
            }


            return notifications;
        }


        // ==========================================
        // RENDER
        // ==========================================

        function renderNotifications() {

            const container =
                document.getElementById(
                    'notifications-list'
                );


            const filtered =
                getFilteredNotifications();


            if (
                filtered.length === 0
            ) {

                container.innerHTML = `
                    <div class="notification-empty-state">

                        <div class="notification-empty-icon">
                            🔔
                        </div>

                        <h3>
                            No notifications found
                        </h3>

                        <p>
                            There are no notifications
                            matching this filter.
                        </p>

                    </div>
                `;

                return;
            }


            container.innerHTML =
                '';


            filtered.forEach(
                notification => {

                    const isRead =
                        Boolean(
                            notification.is_read
                        );


                    const item =
                        document.createElement(
                            'div'
                        );


                    item.className =
                        isRead
                            ?
                            'full-notification-item'
                            :
                            'full-notification-item unread';


                    item.innerHTML = `

                        <div class="notification-icon-box">
                            ${getNotificationIcon(
                        notification.notification_type
                    )}
                        </div>


                        <div class="notification-main-content">

                            <div class="notification-title-row">

                                <h3>
                                    ${escapeHtml(
                        notification.title
                    )}
                                </h3>

                                ${!isRead

                            ?

                            `
                                        <span class="notification-new-badge">
                                            NEW
                                        </span>
                                    `

                            :

                            ''
                        }

                            </div>


                            <p>
                                ${escapeHtml(
                            notification.message
                        )}
                            </p>


                            <div class="notification-meta">

                                <span>
                                    ${escapeHtml(
                            notification.notification_type
                        )}
                                </span>

                                <span>
                                    ${escapeHtml(
                            formatDateTime(
                                notification.created_at
                            )
                        )}
                                </span>

                            </div>

                        </div>


                        <div class="notification-actions">

                            ${isRead

                            ?

                            `
                                    <span class="notification-read-text">
                                        ✓ Read
                                    </span>
                                `

                            :

                            `
                                    <button
                                        type="button"
                                        class="notification-mark-read"
                                        data-notification-id="${notification.notification_id}"
                                    >
                                        Mark as Read
                                    </button>
                                `
                        }

                        </div>

                    `;


                    container.appendChild(
                        item
                    );
                }
            );


            attachMarkReadEvents();
        }


        // ==========================================
        // NOTIFICATION ICON
        // ==========================================

        function getNotificationIcon(
            type
        ) {

            const normalized =
                String(
                    type || ''
                ).toUpperCase();


            if (
                normalized.includes(
                    'TRANSFER'
                )
            ) {
                return '💸';
            }


            if (
                normalized.includes(
                    'BILL'
                )
            ) {
                return '🧾';
            }


            if (
                normalized.includes(
                    'LOAN'
                )
            ) {
                return '🏦';
            }


            if (
                normalized.includes(
                    'CARD'
                )
            ) {
                return '💳';
            }


            if (
                normalized.includes(
                    'FIXED'
                )
                ||
                normalized.includes(
                    'DEPOSIT'
                )
            ) {
                return '📈';
            }


            if (
                normalized.includes(
                    'ACCOUNT'
                )
            ) {
                return '💰';
            }


            return '🔔';
        }


        // ==========================================
        // MARK AS READ
        // ==========================================

        async function markNotificationRead(
            notificationId
        ) {

            try {

                const response =
                    await fetch(
                        `${API_BASE}/notifications/${notificationId}/read`,
                        {
                            method:
                                'PUT'
                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.detail ||
                        'Unable to mark notification as read.'
                    );
                }


                const notification =
                    notifications.find(
                        item =>
                            Number(
                                item.notification_id
                            )
                            ===
                            Number(
                                notificationId
                            )
                    );


                if (notification) {

                    notification.is_read =
                        1;
                }


                updateSummary();

                renderNotifications();

            }

            catch (error) {

                console.error(
                    'MARK READ ERROR:',
                    error
                );


                alert(
                    'Unable to update notification.\n\n'
                    +
                    error.message
                );
            }
        }


        // ==========================================
        // MARK READ EVENTS
        // ==========================================

        function attachMarkReadEvents() {

            document
                .querySelectorAll(
                    '.notification-mark-read'
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            'click',
                            async () => {

                                button.disabled =
                                    true;


                                await markNotificationRead(
                                    button.dataset
                                        .notificationId
                                );

                            }
                        );
                    }
                );
        }


        // ==========================================
        // FILTERS
        // ==========================================

        document
            .querySelectorAll(
                '.notification-filter-btn'
            )
            .forEach(
                button => {

                    button.addEventListener(
                        'click',
                        () => {

                            activeFilter =
                                button.dataset
                                    .filter;


                            document
                                .querySelectorAll(
                                    '.notification-filter-btn'
                                )
                                .forEach(
                                    item =>
                                        item.classList.remove(
                                            'active'
                                        )
                                );


                            button.classList.add(
                                'active'
                            );


                            renderNotifications();
                        }
                    );
                }
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
        // INITIALIZE
        // ==========================================

        async function initializePage() {

            await loadCustomer();

            await loadNotifications();
        }


        initializePage();

    }
);