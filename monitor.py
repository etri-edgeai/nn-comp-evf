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
import subprocess
from flask import Blueprint, jsonify, request, session, render_template
from threading import Lock
from auth import session_required

# Initialize Blueprint for monitoring routes
monitor_bp = Blueprint('monitor', __name__)

# Dictionary to track active TensorBoard processes
tensorboard_processes = {}
process_lock = Lock()

def start_tensorboard(user, project_name):
    """
    Start TensorBoard for the given user and project.

    Args:
        user (str): The username.
        project_name (str): The project name.

    Returns:
        dict: Status message and port information, or error details.
    """
    with process_lock:
        if project_name in tensorboard_processes:
            return {"message": "TensorBoard already running", "port": 6006}

        logdir = os.path.join('workspace', user, project_name, 'runs')
        try:
            process = subprocess.Popen(
                ['tensorboard', '--logdir', logdir, '--port', '6006', '--host', '0.0.0.0'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            tensorboard_processes[project_name] = process
            return {"message": "TensorBoard started", "port": 6006}
        except Exception as e:
            return {"error": f"Failed to start TensorBoard: {str(e)}"}

def stop_tensorboard(project_name):
    """
    Stop TensorBoard for the given project.

    Args:
        project_name (str): The project name.

    Returns:
        dict: Status message indicating success or that TensorBoard is not running.
    """
    with process_lock:
        if project_name in tensorboard_processes:
            process = tensorboard_processes.pop(project_name)
            process.terminate()
            return {"message": "TensorBoard stopped"}
        return {"message": "TensorBoard is not running"}

@monitor_bp.route('/')
@session_required
def monitor_page():
    """
    Render the monitoring page.
    """
    return render_template('monitor.html')

@monitor_bp.route('/start', methods=['POST'])
@session_required
def start_monitoring():
    """
    Start TensorBoard for the current user and project.

    Returns:
        JSON: Success message and port information, or error details.
    """
    user = session.get('user')
    project_name = session.get('project')

    if not user or not project_name:
        return jsonify({"error": "User or project not set in session"}), 400

    response = start_tensorboard(user, project_name)
    if "error" in response:
        return jsonify({"error": response["error"]}), 500
    return jsonify({"message": response["message"], "port": response["port"]}), 200

@monitor_bp.route('/stop', methods=['POST'])
@session_required
def stop_monitoring():
    """
    Stop TensorBoard for the current project.

    Returns:
        JSON: Status message indicating success or that TensorBoard is not running.
    """
    project_name = session.get('project')
    if not project_name:
        return jsonify({"error": "Project not set in session"}), 400

    response = stop_tensorboard(project_name)
    return jsonify({"message": response["message"]})

@monitor_bp.route('/status', methods=['GET'])
@session_required
def tensorboard_status():
    """
    Check if TensorBoard is running for the current project.

    Returns:
        JSON: Status message indicating if TensorBoard is running or stopped.
    """
    project_name = session.get('project')
    if not project_name:
        return jsonify({"error": "Project not set in session"}), 400

    if project_name in tensorboard_processes:
        return jsonify({"status": "running", "port": 6006})
    return jsonify({"status": "stopped"})
