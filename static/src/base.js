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