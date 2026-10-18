function updateRole() {

    const sel = document.getElementById('userType');

    if (!sel) return;

    const opt = sel.options[sel.selectedIndex];

    const c1 = opt.getAttribute('data-color1');
    const c2 = opt.getAttribute('data-color2');
    const icon = opt.getAttribute('data-icon');

    const iconBox = document.getElementById('loginIcon');
    const loginBtn = document.getElementById('loginBtn');

    if (iconBox) {

        iconBox.style.background =
            `linear-gradient(135deg, ${c1}, ${c2})`;

        iconBox.innerHTML = icon;
    }

    if (loginBtn) {

        loginBtn.style.background =
            `linear-gradient(135deg, ${c1}, ${c2})`;
    }
}


async function doLogin() {

    const userType =
        document.getElementById('userType').value;

    const username =
        document.getElementById('loginUser').value.trim();

    const password =
        document.getElementById('loginPass').value;

    const loginMsg =
        document.getElementById('loginMsg');

    const loginBtn =
        document.getElementById('loginBtn');


    // ========================================
    // 1. BASIC VALIDATION
    // ========================================

    if (!username || !password) {

        alert(
            'Please enter your username/email and password.'
        );

        return;
    }


    // ========================================
    // 2. DISABLE LOGIN BUTTON
    // ========================================

    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';


    try {

        // ========================================
        // 3. SEND LOGIN REQUEST
        // ========================================

        const response = await fetch(
            'http://127.0.0.1:8000/login/',
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    username_or_email: username,
                    password: password,
                    role: userType
                })
            }
        );


        const result = await response.json();


        // ========================================
        // 4. LOGIN FAILED
        // ========================================

        if (!response.ok) {

            throw new Error(
                result.detail ||
                'Login failed.'
            );
        }


        console.log(
            'LOGIN SUCCESS:',
            result
        );


        // ========================================
        // 5. CLEAR OLD LOGIN SESSION
        // ========================================

        localStorage.removeItem('user_id');
        localStorage.removeItem('customer_id');
        localStorage.removeItem('role');


        // ========================================
        // 6. SAVE COMMON LOGIN DATA
        // ========================================

        localStorage.setItem(
            'user_id',
            result.user_id
        );

        localStorage.setItem(
            'role',
            result.role
        );


        // Customer gets customer_id too
        if (
            result.role === 'customer'
            && result.customer_id !== null
        ) {

            localStorage.setItem(
                'customer_id',
                result.customer_id
            );
        }


        // ========================================
        // 7. CUSTOMER
        // ========================================

        if (result.role === 'customer') {

            showLoginSuccess(
                '✔ Login successful. Opening your dashboard…',
                'customer-dashboard.html'
            );
        }


        // ========================================
        // 8. ADMIN
        // ========================================

        else if (result.role === 'admin') {

            showLoginSuccess(
                '✔ Admin login successful. Opening dashboard…',
                'admin-dashboard.html'
            );
        }


        // ========================================
        // 9. ACCOUNT OFFICER
        // ========================================

        else if (result.role === 'officer') {

            showLoginSuccess(
                '✔ Login successful. Opening Account Officer Dashboard…',
                'account-officer-dashboard.html'
            );
        }


        // ========================================
        // 10. LOAN OFFICER
        // ========================================

        else if (result.role === 'loan') {

            showLoginSuccess(
                '✔ Login successful. Opening Loan Officer Dashboard…',
                'loan-officer-dashboard.html'
            );
        }


        // ========================================
        // 11. BRANCH MANAGER
        // ========================================

        else if (result.role === 'branch') {

            showLoginSuccess(
                '✔ Login successful. Opening Branch Manager Dashboard…',
                'branch-manager-dashboard.html'
            );
        }


        // ========================================
        // 12. UNKNOWN ROLE
        // ========================================

        else {

            alert(
                'Login successful, but no dashboard is configured for this role.'
            );
        }

    }

    catch (error) {

        console.error(
            'LOGIN ERROR:',
            error
        );

        alert(
            'Login failed.\n\n' +
            error.message
        );

    }

    finally {

        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    }
}


// ============================================================
// HELPER: SHOW SUCCESS AND REDIRECT
// ============================================================

function showLoginSuccess(
    message,
    targetPage
) {

    const loginMsg =
        document.getElementById('loginMsg');

    if (loginMsg) {

        loginMsg.style.display = 'block';
        loginMsg.textContent = message;
    }

    setTimeout(() => {

        window.location.href = targetPage;

    }, 800);
}