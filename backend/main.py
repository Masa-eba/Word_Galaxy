import os
import json
from flask import Flask, send_from_directory, jsonify
from flashcard import flashcard_bp

app = Flask(__name__, static_folder='../frontend', static_url_path='')
app.register_blueprint(flashcard_bp)

# メインページを提供
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

# 静的ファイル（CSS、JSなど）を提供
@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(app.static_folder, path)

# フラッシュカードページを提供
@app.route('/flashcards.html')
def flashcards_page():
    return send_from_directory(app.static_folder, 'flashcards.html')

# data.json を提供するAPIエンドポイント
@app.route('/api/data')
def get_data():
    """
    事前に生成された data.json ファイルを読み込み、
    その内容をJSON形式でクライアントに返す
    """
    try:
        # このスクリプトと同じ階層にある data.json へのパスを取得
        data_path = os.path.join(os.path.dirname(__file__), 'data.json')
        
        # ファイルを開いて内容を読み込む
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # 読み込んだデータをJSONとして返す
        return jsonify(data)
        
    except FileNotFoundError:
        # data.json が見つからない場合のエラーハンドリング
        return jsonify({"error": "data.json not found. Please run generate_data.py first."}), 404
    except Exception as e:
        # その他の予期せぬエラー
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # 開発用サーバーを起動
    # host='0.0.0.0' は、外部からのアクセスを許可
    app.run(host='0.0.0.0', port=5000, debug=True)