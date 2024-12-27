$(document).ready(function() {
    loadRuns();
    async function loadRuns() {
        console.log("Loading runs for deployment...");

        // Retrieve project_name from sessionStorage or wherever you store it
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
            $tableBody.append('<tr><td colspan="7" class="text-center">No runs available</td></tr>');
            return;
        }

        runs.forEach(run => {
            const gpuList = (run.gpu_ids || []).join(', ') || 'N/A';
            const row = `
                <tr>
                    <td>${run.run_name}</td>
                    <td>${run.created_date || 'N/A'}</td>
                    <td>${run.model_name || 'N/A'}</td>
                    <td>${run.dataset_name || 'N/A'}</td>
                    <td>${run.optimization_name || 'N/A'}</td>
                    <td>${run.status || 'Not Running'}</td>
                    <td>${gpuList}</td>
                </tr>
            `;
            $tableBody.append(row);
        });
    }

});
