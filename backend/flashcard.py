import os
import json
from flask import Blueprint, request, jsonify

flashcard_bp = Blueprint('flashcard', __name__)
FLASHCARDS_FILE = os.path.join(os.path.dirname(__file__), 'flashcards.json')

def load_flashcards():
    if not os.path.exists(FLASHCARDS_FILE):
        return []
    with open(FLASHCARDS_FILE, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except Exception:
            return []

def save_flashcards(flashcards):
    with open(FLASHCARDS_FILE, 'w', encoding='utf-8') as f:
        json.dump(flashcards, f, ensure_ascii=False, indent=2)

# 単語帳一覧取得
@flashcard_bp.route('/api/flashcards', methods=['GET'])
def get_flashcards():
    flashcards = load_flashcards()
    return jsonify(flashcards)

# 単語帳新規作成
@flashcard_bp.route('/api/flashcards', methods=['POST'])
def create_flashcard():
    data = request.get_json()
    
    print('受け取ったデータ:', data)  # 追加

    ids = data.get('ids', [])
    name = data.get('name', 'new flashcard')
    # data.jsonからノード情報を取得
    data_path = os.path.join(os.path.dirname(__file__), 'data.json')
    with open(data_path, 'r', encoding='utf-8') as f:
        graph_data = json.load(f)
    id_set = set(ids)
    words = [
        {'id': node['id'], 'label': node['label'], 'details': node['details']}
        for node in graph_data.get('nodes', []) if node['id'] in id_set
    ]
    flashcards = load_flashcards()
    new_id = (max([f.get('id', 0) for f in flashcards]) + 1) if flashcards else 1
    new_flashcard = {
        'id': new_id,
        'name': name,
        'words': words
    }
    print('words:', words)  # 追加

    flashcards.append(new_flashcard)
    save_flashcards(flashcards)
    return jsonify(new_flashcard), 201

# 単語帳名更新
@flashcard_bp.route('/api/flashcards/<int:flashcard_id>', methods=['PUT'])
def update_flashcard_name(flashcard_id):
    data = request.get_json()
    new_name = data.get('name', '').strip()
    
    if not new_name:
        return jsonify({"error": "名前は必須です"}), 400
    
    flashcards = load_flashcards()
    flashcard = next((f for f in flashcards if f['id'] == flashcard_id), None)
    
    if not flashcard:
        return jsonify({"error": "単語帳が見つかりません"}), 404
    
    flashcard['name'] = new_name
    save_flashcards(flashcards)
    
    return jsonify({"message": "名前が更新されました"}), 200

# 単語帳内容更新
@flashcard_bp.route('/api/flashcards/<int:flashcard_id>/content', methods=['PUT'])
def update_flashcard_content(flashcard_id):
    data = request.get_json()
    ids = data.get('ids', [])
    name = data.get('name', 'updated flashcard')
    
    if not ids:
        return jsonify({"error": "単語は必須です"}), 400
    
    # data.jsonからノード情報を取得
    data_path = os.path.join(os.path.dirname(__file__), 'data.json')
    with open(data_path, 'r', encoding='utf-8') as f:
        graph_data = json.load(f)
    
    id_set = set(ids)
    words = [
        {'id': node['id'], 'label': node['label'], 'details': node['details']}
        for node in graph_data.get('nodes', []) if node['id'] in id_set
    ]
    
    flashcards = load_flashcards()
    flashcard = next((f for f in flashcards if f['id'] == flashcard_id), None)
    
    if not flashcard:
        return jsonify({"error": "単語帳が見つかりません"}), 404
    
    flashcard['name'] = name
    flashcard['words'] = words
    save_flashcards(flashcards)
    
    return jsonify(flashcard), 200
