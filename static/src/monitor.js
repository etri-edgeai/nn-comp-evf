// Monitor.js
// Handles TensorBoard start, stop, and status checking for the monitor module

var Monitor = (function() {
    // Configuration
    const baseUrl = `${window.location.protocol}//${window.location.hostname}`;
    const tensorboardPort = 6006;
    
    // Wait for DOM to be fully loaded before initialization
    document.addEventListener('DOMContentLoaded', initializeMonitor);
    
    function initializeMonitor() {
        // Get DOM elements
        const startButton = document.getElementById('start_tensorboard_btn');
        const stopButton = document.getElementById('stop_tensorboard_btn');
        const statusElement = document.getElementById('monitor_status');
        const iframeElement = document.getElementById('monitor_iframe');
        
        // Verify that all required elements exist
        if (!startButton || !stopButton || !statusElement || !iframeElement) {
            console.error("Required DOM elements are missing: startButton, stopButton, statusElement, or iframeElement.");
            return;
        }
        
        // Set iframe to take most of viewport height
        iframeElement.style.height = 'calc(100vh - 200px)';
        
        // Attach event listeners
        startButton.addEventListener('click', startTensorBoard);
        stopButton.addEventListener('click', stopTensorBoard);
        
        // Initial status check
        checkTensorBoardStatus();
        
        // Function to start TensorBoard
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
                    console.log("TensorBoard started successfully");
                    checkTensorBoardStatus();
                }
            } catch (error) {
                console.error("Failed to start TensorBoard:", error);
                alert("Failed to start TensorBoard. Check console for details.");
            } finally {
                startButton.disabled = false; // Re-enable button
            }
        }
        
        // Function to stop TensorBoard
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
                    console.log("TensorBoard stopped successfully");
                    checkTensorBoardStatus();
                }
            } catch (error) {
                console.error("Failed to stop TensorBoard:", error);
                alert("Failed to stop TensorBoard. Check console for details.");
            } finally {
                stopButton.disabled = false; // Re-enable button
            }
        }
        
        // Function to check TensorBoard status
        async function checkTensorBoardStatus() {
            if (!App.AppState.currentProject) {
                console.log("No project selected for monitoring.");
                statusElement.textContent = "Status: No project selected";
                iframeElement.style.display = "none";
                startButton.style.display = "inline-block";
                stopButton.style.display = "none";
                return;
            }
            
            try {
                const response = await fetch(`/monitor/status?project_name=${encodeURIComponent(App.AppState.currentProject)}`);
                const data = await response.json();
                
                if (data.status === "running") {
                    console.log("TensorBoard is running.");
                    statusElement.textContent = "Status: Running";
                    iframeElement.src = `${baseUrl}:${tensorboardPort}/`;
                    iframeElement.style.display = "block";
                    startButton.style.display = "none";
                    stopButton.style.display = "inline-block";
                } else {
                    console.log("TensorBoard is not running.");
                    statusElement.textContent = "Status: Stopped";
                    iframeElement.style.display = "none";
                    startButton.style.display = "inline-block";
                    stopButton.style.display = "none";
                }
            } catch (error) {
                console.error("Error checking TensorBoard status:", error);
                statusElement.textContent = "Status: Error checking status";
                iframeElement.style.display = "none";
                startButton.style.display = "inline-block";
                stopButton.style.display = "none";
            }
        }
    }
    
    // Public API
    return {
        refresh: function() {
            // Method to call from outside to refresh the status
            const statusElement = document.getElementById('monitor_status');
            if (statusElement) {
                this.checkTensorBoardStatus();
            }
        },
        checkTensorBoardStatus: function() {
            // Public method to check status
            const initFn = () => {
                const statusElement = document.getElementById('monitor_status');
                if (statusElement) {
                    checkTensorBoardStatus();
                }
            };
            
            if (document.readyState === 'complete') {
                initFn();
            } else {
                document.addEventListener('DOMContentLoaded', initFn);
            }
        }
    };
})();