import json
import torch
from transformers import BertJapaneseTokenizer, BertModel
from sklearn.metrics.pairwise import cosine_similarity
from collections import defaultdict
import queue

# ==============================================================================
# 設定値
# ==============================================================================
# 【カテゴリ内】の類似度を判定する閾値
SIMILARITY_THRESHOLD = 0.75
# 【カテゴリ間】のハブ単語を接続するための類似度閾値 (少し緩め)
HUB_SIMILARITY_THRESHOLD = 0.70

# UI上のノード間の距離を定義
# 類似度が最大のとき(1.0)の距離
MIN_LENGTH = 50
# 類似度が閾値のとき(SIMILARITY_THRESHOLD)の距離
MAX_LENGTH = 200
# ==============================================================================


def calculate_edge_length(similarity, threshold):
    """
    類似度スコア(0.0 ~ 1.0)を、UI上のエッジの長さに変換する。
    類似度が高いほど、距離は短くなる。
    """
    if (1.0 - threshold) <= 0: return MIN_LENGTH
    # 閾値から1.0の範囲を、0.0から1.0の範囲に正規化
    normalized_similarity = (similarity - threshold) / (1.0 - threshold)
    # 距離を線形にマッピング
    length = MAX_LENGTH - (normalized_similarity * (MAX_LENGTH - MIN_LENGTH))
    return int(length)

def find_connected_components(nodes_in_category, adj_list):
    """
    カテゴリ内の連結成分(繋がっているノードのグループ)をBFSで見つける。
    """
    components = []
    visited = set()
    for start_node in nodes_in_category:
        if start_node['id'] not in visited:
            component = []
            q = queue.Queue()
            q.put(start_node['id'])
            visited.add(start_node['id'])
            while not q.empty():
                node_id = q.get()
                component.append(node_id)
                for neighbor_id in adj_list.get(node_id, []):
                    if neighbor_id not in visited:
                        visited.add(neighbor_id)
                        q.put(neighbor_id)
            components.append(component)
    return components

