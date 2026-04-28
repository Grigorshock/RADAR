import os
import requests
import json
from datetime import datetime
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv

load_dotenv()

support_bp = Blueprint('support', __name__, url_prefix='/api/support')

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

SYSTEM_PROMPT = """Ты - помощник для RADAR - системы 3D отслеживания рейсов в реальном времени. 
Твоя задача помогать пользователям с:
- Отслеживанием рейсов и самолётов
- Информацией об аэропортах
- Навигацией по 3D карте
- Пониманием данных о полётах (высота, скорость, координаты)
- Техническими вопросами о системе
Отвечай дружелюбно и информативно. Если пользователь спрашивает о конкретном рейсе или аэропорте, предложи посмотреть на 3D карте."""


@support_bp.route('/status', methods=['GET'])
def check_status():
    if not OPENROUTER_API_KEY:
        return jsonify({
            'status': 'error',
            'message': 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in .env file',
            'configured': False
        }), 200

    try:
        headers = {
            'Authorization': f'Bearer {OPENROUTER_API_KEY}',
            'Content-Type': 'application/json'
        }
        response = requests.get('https://openrouter.ai/api/v1/auth/key', headers=headers, timeout=5)

        if response.status_code == 200:
            return jsonify({
                'status': 'ok',
                'message': 'OpenRouter API is configured and working',
                'configured': True,
                'model': 'deepseek/deepseek-chat'
            })
        else:
            return jsonify({
                'status': 'warning',
                'message': 'API key may be invalid. Please check your OpenRouter API key',
                'configured': True,
                'error': response.status_code
            })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to connect to OpenRouter API: {str(e)}',
            'configured': True
        }), 200


@support_bp.route('/info', methods=['GET'])
def get_info():
    return jsonify({
        'name': 'RADAR AI Assistant',
        'version': '1.0.0',
        'capabilities': [
            'Отслеживание рейсов в реальном времени',
            'Информация об аэропортах',
            'Помощь с навигацией по 3D карте',
            'Объяснение авиационных данных',
            'Техническая поддержка системы RADAR'
        ],
        'model': 'deepseek/deepseek-chat',
        'api_status': 'operational' if OPENROUTER_API_KEY else 'not_configured'
    })


@support_bp.route('/chat', methods=['POST'])
def chat():
    if not OPENROUTER_API_KEY:
        return jsonify({
            'error': 'OpenRouter API key not configured. Please add OPENROUTER_API_KEY to .env file',
            'status': 'error'
        }), 503

    data = request.get_json()

    if not data or 'message' not in data:
        return jsonify({
            'error': 'Missing message field',
            'status': 'error'
        }), 400

    user_message = data['message']
    conversation_history = data.get('history', [])

    messages = [
        {'role': 'system', 'content': SYSTEM_PROMPT}
    ]

    if conversation_history:
        messages.extend(conversation_history[-10:])

    messages.append({'role': 'user', 'content': user_message})

    try:
        headers = {
            'Authorization': f'Bearer {OPENROUTER_API_KEY}',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:8080',
            'X-Title': 'RADAR Flight Tracker'
        }

        payload = {
            'model': 'deepseek/deepseek-chat',
            'messages': messages,
            'temperature': 0.7,
            'max_tokens': 500,
            'top_p': 0.9
        }

        response = requests.post(
            OPENROUTER_API_URL,
            headers=headers,
            json=payload,
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            ai_response = result['choices'][0]['message']['content']

            return jsonify({
                'response': ai_response,
                'status': 'success',
                'model': 'deepseek/deepseek-chat',
                'timestamp': datetime.now().isoformat()
            })
        else:
            error_msg = f'OpenRouter API error: {response.status_code}'
            try:
                error_data = response.json()
                if 'error' in error_data:
                    error_msg = error_data['error'].get('message', error_msg)
            except:
                pass

            return jsonify({
                'error': error_msg,
                'status': 'error'
            }), response.status_code

    except requests.Timeout:
        return jsonify({
            'error': 'Request timeout. Please try again.',
            'status': 'error'
        }), 504
    except requests.ConnectionError:
        return jsonify({
            'error': 'Cannot connect to OpenRouter API. Please check your internet connection.',
            'status': 'error'
        }), 503
    except Exception as e:
        return jsonify({
            'error': f'Unexpected error: {str(e)}',
            'status': 'error'
        }), 500
