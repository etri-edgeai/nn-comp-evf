"""
Module: monitor.py
Description:
This module manages the monitoring functionality for machine learning projects using TensorBoard.
It provides routes to start, stop, and check the status of TensorBoard processes for specific user 
projects in a Flask application.

Features:
- Start TensorBoard for a specified project.
- Stop TensorBoard if it's running.
- Check the current status of TensorBoard for a project.
- Render a monitoring page.

Dependencies:
- Flask: For route handling and HTTP request/response management.
- Subprocess: For managing TensorBoard processes.
- Threading: To ensure thread-safe access to shared resources.

Author: Junyong Park
"""
import os
import json
import shutil
from flask import Blueprint, jsonify, request, session, render_template
from werkzeug.utils import secure_filename
from auth import session_required

models = Blueprint('models', __name__, url_prefix='/models')

# -------------------- HELPER FUNCTIONS --------------------

def get_temp_path(user, project_name):
    """Get the temporary folder path for model creation."""
    return os.path.abspath(os.path.join('./workspace', user, project_name, 'temp_models'))

def get_workspace_path(user, project_name):
    """Get the workspace path for models."""
    return os.path.abspath(os.path.join('./workspace', user, project_name, 'models'))

def get_project_json_path(user, project_name):
    """Get the project.json file path."""
    return os.path.abspath(os.path.join('./workspace', user, project_name, 'project.json'))

def build_tree(path):
    """Recursively build directory tree structure."""
    tree = {}
    try:
        for item in sorted(os.listdir(path)):
            full_path = os.path.join(path, item)
            if os.path.isdir(full_path):
                tree[item] = {"type": "directory", "children": build_tree(full_path)}
            else:
                tree[item] = {"type": "file"}
    except Exception as e:
        print(f"Error building tree at {path}: {e}")
    return tree

def ensure_path_safety(base_path, requested_path):
    """Ensure the requested path is within the allowed base path."""
    requested_full_path = os.path.abspath(os.path.join(base_path, requested_path))
    if not requested_full_path.startswith(base_path):
        raise ValueError("Invalid path: Attempted to access outside allowed directory")
    return requested_full_path

# -------------------- ROUTES --------------------

@models.route('/')
@session_required
def root():
    return render_template('models.html')

@models.route('/get_temp_file', methods=['POST'])
@session_required
def get_temp_file():
    """Get content of a file from temp directory."""
    try:
        data = request.json
        project_name = data.get('project_name')
        path = data.get('path')

        if not all([project_name, path]):
            raise ValueError("Missing required parameters")

        temp_path = get_temp_path(session['user'], project_name)
        full_path = ensure_path_safety(temp_path, path)

        if not os.path.exists(full_path):
            raise FileNotFoundError(f"File not found: {path}")

        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()

        return jsonify({"content": content, "error": None})
    except Exception as e:
        return jsonify({"error": str(e)})

@models.route('/save_from_temp', methods=['POST'])
@session_required
def save_from_temp():
    """Save model from temp directory to workspace."""
    try:
        data = request.json
        meta = data.get('meta')
        project_name = data.get('project_name')

        if not all([meta, project_name]):
            raise ValueError("Missing required parameters")

        model_name = meta.get('model_name')
        if not model_name:
            raise ValueError("Model name is required")

        # Setup paths
        temp_path = get_temp_path(session['user'], project_name)
        workspace_path = get_workspace_path(session['user'], project_name)
        model_path = os.path.join(workspace_path, model_name)

        # Check if model already exists
        if os.path.exists(model_path):
            raise ValueError(f"Model '{model_name}' already exists")

        # Copy from temp to workspace
        shutil.copytree(temp_path, model_path)

        # Update project.json
        project_json_path = get_project_json_path(session['user'], project_name)
        project_data = {"models": []}
        if os.path.exists(project_json_path):
            with open(project_json_path, 'r') as f:
                project_data = json.load(f)

        # Add new model metadata
        project_data["models"].append(meta)

        # Save updated project.json
        with open(project_json_path, 'w') as f:
            json.dump(project_data, f, indent=4)

        return jsonify({
            "message": f"Model '{model_name}' created successfully",
            "error": None
        })
    except Exception as e:
        return jsonify({"error": str(e)})

