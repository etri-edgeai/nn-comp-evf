$(document).ready(function () {
    // =================================================
    // ACE EDITOR INSTANCES
    // =================================================
    let editorEnginePy        = null; // For "Create" run (engine.py)
    let editorConfigYaml      = null; // For "Create" run (config.yaml)
    let editorEditEnginePy    = null; // For "Edit" run (engine.py)
    let editorEditConfigYaml  = null; // For "Edit" run (config.yaml)

    // Track currently displayed run logs
    let currentLogRunName = null;

    // =================================================
    // CREATE RUN MODAL
    // =================================================
    $('#id_modal_create_run').on('show.bs.modal', function () {
        console.log("Create Run Modal showing.");

        // Auto-generate a default run name (e.g. run_20231014_1315)
        const now       = new Date();
        const timestamp = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0');
        const defaultRunName = `run_${timestamp}`;
        $('#id_run_name').val(defaultRunName);

        // Initialize or reset Ace Editor for engine.py
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
            console.log("Initialized Ace Editor for Create (engine.py).");
        }
        editorEnginePy.setValue('', -1);

        // Initialize or reset Ace Editor for config.yaml
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
            console.log("Initialized Ace Editor for Create (config.yaml).");
        }
        editorConfigYaml.setValue(
`misc:
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
    params: {}
`, -1);

        // Reset other form fields
        $('#id_num_gpus').val('1');
        $('#id_generate_engine_code').prop('disabled', true);

        // Populate dropdowns for model/dataset/optimization
        loadDropdowns('#id_select_model', '#id_select_dataset', '#id_select_optimization');
    });

    // When switching tabs within the Create modal (engine.py / config.yaml),
    // resize Ace Editor so the UI stays consistent
    $('#id_modal_create_run .nav-link').on('shown.bs.tab', function(e){
        if(e.target.getAttribute('href') === '#tab_engine_py'){
            editorEnginePy?.resize();
        } else if(e.target.getAttribute('href') === '#tab_config_yaml'){
            editorConfigYaml?.resize();
        }
    });

    // Enable "Generate Engine Code" only if all fields have values
    $('#id_run_name, #id_select_model, #id_select_dataset, #id_select_optimization, #id_num_gpus')
      .on('input change', checkSelectionsCreate);

    // Handle "Create Run" submission
    $('#id_create_run_ok').click(async function () {
        console.log("Create Run button clicked.");

        const runName          = $('#id_run_name').val().trim();
        const modelName        = $('#id_select_model').val();
        const datasetName      = $('#id_select_dataset').val();
        const optimizationName = $('#id_select_optimization').val();
        const numGpus          = parseInt($('#id_num_gpus').val()) || 1;

        const enginePyContent  = editorEnginePy.getValue();
        const configYamlContent= editorConfigYaml.getValue();

        // Prepare request payload
        const payload = {
            project_name:   sessionStorage.getItem('project_name'),
            run_name:       runName,
            model_name:     modelName,
            dataset_name:   datasetName,
            optimization_name: optimizationName,
            num_gpus:       numGpus,
            engine_py:      enginePyContent,
            config_yaml:    configYamlContent
        };

        try {
            $('#id_create_run_ok').prop('disabled', true).text('Creating...');
            const response = await fetch('/runs/create', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            });
            const data = await response.json();

            if (!data.error) {
                toastr.success("Run created successfully!");
                // Hide the modal
                const modalEl = document.getElementById('id_modal_create_run');
                const modalInstance = bootstrap.Modal.getInstance(modalEl);
                if (modalInstance) modalInstance.hide();

                // Refresh the run list
                loadRunList();
            } else {
                toastr.error(data.error);
            }
        } catch (err) {
            toastr.error("Failed to create run.");
            console.error(err);
        } finally {
            $('#id_create_run_ok').prop('disabled', false).text('Create Run');
        }
    });

    // =================================================
    // EDIT RUN
    // =================================================
    // Exposed globally so it can be called from inline HTML
    window.editRun = async function(runName) {
        console.log("editRun invoked for run:", runName);
        const projectName = sessionStorage.getItem('project_name');
        if (!projectName || !runName) {
            toastr.error("Missing project name or run name.");
            return;
        }

        try {
            // 1) fetch runs
            const payload = { project_name: projectName };
            const response = await fetch('/runs/list', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            });
            if(!response.ok) throw new Error("Failed to fetch runs list.");
            const data = await response.json();
            if(data.error) throw new Error(data.error);

            // 2) find the run
            const run = data.runs.find(r => r.run_name === runName);
            if(!run){
                toastr.error(`Run '${runName}' not found.`);
                return;
            }

            // 3) fill read-only fields in the Edit modal
            $('#id_edit_run_name').text(run.run_name);
            $('#id_edit_num_gpus').text(run.num_gpus);
            $('#id_edit_model').text(run.model_name);
            $('#id_edit_dataset').text(run.dataset_name);
            $('#id_edit_optimization').text(run.optimization_name);

            // 4) init or reset engine.py editor
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
            } else {
                editorEditEnginePy.setValue('', -1);
            }

            // 5) init or reset config.yaml editor
            if (!editorEditConfigYaml) {
                editorEditConfigYaml = ace.edit("editor_edit_config_yaml");
                editorEditConfigYaml.setTheme("ace/theme/monokai");
                editorEditConfigYaml.session.setMode("ace/mode/yaml");
                editorEditConfigYaml.setOptions({
                    maxLines: Infinity,
                    minLines: 30,
                    readOnly: false,
                    highlightActiveLine: true,
                    showPrintMargin: false
                });
            } else {
                editorEditConfigYaml.setValue('', -1);
            }

            // 6) fetch engine.py from server
            const engineRes = await fetch(
                `/runs/get_file?project_name=${encodeURIComponent(projectName)}&run_name=${encodeURIComponent(runName)}&file=engine.py`
            );
            if(!engineRes.ok) throw new Error("Failed to fetch engine.py");
            const engineData = await engineRes.json();
            if(engineData.error) throw new Error(engineData.error);
            editorEditEnginePy.setValue(engineData.content || '', -1);

            // 7) fetch config.yaml from server
            const configRes = await fetch(
                `/runs/get_file?project_name=${encodeURIComponent(projectName)}&run_name=${encodeURIComponent(runName)}&file=config.yaml`
            );
            if(!configRes.ok) throw new Error("Failed to fetch config.yaml");
            const configData = await configRes.json();
            if(configData.error) throw new Error(configData.error);
            editorEditConfigYaml.setValue(configData.content || '', -1);

            // 8) Show the Edit modal
            $('#id_modal_edit_run').modal('show');
            console.log("Edit Run Modal shown.");

        } catch(err) {
            toastr.error("Failed to load run details.");
            console.error("editRun error:", err);
        }
    };

    // When switching tabs within the Edit modal (engine.py / config.yaml),
    // resize Ace Editor so the UI stays correct
    $('#id_modal_edit_run .nav-link').on('shown.bs.tab', function(e){
        if(e.target.getAttribute('href') === '#tab_edit_engine_py'){
            editorEditEnginePy?.resize();
        } else if(e.target.getAttribute('href') === '#tab_edit_config_yaml'){
            editorEditConfigYaml?.resize();
        }
    });

    // =================================================
    // SAVE EDITED RUN
    // =================================================
    // "Save Changes" button in the Edit Run modal
    $('#id_save_edit_run').click(async function () {
        console.log("Save Changes clicked in Edit Run.");

        const runName       = $('#id_edit_run_name').text().trim();
        const engineContent = editorEditEnginePy.getValue();
        const configContent = editorEditConfigYaml.getValue();

        // Build payload
        const payload = {
            project_name:      sessionStorage.getItem('project_name'),
            original_run_name: runName, // if needed
            run_name:          runName,
            engine_py:         engineContent,
            config_yaml:       configContent
        };

        try {
            const response = await fetch('/runs/edit', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            });
            const data = await response.json();

            if (!data.error) {
                toastr.success("Save changes successful");
                // Hide the Edit modal
                const modalElement = document.getElementById('id_modal_edit_run');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) {
                    modalInstance.hide();
                } else {
                    $('#id_modal_edit_run').modal('hide');
                }
                // Refresh run list
                loadRunList();
            } else {
                toastr.error(data.error);
                console.error("Error saving run:", data.error);
            }
        } catch (err) {
            toastr.error("Failed to save changes.");
            console.error(err);
        }
    });

    // Another "Save Changes" button ID if needed:
    $('#id_edit_run_ok').click(async function() {
        console.log("Save Changes clicked in Edit Run (id_edit_run_ok).");

        const runName        = $('#id_edit_run_name').text().trim();
        const engineContent  = editorEditEnginePy.getValue();
        const configContent  = editorEditConfigYaml.getValue();

        // Additional fields
        const payload = {
            project_name:      sessionStorage.getItem('project_name'),
            original_run_name: runName,
            run_name:          runName,
            model_name:        $('#id_edit_model').text().trim(),
            dataset_name:      $('#id_edit_dataset').text().trim(),
            optimization_name: $('#id_edit_optimization').text().trim(),
            num_gpus:          parseInt($('#id_edit_num_gpus').text()) || 1,
            engine_py:         engineContent,
            config_yaml:       configContent
        };

        try {
            const response = await fetch('/runs/edit', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            });
            const data = await response.json();

            if(data.error){
                toastr.error(data.error);
                console.error("Error saving run:", data.error);
            } else {
                toastr.success("Save changes successful");
                const modalElement = document.getElementById('id_modal_edit_run');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) modalInstance.hide();
                else $('#id_modal_edit_run').modal('hide');

                loadRunList();
            }
        } catch(err){
            toastr.error("Failed to save changes.");
            console.error(err);
        }
    });

    // =================================================
    // GENERATE ENGINE CODE (CREATE)
    // =================================================
    $('#id_generate_engine_code').click(function () {
        generateEngineCodeCreate();
    });

    async function generateEngineCodeCreate() {
        const modelName        = $('#id_select_model').val();
        const datasetName      = $('#id_select_dataset').val();
        const optimizationName = $('#id_select_optimization').val();
        const numGpus          = parseInt($('#id_num_gpus').val()) || 1;

        console.log("Generating engine.py for Create Run with:", { modelName, datasetName, optimizationName, numGpus });

        if (!modelName || !datasetName || !optimizationName || !numGpus) {
            toastr.error("Please ensure all fields are selected.");
            console.warn("Missing fields for engine.py generation.");
            return;
        }

        try {
            // 1) Fetch import.txt
            console.log("Fetching import.txt template.");
            const importResponse = await fetch(`/runs/get_template?file=import.txt`);
            if (!importResponse.ok) throw new Error("Failed to fetch import.txt");
            const importText = await importResponse.text();

            // 2) Fetch engine.txt
            console.log("Fetching engine.txt template.");
            const engineResponse = await fetch(`/runs/get_template?file=engine.txt`);
            if (!engineResponse.ok) throw new Error("Failed to fetch engine.txt");
            const engineText = await engineResponse.text();

            // 3) Prepare dynamic imports
            let dynamicImports = `
from model.${modelName}.model import Model as _Model
from dataset.${datasetName}.datasets import Dataset as _Dataset
from optimization.${optimizationName}.optimize import Optimizer as _Optimization
`;

            // Build a comma-separated list of GPU IDs
            let cudaDevices = '';
            for (let i = 0; i < numGpus; i++) {
                cudaDevices += `${i}, `;
            }
            cudaDevices = cudaDevices.slice(0, -2); // remove trailing comma/space

            // 4) Combine everything
            let finalCode = `
${importText}

${dynamicImports}

// Set CUDA devices
os.environ["CUDA_VISIBLE_DEVICES"] = "${cudaDevices}"
${engineText}`.trim();

            editorEnginePy.setValue(finalCode, -1);
            toastr.success("Engine code generated successfully.");
            console.log("Engine code generated and inserted into editor.");

            // Also set config.yaml with defaults
            const defaultConfigYaml = `
misc:
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
            editorConfigYaml.setValue(defaultConfigYaml.trim(), -1);
            console.log("Default config.yaml generated and inserted into editorConfigYaml.");

        } catch (error) {
            console.error("Error generating engine code:", error);
            toastr.error("Failed to generate engine code.");
        }
    }

    // For "Edit" modal code generation if needed
    $('#id_generate_edit_engine_code').click(function () {
        generateEngineCodeEdit();
    });
    async function generateEngineCodeEdit() {
        // Similarly for the Edit modal, if required...
        // editorEditEnginePy.setValue(...)
    }

    // =================================================
    // DROPDOWNS (Models, Datasets, Optimizations)
    // =================================================
    function loadDropdowns(selectModelId, selectDatasetId, selectOptimizationId) {
        const projectName = sessionStorage.getItem('project_name');
        const payload = { project_name: projectName };

        // Models
        $.ajax({
            url:         '/models/list',
            method:      'POST',
            contentType: 'application/json',
            data:        JSON.stringify(payload),
            dataType:    'json',
            success: function(resp) {
                if(!resp.error){
                    const $sel = $(selectModelId);
                    $sel.empty().append(`<option value="">Select a Model</option>`);
                    resp.models.forEach(m => {
                        $sel.append(`<option value="${m.model_name}">${m.model_name}</option>`);
                    });
                }
            }
        });

        // Datasets
        $.ajax({
            url:         '/datasets/list',
            method:      'POST',
            contentType: 'application/json',
            data:        JSON.stringify(payload),
            dataType:    'json',
            success: function(resp) {
                if(!resp.error){
                    const $sel = $(selectDatasetId);
                    $sel.empty().append(`<option value="">Select a Dataset</option>`);
                    resp.datasets.forEach(d => {
                        $sel.append(`<option value="${d.dataset_name}">${d.dataset_name}</option>`);
                    });
                }
            }
        });

        // Optimizations
        $.ajax({
            url:         '/optimizations/list',
            method:      'POST',
            contentType: 'application/json',
            data:        JSON.stringify(payload),
            dataType:    'json',
            success: function(resp) {
                if(!resp.error){
                    const $sel = $(selectOptimizationId);
                    $sel.empty().append(`<option value="">Select an Optimization</option>`);
                    resp.optimizations.forEach(o => {
                        $sel.append(`<option value="${o.optimize_method_name}">${o.optimize_method_name}</option>`);
                    });
                }
            }
        });
    }

    // =================================================
    // CHECK SELECTIONS (CREATE)
    // =================================================
    function checkSelectionsCreate() {
        const runName = $('#id_run_name').val().trim();
        const modelVal= $('#id_select_model').val();
        const dataVal = $('#id_select_dataset').val();
        const optVal  = $('#id_select_optimization').val();
        const numGpus = $('#id_num_gpus').val().trim();

        const allSelected = runName && modelVal && dataVal && optVal && numGpus;
        $('#id_generate_engine_code').prop('disabled', !allSelected);
    }

    // =================================================
    // LOAD & UPDATE RUNS
    // =================================================
    async function loadRunList() {
        console.log("Loading runs list.");
        try {
            const payload = { project_name: sessionStorage.getItem('project_name') };
            const response = await fetch('/runs/list', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            });
            const data = await response.json();
            if(data.error){
                toastr.error(data.error);
                return;
            }
            updateRunTable(data.runs);

            // If logs are open, refresh them
            if(currentLogRunName){
                viewLogs(currentLogRunName, false);
            }
        } catch(err){
            toastr.error("An error occurred while loading runs.");
            console.error(err);
        }
    }

    function updateRunTable(runs) {
        const $tableBody = $('#id_table_body_runs');
        $tableBody.empty();

        if(!runs || runs.length === 0){
            $tableBody.append('<tr><td colspan="8" class="text-center">No runs available</td></tr>');
            return;
        }

        runs.forEach(run => {
            const status  = run.status || 'Not Running';
            const gpuList = (run.gpu_ids || []).join(', ') || 'N/A';

            let actions = '';
            if(status === 'Running'){
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

            const row = `
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
            `;
            $tableBody.append(row);
        });
    }

    // =================================================
    // DELETE RUN
    // =================================================
    window.deleteRun = async function(runName){
        if(!confirm(`Are you sure you want to delete run '${runName}'?`)) return;

        const payload = {
            project_name: sessionStorage.getItem('project_name'),
            run_name: runName
        };
        try {
            $(`button[onclick="deleteRun('${runName}')"]`).prop('disabled',true);
            const response = await fetch('/runs/delete', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            });
            const data = await response.json();
            if(!data.error){
                toastr.success(`Run '${runName}' deleted successfully.`);
                loadRunList();
            } else {
                toastr.error(data.error);
            }
        } catch(err){
            toastr.error("Failed to delete run.");
            console.error(err);
        } finally {
            $(`button[onclick="deleteRun('${runName}')"]`).prop('disabled',false);
        }
    };

    // =================================================
    // START RUN
    // =================================================
    window.startRun = async function(runName){
        const payload = {
            project_name: sessionStorage.getItem('project_name'),
            run_name: runName
        };

        try {
            $(`button[onclick="startRun('${runName}')"]`)
                .prop('disabled',true).text('Starting...');
            const response = await fetch('/runs/start', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            });
            const data = await response.json();
            if(!data.error){
                toastr.success(`Run '${runName}' started successfully.`);
                loadRunList();
            } else {
                toastr.error(data.error);
            }
        } catch(err){
            toastr.error("Failed to start run.");
            console.error(err);
        } finally {
            $(`button[onclick="startRun('${runName}')"]`)
                .prop('disabled',false).text('Start');
        }
    };

    // =================================================
    // STOP RUN
    // =================================================
    window.stopRun = async function(runName){
        const payload = {
            project_name: sessionStorage.getItem('project_name'),
            run_name: runName
        };

        try {
            $(`button[onclick="stopRun('${runName}')"]`)
                .prop('disabled',true).text('Stopping...');
            const response = await fetch('/runs/stop', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            });
            const data=await response.json();
            if(!data.error){
                toastr.success(`Run '${runName}' stopped successfully.`);
                loadRunList();
            } else {
                toastr.error(data.error);
            }
        } catch(err){
            toastr.error("Failed to stop run.");
            console.error(err);
        } finally {
            $(`button[onclick="stopRun('${runName}')"]`)
                .prop('disabled',false).text('Stop');
        }
    };

    // =================================================
    // VIEW LOGS
    // =================================================
    window.viewLogs = async function(runName, showNotify = true){
        console.log(`View Logs invoked for run: ${runName}`);
        const projectName = sessionStorage.getItem('project_name');

        try {
            // First, confirm the run is (or was) running
            const statusPayload = { project_name: projectName };
            const statusRes = await fetch('/runs/list', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(statusPayload)
            });
            const statusData = await statusRes.json();
            const run = statusData.runs.find(r => r.run_name === runName);
            if(!run){
                console.error(`Run '${runName}' not found.`);
                return;
            }

            // If run is never started (Not Running, pid=null, no GPU), no logs
            if(run.status==='Not Running' && run.pid===null && run.gpu_ids.length===0){
                document.getElementById('logs_content').textContent = 
                    'Run has not been started yet. No logs available.';
                return;
            }

            // Otherwise, fetch the logs
            const url = `/runs/logs?project_name=${encodeURIComponent(projectName)}&run_name=${encodeURIComponent(runName)}`;
            const resp = await fetch(url);
            if(!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);

            const data = await resp.json();
            if(data.error){
                document.getElementById('logs_content').textContent = `Error: ${data.error}`;
                if(showNotify) toastr.error(`Failed to fetch logs: ${data.error}`);
                return;
            }

            // Display logs
            const logsContent = document.getElementById('logs_content');
            logsContent.innerHTML = data.lines ? data.lines.join('<br>') : 'No logs available';
            currentLogRunName     = runName;

            // Auto-scroll to bottom
            const container = document.getElementById('logs_container');
            container.scrollTop = container.scrollHeight;

        } catch(err){
            console.error(err);
            const logsContent = document.getElementById('logs_content');
            logsContent.textContent = "Failed to fetch logs";
            if(showNotify) toastr.error("Failed to fetch logs.");
        }
    };

    // =================================================
    // INITIAL LOAD OF RUNS
    // =================================================
    async function loadRunList() {
        console.log("Loading runs list.");
        try {
            const payload = { project_name: sessionStorage.getItem('project_name') };
            const response = await fetch('/runs/list', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            });
            const data = await response.json();
            if (data.error) {
                toastr.error(data.error);
                return;
            }
            updateRunTable(data.runs);

            // If logs are open, refresh them
            if (currentLogRunName) {
                viewLogs(currentLogRunName, false);
            }
        } catch (err) {
            toastr.error("An error occurred while loading runs.");
            console.error(err);
        }
    }

    // The same function is repeated below, so we keep it DRY:
    // (we already have an updateRunTable above in loadRunList)

    // =================================================
    // START-UP
    // =================================================
    loadRunList();
    console.log("Initial runs list loaded.");

    // Refresh run status every 1 second
    setInterval(loadRunList, 1000);
    console.log("Set interval to refresh runs list every 1 second.");
});
