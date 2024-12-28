"""
Module: dataset.py
Description:
This module provides routes and functionality for managing datasets in a Flask-based application.
It includes API endpoints for loading, saving, listing, deleting, and reordering datasets. 
User-specific operations are managed based on active session data.

Features:
- Load dataset templates for initialization.
- Save user-modified datasets to their project workspace.
- List all datasets associated with a specific project.
- Reorder datasets within a project.
- Delete individual datasets or all datasets for a project.
- Load dataset configurations and scripts for editing.

Dependencies:
- Flask: For web routing and handling HTTP requests.
- JSON: For reading and writing dataset metadata.
- os, shutil: For file and directory operations.
- auth: For session-based user authentication and validation.

Author: Junyong Park
"""
import os
import json
import shutil
from flask import Blueprint, jsonify, request, session, render_template
from auth import session_required

dataset = Blueprint('datasets', __name__, url_prefix='/datasets')

@dataset.route('/')
@session_required
def root():
    return render_template('datasets.html')

# Load default dataset template files
@dataset.route('/load_template', methods=['GET'])
@session_required
def load_template():
    try:
        template_path = './edgeai/template/project/datasets'
        
        # Read each template file
        with open(f'{template_path}/config.yaml') as f:
            config = f.read()
        with open(f'{template_path}/meta.json') as f:
            meta = json.load(f)
        with open(f'{template_path}/src/datasets.py') as f:
            dataset_code = f.read()
        with open(f'{template_path}/src/collate_fn.py') as f:
            collate_fn_code = f.read()
        
        # Return templates as JSON
        return jsonify({
            "config": config,
            "meta": meta,
            "dataset": dataset_code,
            "collate_fn": collate_fn_code
        })
    except Exception as e:
        return jsonify({"error": str(e)})

@dataset.route('/save', methods=['POST'])
@session_required
def save_dataset():
    try:
        data = request.json
        dataset_name = data["meta"]["dataset_name"]
        project_name = data.get("project_name")
        
        if not project_name:
            raise ValueError("Project name is missing.")

        # Define user dataset path
        user_path = os.path.join(
            '.', 'workspace', session["user"], project_name, 'datasets', dataset_name
        )
        os.makedirs(user_path, exist_ok=True)

        # Save meta.json
        with open(os.path.join(user_path, "meta.json"), "w") as f:
            json.dump(data["meta"], f, indent=4)

        # Save config.yaml
        with open(os.path.join(user_path, "config.yaml"), "w") as f:
            f.write(data["config"])

        # Save datasets.py
        with open(os.path.join(user_path, "datasets.py"), "w") as f:
            f.write(data["dataset"])

        # Save collate_fn.py
        with open(os.path.join(user_path, "collate_fn.py"), "w") as f:
            f.write(data["collate_fn"])
        
        # Create __init__.py to make it a Python package
        init_content = f""" """
        with open(f"{user_path}/__init__.py", "w") as f:
            f.write(init_content)
        # Update project.json
        project_json_path = os.path.join(
            '.', 'workspace', session["user"], project_name, 'project.json'
        )
        if os.path.exists(project_json_path):
            with open(project_json_path, 'r') as f:
                project_data = json.load(f)
        else:
            project_data = {"datasets": [], "models": [], "experiments": [], "optimizations": [], "runs": []}

        existing_datasets = project_data.get("datasets", [])

        # Add dataset_code_path to meta
        data["meta"]["dataset_code_path"] = user_path

        # Check if dataset already exists
        dataset_exists = any(d["dataset_name"] == dataset_name for d in existing_datasets)
        if not dataset_exists:
            # Append new dataset
            project_data["datasets"].append(data["meta"])
        else:
            # Update existing dataset
            for idx, dataset in enumerate(existing_datasets):
                if dataset["dataset_name"] == dataset_name:
                    project_data["datasets"][idx] = data["meta"]
                    break

        # Save updated project.json
        with open(project_json_path, 'w') as f:
            json.dump(project_data, f, indent=4)

        return jsonify({"message": "Dataset saved successfully"})
    except Exception as e:
        print(f"Error in save_dataset: {e}")
        return jsonify({"error": str(e)})