@models.route('/get_model_structure', methods=['POST'])
@session_required
def get_model_structure():
    """Get file structure of a saved model."""
    try:
        data = request.json
        model_name = data.get('model_name')
        project_name = data.get('project_name')

        if not all([model_name, project_name]):
            raise ValueError("Missing required parameters")

        # Get model path
        workspace_path = get_workspace_path(session['user'], project_name)
        model_path = os.path.join(workspace_path, model_name)

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found: {model_name}")

        # Build tree structure
        tree_data = {model_name: {"type": "directory", "children": build_tree(model_path)}}

        # Find initial file (prefer model.py)
        initial_file = None
        model_file = os.path.join(model_name, 'model.py')
        if os.path.exists(os.path.join(workspace_path, model_file)):
            initial_file = model_file

        return jsonify({
            "tree_data": tree_data,
            "initial_file": initial_file,
            "error": None
        })
    except Exception as e:
        return jsonify({"error": str(e)})

@models.route('/save_model_file', methods=['POST'])
@session_required
def save_model_file():
    """Save changes to a model file."""
    try:
        data = request.json
        project_name = data.get('project_name')
        file_path = data.get('path')
        content = data.get('content')

        if not all([project_name, file_path, content is not None]):
            raise ValueError("Missing required parameters")

        # Get workspace path and ensure file path is valid
        workspace_path = get_workspace_path(session['user'], project_name)
        full_path = ensure_path_safety(workspace_path, file_path)

        # Create directories if they don't exist
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        # Save the file
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)

        return jsonify({
            "message": "File saved successfully",
            "error": None
        })
    except Exception as e:
        return jsonify({"error": str(e)})

@models.route('/reorder', methods=['POST'])
@session_required
def reorder_models():
    """Reorder models in project.json."""
    try:
        data = request.json
        project_name = data.get('project_name')
        new_order = data.get('order')

        if not all([project_name, new_order]):
            raise ValueError("Missing required parameters")

        project_json_path = get_project_json_path(session['user'], project_name)
        if not os.path.exists(project_json_path):
            raise FileNotFoundError("Project configuration not found")

        # Read current project data
        with open(project_json_path, 'r') as f:
            project_data = json.load(f)

        # Create a map of model names to their data
        model_map = {model['model_name']: model for model in project_data.get('models', [])}

        # Reorder models according to new order
        project_data['models'] = [model_map[name] for name in new_order if name in model_map]

        # Save updated project.json
        with open(project_json_path, 'w') as f:
            json.dump(project_data, f, indent=4)

        return jsonify({"message": "Models reordered successfully", "error": None})
    except Exception as e:
        return jsonify({"error": str(e)})
@models.route('/list', methods=['GET', 'POST'])
@session_required
def list_models():
    """List all models for a specific project."""
    try:
        project_name = request.get_json().get("project_name") if request.is_json else request.form.get("project_name")
        
        if not project_name:
            raise ValueError("Project name is missing")

        project_json_path = os.path.join('./workspace', session['user'], project_name, 'project.json')

        if os.path.exists(project_json_path):
            with open(project_json_path, 'r') as f:
                project_data = json.load(f)
                models = project_data.get("models", [])
        else:
            models = []

        return jsonify({"models": models})
    except Exception as e:
        return jsonify({"error": f"Failed to list models: {str(e)}"})
@models.route('/upload_temp_files', methods=['POST'])
@session_required
def upload_temp_files():
    """Handle file uploads to temp directory."""
    try:
        if 'files[]' not in request.files:
            raise ValueError("No files provided")
            
        project_name = request.form.get('project_name')
        if not project_name:
            raise ValueError("Project name is required")

        temp_path = get_temp_path(session['user'], project_name)
        
        # Create temp directory if it doesn't exist
        os.makedirs(temp_path, exist_ok=True)

        files = request.files.getlist('files[]')
        for file in files:
            if file.filename:
                # Get the relative path from the file
                relative_path = file.filename.replace('\\', '/')
                
                # Create full path
                full_path = os.path.join(temp_path, relative_path)
                
                # Create directories if needed
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                
                # Save the file
                file.save(full_path)

        # Build and return updated tree structure
        tree_data = build_tree(temp_path)
        
        return jsonify({
            "message": "Files uploaded successfully",
            "tree_data": tree_data,
            "error": None
        })
        
    except Exception as e:
        return jsonify({"error": str(e)})

