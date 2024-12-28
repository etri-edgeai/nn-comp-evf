"""
Module: project.py
Description:
This module provides API routes for managing user projects in a Flask-based application. It includes functionality for creating, deleting, updating, and retrieving projects, as well as managing project metadata stored in `project.json`.

Features:
- Create a new project with a predefined structure.
- List all projects for a user.
- Retrieve and update `project.json` for a project.
- Set and get the current active project in the user session.
- Delete projects and their associated data.

Dependencies:
- Flask: For handling HTTP requests and responses.
- OS/Shutil: For file system operations.
- JSON: For reading and writing project metadata.
- Regex: For validating project names.

Author: Junyong Park
"""

import os
import shutil
import re
import json
from flask import Blueprint, jsonify, request, session
from auth import session_required

# Define Blueprint
project = Blueprint('project', __name__)

# Regex pattern for valid project names (alphanumeric, underscore, or hyphen)
VALID_PROJECT_NAME_PATTERN = r"^[A-Za-z0-9_-]+$"

@project.route('/create', methods=['POST'])
@session_required
def create_project():
    try:
        project_name = request.json.get('project_name')
        user_name = session.get('user')

        # Validate project name
        if not project_name:
            return jsonify({'err': 'Project name is required', 'res': {}})
            
        if not re.match(r'^[a-zA-Z0-9_-]+$', project_name):
            return jsonify({'err': 'Invalid project name. Use only letters, numbers, hyphens, and underscores.', 'res': {}})

        # Ensure user workspace exists
        user_workspace = os.path.join('./workspace', user_name)
        os.makedirs(user_workspace, exist_ok=True)

        project_directory = os.path.join(user_workspace, project_name)

        # Check if project already exists
        if os.path.exists(project_directory):
            return jsonify({'err': 'Project already exists.', 'res': {}})

        try:
            # Create project directory
            os.makedirs(project_directory)
            
            # Create project structure
            directories = ['models', 'datasets', 'runs', 'optimizations']
            for dir_name in directories:
                os.makedirs(os.path.join(project_directory, dir_name))

            # Create initial project.json with project and user info
            project_json = {
                "project_name": project_name,
                "user_name": user_name,
                "datasets": [],
                "models": [],
                "runs": [],
                "optimizations": []
            }

            json_path = os.path.join(project_directory, 'project.json')
            with open(json_path, 'w') as f:
                json.dump(project_json, f, indent=4)

            # Update session with current project
            session['project'] = project_name

            return jsonify({
                'err': None, 
                'res': {
                    'message': 'Project created successfully',
                    'project_name': project_name,
                    'project_path': project_directory
                }
            })

        except OSError as e:
            # Clean up if directory creation fails
            if os.path.exists(project_directory):
                shutil.rmtree(project_directory)
            raise Exception(f"Failed to create project structure: {str(e)}")

    except Exception as e:
        print(f"Error creating project: {str(e)}")  # Server-side logging
        return jsonify({
            'err': f'Error creating project: {str(e)}', 
            'res': {}
        }), 500


@project.route('/json', methods=['GET'])
@session_required
def get_project_json():
    try:
        project_name = session.get('project', None)
        if not project_name:
            return jsonify({'err': "No project selected.", 'res': {}})

        project_json_path = f'./workspace/{session["user"]}/{project_name}/project.json'

        if not os.path.exists(project_json_path):
            return jsonify({'err': "project.json not found.", 'res': {}})

        with open(project_json_path, 'r') as f:
            project_data = json.load(f)

        return jsonify({'err': None, 'res': project_data})
    except Exception as e:
        return jsonify({'err': f"Error reading project.json: {str(e)}", 'res': {}})

# Update project.json
@project.route('/update_project_json', methods=['POST'])
@session_required
def update_project_json():
    msg = {'err': None, 'res': {}}
    try:
        action = request.json.get('action')
        key = request.json.get('key')
        value = request.json.get('value')
        project_name = request.json.get('project_name')

        if not project_name:
            raise ValueError("Project name is required.")

        project_json_path = f'./workspace/{session["user"]}/{project_name}/project.json'

        # Load existing project.json
        with open(project_json_path, 'r') as f:
            project_data = json.load(f)

        # Perform the requested action
        if action == 'add':
            if key in project_data and value not in project_data[key]:
                project_data[key].append(value)
        elif action == 'remove':
            if key in project_data:
                project_data[key] = [item for item in project_data[key] if item != value]
        else:
            raise ValueError("Invalid action specified.")

        # Save updated project.json
        with open(project_json_path, 'w') as f:
            json.dump(project_data, f, indent=4)

        msg['res'] = "project.json updated successfully."

    except Exception as e:
        msg['err'] = f"Error updating project.json: {str(e)}"

    return jsonify(msg)

# List all projects for the user
@project.route('/list', methods=['POST'])
@session_required
def list_projects():
    msg = {'err': None, 'res': {}}
    try:
        user_workspace = f'./workspace/{session["user"]}'
        projects = sorted(os.listdir(user_workspace)) if os.path.exists(user_workspace) else []
        msg['res'] = {"projects": projects}
    except Exception as e:
        msg['err'] = f"Error listing projects: {str(e)}"
    return jsonify(msg)

# Set the current project
@project.route('/current_project', methods=['POST'])
@session_required
def set_current_project():
    msg = {'err': None, 'res': {}}
    try:
        project_name = request.json.get('project')
        if not project_name:
            msg['err'] = "Project name is required."
        else:
            session['project'] = project_name
            msg['res'] = f"Current project set to '{project_name}'."
    except Exception as e:
        msg['err'] = f"Error setting current project: {str(e)}"
    return jsonify(msg)

# Get the current project
@project.route('/current_project', methods=['GET'])
@session_required
def get_current_project():
    try:
        project_name = session.get('project', None)
        print(f"session: {session}")
        if not project_name:
            print("No current project selected.")
            return jsonify({'err': "No current project selected.", 'res': {}}), 404
        return jsonify({'err': None, 'res': {'project_name': project_name}})
    except Exception as e:
        return jsonify({'err': f"Error retrieving current project: {str(e)}", 'res': {}}), 500


# Delete a project
@project.route('/delete', methods=['POST'])
@session_required
def delete_project():
    msg = {'err': None, 'res': {}}
    try:
        project_name = request.json.get('project_name')
        if not project_name:
            msg['err'] = "Project name is required."
            return jsonify(msg)

        project_directory = f'./workspace/{session["user"]}/{project_name}'
        if not os.path.exists(project_directory):
            msg['err'] = "Project does not exist."
            return jsonify(msg)

        shutil.rmtree(project_directory)
        msg['res'] = f"Project '{project_name}' deleted successfully."

    except Exception as e:
        msg['err'] = f"Error deleting project: {str(e)}"

    return jsonify(msg)

