"""
AI Model Training & Deployment Web Application

This application provides a web interface for managing AI model training pipelines,
including dataset management, model training, optimization, and deployment.

Key Features:
    - Authentication and user management
    - Project management
    - Dataset handling
    - Model training and management
    - Model optimization
    - Experiment tracking
    - Model deployment
    - System monitoring
    - Dashboard visualization

Dependencies:
    - Flask: Web framework for the application
    - PyTorch Lightning: For deep learning model training
    - TensorBoard: For training visualization
    - PyYAML: For configuration management
"""

import os
import importlib
import yaml
import time
import logging
import pytorch_lightning as pl
from torch.utils.data import DataLoader
from pytorch_lightning.loggers import TensorBoardLogger
from pytorch_lightning.strategies import DDPStrategy
from flask import Flask, session, render_template, request, redirect, url_for, send_from_directory
from auth import auth, login_required
from project import project
from dashboard import dashboard
# from tasks import tasks
from models import models
from runs import runs
from datasets import dataset
from optimize import optimizations
from monitor import monitor_bp
from deploy import deploy_bp

# Initialize Flask application
app = Flask(__name__, static_url_path='/static')

# Register blueprints for different modules
app.register_blueprint(auth, url_prefix='/auth')  # Authentication routes
app.register_blueprint(project, url_prefix='/project')  # Project management
app.register_blueprint(dataset, url_prefix='/datasets')  # Dataset management
app.register_blueprint(models, url_prefix='/models')  # Model management
app.register_blueprint(optimizations, url_prefix='/optimizations')  # Model optimization
app.register_blueprint(runs, url_prefix='/runs')  # Experiment tracking
app.register_blueprint(monitor_bp, url_prefix='/monitor')  # System monitoring
app.register_blueprint(dashboard, url_prefix='/dashboard')  # Dashboard visualization
app.register_blueprint(deploy_bp, url_prefix='/deploy')  # Model deployment

# Application configuration
app.secret_key = 'SECRET_KEY_!!!'
app.config['SECRET_KEY'] = app.secret_key  # for debugging tool

@app.route('/')
@login_required
def root():
    """Root endpoint that redirects to dashboard.
    
    Returns:
        redirect: Redirects to the dashboard root page
    """
    return redirect(url_for('dashboard.root'))

@app.route('/<path:path>')
def static_proxy(path):
    """Serve static files.
    
    Args:
        path (str): Path to the static file
        
    Returns:
        file: The requested static file
    """
    return app.send_static_file(path)

@app.route('/favicon.ico')
def favicon():
    """Serve favicon.ico file.
    
    Returns:
        file: The favicon.ico file
        str: Empty string with 204 status if favicon not found
    """
    try:
        return send_from_directory(
            os.path.join(app.root_path, 'static', 'images'),
            'favicon.ico',
            mimetype='image/vnd.microsoft.icon'
        )
    except Exception as e:
        app.logger.error(f"Error serving favicon: {str(e)}")
        return '', 204

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)