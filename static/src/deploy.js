$(document).ready(function() {
    loadRuns();

    // =================================================
    // FETCH & DISPLAY RUNS
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

    // Make exploreRun function globally accessible 
    // so the onclick="exploreRun(...)" can call it.
    window.exploreRun = exploreRun;
    async function exploreRun(runName) {
        console.log("Explore run clicked:", runName);
        
        // Display run name in the UI
        $('#id_explore_run_name').text(runName);

        const projectName = sessionStorage.getItem('project_name');
        const queryString = `?project_name=${encodeURIComponent(projectName)}&run_name=${encodeURIComponent(runName)}`;
        
        try {
            const response = await fetch('/deploy/list_run_files' + queryString);
            const data = await response.json();
            if (data.error) {
                toastr.error(data.error);
                return;
            }
            // data.tree is the nested structure
            const treeData = data.tree;
            renderDirectoryTree(treeData, $('#id_directory_tree'));
        } catch (err) {
            console.error("Error listing run files:", err);
            toastr.error("Failed to list run files.");
        }
    }

    // =================================================
    // RENDER DIRECTORY TREE
    // =================================================
    function renderDirectoryTree(treeData, $container) {
        // Clear previous tree
        $container.empty();

        // Build a nested <ul> structure
        const $rootUl = $('<ul class="tree-root"></ul>');
        const $rootLi = buildTreeItem(treeData);
        $rootUl.append($rootLi);

        $container.append($rootUl);
    }

    function buildTreeItem(node) {
        const isDir = (node.type === 'directory');
        
        // Create text label
        const $label = $('<span>').text(node.name);
        // If directory, add a small arrow or symbol
        if (isDir) $label.prepend('<i class="folder-toggle">▶ </i>');

        // Create the list item
        const $li = $('<li>').append($label);

        // If directory, recursively build children
        if (isDir && node.children && node.children.length > 0) {
            const $ul = $('<ul style="display:none; margin-left:1em;"></ul>');
            node.children.forEach(child => {
                const $childLi = buildTreeItem(child);
                $ul.append($childLi);
            });
            $li.append($ul);

            // Expand/Collapse on label click
            $label.on('click', function(e) {
                e.stopPropagation();  // do not propagate if nested
                $ul.toggle();
                // change arrow symbol if you want
                const $icon = $(this).find('.folder-toggle');
                if ($ul.is(':visible')) {
                    $icon.text('▼ ');
                } else {
                    $icon.text('▶ ');
                }
            });
        } else {
            // It's a file, optionally handle click here
        }

        return $li;
    }

});
