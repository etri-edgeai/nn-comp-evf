// Base Application Module
const App = (function() {
    // State Management
    const AppState = {
        lastSelectedOption: "dashboard",
        currentProject: null,
        projects: [],
        models: [],
        datasets: []
    };

    // UI Constants
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
                invalidProjectName: 'Project name can only contain letters, numbers, hyphens, and underscores',
                noProjectSelected: 'No project selected',
                loadFailed: 'Failed to load projects',
                createFailed: 'Failed to create project',
                deleteFailed: 'Failed to delete project',
                logoutFailed: 'Failed to logout'
            },
            success: {
                projectCreated: 'Project created successfully',
                projectDeleted: 'Project deleted successfully',
                logoutSuccess: 'Logged out successfully'
            }
        }
    };

    // Project Management
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
                    return true;
                }
                NotificationManager.error(data.err);
                return false;
            } catch (error) {
                console.error('Load projects error:', error);
                NotificationManager.error(UI.messages.errors.loadFailed);
                return false;
            }
        },

        async createProject(projectName) {
            console.log('Creating project:', projectName);
            try {
                // Get button and store original text first
                const $createBtn = $(UI.selectors.createProjectBtn);
                const originalText = $createBtn.text() || 'Create';  // Store original text with fallback
                
                // Show loading state
                $createBtn.prop('disabled', true).text('Creating...');
        
                // Validate
                if (!projectName) {
                    NotificationManager.error(UI.messages.errors.projectRequired);
                    $createBtn.prop('disabled', false).text(originalText);
                    return false;
                }
                
                if (!this.validateProjectName(projectName)) {
                    NotificationManager.error(UI.messages.errors.invalidProjectName);
                    $createBtn.prop('disabled', false).text(originalText);
                    return false;
                }
        
                const response = await fetch("/project/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ project_name: projectName })
                });
        
                const data = await response.json();
                console.log('Create project response:', data);
                
                if (!data.err) {
                    AppState.currentProject = projectName;
                    SessionManager.setProject(projectName);
                    NotificationManager.success(UI.messages.success.projectCreated);
                    
                    // Reset form and close modal
                    $(UI.selectors.projectNameInput).val('');
                    const modalElement = document.querySelector(UI.selectors.createProjectModal);
                    if (modalElement) {
                        const modal = bootstrap.Modal.getInstance(modalElement);
                        if (modal) modal.hide();
                    }
                    
                    await this.loadProjects();
                    return true;
                } else {
                    NotificationManager.error(data.err);
                    return false;
                }
            } catch (error) {
                console.error("Create project error:", error);
                NotificationManager.error(UI.messages.errors.createFailed);
                return false;
            } finally {
                // Reset button state using jQuery find to ensure we get the right button
                const $btn = $(UI.selectors.createProjectBtn);
                $btn.prop('disabled', false).text($btn.data('originalText') || 'Create');
            }
        },
        
        async  syncProjectToServer(projectName) {
            try {
                const response = await fetch('/project/current_project', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ project: projectName })
                });
                const data = await response.json();
                if (data.err) {
                    console.error('Failed to sync project to server:', data.err);
                }
            } catch (error) {
                console.error('Error syncing project to server:', error);
            }
        },

        async deleteProject(projectName) {
            try {
                if (!projectName) {
                    NotificationManager.error(UI.messages.errors.noProjectSelected);
                    return false;
                }

                const response = await fetch("/project/delete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ project_name: projectName })
                });

                const data = await response.json();
                if (!data.err) {
                    NotificationManager.success(UI.messages.success.projectDeleted);
                    AppState.currentProject = null;
                    SessionManager.clearProject();
                    $(UI.selectors.deleteProjectModal).modal('hide');
                    await this.loadProjects();
                    return true;
                }
                NotificationManager.error(data.err);
                return false;
            } catch (error) {
                console.error("Delete project error:", error);
                NotificationManager.error(UI.messages.errors.deleteFailed);
                return false;
            }
        },

        validateProjectName(name) {
            return /^[a-zA-Z0-9_-]+$/.test(name);
        }
    };

    // Session Management
    const SessionManager = {
        setProject(projectName) {
            sessionStorage.setItem("project_name", projectName);
            // Add this new fetch call to sync with server
            fetch('/project/current_project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project: projectName }) // Note: 'project', not 'project_name'
            })
            .then(response => response.json())
            .then(data => {
                if (data.err) {
                    console.error('Failed to sync project to server:', data.err);
                }
            })
            .catch(error => {
                console.error('Error syncing project to server:', error);
            });
        },

        getProject() {
            return sessionStorage.getItem("project_name");
        },

        clearProject() {
            sessionStorage.removeItem("project_name");
        },

        async verifySessionState() {
            try {
                const response = await fetch('/project/current_project', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await response.json();
                
                if (!data.err && data.res.project) {
                    AppState.currentProject = data.res.project;
                    this.setProject(data.res.project);
                } else {
                    AppState.currentProject = null;
                    this.clearProject();
                }
            } catch (error) {
                console.error('Session verification error:', error);
                AppState.currentProject = null;
                this.clearProject();
            }
        }
    };

    // UI Management
    const UIManager = {
        updateProjectList(projects) {
            const $select = $(UI.selectors.projectSelect);
            const currentProject = AppState.currentProject || SessionManager.getProject();
            
            // Clear and initialize select
            $select.empty();
            $select.append($('<option>', {
                value: '',
                text: 'Select Project',
                selected: !currentProject
            }));
    
            // Add project options
            if (Array.isArray(projects) && projects.length > 0) {
                projects.forEach(project => {
                    $select.append($('<option>', {
                        value: project,
                        text: project,
                        selected: project === currentProject
                    }));
                });
    
                // Set first project if none selected
                if (!currentProject) {
                    AppState.currentProject = projects[0];
                    SessionManager.setProject(projects[0]);
                    $select.val(projects[0]);
                } else {
                    $select.val(currentProject);
                }
    
                // Enable/disable delete button
                $('#btn_delete_project').prop('disabled', !currentProject);
            }
        },
    
        initializeEventHandlers() {
            // Project creation
            $(document).on('click', UI.selectors.createProjectBtn, async (e) => {
                e.preventDefault();
                const projectName = $(UI.selectors.projectNameInput).val().trim();
                if (projectName) {
                    await ProjectManager.createProject(projectName);
                } else {
                    NotificationManager.error(UI.messages.errors.projectRequired);
                }
            });
    
            // Project deletion
            $(document).on('click', UI.selectors.deleteProjectBtn, async (e) => {
                e.preventDefault();
                if (AppState.currentProject) {
                    await ProjectManager.deleteProject(AppState.currentProject);
                } else {
                    NotificationManager.error(UI.messages.errors.noProjectSelected);
                }
            });
    
            // Project selection change
            $(document).on('change', UI.selectors.projectSelect, function() {
                const selectedProject = $(this).val();
                if (selectedProject) {
                    AppState.currentProject = selectedProject;
                    SessionManager.setProject(selectedProject);
                    syncProjectToServer(selectedProject); // Add this line
                    $('#btn_delete_project').prop('disabled', false);
                    NavigationManager.updateUIForProject(selectedProject);
                } else {
                    $('#btn_delete_project').prop('disabled', true);
                    AppState.currentProject = null;
                    SessionManager.clearProject();
                }
            });
    
            // Sidebar navigation - using event delegation
            $(document).on('click', Object.values(UI.selectors.sidebarItems).join(','), function(e) {
                e.preventDefault();
                const section = Object.keys(UI.selectors.sidebarItems).find(
                    key => UI.selectors.sidebarItems[key] === `#${this.id}`
                );
                if (section) {
                    NavigationManager.handleSidebarClick(section);
                }
            });
    
            // Logout
            $(document).on('click', UI.selectors.logoutBtn, async (e) => {
                e.preventDefault();
                await AuthManager.handleLogout();
            });
        }
    };

    // Navigation Management
    const NavigationManager = {
        handleSidebarClick(section) {
            AppState.lastSelectedOption = section;
            this.loadContentBasedOnCurrentView(section);
        },

        updateUIForProject(projectName) {
            document.title = `${projectName} - Edge Vision Framework`;
            this.loadContentBasedOnCurrentView(AppState.lastSelectedOption);
        },

        async loadContentBasedOnCurrentView(view) {
            if (!AppState.currentProject) {
                NotificationManager.error(UI.messages.errors.noProjectSelected);
                return;
            }

            // Add specific view loading logic here
            console.log(`Loading view: ${view}`);
        }
    };

    // Authentication Management
    const AuthManager = {
        async handleLogout() {
            try {
                const response = await fetch("/auth/logout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                });

                const data = await response.json();
                if (!data.err) {
                    AppState.currentProject = null;
                    SessionManager.clearProject();
                    window.location.href = "/auth/login";
                } else {
                    NotificationManager.error(data.err);
                }
            } catch (error) {
                console.error("Logout error:", error);
                NotificationManager.error(UI.messages.errors.logoutFailed);
            }
        }
    };

    // Notification Management
    const NotificationManager = {
        success(message) {
            toastr.success(message);
        },
        error(message) {
            toastr.error(message);
        }
    };

    $(document).ready(async () => {
        UIManager.initializeEventHandlers();
        await SessionManager.verifySessionState();
        const currentProject = AppState.currentProject || SessionManager.getProject();
        if (currentProject) {
            syncProjectToServer(currentProject); // Add this line
        }
        await ProjectManager.loadProjects();
    });

    // Public API
    return {
        AppState,
        ProjectManager,
        SessionManager,
        UIManager
    };
})();