# List all datasets for the current user
@dataset.route('/list', methods=['POST'])
@session_required
def list_datasets():
    try:
        project_name = request.json.get("project_name")
        if not project_name:
            raise ValueError("Project name is missing.")

        project_json_path = f'./workspace/{session["user"]}/{project_name}/project.json'
        
        # Load dataset information from project.json
        if os.path.exists(project_json_path):
            with open(project_json_path, 'r') as f:
                project_data = json.load(f)
                datasets = project_data.get("datasets", [])
        else:
            datasets = []

        # Return the dataset metadata
        return jsonify({"datasets": datasets})
    except Exception as e:
        return jsonify({"error": str(e)})
    
@dataset.route('/reorder', methods=['POST'])
@session_required
def reorder_datasets():
    try:
        project_name = request.json.get('project_name')
        new_order = request.json.get('order')
        
        if not project_name or not new_order:
            return jsonify({'error': 'Missing required parameters'})

        project_json_path = f'./workspace/{session["user"]}/{project_name}/project.json'
        
        with open(project_json_path, 'r') as f:
            project_data = json.load(f)
        
        # Create a map of dataset names to their full data
        dataset_map = {d['dataset_name']: d for d in project_data['datasets']}
        
        # Reorder datasets according to new_order
        project_data['datasets'] = [dataset_map[name] for name in new_order]
        
        with open(project_json_path, 'w') as f:
            json.dump(project_data, f, indent=4)
        
        return jsonify({'error': None, 'message': 'Order updated successfully'})
    
    except Exception as e:
        return jsonify({'error': f'Failed to update order: {str(e)}'})


@dataset.route('/delete', methods=['POST'])
@session_required
def delete_dataset():
    try:
        dataset_name = request.json['name']
        project_name = request.json.get("project_name")
        if not project_name:
            raise ValueError("Project name is missing.")

        user_path = os.path.join(
            '.', 'workspace', session["user"], project_name, 'datasets', dataset_name
        )

        # Remove the dataset directory
        if os.path.exists(user_path):
            shutil.rmtree(user_path)
        else:
            print(f"Dataset directory does not exist: {user_path}")

        # Update project.json
        project_json_path = os.path.join(
            '.', 'workspace', session["user"], project_name, 'project.json'
        )
        if os.path.exists(project_json_path):
            with open(project_json_path, 'r') as f:
                project_data = json.load(f)
            # Remove the dataset from project.json
            project_data["datasets"] = [
                d for d in project_data.get("datasets", []) if d["dataset_name"] != dataset_name
            ]
            with open(project_json_path, 'w') as f:
                json.dump(project_data, f, indent=4)
        else:
            print(f"project.json does not exist at: {project_json_path}")

        return jsonify({"message": f"Dataset '{dataset_name}' deleted successfully"})
    except Exception as e:
        print(f"Error in delete_dataset: {e}")
        return jsonify({"error": str(e)})


# Delete all datasets for a specific project
@dataset.route('/delete_all', methods=['POST'])
@session_required
def delete_all_datasets():
    try:
        project_name = request.json.get("project_name")
        if not project_name:
            raise ValueError("Project name is missing.")

        user_path = f'./workspace/{session["user"]}/{project_name}/datasets'
        
        # Remove all dataset directories for the project
        if os.path.exists(user_path):
            shutil.rmtree(user_path)

        # Update project.json
        project_json_path = f'./workspace/{session["user"]}/{project_name}/project.json'
        if os.path.exists(project_json_path):
            with open(project_json_path, 'r') as f:
                project_data = json.load(f)

            project_data["datasets"] = []

            with open(project_json_path, 'w') as f:
                json.dump(project_data, f, indent=4)
        
        return jsonify({"message": f"All datasets for project '{project_name}' deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)})

@dataset.route('/load_dataset', methods=['POST'])
@session_required
def load_dataset():
    try:
        dataset_name = request.json.get('dataset_name')
        project_name = request.json.get('project_name')
        
        if not dataset_name or not project_name:
            raise ValueError("Dataset name or project name is missing.")

        # Construct the path to the dataset files
        dataset_path = os.path.join(
            '.', 'workspace', session["user"], project_name, 'datasets', dataset_name
        )

        # Read all the files
        with open(os.path.join(dataset_path, "config.yaml"), 'r') as f:
            config = f.read()
        
        with open(os.path.join(dataset_path, "datasets.py"), 'r') as f:
            dataset_code = f.read()
            
        with open(os.path.join(dataset_path, "collate_fn.py"), 'r') as f:
            collate_fn = f.read()

        return jsonify({
            "config": config,
            "dataset": dataset_code,
            "collate_fn": collate_fn
        })
    except Exception as e:
        print(f"Error loading dataset files: {e}")
        return jsonify({"error": str(e)})