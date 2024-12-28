// Theme Management
class ThemeManager {
    constructor() {
        this.themeLink = document.getElementById('theme-link'); // If any <link> element is used for theming
        this.toggleButton = document.getElementById('dark-mode-toggle');
        this.body = document.body;
        this.initialize();
    }

    // Initialize theme and button handler
    initialize() {
        // Check local storage for theme; default to 'light'
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.applyTheme(savedTheme);

        // Toggle between 'light' and 'dark' on button click
        this.toggleButton.addEventListener('click', () => {
            const newTheme = this.getCurrentTheme() === 'light' ? 'dark' : 'light';
            this.applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    // Apply the selected theme
    applyTheme(theme) {
        const isDark = (theme === 'dark');

        // Toggle a .theme-dark class on <body>
        document.body.classList.toggle('theme-dark', isDark);

        // Update the toggle button text
        this.toggleButton.textContent = isDark ? 'Light Mode' : 'Dark Mode';

        // Additional UI changes for forms, modals, and project selector
        this.updateFormElements(theme);
        this.updateModals(theme);
        this.updateProjectSelector(theme);
    }

    // Form elements background and text color for light/dark
    updateFormElements(theme) {
        const isDark = (theme === 'dark');
        document.querySelectorAll('.form-control, .form-select').forEach(element => {
            if (isDark) {
                element.style.backgroundColor = '#1a1f24';
                element.style.color = '#ffffff';
                element.style.borderColor = '#2c3338';
            } else {
                // Reset to defaults when light theme
                element.style.backgroundColor = '';
                element.style.color = '';
                element.style.borderColor = '';
            }
        });
    }

    // Modals background color/text color for dark mode
    updateModals(theme) {
        const isDark = (theme === 'dark');
        document.querySelectorAll('.modal-content').forEach(modal => {
            if (isDark) {
                modal.classList.add('bg-dark', 'text-white');
            } else {
                modal.classList.remove('bg-dark', 'text-white');
            }
        });
    }

    // Project selector background and text color
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

    // Get the current theme from local storage
    getCurrentTheme() {
        return localStorage.getItem('theme') || 'light';
    }
}

// Toast Notification Management
class ToastManager {
    constructor() {
        this.configure();
    }

    // Toastr Configuration
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

    // Various toast methods
    success(message) {
        toastr.success(message);
    }

    error(message) {
        toastr.error(message);
    }

    warning(message) {
        toastr.warning(message);
    }

    info(message) {
        toastr.info(message);
    }
}

// Navigation Management (Highlight active nav item)
class NavigationManager {
    constructor() {
        this.highlightActiveNavItem();
    }

    highlightActiveNavItem() {
        const currentPath = window.location.pathname;

        // For each link in .navbar-nav, add/remove 'active' based on current URL
        document.querySelectorAll(".navbar-nav .nav-link").forEach(link => {
            if (link.href.includes(currentPath)) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });
    }
}

// Project Management
class ProjectManager {
    constructor() {
        // DOM elements
        this.projectSelect = document.getElementById('id_project');
        this.createProjectBtn = document.getElementById('id_create_project_ok');
        this.deleteProjectBtn = document.getElementById('id_delete_project_ok');
        this.projectNameInput = document.getElementById('id_project_name');
        
        // Use a ToastManager instance to show toast messages
        this.toastManager = new ToastManager();

        this.initialize();
    }

    // Setup event listeners and initial loading
    async initialize() {
        if (this.createProjectBtn) {
            this.createProjectBtn.addEventListener('click', () => this.createProject());
        }
        
        if (this.deleteProjectBtn) {
            this.deleteProjectBtn.addEventListener('click', () => this.deleteProject());
        }

        if (this.projectSelect) {
            // Try to get current project from server, or restore from localStorage
            await this.loadCurrentProject();

            // On changing the project in select
            this.projectSelect.addEventListener('change', () => this.handleProjectChange());

            // Finally, load the projects list
            await this.loadProjects();
        }
    }

    // Get current project from the server
    async loadCurrentProject() {
        try {
            const response = await fetch('/project/current_project', {
                method: 'GET'
            });
            const data = await response.json();

            if (!data.err && data.res.project_name) {
                // Sync the project name with both local and session storage
                localStorage.setItem('currentProject', data.res.project_name);
                sessionStorage.setItem('project_name', data.res.project_name);
            } else {
                // If server has no record, but localStorage has one, try to restore
                const savedProject = localStorage.getItem('currentProject');
                if (savedProject) {
                    await this.handleProjectChange(savedProject);
                    sessionStorage.setItem('project_name', savedProject);
                }
            }
        } catch (error) {
            console.error('Error loading current project:', error);
        }
    }

    // Load the full list of projects and populate the <select>
    async loadProjects() {
        try {
            const response = await fetch('/project/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();

            if (data.err) {
                this.toastManager.error(data.err);
                return;
            }

            // Remove old options (except the first "Select Project")
            while (this.projectSelect.options.length > 1) {
                this.projectSelect.remove(1);
            }

            // Populate new project options
            if (data.res && data.res.projects) {
                data.res.projects.forEach(projectName => {
                    const option = new Option(projectName, projectName);
                    this.projectSelect.add(option);
                });
            }

            // If we have a currently selected project, set it
            const currentProject = localStorage.getItem('currentProject');
            if (currentProject) {
                this.projectSelect.value = currentProject;
            }
        } catch (error) {
            this.toastManager.error('Failed to load projects');
            console.error('Error loading projects:', error);
        }
    }

    // Create a new project by name
    async createProject() {
        const projectName = this.projectNameInput.value.trim();
        if (!projectName) {
            this.toastManager.warning('Please enter a project name');
            return;
        }

        try {
            const response = await fetch('/project/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_name: projectName })
            });
            const data = await response.json();

            if (data.err) {
                this.toastManager.error(data.err);
            } else {
                this.toastManager.success('Project created successfully');
                this.loadProjects();
                $('#id_modal_create_project').modal('hide');
                this.projectNameInput.value = '';
            }
        } catch (error) {
            this.toastManager.error('Error creating project');
            console.error('Error:', error);
        }
    }

    // Delete the currently selected project
    async deleteProject() {
        const projectName = this.projectSelect.value;
        if (!projectName) {
            this.toastManager.warning('Please select a project to delete');
            return;
        }

        try {
            const response = await fetch('/project/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_name: projectName })
            });
            const data = await response.json();

            if (data.err) {
                this.toastManager.error(data.err);
            } else {
                this.toastManager.success('Project deleted successfully');
                this.loadProjects();
                $('#id_modal_delete_project').modal('hide');
            }
        } catch (error) {
            this.toastManager.error('Error deleting project');
            console.error('Error:', error);
        }
    }

    // Handle changing the project selection
    async handleProjectChange() {
        const selectedProject = this.projectSelect.value;
        if (!selectedProject) return;

        try {
            const response = await fetch('/project/current_project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project: selectedProject })
            });
            const data = await response.json();

            if (data.err) {
                this.toastManager.error(data.err);
                localStorage.removeItem('currentProject');
                sessionStorage.removeItem('project_name');
            } else {
                localStorage.setItem('currentProject', selectedProject);
                sessionStorage.setItem('project_name', selectedProject);
                // Reload the page to refresh components
                window.location.reload();
            }
        } catch (error) {
            this.toastManager.error('Error setting current project');
            console.error('Error:', error);
        }
    }
}

// Once the DOM is ready, initialize everything
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
    window.toastManager = new ToastManager();
    window.navigationManager = new NavigationManager();
    window.projectManager = new ProjectManager();
});

// Expose the current theme as a global function if needed
window.getCurrentTheme = () => window.themeManager.getCurrentTheme();
