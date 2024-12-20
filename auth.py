import json
import os
import shutil

from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
import functools

auth = Blueprint('auth', __name__)

db_users = {}

path = "edgeai/users/users.json"
if os.path.exists(path):
    with open(path, 'r') as f:
        db_users = json.load(f)


def login_required(func):
    @functools.wraps(func)
    def check_session(*args, **kwargs):
        if "user" not in session:
            return render_template('sign-in.html')
        return func(*args, **kwargs)

    return check_session


def session_required(func):
    @functools.wraps(func)
    def check_session(*args, **kwargs):
        if "user" not in session:
            msg = {
                'err': "no session",
                'res': {}
            }
            return jsonify(msg)
        return func(*args, **kwargs)

    return check_session

@auth.route('/signin', methods=['GET'])
def signin_form():
    # Render the sign-in page
    return render_template('sign-in.html')

@auth.route('/signin', methods=['POST'])
def signin():
    # Handle sign-in logic
    user = request.form.get('user')
    password = request.form.get('password')

    # Logic for authentication
    if user in db_users and db_users[user] == password:
        session['user'] = user
        return redirect(url_for('root'))
    else:
        flash('Invalid username or password')
        return render_template('sign-in.html', user=user)


@auth.route('/signup')
def signup():
    if "user" in session:
        return redirect(url_for('root'))

    return render_template('sign-up.html')


@auth.route('/signup', methods=['POST'])
def signup_post():
    # code to validate and add user to database goes here
    user = request.form.get('user')
    password1 = request.form.get('password1')
    password2 = request.form.get('password2')

    # 이미 등록된 사용자 => 사용자 등록 다시 시도
    # json: error message => retry signup
    if user in db_users:
        flash('user already exists')
        return render_template('sign-up.html', user=user)

    if password1 != password2:
        flash('passwords do not match')
        return render_template('sign-up.html', user=user)

    # 사용자 생성
    # password hash (+salt, ...)
    pwhash = password1

    # add the new user to the database
    db_users[user] = pwhash

    # 로그인 처리
    session['user'] = user

    with open(path, 'w') as f:
        f.write(json.dumps(db_users, indent=4))

    # create default project directory
    shutil.copytree('./edgeai/template/project', f'./edgeai/users/{user}/default')

    return redirect(url_for('root'))


@auth.route('/logout', methods=['POST'])
@login_required
def logout():
    try:
        session.pop('user', None)  # Remove user from session
        return jsonify({'err': None, 'res': {'redirect_url': url_for('auth.signin')}})
    except Exception as e:
        return jsonify({'err': str(e), 'res': {}})