@models.route('/get_model_file', methods=['GET', 'POST'])
@session_required
def get_model_file():
    """Get content of a model file."""
    try:
        data = request.json
        project_name = data.get('project_name')
        path = data.get('path')

        if not all([project_name, path]):
            raise ValueError("Missing required parameters")

        # Resolve the full path securely
        base_path = os.path.abspath(os.path.join('./workspace', session['user'], project_name, 'models'))
        full_path = os.path.normpath(os.path.join(base_path, path))

        # Security check: ensure the path is within the workspace
        if not full_path.startswith(base_path):
            raise ValueError("Invalid file path.")

        if not os.path.exists(full_path):
            raise FileNotFoundError(f"File not found: {path}")

        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()

        return jsonify({"content": content, "error": None})
    except Exception as e:
        return jsonify({"error": str(e)})

@models.route('/delete', methods=['GET', 'POST'])
@session_required
def delete_model():
    """Delete a specific model."""
    try:
        data = request.json
        model_name = data.get('name')
        project_name = data.get('project_name')

        if not model_name or not project_name:
            raise ValueError("Model name or project name is missing.")

        model_path = os.path.join('./workspace', session['user'], project_name, 'models', model_name)

        # Delete model directory if it exists
        if os.path.exists(model_path):
            shutil.rmtree(model_path)

        # Update project.json
        project_json_path = os.path.join('./workspace', session['user'], project_name, 'project.json')
        if os.path.exists(project_json_path):
            with open(project_json_path, 'r') as f:
                project_data = json.load(f)

            # Remove model from the list
            project_data["models"] = [m for m in project_data.get("models", []) if m["model_name"] != model_name]

            # Save updated project.json
            with open(project_json_path, 'w') as f:
                json.dump(project_data, f, indent=4)

        return jsonify({
            "message": f"Model '{model_name}' deleted successfully.",
            "error": None
        })
    except Exception as e:
        return jsonify({"error": f"Failed to delete model: {str(e)}"})
    
@models.route('/clear_temp', methods=['POST'])
@session_required
def clear_temp():
    """Completely remove temp_models directory."""
    try:
        project_name = request.json.get('project_name')
        if not project_name:
            raise ValueError("Project name is required")

        temp_path = os.path.join('./workspace', session['user'], project_name, 'temp_models')
        
        # Force remove the directory and all contents
        if os.path.exists(temp_path):
            # Use rmtree with onerror handler to handle permission issues
            def handle_remove_readonly(func, path, exc):
                # os.chmod(path, stat.S_IWRITE)
                func(path)
                
            shutil.rmtree(temp_path, onerror=handle_remove_readonly)

        return jsonify({"message": "Temp folder removed successfully", "error": None})
    except Exception as e:
        print(f"Error clearing temp folder: {str(e)}")
        return jsonify({"error": str(e)})

@models.route('/init_temp_folder', methods=['POST'])
@session_required
def init_temp_folder():
    """Initialize temp folder with template files."""
    try:
        project_name = request.json.get('project_name')
        if not project_name:
            raise ValueError("Project name is required")

        # Setup paths
        temp_path = os.path.join('./workspace', session['user'], project_name, 'temp_models')
        template_path = './edgeai/template/project/models/src'

        # Create fresh temp directory
        os.makedirs(temp_path, exist_ok=True)

        # Copy template files
        for filename in ['config.yaml', 'model.py']:
            src_path = os.path.join(template_path, filename)
            dst_path = os.path.join(temp_path, filename)
            if os.path.exists(src_path):
                shutil.copy2(src_path, dst_path)

        # Build tree structure
        tree_data = build_tree(temp_path)
        
        return jsonify({
            "tree_data": tree_data,
            "initial_file": "model.py",
            "error": None
        })
    except Exception as e:
        return jsonify({"error": str(e)})