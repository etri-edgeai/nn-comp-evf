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
    
    // Fetch and display runs
    async function loadRuns() {
        try {
            const response = await fetch('/deploy/runs');
            const runs = await response.json();
            runsList.innerHTML = '';
            runs.forEach(run => {
                const listItem = document.createElement('li');
                listItem.className = 'list-group-item';
                listItem.textContent = run.name;
                listItem.addEventListener('click', () => loadRunDetails(run));
                runsList.appendChild(listItem);
            });
        } catch (error) {
            console.error('Error loading runs:', error);
        }
    }
    
    // Fetch and display directory tree for a selected run
    async function loadRunDetails(run) {
        try {
            const response = await fetch(`/deploy/run/${run.id}/directory`);
            const tree = await response.json();
            renderDirectoryTree(tree);
            deploymentSection.classList.remove('d-none');
        } catch (error) {
            console.error('Error loading run details:', error);
        }
    }
    
    // Render directory tree
    function renderDirectoryTree(tree, parent = directoryTree) {
        parent.innerHTML = '';
        Object.entries(tree).forEach(([key, value]) => {
            const item = document.createElement('div');
            item.textContent = key;
            if (typeof value === 'object') {
                const subtree = document.createElement('div');
                subtree.style.paddingLeft = '20px';
                renderDirectoryTree(value, subtree);
                item.appendChild(subtree);
            } else {
                item.addEventListener('click', () => selectCheckpointFile(value));
            }
            parent.appendChild(item);
        });
    }
    
    // Handle checkpoint file selection
    let selectedCheckpoint = null;
    function selectCheckpointFile(filePath) {
        selectedCheckpoint = filePath;
        console.log('Selected checkpoint file:', filePath);
    }
    
    // Handle deployment
    deployButton.addEventListener('click', async () => {
        if (!selectedCheckpoint) {
            alert('Please select a checkpoint file first.');
            return;
        }
        const deployMethod = deployMethodSelect.value;
        if (!deployMethod) {
            alert('Please select a deployment method.');
            return;
        }
        
        let payload;
        switch (deployMethod) {
            case 'ftp':
                payload = {
                    method: 'ftp',
                    file: selectedCheckpoint,
                    server: document.getElementById('ftp-server').value,
                    username: document.getElementById('ftp-username').value,
                    password: document.getElementById('ftp-password').value,
                    path: document.getElementById('ftp-path').value,
                };
                break;
            case 'ssh':
                payload = {
                    method: 'ssh',
                    file: selectedCheckpoint,
                    host: document.getElementById('ssh-host').value,
                    username: document.getElementById('ssh-username').value,
                    password: document.getElementById('ssh-password').value,
                    path: document.getElementById('ssh-path').value,
                };
                break;
            case 'download':
                    payload = { method: 'download', file: selectedCheckpoint };
                    break;
            default:
                alert('Invalid deployment method.');
                return;
        }