1. Установка зависимостей
pip install -r requirements.txt

2. Настройка базы данных
Вставьте свой ключ файл .env:
DATABASE_URL=sqlite:///radar.db
SECRET_KEY=any-secret-key

3. Создание БД
python create_db.py

4. Запуск
python main.py
