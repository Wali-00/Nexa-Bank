document.addEventListener(
    'DOMContentLoaded',
    () => {

        // ==========================================
        // LOAD SAVED THEME
        // ==========================================

        const savedTheme =
            localStorage.getItem(
                'nexa_theme'
            )
            ||
            'light';


        applyCustomerTheme(
            savedTheme
        );


        // ==========================================
        // APPLY THEME
        // ==========================================

        function applyCustomerTheme(theme) {

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

    }
);