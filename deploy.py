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