def generate_it_word_graph():
    """
    情報系の単語リストから、構造化された関連グラフを生成する。
    """
    # 1. 外部ファイルから単語リストを読み込む
    print("ステップ1/8: 'vocabulary.json' を読み込んでいます...")
    try:
        with open('vocabulary.json', 'r', encoding='utf-8') as f:
            IT_VOCABULARY = json.load(f)
    except FileNotFoundError:
        print("エラー: 'vocabulary.json' が見つかりません。スクリプトと同じディレクトリに配置してください。")
        return
    except json.JSONDecodeError:
        print("エラー: 'vocabulary.json' の形式が正しくありません。")
        return

    # 2. AIモデルとトークナイザーの読み込み
    print("ステップ2/8: AIモデルを読み込んでいます...")
    tokenizer = BertJapaneseTokenizer.from_pretrained('cl-tohoku/bert-base-japanese-v3')
    model = BertModel.from_pretrained('cl-tohoku/bert-base-japanese-v3')
    model.eval() # 評価モードに設定

    # 3. ノードリストの作成
    print("ステップ3/8: ノードリストを作成中...")
    nodes = []
    term_list = []
    term_to_node = {}
    node_id_counter = 1
    for category, terms in IT_VOCABULARY.items():
        for term_data in terms:
            term = term_data["term"]
            node_info = {
                "id": node_id_counter,
                "label": term,
                "details": term_data["details"],
                "category": category,
                "importance": 0,  # 重要度を初期化
                "isHub": False    # Hubノードかどうか初期化
            }
            nodes.append(node_info)
            term_list.append(term)
            term_to_node[term] = node_info
            node_id_counter += 1

    # 4. 全単語のベクトル表現（Embedding）を計算
    print("ステップ4/8: 単語のベクトル表現を計算中...")
    with torch.no_grad():
        inputs = tokenizer(term_list, padding=True, truncation=True, return_tensors="pt")
        outputs = model(**inputs)
        # [CLS]トークンのベクトルを使用
        embeddings = outputs.last_hidden_state[:, 0, :].numpy()

    # 5. カテゴリ内エッジの生成
    print("ステップ5/8: カテゴリ内の関連性を計算しています...")
    cosine_matrix = cosine_similarity(embeddings)
    edges = []
    
    # 行列の上半分だけをチェックして重複を避ける
    for i in range(len(term_list)):
        for j in range(i + 1, len(term_list)):
            node_i = term_to_node[term_list[i]]
            node_j = term_to_node[term_list[j]]
            # カテゴリが違う単語同士は繋がない
            if node_i["category"] != node_j["category"]:
                continue

            similarity = cosine_matrix[i, j]
            if similarity > SIMILARITY_THRESHOLD:
                # 類似度からエッジの長さを計算して追加
                edge_length = calculate_edge_length(similarity, SIMILARITY_THRESHOLD)
                edges.append({
                    "from": node_i["id"],
                    "to": node_j["id"],
                    "length": edge_length
                })

    # 6. カテゴリ内の連結性を確保
    print("ステップ6/8: カテゴリ内の連結性を確保しています...")
    id_to_node = {node['id']: node for node in nodes}
    term_to_idx = {term: i for i, term in enumerate(term_list)}

    for category in IT_VOCABULARY.keys():
        nodes_in_category = [n for n in nodes if n['category'] == category]
        if not nodes_in_category:
            continue

        # 現在のカテゴリのエッジから隣接リストを作成
        adj_list = defaultdict(list)
        for edge in edges:
            node_from = id_to_node.get(edge['from'])
            if node_from and node_from['category'] == category:
                adj_list[edge['from']].append(edge['to'])
                adj_list[edge['to']].append(edge['from'])

        # 連結成分(島のグループ)を特定
        components = find_connected_components(nodes_in_category, adj_list)

        if len(components) <= 1:
            continue # すでに連結済み
        
        print(f"  - カテゴリ '{category}' に {len(components)} 個の非連結グラフを発見。接続します...")

        # 最も大きい成分をメインとし、他を島とする
        main_component = set(max(components, key=len))
        islands = [set(c) for c in components if set(c) != main_component]

        # 各島をメイン成分に最適なエッジで接続する
        for island in islands:
            best_connection = {"from": -1, "to": -1, "similarity": -1.0}
            
            # 島とメイン成分の間で最も類似度の高いペアを探す
            for island_node_id in island:
                for main_node_id in main_component:
                    node_i = id_to_node[island_node_id]
                    node_j = id_to_node[main_node_id]
                    idx_i = term_to_idx[node_i['label']]
                    idx_j = term_to_idx[node_j['label']]
                    similarity = cosine_matrix[idx_i, idx_j]

                    if similarity > best_connection['similarity']:
                        best_connection['similarity'] = similarity
                        best_connection['from'] = island_node_id
                        best_connection['to'] = main_node_id
            
            # 最も良い接続を追加
            if best_connection['from'] != -1:
                similarity = best_connection['similarity']
                edge_length = calculate_edge_length(similarity, 0.0) # 閾値未満でも距離を計算
                edges.append({
                    "from": best_connection['from'],
                    "to": best_connection['to'],
                    "length": edge_length
                })
                node_from_label = id_to_node[best_connection['from']]['label']
                node_to_label = id_to_node[best_connection['to']]['label']
                print(f"    - 救済接続: {node_from_label} <-> {node_to_label} (類似度: {similarity:.2f})")
            
            # 接続したのでメイン成分に合流させる
            main_component.update(island)
    
    # 7. 各ノードの重要度を計算し、1-100の範囲にスケーリング
    print("ステップ7/8: 各単語の重要度を計算し、スケーリングしています...")
    edge_counts = defaultdict(int)
    for edge in edges:
        edge_counts[edge["from"]] += 1
        edge_counts[edge["to"]] += 1

    all_raw_counts = [edge_counts[node["id"]] for node in nodes]

    if all_raw_counts:
        min_count = min(all_raw_counts)
        max_count = max(all_raw_counts)
        for node in nodes:
            raw_count = edge_counts[node["id"]]
            if max_count == min_count:
                scaled_importance = 50 # 全てのノードの重要度が同じ場合
            else:
                # 最小1, 最大100にスケーリング
                scaled_importance = 1 + int(((raw_count - min_count) / (max_count - min_count)) * 99)
            node["importance"] = scaled_importance

    # 8. カテゴリ間のハブ接続
    print("ステップ8/8: カテゴリ間の関連性を計算し、ハブを接続しています...")
    category_hubs = {}
    for category in IT_VOCABULARY.keys():
        nodes_in_category = [n for n in nodes if n["category"] == category]
        if not nodes_in_category: continue
        
        # カテゴリ内で最もエッジ数が多いノードをハブとして特定
        hub_node = max(nodes_in_category, key=lambda x: edge_counts[x["id"]])
        
        hub_node["isHub"] = True
        category_hubs[category] = hub_node
        print(f"  - カテゴリ '{category}' のハブ: {hub_node['label']}")

    hub_nodes = list(category_hubs.values())
    for i in range(len(hub_nodes)):
        for j in range(i + 1, len(hub_nodes)):
            hub_i = hub_nodes[i]
            hub_j = hub_nodes[j]
            
            idx_i = term_list.index(hub_i["label"])
            idx_j = term_list.index(hub_j["label"])
            similarity = cosine_matrix[idx_i, idx_j]
            
            if similarity > HUB_SIMILARITY_THRESHOLD:
                edge_length = calculate_edge_length(similarity, HUB_SIMILARITY_THRESHOLD)
                edges.append({
                    "from": hub_i["id"],
                    "to": hub_j["id"],
                    "length": edge_length
                })
                print(f"  - ハブ接続: {hub_i['label']} <-> {hub_j['label']} (類似度: {similarity:.2f})")

    # 最終的なグラフデータを結合して保存
    graph_data = {"nodes": nodes, "edges": edges}
    output_path = 'data.json'
    print(f"\nグラフデータを '{output_path}' に保存しています...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(graph_data, f, ensure_ascii=False, indent=2)
    
    print("完了！")

if __name__ == '__main__':
    generate_it_word_graph()
