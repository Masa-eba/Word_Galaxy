from flask import Flask, send_from_directory, jsonify
import os

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
    data_path = os.path.join(os.path.dirname(__file__), 'data.json')
    with open(data_path, 'r', encoding='utf-8') as f:
        data = f.read()
    return app.response_class(data, mimetype='application/json')

if __name__ == '__main__':
    app.run(debug=True) 