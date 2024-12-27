// Theme management
class ThemeManager {
    constructor() {
        this.themeLink = document.getElementById('theme-link');
        this.toggleButton = document.getElementById('dark-mode-toggle');
        this.body = document.body;
        this.initialize();
    }
    initialize() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.applyTheme(savedTheme);

        this.toggleButton.addEventListener('click', () => {
            const newTheme = this.getCurrentTheme() === 'light' ? 'dark' : 'light';
            this.applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
    applyTheme(theme) {
        const isDark = theme === 'dark';
        document.body.classList.toggle('theme-dark', isDark);
        this.toggleButton.textContent = isDark ? 'Light Mode' : 'Dark Mode';
        this.updateFormElements(theme);
        this.updateModals(theme);
        this.updateProjectSelector(theme);
    }

    updateFormElements(theme) {
        const isDark = theme === 'dark';
        document.querySelectorAll('.form-control, .form-select').forEach(element => {
            if (isDark) {
                element.style.backgroundColor = '#1a1f24';
                element.style.color = '#ffffff';
                element.style.borderColor = '#2c3338';
            } else {
                element.style.backgroundColor = '';
                element.style.color = '';
                element.style.borderColor = '';
            }
        });
    }
    updateModals(theme) {
        const isDark = theme === 'dark';
        document.querySelectorAll('.modal-content').forEach(modal => {
            if (isDark) {
                modal.classList.add('bg-dark', 'text-white');
            } else {
                modal.classList.remove('bg-dark', 'text-white');
            }
        });
    }

    updateProjectSelector(theme) {
        const projectSelect = document.getElementById('id_project');
        if (projectSelect) {
            if (theme === 'dark') {
                projectSelect.style.backgroundColor = '#1a1f24';
                projectSelect.style.color = '#ffffff';
            } else {
                projectSelect.style.backgroundColor = '';
                projectSelect.style.color = '';
            }
        }
    }

    getCurrentTheme() {
        return localStorage.getItem('theme') || 'light';
    }
}

class ToastManager {
    constructor() {
        this.configure();
    }

    configure() {
        toastr.options = {
            closeButton: true,
            progressBar: true,
            positionClass: "toast-bottom-right",
            showDuration: "300",
            hideDuration: "100",
            timeOut: "1000",
            extendedTimeOut: "1000",
            showMethod: "fadeIn",
            hideMethod: "fadeOut"
        };
    }
    success(message) {
        toastr.success(message);
    }












