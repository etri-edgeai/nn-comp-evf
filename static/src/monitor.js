// Monitor.js
// Handles TensorBoard start, stop, and status checking for the monitor module

var Monitor = (function() {
    // Derive the base URL dynamically
    const baseUrl = `${window.location.protocol}//${window.location.hostname}`;
    const tensorboardPort = 6006;

    // Ensure buttons and status elements exist in the DOM
    const startButton = document.getElementById('start_tensorboard_btn');
    const stopButton = document.getElementById('stop_tensorboard_btn');
    const statusElement = document.getElementById('monitor_status');
    const iframeElement = document.getElementById('monitor_iframe');

    if (!startButton || !stopButton || !statusElement || !iframeElement) {
        console.error("Required DOM elements are missing: startButton, stopButton, statusElement, or iframeElement.");
        return;
    }

    async function startTensorBoard() {
        if (!App.AppState.currentProject) {
            alert("No project selected. Please select a project first.");
            return;
        }

        try {
            startButton.disabled = true; // Disable button during processing
            const response = await fetch('/monitor/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_name: App.AppState.currentProject,
                    port: tensorboardPort
                })
            });

            const data = await response.json();
            if (data.error) {
                alert(`Error starting TensorBoard: ${data.error}`);
            } else {
                alert("TensorBoard started successfully!");
                updateMonitorView();
            }
        } catch (error) {
            console.error("Failed to start TensorBoard:", error);
            alert("Failed to start TensorBoard. Check console for details.");
        } finally {
            startButton.disabled = false; // Re-enable button
        }
    }

    async function stopTensorBoard() {
        if (!App.AppState.currentProject) {
            alert("No project selected. Please select a project first.");
            return;
        }

        try {
            stopButton.disabled = true; // Disable button during processing
            const response = await fetch('/monitor/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_name: App.AppState.currentProject
                })
            });

            const data = await response.json();
            if (data.error) {
                alert(`Error stopping TensorBoard: ${data.error}`);
            } else {
                alert("TensorBoard stopped successfully!");
                updateMonitorView();
            }
        } catch (error) {
            console.error("Failed to stop TensorBoard:", error);
            alert("Failed to stop TensorBoard. Check console for details.");
        } finally {
            stopButton.disabled = false; // Re-enable button
        }
    }

    async function checkTensorBoardStatus() {
        if (!App.AppState.currentProject) {
            console.log("No project selected for monitoring.");
            statusElement.textContent = "No project selected";
            iframeElement.src = ""; // Clear iframe
            return;
        }

        try {
            const response = await fetch(`/monitor/status?project_name=${App.AppState.currentProject}`);
            const data = await response.json();

            if (data.status === "running") {
                console.log("TensorBoard is running.");
                statusElement.textContent = "Running";
                iframeElement.src = `${baseUrl}:${tensorboardPort}/`;
            } else {
                console.log("TensorBoard is not running.");
                statusElement.textContent = "Stopped";
                iframeElement.src = ""; // Clear iframe
            }
        } catch (error) {
            console.error("Error checking TensorBoard status:", error);
            statusElement.textContent = "Error checking status";
        }
    }

    function updateMonitorView() {
        checkTensorBoardStatus();
    }

    // Attach event listeners to buttons
    startButton.addEventListener('click', startTensorBoard);
    stopButton.addEventListener('click', stopTensorBoard);

    // Initial status check when the page loads
    document.addEventListener('DOMContentLoaded', updateMonitorView);

    return {
        startTensorBoard: startTensorBoard,
        stopTensorBoard: stopTensorBoard,
        checkTensorBoardStatus: checkTensorBoardStatus
    };
})();
