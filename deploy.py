import os
import json
import paramiko        # pip install paramiko
from ftplib import FTP
from flask import Blueprint, request, session, send_file, jsonify, abort, render_template
from auth import session_required  # or your own session auth

# Initialize Blueprint
deploy_bp = Blueprint('deploy', __name__)

