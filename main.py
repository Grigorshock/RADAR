import requests
from datetime import datetime as dt
from flask import Flask, render_template, jsonify, request, redirect, url_for, flash
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from dotenv import load_dotenv
from support import support_bp
from models import db, User, FlightHistory, UserFavoriteAirport
import os

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///radar.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Пожалуйста, войдите в систему для доступа'

DELAY = 30
data = {}


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        login = request.form.get('login')
        password = request.form.get('password')

        user = User.query.filter_by(login=login).first()

        if user and user.check_password(password):
            login_user(user)
            user.last_login = dt.utcnow()
            db.session.commit()
            return redirect(url_for('index'))
        else:
            flash('Неверный логин или пароль', 'error')

    return render_template('login.html')


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        login = request.form.get('login')
        email = request.form.get('email')
        password = request.form.get('password')

        if User.query.filter_by(login=login).first():
            flash('Пользователь с таким логином уже существует', 'error')
            return render_template('register.html')

        if User.query.filter_by(email=email).first():
            flash('Пользователь с таким email уже существует', 'error')
            return render_template('register.html')

        user = User(login=login, email=email)
        user.set_password(password)

        try:
            db.session.add(user)
            db.session.commit()
            flash('Регистрация успешна! Теперь вы можете войти', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            flash(f'Ошибка регистрации: {str(e)}', 'error')

    return render_template('register.html')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Вы вышли из системы', 'info')
    return redirect(url_for('login'))


@app.route("/api/flights")
def get_plane():
    global data
    if not data or (dt.now() - data["time"]).seconds >= DELAY:
        data["time"] = dt.now()
        try:
            response = requests.get("https://opensky-network.org/api/states/all", timeout=10)
            data["planes"] = response.json()

            if current_user.is_authenticated:
                states = data["planes"].get("states", [])
                for state in states[:50]:
                    icao24 = state[0]
                    callsign = state[1]

                    existing = FlightHistory.query.filter_by(
                        user_id=current_user.id,
                        icao24=icao24
                    ).first()

                    if not existing:
                        history = FlightHistory(
                            user_id=current_user.id,
                            icao24=icao24,
                            callsign=callsign
                        )
                        db.session.add(history)
                db.session.commit()
        except Exception as e:
            print(f"Error fetching flights: {e}")
            data["planes"] = {"states": []}

    return jsonify(data["planes"].get("states", []))


@app.route('/api/user/stats')
@login_required
def user_stats():
    flights_count = FlightHistory.query.filter_by(user_id=current_user.id).count()
    airports_count = UserFavoriteAirport.query.filter_by(user_id=current_user.id).count()

    return jsonify({
        'username': current_user.login,
        'email': current_user.email,
        'registered_at': current_user.created_at.isoformat(),
        'flights_viewed': flights_count,
        'favorite_airports': airports_count,
        'last_login': current_user.last_login.isoformat() if current_user.last_login else None
    })


@app.route('/api/user/favorites', methods=['GET', 'POST', 'DELETE'])
@login_required
def manage_favorites():
    if request.method == 'GET':
        favorites = UserFavoriteAirport.query.filter_by(user_id=current_user.id).all()
        return jsonify([{
            'code': fav.airport_code,
            'name': fav.airport_name,
            'added_at': fav.added_at.isoformat()
        } for fav in favorites])

    elif request.method == 'POST':
        data = request.get_json()
        airport_code = data.get('code')
        airport_name = data.get('name')

        existing = UserFavoriteAirport.query.filter_by(
            user_id=current_user.id,
            airport_code=airport_code
        ).first()

        if existing:
            return jsonify({'error': 'Аэропорт уже в избранном'}), 400

        favorite = UserFavoriteAirport(
            user_id=current_user.id,
            airport_code=airport_code,
            airport_name=airport_name
        )
        db.session.add(favorite)
        db.session.commit()

        return jsonify({'message': 'Аэропорт добавлен в избранное'}), 201

    elif request.method == 'DELETE':
        data = request.get_json()
        airport_code = data.get('code')

        favorite = UserFavoriteAirport.query.filter_by(
            user_id=current_user.id,
            airport_code=airport_code
        ).first()

        if favorite:
            db.session.delete(favorite)
            db.session.commit()
            return jsonify({'message': 'Аэропорт удален из избранного'})

        return jsonify({'error': 'Аэропорт не найден'}), 404


@app.route('/')
def index():
    return render_template('earth3D.html')


if __name__ == '__main__':
    app.register_blueprint(support_bp)
    app.run(port=8080, host="127.0.0.1", debug=True)
