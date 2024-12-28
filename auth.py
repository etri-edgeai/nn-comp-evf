"""
Module: auth.py
Description:
This module implements the authentication system for a Flask-based application.
It provides routes for user sign-in, sign-up, and logout functionality, as well as decorators to 
enforce login requirements. User data is stored in a JSON file and managed through session cookies.

Dependencies:
- Flask: For creating web routes and managing HTTP requests/responses.
- os, shutil, json: For file and directory operations.
- functools: To create reusable decorators.

Author: Junyong Park
"""

import json
import os
import shutil

from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
import functools

# Create a Flask Blueprint for authentication routes
auth = Blueprint('auth', __name__)

# Initialize an empty dictionary to store user data
db_users = {}

# Path to the JSON file where user data is stored
path = "edgeai/users/users.json"
if os.path.exists(path):
    # Load user data from the JSON file if it exists
    with open(path, 'r') as f:
        db_users = json.load(f)

# Decorator to enforce login requirements for routes
def login_required(func):
    @functools.wraps(func)
    def check_session(*args, **kwargs):
        # Check if a user is logged in (exists in the session)
        if "user" not in session:
            # Redirect to the sign-in page if no user is logged in
            return render_template('sign-in.html')
        return func(*args, **kwargs)
    return check_session

# Decorator to enforce session requirements for API routes
def session_required(func):
    @functools.wraps(func)
    def check_session(*args, **kwargs):
        # Check if a user session exists
        if "user" not in session:
            # Return an error message in JSON format if no session exists
            msg = {
                'err': "no session",
                'res': {}
            }
            return jsonify(msg)
        return func(*args, **kwargs)
    return check_session

# Route to render the sign-in form
@auth.route('/signin', methods=['GET'])
def signin_form():
    return render_template('sign-in.html')

# Route to handle user sign-in
@auth.route('/signin', methods=['POST'])
def signin():
    user = request.form.get('user')
    password = request.form.get('password')

    # Authenticate the user
    if user in db_users and db_users[user] == password:
        session['user'] = user
        return redirect(url_for('root'))
    else:
        flash('Invalid username or password')
        return render_template('sign-in.html', user=user)

# Route to render the sign-up form
@auth.route('/signup')
def signup():
    if "user" in session:
        return redirect(url_for('root'))
    return render_template('sign-up.html')

# Route to handle user sign-up
@auth.route('/signup', methods=['POST'])
def signup_post():
    user = request.form.get('user')
    password1 = request.form.get('password1')
    password2 = request.form.get('password2')

    # Check if the user already exists
    if user in db_users:
        flash('User already exists')
        return render_template('sign-up.html', user=user)

    # Check if passwords match
    if password1 != password2:
        flash('Passwords do not match')
        return render_template('sign-up.html', user=user)

    # Save the user's password (basic password storage)
    pwhash = password1
    db_users[user] = pwhash

    # Save the user data to the JSON file
    with open(path, 'w') as f:
        f.write(json.dumps(db_users, indent=4))

    # Create a default project directory for the user
    shutil.copytree('./edgeai/template/project', f'./edgeai/users/{user}/default')

    # Log in the new user
    session['user'] = user

    return redirect(url_for('root'))

# Route to handle user logout
@auth.route('/logout', methods=['POST'])
@login_required
def logout():
    try:
        # Remove the user from the session
        session.pop('user', None)
        return jsonify({'err': None, 'res': {'redirect_url': url_for('auth.signin')}})
    except Exception as e:
        return jsonify({'err': str(e), 'res': {}})
