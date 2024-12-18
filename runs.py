import os
import json
import shutil
import subprocess
import time
import yaml
import torch
from threading import Lock
from flask import Blueprint, jsonify, request, session, render_template, send_from_directory
from auth import session_required

runs = Blueprint('runs', __name__, url_prefix='/runs')

class GPUManager:
    def __init__(self):
        self.lock = Lock()
        self.gpu_status = {i: False for i in range(torch.cuda.device_count())}

    def allocate_gpus(self, num_gpus=1):
        with self.lock:
            available = [gpu_id for gpu_id, in_use in self.gpu_status.items() if not in_use]
            if len(available) >= num_gpus:
                allocated = available[:num_gpus]
                for gpu_id in allocated:
                    self.gpu_status[gpu_id] = True
                return allocated
            return None

    def release_gpus(self, gpu_ids):
        with self.lock:
            for gpu_id in gpu_ids:
                if gpu_id in self.gpu_status:
                    self.gpu_status[gpu_id] = False

gpu_manager = GPUManager()

def update_project_json(user, project_name, run_metadata):
    workspace_dir = os.path.join('workspace', user, project_name)
    project_json_path = os.path.join(workspace_dir, 'project.json')
    
    project_data = {"runs": []}
    if os.path.exists(project_json_path):
        with open(project_json_path, 'r') as f:
            project_data = json.load(f)

    project_data["runs"].append(run_metadata)
    with open(project_json_path, 'w') as f:
        json.dump(project_data, f, indent=4)

