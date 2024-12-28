$(document).ready(function () {

    // =================================================
    // ACE EDITOR THEME MANAGEMENT
    // =================================================

    // Dynamically change the Ace Editor theme on 'themeChanged' event
    function updateEditorTheme(isDark) {
        const theme = isDark ? "ace/theme/dracula" : "ace/theme/chrome";

        if (window.editorOptimizePy) {
            window.editorOptimizePy.setTheme(theme);
        }
        if (editorOptimizePyEdit) {
            editorOptimizePyEdit.setTheme(theme);
        }
    }

    // Listen for a custom 'themeChanged' event from elsewhere in the app
    window.addEventListener('themeChanged', (e) => {
        updateEditorTheme(e.detail.theme === 'dark');
    });

    // =================================================
    // CREATE OPTIMIZATION: ACE EDITOR INITIALIZATION
    // =================================================
    // Editor is initialized when the "Create Optimization" modal shows
    $('#id_modal_create_optimization').on('shown.bs.modal', function () {
        // If the editor isn't already created, create it now
        if (!window.editorOptimizePy) {
            window.editorOptimizePy = ace.edit("editor_optimize_py");
            editorOptimizePy.setTheme(window.getCurrentTheme() === 'dark'
                ? "ace/theme/dracula"
                : "ace/theme/chrome"
            );
            editorOptimizePy.session.setMode("ace/mode/python");
            editorOptimizePy.setOptions({
                maxLines: Infinity,
                minLines: 30,
                fontSize: "14px"
            });
        }

        // Load model names into the dropdown
        loadModelOptions();

        // Load template files into the dropdown
        loadTemplateOptions();
    });

    // =================================================
    // EDIT OPTIMIZATION: ACE EDITOR INITIALIZATION
    // =================================================
    let editorOptimizePyEdit = null;

    // Editor is initialized when the "Edit Optimization" modal shows
    $('#id_modal_edit_optimization').on('shown.bs.modal', function () {
        if (!editorOptimizePyEdit) {
            editorOptimizePyEdit = ace.edit("editor_optimize_py_edit");
            editorOptimizePyEdit.setTheme(window.getCurrentTheme() === 'dark'
                ? "ace/theme/dracula"
                : "ace/theme/chrome"
            );
            editorOptimizePyEdit.session.setMode("ace/mode/python");
            editorOptimizePyEdit.setOptions({
                maxLines: Infinity,
                minLines: 30,
                fontSize: "14px"
            });
        }
    });

    // When the "Edit Optimization" modal is hidden, reset fields
    $('#id_modal_edit_optimization').on('hidden.bs.modal', function () {
        if (editorOptimizePyEdit) {
            editorOptimizePyEdit.setValue('', -1);
        }
        $('#id_edit_optimize_method_name').val('');
        $('#id_edit_original_model_name').val('');
    });

    // =================================================
    // SAVE CHANGES TO EDITED OPTIMIZATION
    // =================================================
    $('#id_edit_optimization_ok').click(async function () {
        const optimizeMethodName = $('#id_edit_optimize_method_name').val();
        const originalModelName  = $('#id_edit_original_model_name').val();
        const editedCode         = editorOptimizePyEdit.getValue();

        if (!optimizeMethodName) {
            toastr.error("No optimization is selected.", "Error");
            return;
        }

        try {
            const response = await fetch(`/optimizations/save_edit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    project_name: sessionStorage.getItem('project_name'),
                    optimize_method_name: optimizeMethodName,
                    original_model_name: originalModelName, // if needed on the server
                    edited_code: editedCode
                })
            });
            const data = await response.json();

            if (data.error) {
                toastr.error(data.error, "Error");
            } else {
                toastr.success("Optimization updated successfully!", "Success");
                $('#id_modal_edit_optimization').modal('hide');
                loadOptimizationList(); // Refresh the table
            }
        } catch (error) {
            console.error("Error saving edited optimization:", error);
            toastr.error("Failed to save optimization.", "Error");
        }
    });

    // =================================================
    // RESET ON "CREATE OPTIMIZATION" MODAL CLOSE
    // =================================================
    $('#id_modal_create_optimization').on('hidden.bs.modal', function () {
        $('#id_original_model_name').empty();
        $('#id_optimize_method_name').val('');
        $('#id_optimization_template').empty();

        if (window.editorOptimizePy) {
            editorOptimizePy.setValue('', -1);
        }
    });

    // =================================================
    // HANDLING TEMPLATE SELECTION
    // =================================================
    // When the user picks a template, load it into the editor
    $('#id_optimization_template').change(function () {
        const templateFile = $(this).val();
        console.log('Template selected:', templateFile);

        if (templateFile) {
            loadTemplateFile(templateFile);
        } else {
            editorOptimizePy.setValue('', -1);
        }
    });

    // =================================================
    // CREATE NEW OPTIMIZATION
    // =================================================
    $('#id_create_optimization_ok').click(async function () {
        const originalModelName  = $('#id_original_model_name').val();
        const optimizeMethodName = $('#id_optimize_method_name').val();
        const optimizationCode   = editorOptimizePy.getValue();

        // Validate fields
        if (!originalModelName || !optimizeMethodName || !optimizationCode) {
            toastr.error("Please fill in all the required fields.", "error");
            return;
        }

        // Build request payload
        const payload = {
            original_model_name:  originalModelName,
            optimize_method_name: optimizeMethodName,
            optimization_code:    optimizationCode,
            project_name:         sessionStorage.getItem('project_name')
        };
        console.log('Saving optimization with payload:', payload);

        // POST request to save the optimization
        try {
            const response = await fetch(`/optimizations/save`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(payload)
            });

            const data = await response.json();
            console.log('Response from save optimization:', data);

            if (!data.error) {
                toastr.success("Optimization created successfully!", "success");
                $('#id_modal_create_optimization').modal('hide');
                loadOptimizationList();
            } else {
                toastr.error(data.error, "error");
            }
        } catch (error) {
            console.error("Create optimization error:", error);
            toastr.error("Failed to create optimization.", "error");
        }
    });

    // =================================================
    // LOAD MODEL OPTIONS (FOR CREATE OPTIMIZATION)
    // =================================================
    async function loadModelOptions() {
        console.log('Loading model options...');
        try {
            const response = await fetch(`/models/list`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    project_name: sessionStorage.getItem('project_name')
                })
            });

            const data = await response.json();
            console.log('Models data:', data);

            if (!data.error) {
                const $modelSelect = $('#id_original_model_name');
                $modelSelect.empty();

                if (data.models.length === 0) {
                    $modelSelect.append('<option value="">No models available</option>');
                    toastr.error("No models available. Please create a model first.", "warning");
                } else {
                    $modelSelect.append('<option value="">Select a model</option>');
                    data.models.forEach(model => {
                        $modelSelect.append(
                            `<option value="${model.model_name}">${model.model_name}</option>`
                        );
                    });
                }
            } else {
                toastr.error(data.error, "error");
            }
        } catch (error) {
            console.error("Load model options error:", error);
            toastr.error("Failed to load models.", "error");
        }
    }

    // =================================================
    // DRAG AND DROP REORDER
    // =================================================
    function initOptimizationDragAndDrop() {
        const rows = document.querySelectorAll('#id_table_body_optimizations tr');
        let draggedRow = null;

        rows.forEach(row => {
            row.addEventListener('dragstart', function () {
                draggedRow = this;
                this.style.opacity = '0.4';
            });

            row.addEventListener('dragend', function () {
                this.style.opacity = '1';
                rows.forEach(r => r.classList.remove('drag-over'));
            });

            row.addEventListener('dragover', function (e) {
                e.preventDefault();
            });

            row.addEventListener('dragenter', function () {
                this.classList.add('drag-over');
            });

            row.addEventListener('dragleave', function () {
                this.classList.remove('drag-over');
            });

            row.addEventListener('drop', function (e) {
                e.preventDefault();
                if (this === draggedRow) return;

                // Insert the dragged row before/after
                this.parentNode.insertBefore(draggedRow, this.nextSibling);
                saveOptimizationOrder();
            });
        });
    }

    async function saveOptimizationOrder() {
        // Gather the new order from the table rows
        const newOrder = [];
        document.querySelectorAll('#id_table_body_optimizations tr').forEach(row => {
            newOrder.push(row.dataset.name); // The optimize_method_name
        });

        try {
            const response = await fetch('/optimizations/reorder', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    project_name: sessionStorage.getItem('project_name'),
                    order:        newOrder
                })
            });

            const data = await response.json();
            if (!data.error) {
                toastr.success(data.message, "Success");
            } else {
                toastr.error(data.error, "Error");
            }
        } catch (error) {
            console.error('Failed to save new order:', error);
            toastr.error('Failed to save the new order', "Error");
        }
    }

    // =================================================
    // RENDER OPTIMIZATION TABLE
    // =================================================
    function updateOptimizationTable(optimizations) {
        const $tableBody = $('#id_table_body_optimizations');
        $tableBody.empty();

        if (optimizations.length === 0) {
            $tableBody.append(
                '<tr><td colspan="5" class="text-center">No optimizations available</td></tr>'
            );
        } else {
            const isDark = window.getCurrentTheme() === 'dark';
            optimizations.forEach(opt => {
                $tableBody.append(`
                    <tr draggable="true" data-name="${opt.optimize_method_name}" class="${isDark ? 'text-light' : ''}">
                        <td class="drag-handle">
                            <svg xmlns="http://www.w3.org/2000/svg"
                                 class="icon"
                                 width="24"
                                 height="24"
                                 viewBox="0 0 24 24"
                                 stroke-width="2"
                                 stroke="currentColor"
                                 fill="none">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <line x1="4"  y1="6"  x2="20" y2="6"  />
                                <line x1="4"  y1="12" x2="20" y2="12" />
                                <line x1="4"  y1="18" x2="20" y2="18" />
                            </svg>
                        </td>
                        <td>${opt.original_model_name}</td>
                        <td>${opt.optimize_method_name}</td>
                        <td>${opt.misc || ''}</td>
                        <td>
                            <button class="btn btn-sm btn-warning"
                                    onclick="editOptimization('${opt.optimize_method_name}')">
                                Edit
                            </button>
                            <button class="btn btn-sm btn-danger"
                                    onclick="deleteOptimization('${opt.optimize_method_name}')">
                                Delete
                            </button>
                        </td>
                    </tr>
                `);
            });
            initOptimizationDragAndDrop();
        }
    }

    // =================================================
    // LOAD TEMPLATES
    // =================================================
    async function loadTemplateOptions() {
        console.log('Loading template options...');
        try {
            const response = await fetch(`/optimizations/templates`, {
                method:  "GET",
                headers: { "Content-Type": "application/json" }
            });

            const data = await response.json();
            console.log('Templates data:', data);

            if (!data.error) {
                const $templateSelect = $('#id_optimization_template');
                $templateSelect.empty();

                if (data.templates.length === 0) {
                    $templateSelect.append('<option value="">No templates available</option>');
                    toastr.error("No optimization templates found.", "warning");
                } else {
                    $templateSelect.append('<option value="">Select a template</option>');
                    data.templates.forEach(template => {
                        $templateSelect.append(`<option value="${template}">${template}</option>`);
                    });
                }
            } else {
                toastr.error(data.error, "error");
            }
        } catch (error) {
            console.error("Load template options error:", error);
            toastr.error("Failed to load templates.", "error");
        }
    }

    // Load selected template file content into the Ace editor
    async function loadTemplateFile(templateFile) {
        console.log('Loading template file:', templateFile);
        try {
            const response = await fetch(`/optimizations/load_template`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ template_file: templateFile })
            });

            const data = await response.json();
            console.log('Template file content:', data);

            if (!data.error) {
                editorOptimizePy.setValue(data.template_content, -1);
            } else {
                toastr.error(data.error, "error");
            }
        } catch (error) {
            console.error("Load template file error:", error);
            toastr.error("Failed to load template file.", "error");
        }
    }

    // =================================================
    // LOAD AND EDIT OPTIMIZATIONS
    // =================================================
    async function loadOptimizationList() {
        console.log('Loading optimization list...');
        try {
            const response = await fetch(`/optimizations/list`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    project_name: sessionStorage.getItem('project_name')
                })
            });

            const data = await response.json();
            console.log('Optimizations data:', data);

            if (!data.error) {
                updateOptimizationTable(data.optimizations);
            } else {
                toastr.error(data.error, "error");
            }
        } catch (error) {
            console.error("Load optimization list error:", error);
            toastr.error("Failed to load optimizations.", "error");
        }
    }

    // Expose editOptimization globally so it can be called from inline HTML
    window.editOptimization = async function (optimizeMethodName) {
        try {
            // 1) Fetch existing optimization data
            const response = await fetch(`/optimizations/get_optimization`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    project_name: sessionStorage.getItem('project_name'),
                    optimize_method_name: optimizeMethodName
                })
            });

            const data = await response.json();
            if (data.error) {
                toastr.error(data.error, "Error");
                return;
            }

            // 2) Populate fields in the "Edit Optimization" modal
            $('#id_edit_optimize_method_name').val(data.optimize_method_name);
            $('#id_edit_original_model_name').val(data.original_model_name);

            if (editorOptimizePyEdit) {
                editorOptimizePyEdit.setValue(data.optimization_code || '', -1);
            }

            // 3) Show the modal
            $('#id_modal_edit_optimization').modal('show');

        } catch (error) {
            console.error("Error loading optimization for editing:", error);
            toastr.error("Failed to load optimization.", "Error");
        }
    };

    // Expose deleteOptimization globally so it can be called from inline HTML
    window.deleteOptimization = async function (optimizeMethodName) {
        if (!confirm("Are you sure you want to delete this optimization?")) {
            return;
        }

        console.log('Deleting optimization:', optimizeMethodName);

        try {
            const response = await fetch(`/optimizations/delete`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    optimize_method_name: optimizeMethodName,
                    project_name:         sessionStorage.getItem('project_name')
                })
            });

            const data = await response.json();
            console.log('Response from delete optimization:', data);

            if (!data.error) {
                toastr.success("Optimization deleted successfully!", "success");
                loadOptimizationList();
            } else {
                toastr.error(data.error, "error");
            }
        } catch (error) {
            console.error("Delete optimization error:", error);
            toastr.error("Failed to delete optimization.", "error");
        }
    };

    // =================================================
    // CUSTOM THEME STYLES FOR DARK MODE
    // =================================================
    const style = document.createElement('style');
    style.textContent = `
        .theme-dark .drag-over {
            background-color: #2c3338 !important;
        }
        .theme-dark .table td {
            border-color: #2c3338;
        }
    `;
    document.head.appendChild(style);

    // =================================================
    // INITIALIZE ON PAGE LOAD
    // =================================================
    loadOptimizationList();
});
