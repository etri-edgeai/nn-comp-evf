import os
import json
import paramiko        # pip install paramiko
from ftplib import FTP
from flask import Blueprint, request, session, send_file, jsonify, abort, render_template
from auth import session_required  # or your own session auth

# Initialize Blueprint
deploy_bp = Blueprint('deploy', __name__)

@deploy_bp.route('/', methods=['GET'])
def show_deploy():
    """
    Renders the Deploy page at /deploy/.
    """
    # In your real code, use @session_required or similar if you have auth
    if 'user' not in session:
        return abort(401, description="Unauthorized - user not in session")
    return render_template('deploy.html')

@deploy_bp.route('/list_run_files', methods=['GET'])
def list_run_files():
    """
    Returns a JSON directory tree for the run.
    GET /deploy/list_run_files?project_name=...&run_name=...
    """
    if 'user' not in session:
        return abort(401, description="Unauthorized")

    user = session['user']
    project_name = request.args.get('project_name')
    run_name = request.args.get('run_name')
    if not project_name or not run_name:
        return jsonify({"error": "Missing project_name or run_name"}), 400

    base_dir = os.path.join('workspace', user, project_name, 'runs', run_name)
    if not os.path.exists(base_dir):
        return jsonify({"error": f"Run directory not found: {base_dir}"}), 404

    def get_directory_tree(folder_path):
        tree = {
            "name": os.path.basename(folder_path),
            "path": folder_path,
            "type": "directory",
            "children": []
        }
        try:
            for entry in os.scandir(folder_path):
                if entry.is_dir():
                    tree["children"].append(get_directory_tree(entry.path))
                else:
                    tree["children"].append({
                        "name": entry.name,
                        "path": entry.path,
                        "type": "file"
                    })
        except PermissionError:
            pass
        return tree

    tree_data = get_directory_tree(base_dir)
    return jsonify({"tree": tree_data}), 200
