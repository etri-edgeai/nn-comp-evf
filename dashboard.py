import os
import shutil
import psutil
import GPUtil

from flask import Blueprint, render_template, send_from_directory, jsonify, request, session
from auth import login_required, session_required
import re

dashboard = Blueprint('dashboard', __name__)


@dashboard.route('/')
@login_required
def root():
    cpu = psutil.cpu_percent()
    cpu_mem = psutil.virtual_memory()[2]
    gpus = [ [g.load, "%.4f" % (100*g.memoryUsed/g.memoryTotal)] for g in GPUtil.getGPUs() ]
    num_gpus = len(gpus)
    return render_template('dashboard.html', cpu=cpu, cpu_mem=cpu_mem, gpus=gpus, num_gpus=num_gpus)
