// Theme management
class ThemeManager {
    constructor() {
        this.themeLink = document.getElementById('theme-link');
        this.toggleButton = document.getElementById('dark-mode-toggle');
        this.body = document.body;
        this.initialize();
    }
