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







