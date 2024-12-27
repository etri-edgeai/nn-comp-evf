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
class NavigationManager {
    constructor() {
        this.highlightActiveNavItem();
    }

    highlightActiveNavItem() {
        const currentPath = window.location.pathname;
        document.querySelectorAll(".navbar-nav .nav-link").forEach(link => {
            if (link.href.includes(currentPath)) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });
    }
}

class ProjectManager {
    constructor() {
        this.projectSelect = document.getElementById('id_project');
        this.createProjectBtn = document.getElementById('id_create_project_ok');
        this.deleteProjectBtn = document.getElementById('id_delete_project_ok');
        this.projectNameInput = document.getElementById('id_project_name');
        this.toastManager = new ToastManager();
        
        this.initialize();
    }
    async initialize() {
        if (this.createProjectBtn) {
            this.createProjectBtn.addEventListener('click', () => this.createProject());
        }
        
        if (this.deleteProjectBtn) {
            this.deleteProjectBtn.addEventListener('click', () => this.deleteProject());
        }

        if (this.projectSelect) {
            // First try to get current project from server
            await this.loadCurrentProject();
            
            this.projectSelect.addEventListener('change', () => this.handleProjectChange());
            await this.loadProjects();
        }
    }

    async loadCurrentProject() {
        try {
            const response = await fetch('/project/current_project', {
                method: 'GET'
            });
            const data = await response.json();
            
            if (!data.err && data.res.project_name) {
                // Store in both storages
                localStorage.setItem('currentProject', data.res.project_name);
                sessionStorage.setItem('project_name', data.res.project_name);
            } else if (localStorage.getItem('currentProject')) {
                // If server has no project but localStorage does, try to restore it
                const savedProject = localStorage.getItem('currentProject');
                await this.handleProjectChange(savedProject);
                sessionStorage.setItem('project_name', savedProject);
            }
        } catch (error) {
            console.error('Error loading current project:', error);
        }
    }

    async loadProjects() {
        try {
            const response = await fetch('/project/list', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();

            if (data.err) {
                this.toastManager.error(data.err);
                return;
            }

            // Clear existing options except the first one
            while (this.projectSelect.options.length > 1) {
                this.projectSelect.remove(1);
            }

            // Add projects to select
            if (data.res && data.res.projects) {
                data.res.projects.forEach(projectName => {
                    const option = new Option(projectName, projectName);
                    this.projectSelect.add(option);
                });
            }

            // Set current project
            const currentProject = localStorage.getItem('currentProject');
            if (currentProject) {
                this.projectSelect.value = currentProject;
            }
            
        } catch (error) {
            this.toastManager.error('Failed to load projects');
            console.error('Error loading projects:', error);
        }
    }

    async createProject() {
        const projectName = this.projectNameInput.value.trim();
        if (!projectName) {
            this.toastManager.warning('Please enter a project name');
            return;
        }

        try {
            const response = await fetch('/project/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
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
    async deleteProject() {
        const projectName = this.projectSelect.value;
        if (!projectName) {
            this.toastManager.warning('Please select a project to delete');
            return;
        }

        try {
            const response = await fetch('/project/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
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
    async handleProjectChange() {
        const selectedProject = this.projectSelect.value;
        if (!selectedProject) return;

        try {
            const response = await fetch('/project/current_project', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
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
                // Force reload to refresh all components
                window.location.reload();
            }
        } catch (error) {
            this.toastManager.error('Error setting current project');
            console.error('Error:', error);
        }
    }
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
    window.toastManager = new ToastManager();
    window.navigationManager = new NavigationManager();
    window.projectManager = new ProjectManager();
});


// Make theme manager available globally
window.getCurrentTheme = () => window.themeManager.getCurrentTheme();





