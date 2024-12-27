document.addEventListener('DOMContentLoaded', () => {
    const runsList = document.getElementById('runs-list');
    const directoryTree = document.getElementById('directory-tree');
    const deploymentSection = document.getElementById('deployment-section');
    const deployMethodSelect = document.getElementById('deploy-method');
    const deployButton = document.getElementById('deploy-button');

    // Hide/Show deployment options
    deployMethodSelect.addEventListener('change', () => {
        document.querySelectorAll('.deployment-options').forEach(option => {
            option.classList.add('d-none');
        });
        const selectedMethod = deployMethodSelect.value;
        if (selectedMethod) {
            document.getElementById(`${selectedMethod}-options`).classList.remove('d-none');
        }
    });