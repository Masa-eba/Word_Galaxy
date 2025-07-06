import os
import json
from flask import Flask, send_from_directory, jsonify

app = Flask(__name__, static_folder='../frontend', static_url_path='')

# Serve the main page
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

# Serve static files (CSS, JS, etc.)
@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(app.static_folder, path)

# API endpoint to serve data.json
@app.route('/api/data')
def get_data():
    """
    事前に生成された data.json ファイルを読み込み、
    その内容をJSON形式でクライアントに返します。
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
    # host='0.0.0.0' は、外部からのアクセスを許可します
    app.run(host='0.0.0.0', port=5000, debug=True)