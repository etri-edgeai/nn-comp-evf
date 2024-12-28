"""
Module: dashboard.py
Description:
This module handles the dashboard functionalities of a Flask-based application.
It provides routes to display system performance metrics such as CPU usage, memory usage, 
and GPU utilization.

Dependencies:
- Flask: For web route management.
- psutil: For CPU and memory usage statistics.
- GPUtil: For GPU utilization data.
- os, shutil: For file and directory operations.
- auth: For user authentication decorators.

Author: Junyong Park
"""


import os
import shutil
import psutil
import GPUtil

from flask import Blueprint, render_template, jsonify, request, session
from auth import login_required

# Create a Flask Blueprint for dashboard routes
dashboard = Blueprint('dashboard', __name__)

@dashboard.route('/')
@login_required  # Ensure only logged-in users can access this route
def root():
    """
    Render the dashboard page with system performance metrics.

    Returns:
        Rendered HTML template with CPU, memory, and GPU data.
    """
    # Get CPU usage percentage
    cpu = psutil.cpu_percent()

    # Get CPU memory usage percentage
    cpu_mem = psutil.virtual_memory()[2]

    # Get GPU usage and memory utilization for all available GPUs
    gpus = [[g.load, "%.4f" % (100 * g.memoryUsed / g.memoryTotal)] for g in GPUtil.getGPUs()]
    num_gpus = len(gpus)

    # Render the dashboard template with system metrics
    return render_template('dashboard.html', cpu=cpu, cpu_mem=cpu_mem, gpus=gpus, num_gpus=num_gpus)
