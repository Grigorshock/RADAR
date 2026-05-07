from main import app
from models import db, User, FlightHistory, UserFavoriteAirport
import os


def init_db():
    db_path = 'radar.db'

    with app.app_context():
        db_exists = os.path.exists(db_path)

        if db_exists:

            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()

            if tables:
                pass
            else:
                db.create_all()
        else:
            db.create_all()
        return True


if __name__ == '__main__':
    try:
        init_db()
    except Exception as e:
        print(f"Ошибка при инициализации БД: {e}")
        import traceback

        traceback.print_exc()