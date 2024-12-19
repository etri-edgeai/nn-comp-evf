$(document).ready(function () {
    // Initialize Ace Editor when the modal is shown
    $('#id_modal_create_optimization').on('shown.bs.modal', function () {
        if (!window.editorOptimizePy) {
            window.editorOptimizePy = ace.edit("editor_optimize_py");
            editorOptimizePy.setTheme("ace/theme/monokai");
            editorOptimizePy.session.setMode("ace/mode/python");
            editorOptimizePy.setOptions({
                maxLines: Infinity,
                minLines: 30
            });
        }

        // Load models into the dropdown
        loadModelOptions();

        // Load templates into the dropdown
        loadTemplateOptions();
    });

    // When the modal is hidden, clear the editor and reset form fields
    $('#id_modal_create_optimization').on('hidden.bs.modal', function () {
        $('#id_original_model_name').empty();
        $('#id_optimize_method_name').val('');
        $('#id_optimization_template').empty();
        if (window.editorOptimizePy) {
            editorOptimizePy.setValue('', -1);
        }
    });

    // Handle Template Selection Change
    $('#id_optimization_template').change(function () {
        const templateFile = $(this).val();
        console.log('Template selected:', templateFile);
        if (templateFile) {
            loadTemplateFile(templateFile);
        } else {
            editorOptimizePy.setValue('', -1);
        }
    });

    // Handle Create Optimization Button Click
    $('#id_create_optimization_ok').click(async function () {
        const originalModelName = $('#id_original_model_name').val();
        const optimizeMethodName = $('#id_optimize_method_name').val();
        const optimizationCode = editorOptimizePy.getValue();

        // Validate input fields
        if (!originalModelName || !optimizeMethodName || !optimizationCode) {
            toastr.error("Please fill in all the required fields.", "error");
            return;
        }

        // Prepare the payload
        const payload = {
            original_model_name: originalModelName,
            optimize_method_name: optimizeMethodName,
            optimization_code: optimizationCode,
            project_name: sessionStorage.getItem('project_name')
        };

        console.log('Saving optimization with payload:', payload);

        try {
            // Send the request to save the optimization
            const response = await fetch(`/optimizations/save`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload)
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

    // Function to Load Model Options
    async function loadModelOptions() {
        console.log('Loading model options...');
        try {
            const response = await fetch(`/models/list`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ project_name: sessionStorage.getItem('project_name') })
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
                        $modelSelect.append(`<option value="${model.model_name}">${model.model_name}</option>`);
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

    // Function to Load Template Options
    async function loadTemplateOptions() {
        console.log('Loading template options...');
        try {
            const response = await fetch(`/optimizations/templates`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                }
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

    // Function to Load Template File into Ace Editor
    async function loadTemplateFile(templateFile) {
        console.log('Loading template file:', templateFile);
        try {
            const response = await fetch(`/optimizations/load_template`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ template_file: templateFile })
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

    // Function to Load Optimization List
    async function loadOptimizationList() {
        console.log('Loading optimization list...');
        try {
            const response = await fetch(`/optimizations/list`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ project_name: sessionStorage.getItem('project_name') })
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

    // Function to Update Optimization Table
    function updateOptimizationTable(optimizations) {
        console.log('Updating optimization table with:', optimizations);
        const $tableBody = $('#id_table_body_optimizations');
        $tableBody.empty();

        if (optimizations.length === 0) {
            $tableBody.append('<tr><td colspan="4" class="text-center">No optimizations available</td></tr>');
        } else {
            optimizations.forEach(opt => {
                const $row = $(
                    `<tr>
                        <td>${opt.original_model_name}</td>
                        <td>${opt.optimize_method_name}</td>
                        <td>${opt.misc || ''}</td>
                        <td>
                            <button class="btn btn-sm btn-warning" onclick="editOptimization('${opt.optimize_method_name}')">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteOptimization('${opt.optimize_method_name}')">Delete</button>
                        </td>
                    </tr>`
                );
                $tableBody.append($row);
            });
        }
    }

    // Handle Edit Optimization
    window.editOptimization = function (optimizeMethodName) {
        // TODO: Implement edit functionality
        toastr.info("Edit functionality is not implemented yet.", "info");
    };

    // Handle Delete Optimization
    window.deleteOptimization = async function (optimizeMethodName) {
        if (!confirm("Are you sure you want to delete this optimization?")) {
            return;
        }

        console.log('Deleting optimization:', optimizeMethodName);

        try {
            const response = await fetch(`/optimizations/delete`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ optimize_method_name: optimizeMethodName, project_name: sessionStorage.getItem('project_name') })
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

    // Initial Load of Optimization List
    loadOptimizationList();
});
