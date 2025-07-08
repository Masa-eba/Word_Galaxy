# Word_Graph
flask

## 1. 概要

## 2. 主な機能


## 3. ディレクトリ構成
```bash
.
├── backend/
│   ├── generate_data.py   # (参照用) data.jsonを生成する元のスクリプト
│   ├── main.py            # Webサーバー (Flask)
│   ├── vocabulary.json    # グラフの元になる単語リスト ★単語を追加・編集するファイル
│   └── data.json          # 生成済みのグラフデータ ★サーバーが直接読み込むファイル
│
```

## 4. 開発環境のセットアップと実行方法

### ステップ1: Webサーバーのセットアップ

1.  このリポジトリをクローンします。
2.  ターミナルで `backend` ディレクトリに移動します。
    ```bash
    cd backend
    ```
3.  必要なPythonライブラリをインストールします。（Webサーバーの実行に最低限必要なものだけです）
    ```bash
    pip install Flask
    ```

### ステップ2: Webサーバーの実行

1.  `backend` ディレクトリで、以下のコマンドを実行してサーバーを起動します。
    ```bash
    python main.py
    ```
2.  ブラウザで `http://127.0.0.1:5000` にアクセスすると、アプリケーションが表示されます。

---
## 5. 【重要】グラフデータ (`data.json`) の更新方法

グラフの元データである `data.json` は、AIモデルを使った重い計算が必要なため、**ローカルPCでは生成しません。**

PCのスペックやディスク容量に依存せず、誰でも同じ結果を生成できるように、**Google Colaboratory** を使用して生成します。

### 手順

1.  **単語の追加・編集:**
    `backend/vocabulary.json` ファイルを直接編集して、新しい単語やカテゴリを追加・修正します。

2.  **Google Colabを開く:**
    [Google Colaboratory](https://colab.research.google.com/) にアクセスし、「ノートブックを新規作成」します。

3.  **`vocabulary.json` のアップロード:**
    Colabの画面左にあるフォルダアイコンから、編集した `vocabulary.json` をアップロードします。

4.  **Colabでコードを実行:**
    以下のコードをColabのセルに貼り付け、実行（▶ボタンをクリック）します。

    ```python
    # 1. 必要なライブラリをインストール
    !pip install transformers fugashi ipadic unidic-lite protobuf scikit-learn

    # 2. メイン処理
    import json
    import torch
    from transformers import BertJapaneseTokenizer, BertModel
    from sklearn.metrics.pairwise import cosine_similarity

    # --- (ここにgenerate_data.pyとほぼ同じコードを貼り付け) ---
    # ※長くなるため省略。内容はgenerate_data.pyを参照してください。
    # 最終的にdata.jsonが生成されます。
    ```
    > **注:** Colabに貼り付けるコードの詳細は、プロジェクト内の `backend/generate_data.py` を参照してください。

5.  **`data.json` のダウンロード:**
    処理が完了すると、Colabのファイルパネルに `data.json` が生成されます。これを右クリックしてダウンロードします。

6.  **ファイルの配置:**
    ダウンロードした `data.json` を、ローカルの `backend` フォルダに上書き保存します。

7.  **GitHubにプッシュ:**
    変更した `vocabulary.json` と、新しく生成した `data.json` の両方をGitHubにプッシュしてください。

## 6. 使用技術

- **バックエンド:** Python, Flask
- **フロントエンド:** 
- **可視化ライブラリ:** 
- **データ生成:** Python, PyTorch, Transformers (Hugging Face), Google Colaboratory
