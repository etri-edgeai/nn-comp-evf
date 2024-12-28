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

@deploy_bp.route('/transfer', methods=['GET', 'POST'])
def deploy_transfer():
    """
    Two possible flows:
    1) GET /deploy/transfer?method=download&file=... => triggers direct download
    2) POST /deploy/transfer (JSON or form-data):
       {
         "method": "scp" or "ftp",
         "file": "/abs/path/to/file",
         "host": "...",
         "port": 22,
         "username": "...",
         "password": "...",
         "remote_path": "..."
       }
    """
    if 'user' not in session:
        return abort(401, description="Unauthorized")

    user = session['user']

    if request.method == 'GET':
        # Expecting ?method=download & file=
        method = request.args.get("method")
        file_path = request.args.get("file")
        if method != "download":
            return abort(400, description="GET only supports method=download")
        if not file_path or not os.path.exists(file_path):
            return abort(404, description="File not found for download.")
        return send_file(file_path, as_attachment=True)

    else:  # POST
        data = request.get_json() or {}
        method = data.get("method")
        file_path = data.get("file")

        if not method or not file_path:
            return jsonify({"error": "Missing 'method' or 'file' in request."}), 400
        if not os.path.exists(file_path):
            return jsonify({"error": f"File not found: {file_path}"}), 404

        # For safety, ensure file_path is within user's workspace
        # safe_base = os.path.abspath(os.path.join('workspace', user))
        # safe_target = os.path.abspath(file_path)
        # if not safe_target.startswith(safe_base):
        #    return jsonify({"error": "File path outside workspace."}), 403

        if method == "scp":
            return scp_file(data)
        elif method == "ftp":
            return ftp_file(data)
        else:
            return jsonify({"error": f"Unsupported method: {method}"}), 400

def scp_file(payload):
    """
    Uses paramiko to SFTP upload a file. Expects:
    {
      "file": "/local/path",
      "host": "...",
      "port": 22,
      "username": "...",
      "password": "...",
      "remote_path": "/destination/path/filename"
    }
    """
    file_path   = payload["file"]
    host        = payload.get("host", "localhost")
    port        = int(payload.get("port", 22))
    username    = payload.get("username", "")
    password    = payload.get("password", "")
    remote_path = payload.get("remote_path", "/tmp/deployed_model.pth")

    transport = paramiko.Transport((host, port))
    try:
        transport.connect(username=username, password=password)
        sftp = paramiko.SFTPClient.from_transport(transport)
        sftp.put(file_path, remote_path)
    finally:
        transport.close()

    return jsonify({"message": f"SCP to {host}:{remote_path} succeeded."})

def ftp_file(payload):
    """
    Uses Python's ftplib to upload a file. Expects:
    {
      "file": "/local/path",
      "host": "...",
      "port": 21,
      "username": "...",
      "password": "...",
      "remote_path": "filename or subdir/filename"
    }
    """
    file_path   = payload["file"]
    host        = payload.get("host", "localhost")
    port        = int(payload.get("port", 21))
    username    = payload.get("username", "")
    password    = payload.get("password", "")
    remote_path = payload.get("remote_path", None)  # e.g. "some_subdir/model.pth"

    # We'll parse out subdir if present
    # e.g. remote_path="some_subdir/model.pth"
    # Then subdir="some_subdir", filename="model.pth"
    # For simplicity, if there's a slash, we try to cd into that subdir
    ftp_filename = os.path.basename(remote_path) if remote_path else os.path.basename(file_path)
    ftp_subdir = os.path.dirname(remote_path) if remote_path else ""

    with FTP() as ftp:
        ftp.connect(host=host, port=port, timeout=30)
        ftp.login(user=username, passwd=password)
        if ftp_subdir:
            try:
                ftp.cwd(ftp_subdir)
            except:
                # create directory if needed (optional)
                ftp.mkd(ftp_subdir)
                ftp.cwd(ftp_subdir)

        with open(file_path, 'rb') as f:
            ftp.storbinary(f"STOR {ftp_filename}", f)

    return jsonify({"message": f"FTP to {host}:{remote_path or ftp_filename} succeeded."})

