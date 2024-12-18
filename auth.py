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


@auth.route('/signin', methods=['POST'])
def signin():
    try:
        user = request.form.get('user')
        password = request.form.get('password')

        if user not in db_users:
            flash('user not found')
            return render_template('sign-in.html', user=user)

        if db_users[user] != password:
            flash('password is wrong')
            return render_template('sign-in.html', user=user)

        session['user'] = user

    except Exception as e:
        flash(e)

    return redirect(url_for('root'))


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
    msg = {
        'err': None,
        'res': {}
    }

    try:
        session.pop('user', None)
        # session.clear()

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)
