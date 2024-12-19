$(document).ready(function () {
    // Initialize editors
    const createEditor = ace.edit("editor");
    createEditor.setTheme("ace/theme/monokai");
    createEditor.setOptions({
        fontSize: "14px",
        showPrintMargin: false,
        showGutter: true
    });
    document.getElementById("editor").style.height = "500px";
    createEditor.resize();

    const editEditor = ace.edit("edit_editor");
    editEditor.setTheme("ace/theme/monokai");
    editEditor.setOptions({
        fontSize: "14px",
        showPrintMargin: false,
        showGutter: true
    });
    document.getElementById("edit_editor").style.height = "500px";
    editEditor.resize();

    // State variables
    let currentCreateFile = null;
    let currentEditFile = null;
    let treeData = {
        'temp_models': {
            type: 'directory',
            children: {}
        }
    };

    // Helper Functions
    function setEditorMode(editor, path) {
        const fileExtension = path.split('.').pop().toLowerCase();
        const modeMap = {
            'py': 'python',
            'yaml': 'yaml',
            'yml': 'yaml',
            'json': 'json',
            'js': 'javascript',
            'html': 'html',
            'css': 'css'
        };
        editor.session.setMode(`ace/mode/${modeMap[fileExtension] || 'text'}`);
    }

    function updateDirectoryTree(containerId = 'directory_tree', data = treeData, clickHandler = loadFileContent) {
        const $tree = $(`#${containerId}`);
        $tree.empty();
        
        function renderTree(treeData, basePath = '', level = 0) {
            let html = '';
            
            const entries = Object.entries(treeData).sort((a, b) => {
                const aIsDir = a[1].type === 'directory';
                const bIsDir = b[1].type === 'directory';
                if (aIsDir && !bIsDir) return -1;
                if (!aIsDir && bIsDir) return 1;
                return a[0].localeCompare(b[0]);
            });

            entries.forEach(([name, item]) => {
                const currentPath = basePath ? `${basePath}/${name}` : name;
                const indent = level * 20;
                
                if (item.type === 'directory') {
                    html += `
                        <div class="tree-item directory" style="padding-left: ${indent}px" data-path="${currentPath}">
                            <span class="tree-toggle">►</span>
                            <span class="tree-label">📁 ${name}</span>
                        </div>
                        <div class="tree-children" style="display: none;">
                            ${renderTree(item.children, currentPath, level + 1)}
                        </div>
                    `;
                } else {
                    html += `
                        <div class="tree-item file" style="padding-left: ${indent}px" data-path="${currentPath}">
                            <span class="tree-label">📄 ${name}</span>
                        </div>
                    `;
                }
            });
            
            return html;
        }

        $tree.html(renderTree(data));

        $tree.find('.tree-item.directory .tree-toggle').off('click').on('click', function(e) {
            e.stopPropagation();
            const $parent = $(this).closest('.directory');
            const $children = $parent.next('.tree-children');
            
            if ($children.is(':visible')) {
                $(this).html('►');
                $children.slideUp(100);
            } else {
                $(this).html('▼');
                $children.slideDown(100);
            }
        });

        $tree.find('.tree-item.file').off('click').on('click', function() {
            const path = $(this).data('path');
            $('.tree-item').removeClass('active');
            $(this).addClass('active');
            clickHandler(path);
        });
    }

    // File Operations
    async function loadCreateModelContent(path) {
        try {
            const response = await fetch('/models/get_temp_file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    path: path.replace(/\\/g, '/'),
                    project_name: sessionStorage.getItem('project_name')
                })
            });

            const data = await response.json();
            if (!data.error) {
                createEditor.setValue(data.content, -1);
                currentCreateFile = path;
                setEditorMode(createEditor, path);
            } else {
                toastr.error(data.error, "Error");
            }
        } catch (error) {
            console.error("Error loading file:", error);
            toastr.error("Failed to load file content", "Error");
        }
    }

    async function loadEditModelContent(path) {
        try {
            const response = await fetch('/models/get_model_file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    path: path,
                    project_name: sessionStorage.getItem('project_name')
                })
            });

            const data = await response.json();
            if (!data.error) {
                editEditor.setValue(data.content, -1);
                currentEditFile = path;
                setEditorMode(editEditor, path);
            } else {
                toastr.error(data.error, "Error");
            }
        } catch (error) {
            console.error("Error loading file:", error);
            toastr.error("Failed to load file content", "Error");
        }
    }

    async function loadFileContent(path) {
        const isEditMode = $('#id_modal_edit_model').is(':visible');
        if (isEditMode) {
            await loadEditModelContent(path);
        } else {
            await loadCreateModelContent(path);
        }
    }

    async function handleFileUpload(formData) {
        try {
            const response = await fetch('/models/upload_temp_files', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (!data.error) {
                treeData = data.tree_data;
                updateDirectoryTree();
                toastr.success("Files uploaded successfully");
            } else {
                toastr.error(data.error, "Error");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toastr.error("Failed to upload files", "Error");
        }
    }

    // Model List Management
    async function loadModelList() {
        try {
            const response = await fetch('/models/list', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    project_name: sessionStorage.getItem('project_name') 
                })
            });

            const data = await response.json();
            if (!data.error) {
                updateModelTable(data.models);
            } else {
                toastr.error(data.error, "Error");
            }
        } catch (error) {
            console.error("Error loading model list:", error);
            toastr.error("Failed to load models", "Error");
        }
    }

    function updateModelTable(models) {
        const $tableBody = $('#id_table_body_models');
        $tableBody.empty();

        if (models.length === 0) {
            $tableBody.append('<tr><td colspan="5" class="text-center">No models available</td></tr>');
            return;
        }

        models.forEach((model, index) => {
            $tableBody.append(`
                <tr draggable="true" data-index="${index}" data-name="${model.model_name}">
                    <td class="drag-handle">
                        <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <line x1="4" y1="6" x2="20" y2="6" />
                            <line x1="4" y1="12" x2="20" y2="12" />
                            <line x1="4" y1="18" x2="20" y2="18" />
                        </svg>
                    </td>
                    <td>${model.model_name}</td>
                    <td>${model.model_type}</td>
                    <td>${model.model_architecture}</td>
                    <td>
                        <button class="btn btn-sm btn-warning me-2" onclick="editModel('${model.model_name}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteModel('${model.model_name}')">Delete</button>
                    </td>
                </tr>
            `);
        });

        initDragAndDrop();
    }

    // Event Handlers
    $('#id_modal_create_model').on('show.bs.modal', async function () {
        try {
            // First ensure temp_models is cleared
            const clearResponse = await fetch('/models/clear_temp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_name: sessionStorage.getItem('project_name')
                })
            });

            if (clearResponse.error) {
                toastr.error("Failed to clean temporary files");
                return;
            }

            // Then initialize with fresh template files
            const initResponse = await fetch('/models/init_temp_folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_name: sessionStorage.getItem('project_name')
                })
            });

            const data = await initResponse.json();
            if (!data.error) {
                // Reset form fields
                $('#id_model_name').val('');
                $('#id_model_type').val('');
                $('#id_model_architecture').val('');
                
                // Update tree with new data
                treeData = data.tree_data;
                updateDirectoryTree('directory_tree', treeData, loadCreateModelContent);
                
                if (data.initial_file) {
                    await loadCreateModelContent(data.initial_file);
                }
            } else {
                toastr.error(data.error, "Error");
            }
        } catch (error) {
            console.error("Error:", error);
            toastr.error("Failed to initialize modal", "Error");
        }
    });


    $('#id_modal_create_model').on('hidden.bs.modal', async function() {
        try {
            // Clear editor content
            createEditor.setValue('');
            currentCreateFile = null;
            
            // Remove temp_models directory
            const response = await fetch('/models/clear_temp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_name: sessionStorage.getItem('project_name')
                })
            });

            if (response.error) {
                console.error("Failed to clean up temporary files");
            }
        } catch (error) {
            console.error("Error during cleanup:", error);
        }
    });

    $('#id_modal_edit_model').on('hidden.bs.modal', function() {
        editEditor.setValue('');
        currentEditFile = null;
    });

    $('#id_create_model_ok').click(async function() {
        const modelName = $('#id_model_name').val();
        const modelType = $('#id_model_type').val();
        const modelArchitecture = $('#id_model_architecture').val();

        if (!modelName || !modelType || !modelArchitecture) {
            toastr.error("Please fill in all required fields");
            return;
        }

        try {
            const response = await fetch('/models/save_from_temp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    meta: {
                        model_name: modelName,
                        model_type: modelType,
                        model_architecture: modelArchitecture
                    },
                    project_name: sessionStorage.getItem('project_name')
                })
            });

            const data = await response.json();
            if (!data.error) {
                toastr.success("Model created successfully");
                $('#id_modal_create_model').modal('hide');
                loadModelList();
            } else {
                toastr.error(data.error, "Error");
            }
        } catch (error) {
            console.error("Error:", error);
            toastr.error("Failed to create model", "Error");
        }
    });

    $('#id_edit_model_ok').click(async function() {
        if (!currentEditFile) {
            toastr.error("No file selected");
            return;
        }

        try {
            const response = await fetch('/models/save_model_file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_name: sessionStorage.getItem('project_name'),
                    path: currentEditFile,
                    content: editEditor.getValue()
                })
            });

            const data = await response.json();
            if (!data.error) {
                toastr.success("File saved successfully");
                $('#id_modal_edit_model').modal('hide');
            } else {
                toastr.error(data.error, "Error");
            }
        } catch (error) {
            console.error("Error:", error);
            toastr.error("Failed to save file", "Error");
        }
    });

    // File Upload Event Handlers
    $('#file_upload, #folder_upload').on('change', function(e) {
        const files = e.target.files;
        if (files.length === 0) return;

        const formData = new FormData();
        for (let file of files) {
            const filePath = file.webkitRelativePath || file.name;
            formData.append('files[]', file, filePath);
        }
        formData.append('project_name', sessionStorage.getItem('project_name'));

        handleFileUpload(formData);
        this.value = ''; // Reset file input
    });

    // Edit and Delete Model Functions
    window.editModel = async function(modelName) {
        try {
            const response = await fetch('/models/get_model_structure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model_name: modelName,
                    project_name: sessionStorage.getItem('project_name')
                })
            });

            const data = await response.json();
            if (!data.error) {
                updateDirectoryTree('edit_directory_tree', data.tree_data, loadEditModelContent);
                
                if (data.initial_file) {
                    await loadEditModelContent(data.initial_file);
                }
                
                $('#id_edit_model_name').val(modelName);
                $('#id_modal_edit_model').modal('show');
            } else {
                toastr.error(data.error, "Error");
            }
        } catch (error) {
            console.error("Error:", error);
            toastr.error("Failed to load model", "Error");
        }
    };

    window.deleteModel = async function(modelName) {
        if (!confirm("Are you sure you want to delete this model?")) {
            return;
        }

        try {
            const response = await fetch('/models/delete', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    name: modelName, 
                    project_name: sessionStorage.getItem('project_name') 
                })
            });

            const data = await response.json();
            if (!data.error) {
                toastr.success(data.message);
                loadModelList();
            } else {
                toastr.error(data.error, "Error");
            }
        } catch (error) {
            console.error("Error deleting model:", error);
            toastr.error("Failed to delete model", "Error");
        }
    };

    function initDragAndDrop() {
        const rows = document.querySelectorAll('#id_table_body_models tr');
        let draggedRow = null;

        rows.forEach(row => {
            row.addEventListener('dragstart', function(e) {
                draggedRow = this;
                this.style.opacity = '0.4';
                e.dataTransfer.effectAllowed = 'move';
            });

            row.addEventListener('dragend', function(e) {
                this.style.opacity = '1';
                rows.forEach(row => row.classList.remove('drag-over'));
            });

            row.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            row.addEventListener('dragenter', function(e) {
                this.classList.add('drag-over');
            });

            row.addEventListener('dragleave', function(e) {
                this.classList.remove('drag-over');
            });

            row.addEventListener('drop', function(e) {
                e.preventDefault();
                if (this === draggedRow) return;

                let allRows = [...rows];
                const draggedIndex = allRows.indexOf(draggedRow);
                const droppedIndex = allRows.indexOf(this);

                if (draggedIndex < droppedIndex) {
                    this.parentNode.insertBefore(draggedRow, this.nextSibling);
                } else {
                    this.parentNode.insertBefore(draggedRow, this);
                }

                saveNewOrder();
            });
        });
    }

    async function saveNewOrder() {
        const newOrder = [];
        document.querySelectorAll('#id_table_body_models tr').forEach(row => {
            newOrder.push(row.dataset.name);
        });

        try {
            const response = await fetch('/models/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_name: sessionStorage.getItem('project_name'),
                    order: newOrder
                })
            });

            const data = await response.json();
            if (data.error) {
                toastr.error(data.error);
            }
        } catch (error) {
            console.error('Failed to save new order:', error);
            toastr.error('Failed to save the new order');
        }
    }

    // Initialize the page
    loadModelList();
    updateDirectoryTree();
});