// Base Application Module
const App = (function() {
    const AppState = {
        lastSelectedOption: "dashboard",
        currentProject: null,
        projects: [],
        models: [],
        datasets: []
    };

    const UI = {
        selectors: {
            projectSelect: '#id_project',
            createProjectBtn: '#id_create_project_ok',
            deleteProjectBtn: '#id_delete_project_ok',
            logoutBtn: '#id_logout_ok',
            projectNameInput: '#id_project_name',
            createProjectModal: '#id_modal_create_project',
            deleteProjectModal: '#id_modal_delete_project',
            sidebarItems: {
                dashboard: '#sidebar_dashboard',
                datasets: '#sidebar_datasets',
                models: '#sidebar_models',
                experiments: '#sidebar_experiments',
                optimizations: '#sidebar_optimizations',
                deployment: '#sidebar_deployment',
                monitoring: '#sidebar_monitoring'
            }
        },
        messages: {
            errors: {
                projectRequired: 'Project name is required',
                invalidProjectName: 'Only letters, numbers, hyphens, and underscores are allowed.',
                loadFailed: 'Failed to load projects',
                createFailed: 'Failed to create project',
                deleteFailed: 'Failed to delete project',
                logoutFailed: 'Logout failed'
            },
            success: {
                projectCreated: 'Project created successfully!',
                projectDeleted: 'Project deleted successfully!',
                logoutSuccess: 'Logged out successfully.'
            }
        }
    };

    // Project Manager
    const ProjectManager = {
        async loadProjects() {
            try {
                const response = await fetch('/project/list', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await response.json();

                if (!data.err) {
                    AppState.projects = data.res.projects || [];
                    UIManager.updateProjectList(AppState.projects);
                } else {
                    throw new Error(data.err);
                }
            } catch (error) {
                console.error('Load projects error:', error);
                NotificationManager.error(UI.messages.errors.loadFailed);
            }
        },

        async createProject(projectName) {
            if (!this.validateProjectName(projectName)) {
                return NotificationManager.error(UI.messages.errors.invalidProjectName);
            }

            try {
                const response = await fetch("/project/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ project_name: projectName })
                });

                const data = await response.json();
                if (!data.err) {
                    NotificationManager.success(UI.messages.success.projectCreated);
                    await setCurrentProject(projectName);
                    await this.loadProjects();
                } else {
                    throw new Error(data.err);
                }
            } catch (error) {
                console.error('Create project error:', error);
                NotificationManager.error(UI.messages.errors.createFailed);
            }
        },

        validateProjectName(name) {
            return /^[a-zA-Z0-9_-]+$/.test(name);
        }
    };

    // Session Management
    async function setCurrentProject(projectName) {
        try {
            const response = await fetch('/project/current_project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project: projectName })
            });
            const data = await response.json();

            if (!data.err) {
                sessionStorage.setItem("project_name", projectName);
                AppState.currentProject = projectName;
                NavigationManager.updateUIForProject(projectName);
            } else {
                throw new Error(data.err);
            }
        } catch (error) {
            console.error("Failed to set current project:", error);
        }
    }

    const SessionManager = {
        async verifySessionState() {
            try {
                const response = await fetch('/project/current_project', { method: 'GET' });
                const data = await response.json();

                if (!data.err) {
                    AppState.currentProject = data.res.project_name;
                    sessionStorage.setItem("project_name", data.res.project_name);
                } else if (AppState.projects.length > 0) {
                    await setCurrentProject(AppState.projects[0]); // Default to first project
                } else {
                    AppState.currentProject = null;
                    sessionStorage.removeItem("project_name");
                }
            } catch (error) {
                console.error('Session verification failed:', error);
                sessionStorage.removeItem("project_name");
            }
        }
    };

    // UI Management
    const UIManager = {
        updateProjectList(projects) {
            const $select = $(UI.selectors.projectSelect);
            $select.empty();
            $select.append(new Option('Select Project', '', true, true));

            projects.forEach(project => {
                const option = new Option(project, project, project === AppState.currentProject, project === AppState.currentProject);
                $select.append(option);
            });

            $select.trigger('change');
        },

        initializeEventHandlers() {
            $(document).on('click', UI.selectors.createProjectBtn, async () => {
                const projectName = $(UI.selectors.projectNameInput).val().trim();
                if (projectName) await ProjectManager.createProject(projectName);
            });

            $(document).on('change', UI.selectors.projectSelect, async function() {
                const selectedProject = $(this).val();
                if (selectedProject) await setCurrentProject(selectedProject);
            });
        }
    };

    const NavigationManager = {
        updateUIForProject(projectName) {
            document.title = `${projectName} - Project Management`;
            console.log(`UI updated for project: ${projectName}`);
        }
    };

    const NotificationManager = {
        success(message) { toastr.success(message); },
        error(message) { toastr.error(message); }
    };

    // Initialize Application
    $(document).ready(async () => {
        UIManager.initializeEventHandlers();
        await ProjectManager.loadProjects();
        await SessionManager.verifySessionState();
    });

    return { AppState, ProjectManager, SessionManager, UIManager };
})();
