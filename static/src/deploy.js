$(document).ready(function() {
    // =================================================
    // GLOBAL STATE
    // =================================================
    let selectedFilePath = null;    // The path of the file the user selected in the tree
    let chosenDeployMethod = null;  // Deployment method: 'scp' or 'ftp'

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

    // When the user clicks "Explore" for a run
    async function exploreRun(runName) {
        console.log("Exploring run:", runName);

        const projectName = sessionStorage.getItem('project_name');
        if (!projectName) {
            console.error("No project name found in sessionStorage.");
            toastr.error("Project name not found. Please reload the page.");
            return;
        }

        // Build query parameters
        const queryParams = new URLSearchParams({
            project_name: projectName,
            run_name: runName
        });

        try {
            const response = await fetch(`/deploy/list_run_files?${queryParams.toString()}`);
            const data = await response.json();

            if (data.error) {
                console.error("Error fetching directory tree:", data.error);
                toastr.error(data.error);
                return;
            }

            // Update Explorer UI
            $('#id_explore_run_name').text(runName);
            const $treeContainer = $('#id_directory_tree');
            $treeContainer.empty(); // Clear old tree, if any
            renderDirectoryTree(data.tree, $treeContainer);
        } catch (err) {
            console.error("Error fetching directory tree:", err);
            toastr.error("Failed to load directory tree.");
        }
    }

    // Populate the Runs table in the UI
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
                <button class="btn btn-sm btn-info explore-run-btn" data-run-name="${run.run_name}">Explore</button>
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

        // If it's a directory, prepend a toggle arrow
        if (isDir) {
            $label.prepend('<i class="folder-toggle">▶ </i>');
        }

        const $li = $('<li>').append($label);

        // Directory with children
        if (isDir && node.children && node.children.length > 0) {
            const $ul = $('<ul style="display:none; margin-left:1em;"></ul>');
            node.children.forEach(child => {
                const $childLi = buildTreeItem(child);
                $ul.append($childLi);
            });
            $li.append($ul);

            // Toggle expand/collapse on click
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

        // File item (no children)
        } else if (!isDir) {
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

        // Direct Download
        if (method === 'download') {
            // GET request triggers file download
            const url = `/deploy/transfer?method=download&file=${encodeURIComponent(selectedFilePath)}`;
            window.location.href = url;
        }
        // SCP or FTP
        else if (method === 'scp' || method === 'ftp') {
            chosenDeployMethod = method;
            $('#id_modal_method_label').text(method.toUpperCase()); // e.g. 'SCP' or 'FTP'

            // Set default ports
            if (method === 'scp') {
                $('#id_input_port').val('22');
            } else {
                $('#id_input_port').val('21');
            }

            // Clear or default form fields
            $('#id_input_host').val('');
            $('#id_input_username').val('');
            $('#id_input_password').val('');
            $('#id_input_remote_path').val(
                method === 'scp' ? '/tmp/deployed_model.pth' : 'model.pth'
            );

            // Show credentials modal
            const modalEl = document.getElementById('id_modal_credentials');
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }
    };

    // Click handler for "Deploy" in credentials modal
    $('#id_modal_credentials_ok').click(async function() {
        const method      = chosenDeployMethod; // 'scp' or 'ftp'
        const host        = $('#id_input_host').val().trim();
        const port        = parseInt($('#id_input_port').val().trim(), 10);
        const username    = $('#id_input_username').val().trim();
        const password    = $('#id_input_password').val(); // can contain spaces
        const remote_path = $('#id_input_remote_path').val().trim();

        // Simple validation
        if (!host || !port || !username) {
            toastr.error("Please fill Host, Port, and Username fields.");
            return;
        }

        // Hide modal
        const modalEl = document.getElementById('id_modal_credentials');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();

        // Prepare payload and send to server
        try {
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

    // Event: Clicking "Explore" in the runs table
    $('#id_table_body_deploy_runs').on('click', '.explore-run-btn', function() {
        const runName = $(this).data('run-name');
        exploreRun(runName);
    });

    // =================================================
    // INITIALIZE
    // =================================================
    loadRuns();
});
