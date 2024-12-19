$(document).ready(function () {
    // Declare Ace Editor instances
    let editorEnginePy = null;
    let editorEditEnginePy = null;
    let editorConfigYaml = null;
    let editorConfigYamlEdit = null;

    // Declare a global variable to track the current run's logs
    let currentLogRunName = null;

    // Initialize Ace Editors for Create Run Modal
    $('#id_modal_create_run').on('show.bs.modal', function () {
    console.log("Create Run Modal showing.");
    
    // Generate default run name with timestamp
    const now = new Date();
    const timestamp = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0');
    const defaultRunName = `run_${timestamp}`;
    
    // Set the default run name
    $('#id_run_name').val(defaultRunName);
    console.log("Set default run name to:", defaultRunName);

    // Initialize or reset the Ace Editor for engine.py
    if (!editorEnginePy) {
        editorEnginePy = ace.edit("editor_engine_py");
        editorEnginePy.setTheme("ace/theme/monokai");
        editorEnginePy.session.setMode("ace/mode/python");
        editorEnginePy.setOptions({
            maxLines: Infinity,
            minLines: 30,
            readOnly: false,
            highlightActiveLine: true,
            showPrintMargin: false
        });
        console.log("Initialized Ace Editor for Create Run.");
    }
    editorEnginePy.setValue('', -1);
    console.log("Reset Ace Editor for Create Run.");

    // Initialize or reset the config.yaml editor
    if (!editorConfigYaml) {
        editorConfigYaml = ace.edit("editor_config_yaml");
        editorConfigYaml.setTheme("ace/theme/monokai");
        editorConfigYaml.session.setMode("ace/mode/yaml");
        editorConfigYaml.setOptions({
            maxLines: Infinity,
            minLines: 30,
            readOnly: false,
            highlightActiveLine: true,
            showPrintMargin: false
        });
        console.log("Initialized Ace Editor for config.yaml.");
    }

    // Set default config.yaml content
    const defaultConfigYaml = `misc:
    seed: 42
    log_dir: ./logs
    checkpoint_dir: ./checkpoints

training:
    epochs: 10
    num_gpus: 1
    batch_size: 32
    loss_function: CrossEntropyLoss

optimization:
    optimizer:
        name: Adam
        params:
            lr: 0.001

dataset:
    name: dataset_1
    params: {}

model:
    name: model_1
    params: {}`;

    editorConfigYaml.setValue(defaultConfigYaml, -1);
    console.log("Reset config.yaml editor with default content.");

    // Reset other form fields
    $('#id_num_gpus').val('1');
    $('#id_generate_engine_code').prop('disabled', true);
    
    // Load dropdowns
    loadDropdowns('#id_select_model', '#id_select_dataset', '#id_select_optimization');

    console.log("Reset Create Run form fields and loaded dropdowns.");
});

    // Initialize Ace Editors for Edit Run Modal
    $('#id_modal_edit_run').on('shown.bs.modal', function () {
        console.log("Edit Run Modal shown.");
        if (!editorEditEnginePy) {
            editorEditEnginePy = ace.edit("editor_edit_engine_py");
            editorEditEnginePy.setTheme("ace/theme/monokai");
            editorEditEnginePy.session.setMode("ace/mode/python");
            editorEditEnginePy.setOptions({
                maxLines: Infinity,
                minLines: 30,
                readOnly: false,
                highlightActiveLine: true,
                showPrintMargin: false
            });
            console.log("Initialized Ace Editor for Edit Run.");
        } else {
            editorEditEnginePy.setValue('', -1); // Reset editor when modal is opened
            console.log("Reset Ace Editor for Edit Run.");
        }
        // Initialize config.yaml editor for Edit Run Modal if not done before
        if (!editorConfigYamlEdit) {
            editorConfigYamlEdit = ace.edit("editor_config_yaml_edit");
            editorConfigYamlEdit.setTheme("ace/theme/monokai");
            editorConfigYamlEdit.session.setMode("ace/mode/yaml");
            editorConfigYamlEdit.setOptions({
                maxLines: Infinity,
                minLines: 30,
                readOnly: false,
                highlightActiveLine: true,
                showPrintMargin: false
            });
            console.log("Initialized Ace Editor for config.yaml in Edit Run.");
        } else {
            editorConfigYamlEdit.setValue('', -1); // Reset editor when modal is opened
            console.log("Reset Ace Editor for config.yaml in Edit Run.");
        }
    });


    // Function to fetch and populate dropdowns
    function loadDropdowns(selectModelId, selectDatasetId, selectOptimizationId) {
        console.log(`Loading dropdowns: Model (${selectModelId}), Dataset (${selectDatasetId}), Optimization (${selectOptimizationId})`);
        const projectName = sessionStorage.getItem('project_name');
        const payload = { project_name: projectName };

        // Fetch Models
        $.ajax({
            url: '/models/list',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            dataType: 'json',
            success: function (data) {
                if (!data.error) {
                    const models = data.models;
                    const $selectModel = $(selectModelId);
                    $selectModel.empty().append(`<option value="">Select a Model</option>`);
                    models.forEach(function (model) {
                        $selectModel.append(`<option value="${model.model_name}">${model.model_name}</option>`);
                    });
                    console.log("Models loaded successfully.");
                } else {
                    toastr.error(data.error);
                    console.error("Error loading models:", data.error);
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                toastr.error("Failed to load models.");
                console.error("AJAX error loading models:", textStatus, errorThrown);
            }
        });

        // Fetch Datasets
        $.ajax({
            url: '/datasets/list',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            dataType: 'json',
            success: function (data) {
                if (!data.error) {
                    const datasets = data.datasets;
                    const $selectDataset = $(selectDatasetId);
                    $selectDataset.empty().append(`<option value="">Select a Dataset</option>`);
                    datasets.forEach(function (dataset) {
                        $selectDataset.append(`<option value="${dataset.dataset_name}">${dataset.dataset_name}</option>`);
                    });
                    console.log("Datasets loaded successfully.");
                } else {
                    toastr.error(data.error);
                    console.error("Error loading datasets:", data.error);
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                toastr.error("Failed to load datasets.");
                console.error("AJAX error loading datasets:", textStatus, errorThrown);
            }
        });

        // Fetch Optimizations
        $.ajax({
            url: '/optimizations/list',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            dataType: 'json',
            success: function (data) {
                if (!data.error) {
                    const optimizations = data.optimizations;
                    const $selectOptimization = $(selectOptimizationId);
                    $selectOptimization.empty().append(`<option value="">Select an Optimization</option>`);
                    optimizations.forEach(function (opt) {
                        $selectOptimization.append(`<option value="${opt.optimize_method_name}">${opt.optimize_method_name}</option>`);
                    });
                    console.log("Optimizations loaded successfully.");
                } else {
                    toastr.error(data.error);
                    console.error("Error loading optimizations:", data.error);
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                toastr.error("Failed to load optimizations.");
                console.error("AJAX error loading optimizations:", textStatus, errorThrown);
            }
        });
    }

    // Function to validate run name
    function isValidName(name) {
        const reservedWords = ['import', 'from', 'as', 'class', 'def', 'return', 'pass', 'if', 'else', 'for', 'while']; // Extend as needed
        const invalidPattern = /[^a-zA-Z0-9_]/; // Only allow alphanumerics and underscores
        const isValid = !reservedWords.includes(name) && !invalidPattern.test(name);
        console.log(`Validating run name '${name}':`, isValid);
        return isValid;
    }

    // Function to check selections in Create Run Modal
    function checkSelectionsCreate() {
        const runName = $('#id_run_name').val().trim();
        const modelSelected = $('#id_select_model').val() !== "";
        const datasetSelected = $('#id_select_dataset').val() !== "";
        const optimizationSelected = $('#id_select_optimization').val() !== "";
        const numGpus = $('#id_num_gpus').val().trim();

        const allSelected = runName !== "" && modelSelected && datasetSelected && optimizationSelected && numGpus !== "";

        $('#id_generate_engine_code').prop('disabled', !allSelected);
        console.log(`Check Create Run selections: ${allSelected ? 'Enabled' : 'Disabled'}`);
    }

    // Function to check selections in Edit Run Modal
    function checkSelectionsEdit() {
        const runName = $('#id_edit_run_name').val().trim();
        const modelSelected = $('#id_edit_select_model').val() !== "";
        const datasetSelected = $('#id_edit_select_dataset').val() !== "";
        const optimizationSelected = $('#id_edit_select_optimization').val() !== "";
        const numGpus = $('#id_edit_num_gpus').val().trim();

        const allSelected = runName !== "" && modelSelected && datasetSelected && optimizationSelected && numGpus !== "";

        $('#id_generate_edit_engine_code').prop('disabled', !allSelected);
        console.log(`Check Edit Run selections: ${allSelected ? 'Enabled' : 'Disabled'}`);
    }

    // Attach change event listeners to Create Run dropdowns and inputs
    $('#id_run_name, #id_select_model, #id_select_dataset, #id_select_optimization, #id_num_gpus').on('input change', checkSelectionsCreate);

    // Attach change event listeners to Edit Run dropdowns and inputs
    $('#id_edit_run_name, #id_edit_select_model, #id_edit_select_dataset, #id_edit_select_optimization, #id_edit_num_gpus').on('input change', checkSelectionsEdit);

    // Load dropdowns when Create Run Modal is opened
    // $('#id_modal_create_run').on('show.bs.modal', function () {
    //     loadDropdowns('#id_select_model', '#id_select_dataset', '#id_select_optimization');
    // });

    // Load dropdowns when Edit Run Modal is opened
    $('#id_modal_edit_run').on('show.bs.modal', function () {
        loadDropdowns('#id_edit_select_model', '#id_edit_select_dataset', '#id_edit_select_optimization');
    });

    // Function to generate engine.py code in Create Run Modal
    async function generateEngineCodeCreate() {
        const modelName = $('#id_select_model').val();
        const datasetName = $('#id_select_dataset').val();
        const optimizationName = $('#id_select_optimization').val();
        const numGpus = parseInt($('#id_num_gpus').val()) || 1;

        console.log("Generating engine.py for Create Run with:", { modelName, datasetName, optimizationName, numGpus });

        if (!modelName || !datasetName || !optimizationName || !numGpus) {
            toastr.error("Please ensure all fields are selected.");
            console.warn("Missing fields for engine.py generation.");
            return;
        }

        try {
            // Fetch import.txt
            console.log("Fetching import.txt template.");
            const importResponse = await fetch(`/runs/get_template?file=import.txt`);
            if (!importResponse.ok) {
                throw new Error("Failed to fetch import.txt");
            }
            const importText = await importResponse.text();

            // Fetch engine.txt
            console.log("Fetching engine.txt template.");
            const engineResponse = await fetch(`/runs/get_template?file=engine.txt`);
            if (!engineResponse.ok) {
                throw new Error("Failed to fetch engine.txt");
            }
            const engineText = await engineResponse.text();

            // Dynamic imports based on selections
            let dynamicImports = `
from model.${modelName}.model import Model as _Model
from dataset.${datasetName}.datasets import Dataset as _Dataset
from optimization.${optimizationName}.optimize import Optimizer as _Optimization
            `;

            // Set CUDA device based on number of GPUs
            let cudaDevices = '';
            for (let i = 0; i < numGpus; i++) {
                cudaDevices += `${i}, `;
            }
            cudaDevices = cudaDevices.slice(0, -2); // Remove trailing comma and space

            // Combine all parts
            let finalCode = `${importText}

${dynamicImports}

# Set CUDA devices
os.environ["CUDA_VISIBLE_DEVICES"] = "${cudaDevices}"
${engineText}`;

            editorEnginePy.setValue(finalCode.trim(), -1); // Insert code into editor
            toastr.success("Engine code generated successfully.");
            console.log("Engine code generated and inserted into editor.");

            const defaultConfigYaml = `misc:
  seed: 42
  log_dir: ./logs
  checkpoint_dir: ./checkpoints

training:
  epochs: 10
  num_gpus: ${numGpus}
  batch_size: 32
  loss_function: CrossEntropyLoss

optimization:
  optimizer:
    name: Adam
    params:
      lr: 0.001

dataset:
  name: ${datasetName}
  params: {}

model:
  name: ${modelName}
  params: {}
`;
            editorConfigYaml.setValue(defaultConfigYaml, -1);
            console.log("Default config.yaml generated and inserted into editorConfigYaml.");
        } catch (error) {
            console.error("Error generating engine code:", error);
            toastr.error("Failed to generate engine code.");
        }
    }

    // Function to generate engine.py code in Edit Run Modal
    async function generateEngineCodeEdit() {
        const modelName = $('#id_edit_select_model').val();
        const datasetName = $('#id_edit_select_dataset').val();
        const optimizationName = $('#id_edit_select_optimization').val();
        const numGpus = parseInt($('#id_edit_num_gpus').val()) || 1;

        console.log("Generating engine.py for Edit Run with:", { modelName, datasetName, optimizationName, numGpus });

        if (!modelName || !datasetName || !optimizationName || !numGpus) {
            toastr.error("Please ensure all fields are selected.");
            console.warn("Missing fields for engine.py generation in Edit Run.");
            return;
        }

        try {
            // Fetch import.txt
            console.log("Fetching import.txt template.");
            const importResponse = await fetch(`/runs/get_template?file=import.txt`);
            if (!importResponse.ok) {
                throw new Error("Failed to fetch import.txt");
            }
            const importText = await importResponse.text();

            // Fetch engine.txt
            console.log("Fetching engine.txt template.");
            const engineResponse = await fetch(`/runs/get_template?file=engine.txt`);
            if (!engineResponse.ok) {
                throw new Error("Failed to fetch engine.txt");
            }
            const engineText = await engineResponse.text();

            // Dynamic imports based on selections
            let dynamicImports = `
from model.${modelName}.model import Model as _Model
from dataset.${datasetName}.datasets import Dataset as _Dataset
from optimization.${optimizationName}.optimize import Optimizer as _Optimization
            `;

            // Set CUDA device based on number of GPUs
            let cudaDevices = '';
            for (let i = 0; i < numGpus; i++) {
                cudaDevices += `${i}, `;
            }
            cudaDevices = cudaDevices.slice(0, -2); // Remove trailing comma and space

            // Combine all parts
            let finalCode = `${importText}

${dynamicImports}

# Set CUDA devices
os.environ["CUDA_VISIBLE_DEVICES"] = "${cudaDevices}"

${engineText}
            `;

            editorEditEnginePy.setValue(finalCode.trim(), -1); // Insert code into editor
            toastr.success("Engine code generated successfully.");
            console.log("Engine code generated and inserted into Edit Run editor.");
        } catch (error) {
            console.error("Error generating engine code:", error);
            toastr.error("Failed to generate engine code.");
        }
    }

    // Handle Generate Basic Engine Code button in Create Run Modal
    $('#id_generate_engine_code').click(function () {
        generateEngineCodeCreate();
    });

    // Handle Generate Basic Engine Code button in Edit Run Modal
    $('#id_generate_edit_engine_code').click(function () {
        generateEngineCodeEdit();
    });

    // Handle Create Run Submission
    $('#id_create_run_ok').click(async function () {
        console.log("Create Run button clicked.");

        const runName = $('#id_run_name').val().trim();
        const modelName = $('#id_select_model').val();
        const datasetName = $('#id_select_dataset').val();
        const optimizationName = $('#id_select_optimization').val();
        const numGpus = parseInt($('#id_num_gpus').val()) || 1;
        const misc = { seed: 42 }; // Default seed, can be extended

        if (!runName || !modelName || !datasetName || !optimizationName) {
            toastr.error("Please fill in all required fields and select all items.");
            console.warn("Create Run validation failed: Missing fields.");
            return;
        }

        // Validate run name
        if (!isValidName(runName)) {
            toastr.error("Run name contains invalid characters or is a reserved keyword.");
            console.warn("Create Run validation failed: Invalid run name.");
            return;
        }

        // Validate number of GPUs
        const totalGpus = parseInt($('#id_gpu_count').text()) || 1;
        if (numGpus < 1 || numGpus > totalGpus) {
            toastr.error(`Please select between 1 and ${totalGpus} GPUs.`);
            console.warn(`Create Run validation failed: Number of GPUs (${numGpus}) out of range.`);
            return;
        }

        const enginePyContent = editorEnginePy.getValue();
        const configYamlContent = editorConfigYaml.getValue(); // Get the config.yaml content

        const payload = {
            project_name: sessionStorage.getItem('project_name'),
            run_name: runName,
            model_name: modelName,
            dataset_name: datasetName,
            optimization_name: optimizationName,
            num_gpus: numGpus,
            misc: misc,
            engine_py: enginePyContent,
            config_yaml: configYamlContent
        };

        console.log("Sending Create Run payload:", payload);

        try {
            // Disable the Create Run button to prevent multiple submissions
            $('#id_create_run_ok').prop('disabled', true).text('Creating...');
            console.log("Create Run button disabled and text changed to 'Creating...'.");

            const response = await fetch('/runs/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.log("Create Run POST request sent.");

            const data = await response.json();
            console.log("Received response from /runs/create:", data);

            if (!data.error) {
                toastr.success("Run created successfully! You can start the run when ready.");
                console.log("Run created successfully. Attempting to hide modal.");

                // Hide the modal using Bootstrap 5's Modal API
                const modalElement = document.getElementById('id_modal_create_run');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) {
                    modalInstance.hide();
                    console.log("Create Run modal hidden using existing Bootstrap Modal instance.");
                } else {
                    // If no instance exists, create one and then hide
                    const newModal = new bootstrap.Modal(modalElement);
                    newModal.hide();
                    console.log("Create Run modal hidden using new Bootstrap Modal instance.");
                }

                // Refresh the runs list
                loadRunList();
                console.log("Runs list refreshed.");
            } else {
                toastr.error(data.error);
                console.error("Error from /runs/create:", data.error);
            }
        } catch (error) {
            console.error("Create run error:", error);
            toastr.error("Failed to create run.");
        } finally {
            $('#id_create_run_ok').prop('disabled', false).text('Create Run');
            console.log("Create Run button re-enabled and text reset to 'Create Run'.");
        }
    });


    // Handle Save Changes in Edit Run Modal
    $('#id_edit_run_ok').click(async function () {
        console.log("Save Changes button clicked in Edit Run Modal.");

        const originalRunName = $('#id_edit_run_name').data('original-name');
        const runName = $('#id_edit_run_name').val().trim();
        const modelName = $('#id_edit_select_model').val();
        const datasetName = $('#id_edit_select_dataset').val();
        const optimizationName = $('#id_edit_select_optimization').val();
        const numGpus = parseInt($('#id_edit_num_gpus').val()) || 1;
        const misc = { seed: 42 }; // Default seed, can be extended

        if (!runName || !modelName || !datasetName || !optimizationName) {
            toastr.error("Please fill in all required fields and select all items.");
            console.warn("Edit Run validation failed: Missing fields.");
            return;
        }

        // Validate run name
        if (!isValidName(runName)) {
            toastr.error("Run name contains invalid characters or is a reserved keyword.");
            console.warn("Edit Run validation failed: Invalid run name.");
            return;
        }

        const enginePyContent = editorEditEnginePy.getValue();
        const configYamlContent = editorConfigYamlEdit ? editorConfigYamlEdit.getValue() : ''; // Get the config.yaml content

        const payload = {
            project_name: sessionStorage.getItem('project_name'),
            original_run_name: originalRunName,
            run_name: runName,
            model_name: modelName,
            dataset_name: datasetName,
            optimization_name: optimizationName,
            num_gpus: numGpus,
            misc: misc,
            engine_py: enginePyContent,
            config_yaml: configYamlContent
        };

        console.log("Sending Edit Run payload:", payload);

        try {
            // Disable the Edit Run button to prevent multiple submissions
            $('#id_edit_run_ok').prop('disabled', true).text('Saving...');
            console.log("Edit Run button disabled and text changed to 'Saving...'.");

            const response = await fetch('/runs/edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.log("Edit Run POST request sent.");

            const data = await response.json();
            console.log("Received response from /runs/edit:", data);

            if (!data.error) {
                toastr.success("Run updated successfully!");
                console.log("Run updated successfully. Attempting to hide Edit Run modal.");
                const modalElement = document.getElementById('id_modal_edit_run');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) {
                    modalInstance.hide();
                    console.log("Edit Run modal hidden using existing Bootstrap Modal instance.");
                } else {
                    // If no instance exists, create one and then hide
                    const newModal = new bootstrap.Modal(modalElement);
                    newModal.hide();
                    console.log("Edit Run modal hidden using new Bootstrap Modal instance.");
                }
                loadRunList();
                console.log("Runs list refreshed.");
            } else {
                toastr.error(data.error);
                console.error("Error from /runs/edit:", data.error);
            }
        } catch (error) {
            console.error("Edit run error:", error);
            toastr.error("Failed to edit run.");
        } finally {
            $('#id_edit_run_ok').prop('disabled', false).text('Save Changes');
            console.log("Edit Run button re-enabled and text reset to 'Save Changes'.");
        }
    });

    // Function to fetch and populate run details in Edit Run Modal
    window.editRun = async function (runName) {
        console.log(`Edit Run invoked for run: ${runName}`);
        const projectName = sessionStorage.getItem('project_name');

        // Validation
        if (!projectName || !runName) {
            toastr.error("Missing project name or run name.");
            console.error("Missing project name or run name. Cannot proceed with edit.");
            return;
        }

        try {
            // Fetch run details from the server
            const payload = {
                project_name: projectName,
                run_name: runName
            };
            
            console.log("Sending payload to /runs/list:", payload);

            const response = await fetch('/runs/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.log("Edit Run list POST request sent.");

            if (!response.ok) {
                throw new Error(`Failed to fetch run details: ${response.statusText}`);
            }

            const data = await response.json();
            console.log("Received response from /runs/list:", data);

            if (data.error) {
                toastr.error(data.error);
                console.error("Error from /runs/list:", data.error);
                return;
            }

            const runs = data.runs;
            const run = runs.find(r => r.run_name === runName);
            if (!run) {
                toastr.error(`Run '${runName}' not found.`);
                console.error(`Run '${runName}' not found.`);
                return;
            }

            // Populate the Edit Run Modal with run details
            $('#id_edit_run_name').val(run.run_name).data('original-name', run.run_name);
            $('#id_edit_num_gpus').val(run.num_gpus || 1);
            $('#id_edit_select_model').val(run.model_name);
            $('#id_edit_select_dataset').val(run.dataset_name);
            $('#id_edit_select_optimization').val(run.optimization_name);
            console.log("Populated Edit Run form fields.");

            // Initialize editor if not already initialized
            if (!editorEditEnginePy) {
                editorEditEnginePy = ace.edit("editor_edit_engine_py");
                editorEditEnginePy.setTheme("ace/theme/monokai");
                editorEditEnginePy.session.setMode("ace/mode/python");
                editorEditEnginePy.setOptions({
                    maxLines: Infinity,
                    minLines: 30,
                    readOnly: false,
                    highlightActiveLine: true,
                    showPrintMargin: false
                });
                console.log("Initialized Ace Editor for Edit Run.");
            }

            // Fetch and populate engine.py content
            console.log("Fetching engine.py content for Edit Run.");
            const engineResponse = await fetch(`/runs/get_file?project_name=${encodeURIComponent(projectName)}&run_name=${encodeURIComponent(runName)}&file=engine.py`);
            if (!engineResponse.ok) {
                toastr.error("Failed to fetch engine.py content.");
                console.error("Failed to fetch engine.py content.");
                return;
            }
            const engineData = await engineResponse.json();
            if (engineData.error) {
                toastr.error(engineData.error);
                console.error("Error fetching engine.py:", engineData.error);
                return;
            }
            editorEditEnginePy.setValue(engineData.content, -1);
            console.log("engine.py content loaded into Edit Run editor.");

            // Fetch and populate config.yaml content
            console.log("Fetching config.yaml content for Edit Run.");
            const configResponse = await fetch(`/runs/get_file?project_name=${encodeURIComponent(projectName)}&run_name=${encodeURIComponent(runName)}&file=config.yaml`);
            if (!configResponse.ok) {
                toastr.error("Failed to fetch config.yaml content.");
                console.error("Failed to fetch config.yaml content.");
                return;
            }
            const configData = await configResponse.json();
            if (configData.error) {
                toastr.error(configData.error);
                console.error("Error fetching config.yaml:", configData.error);
                return;
            }

            // Set config.yaml content in the Ace Editor
            if (!editorConfigYamlEdit) {
                editorConfigYamlEdit = ace.edit("editor_config_yaml_edit");
                editorConfigYamlEdit.setTheme("ace/theme/monokai");
                editorConfigYamlEdit.session.setMode("ace/mode/yaml");
                editorConfigYamlEdit.setOptions({
                    maxLines: Infinity,
                    minLines: 30,
                    readOnly: false,
                    highlightActiveLine: true,
                    showPrintMargin: false
                });
                console.log("Initialized Ace Editor for config.yaml in Edit Run.");
            }
            editorConfigYamlEdit.setValue(configData.content, -1);
            console.log("config.yaml content loaded into Edit Run editor.");

            // Show the Edit Run Modal
            $('#id_modal_edit_run').modal('show');
            console.log("Edit Run Modal shown.");
        } catch (error) {
            console.error("Edit run error:", error);
            toastr.error("Failed to fetch run details.");
        }
    };

    // Handle Delete Run Confirmation and Deletion
    window.deleteRun = async function (runName) {
        console.log(`Delete Run invoked for run: ${runName}`);
        if (!confirm(`Are you sure you want to delete run '${runName}'? This action cannot be undone.`)) {
            console.log(`Deletion cancelled for run: ${runName}`);
            return;
        }

        const payload = {
            project_name: sessionStorage.getItem('project_name'),
            run_name: runName
        };

        try {
            // Disable the Delete button to prevent multiple submissions
            console.log(`Disabling Delete button for run: ${runName}`);
            $(`button[onclick="deleteRun('${runName}')"]`).prop('disabled', true);

            const response = await fetch('/runs/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.log("Delete Run POST request sent.");

            const data = await response.json();
            console.log("Received response from /runs/delete:", data);

            if (!data.error) {
                toastr.success(`Run '${runName}' deleted successfully.`);
                console.log(`Run '${runName}' deleted successfully.`);
                loadRunList();
            } else {
                toastr.error(data.error);
                console.error(`Error deleting run '${runName}':`, data.error);
            }
        } catch (error) {
            console.error("Delete run error:", error);
            toastr.error("Failed to delete run.");
        } finally {
            $(`button[onclick="deleteRun('${runName}')"]`).prop('disabled', false);
            console.log(`Delete button re-enabled for run: ${runName}`);
        }
    };

    // Handle Start Run
    window.startRun = async function (runName) {
        console.log(`Start Run invoked for run: ${runName}`);
        const payload = {
            project_name: sessionStorage.getItem('project_name'),
            run_name: runName
        };

        try {
            // Disable the Start button to prevent multiple clicks
            console.log(`Disabling Start button for run: ${runName}`);
            $(`button[onclick="startRun('${runName}')"]`).prop('disabled', true).text('Starting...');

            const response = await fetch('/runs/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.log("Start Run POST request sent.");

            const data = await response.json();
            console.log("Received response from /runs/start:", data);

            if (!data.error) {
                toastr.success(`Run '${runName}' started successfully.`);
                console.log(`Run '${runName}' started successfully.`);
                loadRunList();
            } else {
                toastr.error(data.error);
                console.error(`Error starting run '${runName}':`, data.error);
            }
        } catch (error) {
            console.error("Start run error:", error);
            toastr.error("Failed to start run.");
        } finally {
            $(`button[onclick="startRun('${runName}')"]`).prop('disabled', false).text('Start');
            console.log(`Start button re-enabled for run: ${runName}`);
        }
    };

    // Handle Stop Run
    window.stopRun = async function (runName) {
        console.log(`Stop Run invoked for run: ${runName}`);
        const payload = {
            project_name: sessionStorage.getItem('project_name'),
            run_name: runName
        };
    
        try {
            // Disable the Stop button to prevent multiple clicks
            console.log(`Disabling Stop button for run: ${runName}`);
            $(`button[onclick="stopRun('${runName}')"]`).prop('disabled', true).text('Stopping...');
    
            const response = await fetch('/runs/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
    
            console.log("Stop Run POST request sent.");
    
            const data = await response.json();
            console.log("Received response from /runs/stop:", data);
    
            if (!data.error) {
                toastr.success(`Run '${runName}' stopped successfully.`);
                console.log(`Run '${runName}' stopped successfully.`);
                loadRunList(); // Refresh the list of runs to update the status
            } else {
                toastr.error(data.error);
                console.error(`Error stopping run '${runName}':`, data.error);
            }
        } catch (error) {
            console.error("Stop run error:", error);
            toastr.error("Failed to stop run.");
        } finally {
            $(`button[onclick="stopRun('${runName}')"]`).prop('disabled', false).text('Stop');
            console.log(`Stop button re-enabled for run: ${runName}`);
        }
    };


    // When user clicks logs button:
    window.viewLogsButton = function(runName) {
        // calling viewLogs with showNotify=true since it's user-initiated
        viewLogs(runName, true);
    };

    // Declare a global variable to track the current run's logs

    window.viewLogs = async function (runName, showNotify = true) {
        console.log(`View Logs invoked for run: ${runName}`);
        const projectName = sessionStorage.getItem('project_name');
        
        // First, check the run's status
        try {
            const statusResponse = await fetch('/runs/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_name: projectName })
            });
    
            const statusData = await statusResponse.json();
            const run = statusData.runs.find(r => r.run_name === runName);
            
            if (!run) {
                console.error(`Run ${runName} not found`);
                return;
            }
    
            // Only fetch logs if run is or was running
            if (run.status === "Not Running" && run.pid === null && run.gpu_ids.length === 0) {
                const logsContent = document.getElementById('logs_content');
                logsContent.textContent = 'Run has not been started yet. No logs available.';
                return;
            }
    
            // Proceed with log fetching if run has been started
            const url = `/runs/logs?project_name=${encodeURIComponent(projectName)}&run_name=${encodeURIComponent(runName)}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const logsContent = document.getElementById('logs_content');
            
            if (data.error) {
                logsContent.textContent = `Error: ${data.error}`;
                console.error("Error fetching logs:", data.error);
                if (showNotify) {
                    toastr.error(`Failed to fetch logs: ${data.error}`);
                }
                return;
            }
    
            // Display the logs
            logsContent.innerHTML = data.lines ? data.lines.join('<br>') : 'No logs available';
            
            // Store the current run name for logs
            currentLogRunName = runName;
    
            // Auto-scroll to bottom
            const container = document.getElementById('logs_container');
            container.scrollTop = container.scrollHeight;
    
        } catch (error) {
            console.error("Error:", error);
            const logsContent = document.getElementById('logs_content');
            logsContent.textContent = "Failed to fetch logs";
            if (showNotify) {
                toastr.error("Failed to fetch logs.");
            }
        }
    };

    async function loadRunList() {
        console.log("Loading runs list.");
        try {
            const payload = { project_name: sessionStorage.getItem('project_name') };

            // Fetching runs from the API
            const response = await fetch('/runs/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            console.log("Runs data received:", data);

            if (data.error) {
                console.error("Error loading runs:", data.error);
                toastr.error(data.error || "Failed to load runs.");
                return;
            }

            // Update the table with the runs data
            updateRunTable(data.runs);

            // Refresh logs if a log view is active
            if (currentLogRunName) {
                console.log(`Refreshing logs for run: ${currentLogRunName}`);
                viewLogs(currentLogRunName, false);
            }
        } catch (error) {
            console.error("Error loading runs list:", error);
            toastr.error("An error occurred while loading runs.");
        }
    }
    // Update runs table in the frontend
    function updateRunTable(runs) {
        console.log("Updating runs table...");
        const $tableBody = $('#id_table_body_runs');
        $tableBody.empty();

        if (!runs || runs.length === 0) {
            $tableBody.append('<tr><td colspan="8" class="text-center">No runs available</td></tr>');
            console.log("No runs available.");
            return;
        }

        // Populate the table with runs data
        runs.forEach((run) => {
            const status = run.status || 'Not Running';
            const gpuList = run.gpu_ids?.join(', ') || 'N/A';

            // Dynamically create buttons based on the run status
            let actions = '';
            if (status === 'Running') {
                actions = `
                    <button class="btn btn-sm btn-danger me-1" onclick="stopRun('${run.run_name}')">Stop</button>
                    <button class="btn btn-sm btn-secondary me-1" onclick="editRun('${run.run_name}')">Edit</button>
                    <button class="btn btn-sm btn-info me-1" onclick="viewLogs('${run.run_name}')">Logs</button>
                    <button class="btn btn-sm btn-warning" onclick="deleteRun('${run.run_name}')">Delete</button>
                `;
            } else {
                actions = `
                    <button class="btn btn-sm btn-success me-1" onclick="startRun('${run.run_name}')">Start</button>
                    <button class="btn btn-sm btn-secondary me-1" onclick="editRun('${run.run_name}')">Edit</button>
                    <button class="btn btn-sm btn-info me-1" onclick="viewLogs('${run.run_name}')">Logs</button>
                    <button class="btn btn-sm btn-warning" onclick="deleteRun('${run.run_name}')">Delete</button>
                `;
            }

            const $row = $(`
                <tr>
                    <td>${run.run_name}</td>
                    <td>${run.created_date || 'N/A'}</td>
                    <td>${run.model_name || 'N/A'}</td>
                    <td>${run.dataset_name || 'N/A'}</td>
                    <td>${run.optimization_name || 'N/A'}</td>
                    <td>${status}</td>
                    <td>${gpuList}</td>
                    <td>${actions}</td>
                </tr>
            `);

            $tableBody.append($row);
        });

        console.log("Runs table updated successfully.");
    }


    // Initial Load of Runs
    loadRunList();
    console.log("Initial runs list loaded.");

    // Set interval to refresh runs status every 5 seconds
    setInterval(loadRunList, 1000);
    console.log("Set interval to refresh runs list every 5 seconds.");
});
