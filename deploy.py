from flask import Blueprint, jsonify, request, session, render_template
import os
import paramiko
from ftplib import FTP
from auth import session_required

# Initialize Blueprint
deploy_bp = Blueprint('deploy', __name__)

@deploy_bp.route('/')
@session_required
def root():
    return render_template('deploy.html')

# Directory for storing runs (replace with actual path)
RUNS_DIRECTORY = "./runs"

@deploy_bp.route('/runs', methods=['GET'])
def list_runs():
    try:
        runs = os.listdir(RUNS_DIRECTORY)
        runs_info = [{"name": run, "id": run} for run in runs]
        return jsonify(runs_info)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@deploy_bp.route('/run/<run_id>/directory', methods=['GET'])
def get_run_directory(run_id):
    try:
        run_path = os.path.join(RUNS_DIRECTORY, run_id)
        if not os.path.exists(run_path):
            return jsonify({"error": "Run not found"}), 404

        def build_tree(path):
            tree = {}
            for entry in os.listdir(path):
                full_path = os.path.join(path, entry)
                if os.path.isdir(full_path):
                    tree[entry] = build_tree(full_path)
                else:
                    tree[entry] = full_path
            return tree

        directory_tree = build_tree(run_path)
        return jsonify(directory_tree)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@deploy_bp.route('/', methods=['POST'])
def deploy_checkpoint():
    try:
        data = request.json
        method = data.get('method')
        file_path = data.get('file')

        if not file_path or not os.path.exists(file_path):
            return jsonify({"error": "Invalid file path"}), 400

        if method == 'ftp':
            server = data.get('server')
            username = data.get('username')
            password = data.get('password')
            remote_path = data.get('path')

            if not all([server, username, password, remote_path]):
                return jsonify({"error": "Missing FTP configuration"}), 400

            return ftp_deploy(server, username, password, file_path, remote_path)

        elif method == 'ssh':
            host = data.get('host')
            username = data.get('username')
            password = data.get('password')
            remote_path = data.get('path')

            if not all([host, username, password, remote_path]):
                return jsonify({"error": "Missing SSH configuration"}), 400

            return ssh_deploy(host, username, password, file_path, remote_path)

        elif method == 'download':
            return jsonify({"success": True, "download_link": file_path})

        else:
            return jsonify({"error": "Unsupported deployment method"}), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 500

def ftp_deploy(server, username, password, file_path, remote_path):
    try:
        with FTP(server) as ftp:
            ftp.login(user=username, passwd=password)
            with open(file_path, 'rb') as f:
                ftp.storbinary(f'STOR {remote_path}', f)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": f"FTP deployment failed: {str(e)}"}), 500

def ssh_deploy(host, username, password, file_path, remote_path):
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(host, username=username, password=password)
        
        sftp = ssh.open_sftp()
        sftp.put(file_path, remote_path)
        sftp.close()
        ssh.close()
        
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": f"SSH deployment failed: {str(e)}"}), 500