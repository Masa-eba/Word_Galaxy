# ことばのほしぞら/Word Galaxy

> **知識の星空を探検する** - 新しい学習体験を提供する単語関連可視化Webアプリケーション

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-2.0+-green.svg)](https://flask.palletsprojects.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![BERT](https://img.shields.io/badge/BERT-NLP-orange.svg)](https://huggingface.co/transformers/)

## 目次

- [プロジェクト概要](#-プロジェクト概要)
- [開発チーム](#-開発チーム)
- [作成背景](#-作成背景)
- [主要機能](#-主要機能)
- [技術仕様](#-技術仕様)
- [セットアップ](#-セットアップ)
- [使用方法](#-使用方法)
- [プロジェクト構造](#-プロジェクト構造)
- [今後の展望](#-今後の展望)

## プロジェクト概要

「ことばのほしぞら」は、単語間の関連性を可視化することで、より効果的な学習体験を提供するWebアプリケーションです。

### コンセプト
『点』ではなく『つながり』で学ぶ新しい学習体験を提供します。言葉と言葉の繋がりを辿っていくことで、偶然の発見があったり、記憶に残りやすくなったりします。

### デモ
**デプロイ版はこちらからアクセスできます！** [https://word-graph.onrender.com]

## 開発チーム

**しめたファンクラブ** - 4名のメンバーで開発いたしました。

## 作成背景

### 課題
- 学習するときに体系的に学びたい！
- 単語同士の関連が知りたい！

### 解決策
単語の関連度を可視化したWebアプリケーションを開発し、知識の星空を探検するような学習体験を実現しました。

## 主要機能

### マインドマップ機能

#### 基本情報技術者 重要単語500語を可視化

**特徴:**
- **ノード（点）**: 各単語が個別のノードとして表示
- **エッジ（線）**: 関連度に基づいて単語間を接続
- **重要度表示**: より多くのつながりを持つ単語を明るく表示
- **表示切り替え**: 2D/3D表示の切り替えが可能

#### AI技術による関連度計算
- **BERT（Bidirectional Encoder Representations from Transformers）**を使用
- 単語の意味的類似性を高精度で計算
- 例: 「も言いたい」→「例えば」のような関連性を自動検出

### 検索機能
- リアルタイム検索
- 検索結果への自動ズームイン
- 2D/3D両方の表示で利用可能

### 単語帳機能

#### 単語帳作成
- 任意の単語を選択してカスタム単語帳を作成
- 学習進度に応じた単語選択

#### 学習モード
1. **カードビュー**: カードを裏返して意味を確認
2. **テストモード**: 4択クイズで理解度をチェック

## 🛠️ 技術仕様

### フロントエンド
| 技術 | 用途 | バージョン |
|------|------|------------|
| **HTML5** | マークアップ | 最新 |
| **CSS3** | スタイリング | 最新 |
| **JavaScript (ES6+)** | インタラクション | 最新 |

#### 可視化ライブラリ
- **Vis.js**: 2Dグラフ表示
- **Three.js**: 3Dグラフ表示

### バックエンド
| 技術 | 用途 | バージョン |
|------|------|------------|
| **Python** | サーバーサイド言語 | 3.8+ |
| **Flask** | Webフレームワーク | 2.0+ |

#### AI/ML技術
- **PyTorch**: 深層学習フレームワーク
- **Transformers (Hugging Face)**: BERTモデル
- **scikit-learn**: 機械学習アルゴリズム
- **NumPy**: 数値計算処理

### データ処理
- **BERT日本語モデル**: 単語の意味的類似性計算
- **コサイン類似度**: 関連度の数値化

## セットアップ

### 前提条件
- Python 3.8以上
- Node.js (推奨)
- 現代的なWebブラウザ

### インストール手順

#### 1. リポジトリのクローン
```bash
git clone https://github.com/your-username/Word_Galaxy.git
cd Word_Galaxy
```

#### 2. バックエンド環境のセットアップ
```bash
cd backend

# 仮想環境の作成（推奨）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係のインストール
pip install -r requirements.txt
```

#### 3. サーバーの起動
```bash
python main.py
```

#### 4. アクセス
ブラウザで `http://127.0.0.1:5000` にアクセス

## 使用方法

### 基本操作
1. **ホーム画面**: アプリケーションのメインページ
2. **2D表示**: 平面的なグラフ表示
3. **3D表示**: 立体的なグラフ表示
4. **検索**: 単語検索機能
5. **単語帳**: 学習機能

### 学習フロー
1. マインドマップで単語の関連性を確認
2. 興味のある単語を検索
3. 単語帳に追加
4. カードビューで学習
5. テストで理解度を確認

## プロジェクト構造

```
Word_Galaxy/
├── backend/                    # バックエンド
│   ├── main.py                # Flaskサーバー
│   ├── flashcard.py           # 単語帳機能
│   ├── generate_data.py       # データ生成スクリプト
│   ├── vocabulary.json        # 単語データ
│   ├── data.json              # 生成済みグラフデータ
│   └── requirements.txt       # Python依存関係
├── frontend/                   # フロントエンド
│   ├── index.html             # メインページ
│   ├── main2D/               # 2D表示
│   │   ├── index.html
│   │   ├── app.js
│   │   └── style.css
│   ├── sub3D/                # 3D表示
│   │   ├── 3d.html
│   │   └── 3d.css
│   └── flashcard/            # 単語帳機能
│       ├── flashcard_menu.html
│       ├── flashcard_view.html
│       ├── flashcard_view.js
│       ├── flashcards.css
│       └── flashcards.js
├── README.md                  # このファイル
└── requirements.txt           # プロジェクト依存関係
```

## 開発者向け情報

### データ更新方法
グラフデータ（`data.json`）の更新は、重い計算が必要なためGoogle Colaboratoryを使用します。

#### 手順
1. `backend/vocabulary.json` を編集
2. Google Colabで `generate_data.py` を実行
3. 生成された `data.json` をダウンロード
4. `backend/` に配置

### 技術的詳細
- **API**: RESTful API設計
- **データ形式**: JSON
- **セキュリティ**: CORS設定済み
- **パフォーマンス**: 非同期処理対応

## 今後の展望

### 短期目標
- [ ] ユーザー認証機能の追加
- [ ] 学習進度の保存機能
- [ ] モバイル対応の改善

### 長期目標
- [ ] 多言語対応
- [ ] 他の学習分野への展開
- [ ] AI機能の強化

### 応用可能性
現在は情報技術単語に特化していますが、データベースを変更することで以下の分野でも活用可能です：

- 語学学習
- 科学用語
- 医学用語
- ビジネス用語
- 芸術用語

## まとめ

**繋がりが分かれば、勉強はもっと楽しくなる！**

「ことばのほしぞら」は、従来の暗記型学習から、関連性を重視した理解型学習への転換を支援します。知識の星空を探検するような新しい学習体験を、私たちはこのアプリケーションでお届けします。

---

**開発チーム**: しめたファンクラブ

---

<div align="center">

**🌟 知識の星空を一緒に探検しましょう！ 🌟**

</div>
