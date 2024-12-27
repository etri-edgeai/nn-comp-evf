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
});
