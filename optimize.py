import os
import json
import shutil
from flask import Blueprint, jsonify, request, session, render_template
from auth import session_required

optimizations = Blueprint('optimizations', __name__, url_prefix='/optimizations')

@optimizations.route('/')
@session_required
def root():
    return render_template('optimize.html')

# Load list of optimization templates
@optimizations.route('/templates', methods=['GET'])
@session_required
def get_templates():
    try:
        template_path = './edgeai/template/project/optimizations/'
        print(f"Looking for templates in: {template_path}")
        if not os.path.exists(template_path):
            print(f"Templates directory does not exist: {template_path}")
            return jsonify({"templates": []})
        templates = [f for f in os.listdir(template_path) if f.endswith('.py')]
        print(f"Found templates: {templates}")
        return jsonify({"templates": templates})
    except Exception as e:
        print(f"Error in get_templates: {e}")
        return jsonify({"error": str(e)})

# Load specific template content
@optimizations.route('/load_template', methods=['POST'])
@session_required
def load_template():
    try:
        data = request.json
        template_file = data.get('template_file')
        if not template_file:
            raise ValueError("Template file name is missing.")

        template_path = os.path.join('./edgeai/template/project/optimizations/', template_file)
        if not os.path.exists(template_path):
            raise FileNotFoundError(f"Template file '{template_file}' not found.")

        with open(template_path, 'r') as f:
            template_content = f.read()

        print(f"Loaded template content for {template_file}")

        return jsonify({"template_content": template_content})
    except Exception as e:
        print(f"Error in load_template: {e}")
        return jsonify({"error": str(e)})

# Save a new optimization
@optimizations.route('/save', methods=['POST'])
@session_required
def save_optimization():
    try:
        data = request.json
        print(f"Received data for saving optimization: {data}")
        original_model_name = data['original_model_name']
        optimize_method_name = data['optimize_method_name']
        optimization_code = data['optimization_code']
        project_name = data.get('project_name')

        if not project_name:
            raise ValueError("Project name is missing.")

        # Define user optimization path
        user_path = os.path.join(
            '.', 'workspace', session["user"], project_name, 'optimizations', optimize_method_name
        )
        os.makedirs(user_path, exist_ok=True)

        # Create __init__.py to make it a Python package
        init_content = f""" """
        with open(f"{user_path}/__init__.py", "w") as f:
            f.write(init_content)

        # Save optimize.py
        optimize_py_path = os.path.join(user_path, "optimize.py")
        with open(optimize_py_path, "w") as f:
            f.write(optimization_code)

        # Save meta.json
        meta = {
            "original_model_name": original_model_name,
            "optimize_method_name": optimize_method_name,
            "optimization_code_path": user_path,  # Include the path to the optimization code
            "misc": data.get('misc', '')
        }
        with open(os.path.join(user_path, "meta.json"), "w") as f:
            json.dump(meta, f, indent=4)

        # Update project.json
        project_json_path = os.path.join(
            '.', 'workspace', session["user"], project_name, 'project.json'
        )
        if os.path.exists(project_json_path):
            with open(project_json_path, 'r') as f:
                project_data = json.load(f)
        else:
            project_data = {"datasets": [], "models": [], "experiments": [], "optimizations": [], "runs": []}

        existing_optimizations = project_data.get("optimizations", [])

        # Check if optimization already exists
        optimization_exists = any(o["optimize_method_name"] == optimize_method_name for o in existing_optimizations)
        if not optimization_exists:
            # Append new optimization
            project_data["optimizations"].append(meta)
        else:
            # Update existing optimization
            for idx, optimization in enumerate(existing_optimizations):
                if optimization["optimize_method_name"] == optimize_method_name:
                    project_data["optimizations"][idx] = meta
                    break

        # Save updated project.json
        with open(project_json_path, 'w') as f:
            json.dump(project_data, f, indent=4)

        print(f"Optimization '{optimize_method_name}' saved successfully.")

        return jsonify({"message": "Optimization saved successfully"})
    except Exception as e:
        print(f"Error in save_optimization: {e}")
        return jsonify({"error": str(e)})

# List all optimizations for the current user
@optimizations.route('/list', methods=['POST'])
@session_required
def list_optimizations():
    try:
        project_name = request.json.get("project_name")
        if not project_name:
            raise ValueError("Project name is missing.")

        project_json_path = f'./workspace/{session["user"]}/{project_name}/project.json'

        # Load optimization information from project.json
        if os.path.exists(project_json_path):
            with open(project_json_path, 'r') as f:
                project_data = json.load(f)
                optimizations = project_data.get("optimizations", [])
        else:
            optimizations = []

        print(f"Loaded optimizations: {optimizations}")

        # Return the optimization metadata
        return jsonify({"optimizations": optimizations})
    except Exception as e:
        print(f"Error in list_optimizations: {e}")
        return jsonify({"error": str(e)})

# Delete a specific optimization
@optimizations.route('/delete', methods=['POST'])
@session_required
def delete_optimization():
    try:
        optimize_method_name = request.json['optimize_method_name']
        project_name = request.json.get("project_name")
        if not project_name:
            raise ValueError("Project name is missing.")

        user_path = f'./workspace/{session["user"]}/{project_name}/optimizations/{optimize_method_name}'

        # Remove the optimization directory
        if os.path.exists(user_path):
            shutil.rmtree(user_path)
            print(f"Deleted optimization directory: {user_path}")
        else:
            print(f"Optimization directory does not exist: {user_path}")

        # Update project.json
        project_json_path = f'./workspace/{session["user"]}/{project_name}/project.json'
        if os.path.exists(project_json_path):
            with open(project_json_path, 'r') as f:
                project_data = json.load(f)

            project_data["optimizations"] = [o for o in project_data.get("optimizations", []) if o["optimize_method_name"] != optimize_method_name]

            with open(project_json_path, 'w') as f:
                json.dump(project_data, f, indent=4)
            print(f"Updated project.json after deleting optimization '{optimize_method_name}'")
        else:
            print(f"project.json does not exist at: {project_json_path}")

        return jsonify({"message": f"Optimization '{optimize_method_name}' deleted successfully"})
    except Exception as e:
        print(f"Error in delete_optimization: {e}")
        return jsonify({"error": str(e)})
