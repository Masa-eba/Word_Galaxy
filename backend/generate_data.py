import json
import torch
from transformers import BertJapaneseTokenizer, BertModel
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# 類似度を判定する閾値（この値を調整するとエッジの数が変わる）
SIMILARITY_THRESHOLD = 0.75

def generate_it_word_graph():
    """
    情報系の単語リストから、単語間の関連性を計算し、
    グラフデータとしてJSONファイルに出力する。
    """
    # ==============================================================================
    # 1. 外部のJSONファイルから単語リストを読み込む
    # ==============================================================================
    print("外部ファイル 'vocabulary.json' を読み込んでいます...")
    try:
        with open('vocabulary.json', 'r', encoding='utf-8') as f:
            IT_VOCABULARY = json.load(f)
    except FileNotFoundError:
        print("エラー: 'vocabulary.json' が見つかりません。スクリプトと同じディレクトリに配置してください。")
        return
    except json.JSONDecodeError:
        print("エラー: 'vocabulary.json' の形式が正しくありません。")
        return

    print("AIモデルを読み込んでいます...（少し時間がかかります）")
    # 2. AIモデルとトークナイザーの読み込み
    tokenizer = BertJapaneseTokenizer.from_pretrained('cl-tohoku/bert-base-japanese-v3')
    model = BertModel.from_pretrained('cl-tohoku/bert-base-japanese-v3')
    model.eval() # 評価モードに設定

    print("ノードと単語リストを作成中...")
    nodes = []
    term_list = []
    term_to_id = {}
    node_id_counter = 1

    # 3. ノードリストの作成
    for category, terms in IT_VOCABULARY.items():
        for term_data in terms:
            term = term_data["term"]
            nodes.append({
                "id": node_id_counter,
                "label": term,
                "details": term_data["details"],
                "category": category
            })
            term_list.append(term)
            term_to_id[term] = node_id_counter
            node_id_counter += 1

    print("単語のベクトル表現を計算中...")
    # 4. 全単語のベクトル表現（Embedding）を計算
    with torch.no_grad():
        inputs = tokenizer(term_list, padding=True, truncation=True, return_tensors="pt")
        outputs = model(**inputs)
        # [CLS]トークンのベクトルを使用
        embeddings = outputs.last_hidden_state[:, 0, :].numpy()

    print("単語間の類似度を計算し、エッジを作成中...")
    # 5. コサイン類似度を計算し、エッジリストを作成
    cosine_matrix = cosine_similarity(embeddings)
    edges = []
    
    # 行列の上半分だけをチェックして重複を避ける
    for i in range(len(term_list)):
        for j in range(i + 1, len(term_list)):
            similarity = cosine_matrix[i, j]
            if similarity > SIMILARITY_THRESHOLD:
                term_from = term_list[i]
                term_to = term_list[j]
                
                edges.append({
                    "from": term_to_id[term_from],
                    "to": term_to_id[term_to]
                })
                print(f"  - エッジ発見: {term_from} <-> {term_to} (類似度: {similarity:.2f})")

    # 6. 最終的なグラフデータを結合
    graph_data = {
        "nodes": nodes,
        "edges": edges
    }

    # 7. JSONファイルとして保存
    output_path = 'data.json'
    print(f"\nグラフデータを '{output_path}' に保存しています...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(graph_data, f, ensure_ascii=False, indent=2)
    
    print("完了！")

if __name__ == '__main__':
    generate_it_word_graph()
