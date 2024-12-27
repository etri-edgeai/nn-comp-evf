$(document).ready(function() {
    // =================================================
    // GLOBAL STATE
    // =================================================
    let selectedFilePath = null;        // path of file user clicked in tree
    let chosenDeployMethod = null;      // 'scp' or 'ftp' from button
    
    // =================================================
    // LOAD RUNS
    // =================================================
    async function loadRuns() {
        console.log("Loading runs for deployment...");

        const projectName = sessionStorage.getItem('project_name');
        if (!projectName) {
            console.warn("No project name found in sessionStorage.");
            return;
        }

        const payload = { project_name: projectName };

        try {
            const response = await fetch('/runs/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (data.error) {
                console.error("Error fetching runs:", data.error);
                toastr.error(data.error);
                return;
            }

            updateRunsTable(data.runs);
        } catch (err) {
            console.error("Error fetching runs:", err);
            toastr.error("Failed to load runs.");
        }
    }

    function updateRunsTable(runs) {
        const $tableBody = $('#id_table_body_deploy_runs');
        $tableBody.empty();

        if (!runs || runs.length === 0) {
            $tableBody.append('<tr><td colspan="8" class="text-center">No runs available</td></tr>');
            return;
        }

        runs.forEach(run => {
            const gpuList = (run.gpu_ids || []).join(', ') || 'N/A';
            const actions = `
                <button class="btn btn-sm btn-info" onclick="exploreRun('${run.run_name}')">Explore</button>
            `;
            const row = `
                <tr>
                    <td>${run.run_name}</td>
                    <td>${run.created_date || 'N/A'}</td>
                    <td>${run.model_name || 'N/A'}</td>
                    <td>${run.dataset_name || 'N/A'}</td>
                    <td>${run.optimization_name || 'N/A'}</td>
                    <td>${run.status || 'Not Running'}</td>
                    <td>${gpuList}</td>
                    <td>${actions}</td>
                </tr>
            `;
            $tableBody.append(row);
        });
    }

    // Expose exploreRun globally so the onclick can call it
    window.exploreRun = async function(runName) {
        console.log("Explore run clicked:", runName);
        $('#id_explore_run_name').text(runName);
        $('#id_directory_tree').empty();
        selectedFilePath = null;
        $('#id_selected_file').text('None');

        const projectName = sessionStorage.getItem('project_name');
        const queryString = `?project_name=${encodeURIComponent(projectName)}&run_name=${encodeURIComponent(runName)}`;

        try {
            const response = await fetch('/deploy/list_run_files' + queryString);
            const data = await response.json();
            if (data.error) {
                toastr.error(data.error);
                return;
            }
            renderDirectoryTree(data.tree, $('#id_directory_tree'));
        } catch (err) {
            console.error("Error listing run files:", err);
            toastr.error("Failed to list run files.");
        }
    };

    // =================================================
    // DIRECTORY TREE RENDERING
    // =================================================
    function renderDirectoryTree(treeData, $container) {
        const $rootUl = $('<ul class="tree-root"></ul>');
        const $rootLi = buildTreeItem(treeData);
        $rootUl.append($rootLi);
        $container.append($rootUl);
    }

    function buildTreeItem(node) {
        const isDir = (node.type === 'directory');
        const $label = $('<span>').text(node.name);

        // If directory, add an arrow
        if (isDir) $label.prepend('<i class="folder-toggle">▶ </i>');

        const $li = $('<li>').append($label);

        if (isDir && node.children && node.children.length > 0) {
            const $ul = $('<ul style="display:none; margin-left:1em;"></ul>');
            node.children.forEach(child => {
                const $childLi = buildTreeItem(child);
                $ul.append($childLi);
            });
            $li.append($ul);

            // Toggle expand/collapse
            $label.on('click', function(e) {
                e.stopPropagation();
                $ul.toggle();
                const $icon = $(this).find('.folder-toggle');
                if ($ul.is(':visible')) {
                    $icon.text('▼ ');
                } else {
                    $icon.text('▶ ');
                }
            });
        } else if (!isDir) {
            // It's a file => set up selection
            $label.on('click', function(e) {
                e.stopPropagation();
                selectedFilePath = node.path;
                console.log("Selected file:", selectedFilePath);
                $('#id_selected_file').text(selectedFilePath);
            });
        }
        return $li;
    }

    // =================================================
    // DEPLOY: DOWNLOAD / SCP / FTP
    // =================================================
    window.deploySelectedFile = function(method) {
        if (!selectedFilePath) {
            toastr.warning("No file selected. Please click on a file in the tree.");
            return;
        }
        if (method === 'download') {
            // Just do GET => triggers direct file download
            const url = `/deploy/transfer?method=download&file=${encodeURIComponent(selectedFilePath)}`;
            window.location.href = url;  // cause download
        } else if (method === 'scp' || method === 'ftp') {
            // Open the credentials modal
            chosenDeployMethod = method;
            $('#id_modal_method_label').text(method.toUpperCase()); // e.g. "SCP" or "FTP"

            // Reset form fields to defaults
            if (method === 'scp') {
                $('#id_input_port').val('22');
            } else {
                $('#id_input_port').val('21');
            }
            $('#id_input_host').val('');
            $('#id_input_username').val('');
            $('#id_input_password').val('');
            $('#id_input_remote_path').val(method === 'scp'
                ? '/tmp/deployed_model.pth'
                : 'model.pth'
            );

            const modalEl = document.getElementById('id_modal_credentials');
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }
    };

    // On "Deploy" in the credentials modal
    $('#id_modal_credentials_ok').click(async function() {
        // gather fields
        const method = chosenDeployMethod; // 'scp' or 'ftp'
        const host        = $('#id_input_host').val().trim();
        const port        = parseInt($('#id_input_port').val().trim(), 10);
        const username    = $('#id_input_username').val().trim();
        const password    = $('#id_input_password').val();   // password can have spaces
        const remote_path = $('#id_input_remote_path').val().trim();

        // simple validation
        if (!host || !port || !username) {
            toastr.error("Please fill Host, Port, and Username fields.");
            return;
        }
        // hide modal
        const modalEl = document.getElementById('id_modal_credentials');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();

        try {
            // POST to /deploy/transfer with JSON body
            const payload = {
                method: method,
                file: selectedFilePath,
                host: host,
                port: port,
                username: username,
                password: password,
                remote_path: remote_path
            };
            const resp = await fetch('/deploy/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!resp.ok) {
                const errorTxt = await resp.text();
                toastr.error(`Deployment failed. Server responded: ${errorTxt}`);
                return;
            }
            const data = await resp.json();
            if (data.error) {
                toastr.error(data.error);
            } else {
                toastr.success(data.message || "Deployment successful!");
            }
        } catch (err) {
            console.error("Error deploying file:", err);
            toastr.error("Error deploying file.");
        }
    });

    // INITIALIZE
    loadRuns();
});