@runs.route('/get_file', methods=['GET'])
@session_required
def get_file():
    try:
        project_name = request.args.get("project_name")
        run_name = request.args.get("run_name")
        file = request.args.get("file")

        if not project_name or not run_name or not file:
            return jsonify({"error": "Missing parameters."}), 400

        if file not in ['engine.py', 'config.yaml']:
            return jsonify({"error": "Invalid file requested."}), 400

        user = session["user"]
        file_path = os.path.join('workspace', user, project_name, 'runs', run_name, file)

        if not os.path.exists(file_path):
            return jsonify({"error": f"File '{file}' not found for run '{run_name}'."}), 404

        with open(file_path, 'r') as f:
            content = f.read()

        return jsonify({"content": content}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@runs.route('/')
@session_required
def root():
    gpu_count = torch.cuda.device_count()
    return render_template('runs.html', gpu_count=gpu_count)

@runs.route('/get_template', methods=['GET'])
@session_required
def get_template():
    try:
        file = request.args.get('file')
        if file not in ['import.txt', 'engine.txt']:
            return jsonify({"error": "Invalid template file requested."}), 400

        template_dir = os.path.join('edgeai', 'template', 'project', 'runs')
        file_path = os.path.join(template_dir, file)

        if not os.path.exists(file_path):
            return jsonify({"error": f"Template file '{file}' not found."}), 404

        return send_from_directory(template_dir, file)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@runs.route('/create', methods=['POST'])
@session_required
def create_run():
    try:
        data = request.get_json()
        user = session["user"]
        project_name = data["project_name"]
        run_name = data['run_name']
        model_name = data['model_name']
        dataset_name = data['dataset_name']
        optimization_name = data.get('optimization_name', '')
        misc = data.get('misc', {})
        engine_py_content = data['engine_py']
        config_yaml_content = data.get('config_yaml', '')
        num_gpus = data.get('num_gpus', 1)

        workspace_dir = os.path.join('workspace', user, project_name)
        runs_dir = os.path.join(workspace_dir, 'runs', run_name)

        if os.path.exists(runs_dir):
            return jsonify({"error": f"Run '{run_name}' already exists."}), 400

        os.makedirs(runs_dir, exist_ok=True)
        os.makedirs(os.path.join(runs_dir, 'logs'), exist_ok=True)

        for src, dst in [
            (os.path.join(workspace_dir, 'models', model_name), os.path.join(runs_dir, 'model', model_name)),
            (os.path.join(workspace_dir, 'datasets', dataset_name), os.path.join(runs_dir, 'dataset', dataset_name)),
            (os.path.join(workspace_dir, 'optimizations', optimization_name), os.path.join(runs_dir, 'optimization', optimization_name))
        ]:
            if os.path.exists(src):
                shutil.copytree(src, dst)
                open(os.path.join(os.path.dirname(dst), '__init__.py'), 'w').close()

        with open(os.path.join(runs_dir, 'engine.py'), 'w') as f:
            f.write(engine_py_content)

        if config_yaml_content.strip():
            with open(os.path.join(runs_dir, 'config.yaml'), 'w') as f:
                f.write(config_yaml_content)

        run_metadata = {
            "run_name": run_name,
            "created_date": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "model_name": model_name,
            "dataset_name": dataset_name,
            "optimization_name": optimization_name,
            "status": "Not Running",
            "gpu_ids": [],
            "pid": None,
            "num_gpus": num_gpus
        }

        update_project_json(user, project_name, run_metadata)

        return jsonify({"message": "Run created successfully."}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@runs.route('/list', methods=['POST'])
@session_required
def list_runs():
    try:
        data = request.get_json()
        project_name = data.get("project_name")

        if not project_name:
            return jsonify({"error": "Project name is required."}), 400

        user = session.get("user")
        if not user:
            return jsonify({"error": "User session is not set."}), 401

        project_json_path = os.path.join('workspace', user, project_name, 'project.json')

        if not os.path.exists(project_json_path):
            return jsonify({"error": f"Project '{project_name}' not found for user '{user}'."}), 404

        with open(project_json_path, 'r') as f:
            project_data = json.load(f)

        return jsonify({"runs": project_data.get("runs", [])}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Remaining functions like start, stop, delete, logs, edit_run would follow similar modular refactoring, ensuring readability and reusability.


@runs.route('/start', methods=['POST'])
@session_required
def start_run():
    try:
        data = request.get_json()
        project_name = data.get("project_name")
        run_name = data.get("run_name")
        if not project_name or not run_name:
            raise ValueError("Project name or run name is missing.")

        user = session["user"]
        workspace_dir = os.path.join('workspace', user, project_name)
        runs_dir = os.path.join(workspace_dir, 'runs', run_name)
        log_file_path = os.path.join(runs_dir, 'logs', 'run.log')

        config_yaml_path = os.path.join(runs_dir, 'config.yaml')
        engine_py_path = os.path.join(runs_dir, 'engine.py')

        if not os.path.exists(engine_py_path):
            return jsonify({"error": f"engine.py not found for run '{run_name}'"}), 400

        # Read run metadata from project.json
        project_json_path = os.path.join(workspace_dir, 'project.json')
        if not os.path.exists(project_json_path):
            return jsonify({"error": "Project not found."}), 404

        with open(project_json_path, 'r') as f:
            project_data = json.load(f)

        run = next((r for r in project_data.get("runs", []) if r["run_name"] == run_name), None)
        if not run:
            return jsonify({"error": f"Run '{run_name}' not found."}), 404

        if run["status"] == "Running":
            return jsonify({"error": f"Run '{run_name}' is already running."}), 400

        # Check GPU availability first
        if not torch.cuda.is_available():
            return jsonify({"error": "No CUDA-capable GPUs available on this system"}), 503

        # Allocate GPUs based on run's num_gpus
        num_gpus = run.get('num_gpus', 1)
        gpu_ids = gpu_manager.allocate_gpus(num_gpus)
        if gpu_ids is None:
            available_gpus = sum(not in_use for in_use in gpu_manager.gpu_status.values())
            return jsonify({"error": f"Requested {num_gpus} GPUs, but only {available_gpus} available."}), 503

        # Set up environment variables for GPU
        env = os.environ.copy()
        gpu_list = ','.join(map(str, gpu_ids))
        env['CUDA_VISIBLE_DEVICES'] = gpu_list
        env['NVIDIA_VISIBLE_DEVICES'] = gpu_list  # For container compatibility
        
        # Log GPU allocation
        with open(log_file_path, 'a') as log_file:
            log_file.write(f"\nStarting run with GPUs: {gpu_list}\n")
            log_file.write(f"CUDA available: {torch.cuda.is_available()}\n")
            log_file.write(f"Number of GPUs allocated: {len(gpu_ids)}\n")
            for gpu_id in gpu_ids:
                if gpu_id < torch.cuda.device_count():
                    log_file.write(f"GPU {gpu_id}: {torch.cuda.get_device_name(gpu_id)}\n")

        # Update config.yaml with GPU settings if it exists
        if os.path.exists(config_yaml_path):
            with open(config_yaml_path, 'r') as f:
                config = yaml.safe_load(f)
            
            # Update GPU settings in config
            if 'training' not in config:
                config['training'] = {}
            config['training']['num_gpus'] = len(gpu_ids)
            
            with open(config_yaml_path, 'w') as f:
                yaml.dump(config, f, default_flow_style=False)

        # Start the training process
        with open(log_file_path, 'a') as log_file:
            process = subprocess.Popen(
                ['python', 'engine.py'],
                cwd=runs_dir,
                stdout=log_file,
                stderr=subprocess.STDOUT,
                env=env,
                bufsize=1,
                universal_newlines=True
            )

        # Update the run's metadata
        run["pid"] = process.pid
        run["status"] = "Running"
        run["gpu_ids"] = gpu_ids

        with open(project_json_path, 'w') as f:
            json.dump(project_data, f, indent=4)

        return jsonify({
            "message": f"Run '{run_name}' started successfully.", 
            "pid": process.pid, 
            "gpu_ids": gpu_ids
        }), 200

    except Exception as e:
        # If there was an error, make sure to release any allocated GPUs
        if 'gpu_ids' in locals():
            gpu_manager.release_gpus(gpu_ids)
        return jsonify({"error": str(e)}), 500

@runs.route('/stop', methods=['POST'])
@session_required
def stop_run():
    try:
        data = request.get_json()
        project_name = data.get("project_name")
        run_name = data.get("run_name")

        if not project_name or not run_name:
            return jsonify({"error": "Project name or run name is missing."}), 400

        user = session["user"]
        workspace_dir = os.path.join('workspace', user, project_name)
        project_json_path = os.path.join(workspace_dir, 'project.json')

        if not os.path.exists(project_json_path):
            return jsonify({"error": "Project not found."}), 404

        with open(project_json_path, 'r') as f:
            project_data = json.load(f)

        run = next((r for r in project_data.get("runs", []) if r["run_name"] == run_name), None)
        if not run:
            return jsonify({"error": f"Run '{run_name}' not found."}), 404

        pid = run.get("pid")
        gpu_ids = run.get("gpu_ids", [])

        # If no PID or run isn't in "Running" state, just return a message instead of an error
        if not pid or run["status"] != "Running":
            return jsonify({"message": f"Run '{run_name}' is not currently running."}), 200

        # If we do have a PID and it's running, attempt to kill the process
        try:
            if os.name == 'nt':
                subprocess.call(['taskkill', '/F', '/PID', str(pid)])
            else:
                # On Unix-like systems, ProcessLookupError is raised if the process does not exist
                os.kill(pid, 9)
        except ProcessLookupError:
            # The process is already gone, so just proceed as if it's stopped
            pass
        except Exception as e:
            # If it's another type of error, you can log it or handle it as you see fit
            print(f"Warning: Could not kill process {pid}: {e}")

        # Release the GPUs and update run status as before
        gpu_manager.release_gpus(gpu_ids)
        run["pid"] = None
        run["status"] = "Stopped"
        run["gpu_ids"] = []

        with open(project_json_path, 'w') as f:
            json.dump(project_data, f, indent=4)

        return jsonify({"message": f"Run '{run_name}' stopped successfully."}), 200


    except Exception as e:
        return jsonify({"error": str(e)}), 500

@runs.route('/logs', methods=['GET'])
@session_required
def logs_run():
    try:
        project_name = request.args.get("project_name")
        run_name = request.args.get("run_name")
        print(f"Fetching logs for project: {project_name}, run: {run_name}")  # Debug log

        if not project_name or not run_name:
            raise ValueError("Project name or run name is missing.")

        user = session["user"]
        runs_dir = os.path.join('workspace', user, project_name, 'runs', run_name)
        log_file_path = os.path.join(runs_dir, 'logs', 'run.log')

        print(f"Looking for log file at: {log_file_path}")  # Debug log

        if not os.path.exists(log_file_path):
            print(f"Log file not found: {log_file_path}")  # Debug log
            return jsonify({"error": f"Log file for run '{run_name}' does not exist."}), 404

        with open(log_file_path, 'r', errors='replace') as f:
            lines = [line.rstrip() for line in f.readlines()]
            print(f"Read {len(lines)} lines from log file")  # Debug log

        response = {"lines": lines}
        print(f"Sending response with {len(response['lines'])} lines")  # Debug log
        return jsonify(response), 200

    except Exception as e:
        print(f"Error in logs_run: {str(e)}")  # Debug log
        return jsonify({"error": str(e)}), 500


# Delete a run
@runs.route('/delete', methods=['POST'])
@session_required
def delete_run():
    try:
        data = request.get_json()
        project_name = data.get("project_name")
        run_name = data.get("run_name")
        if not project_name or not run_name:
            raise ValueError("Project name or run name is missing.")

        user = session["user"]
        workspace_dir = os.path.join('workspace', user, project_name)
        runs_dir = os.path.join(workspace_dir, 'runs', run_name)
        project_json_path = os.path.join(workspace_dir, 'project.json')

        # Check if run exists in project.json
        if not os.path.exists(project_json_path):
            return jsonify({"error": "Project not found."}), 404

        with open(project_json_path, 'r') as f:
            project_data = json.load(f)

        run = next((r for r in project_data.get("runs", []) if r["run_name"] == run_name), None)
        if not run:
            return jsonify({"error": f"Run '{run_name}' not found."}), 404

        # If the run is running, stop it first
        pid = run.get("pid")
        gpu_ids = run.get("gpu_ids", [])
        if pid:
            try:
                if os.name == 'nt':
                    subprocess.call(['taskkill', '/F', '/PID', str(pid)])
                else:
                    os.kill(pid, 9)
                run["pid"] = None
                run["status"] = "Stopped"
                gpu_manager.release_gpus(gpu_ids)
                run["gpu_ids"] = []
            except Exception as e:
                return jsonify({"error": f"Failed to terminate process with PID {pid}: {str(e)}"}), 500

        # Remove the run directory
        if os.path.exists(runs_dir):
            shutil.rmtree(runs_dir)

        # Remove run from project.json
        project_data["runs"] = [r for r in project_data.get("runs", []) if r["run_name"] != run_name]

        with open(project_json_path, 'w') as f:
            json.dump(project_data, f, indent=4)

        return jsonify({"message": f"Run '{run_name}' deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Edit a run
@runs.route('/edit', methods=['POST'])
@session_required
def edit_run():
    try:
        data = request.get_json()
        project_name = data.get("project_name")
        original_run_name = data.get("original_run_name")
        run_name = data.get("run_name")
        model_name = data.get("model_name")
        dataset_name = data.get("dataset_name")
        optimization_name = data.get("optimization_name")
        num_gpus = data.get("num_gpus", 1)
        misc = data.get("misc", {})
        engine_py_content = data.get("engine_py")
        config_yaml_content = data.get("config_yaml")

        if not all([project_name, original_run_name, run_name, model_name, dataset_name, optimization_name]):
            raise ValueError("Missing required fields.")

        user = session["user"]
        workspace_dir = os.path.join('workspace', user, project_name)
        runs_dir = os.path.join(workspace_dir, 'runs', original_run_name)

        if not os.path.exists(runs_dir):
            return jsonify({"error": f"Run '{original_run_name}' does not exist."}), 404

        project_json_path = os.path.join(workspace_dir, 'project.json')
        if not os.path.exists(project_json_path):
            return jsonify({"error": "Project not found."}), 404

        with open(project_json_path, 'r') as f:
            project_data = json.load(f)

        # Find the run
        run = next((r for r in project_data.get("runs", []) if r["run_name"] == original_run_name), None)
        if not run:
            return jsonify({"error": f"Run '{original_run_name}' not found."}), 404

        # If run name is changed, rename the directory
        if original_run_name != run_name:
            new_runs_dir = os.path.join(workspace_dir, 'runs', run_name)
            if os.path.exists(new_runs_dir):
                return jsonify({"error": f"Run name '{run_name}' already exists."}), 400
            os.rename(runs_dir, new_runs_dir)
            run["run_name"] = run_name
            run["engine_path"] = os.path.abspath(os.path.join(new_runs_dir, 'engine.py'))
            run["status"] = "Not Running"
            run["gpu_ids"] = []
            runs_dir = new_runs_dir  # Update runs_dir

        # Update other run details
        run["model_name"] = model_name
        run["dataset_name"] = dataset_name
        run["optimization_name"] = optimization_name
        run["num_gpus"] = num_gpus
        run["misc"] = misc

        # Save updated engine.py
        engine_py_path = os.path.join(runs_dir, 'engine.py')
        with open(engine_py_path, 'w') as f:
            f.write(engine_py_content)

        # Save updated config.yaml if provided
        if config_yaml_content:
            config_yaml_path = os.path.join(runs_dir, 'config.yaml')
            with open(config_yaml_path, 'w') as f:
                f.write(config_yaml_content)

        # If the run is running, stop it before applying changes
        if run["status"] == "Running":
            pid = run.get("pid")
            gpu_ids = run.get("gpu_ids", [])
            if pid:
                try:
                    if os.name == 'nt':
                        subprocess.call(['taskkill', '/F', '/PID', str(pid)])
                    else:
                        os.kill(pid, 9)
                    run["pid"] = None
                    run["status"] = "Stopped"
                    gpu_manager.release_gpus(gpu_ids)
                    run["gpu_ids"] = []
                except Exception as e:
                    return jsonify({"error": f"Failed to terminate process with PID {pid}: {str(e)}"}), 500

        # Save project.json
        with open(project_json_path, 'w') as f:
            json.dump(project_data, f, indent=4)

        return jsonify({"message": f"Run '{run_name}' updated successfully."}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
