import requests
import json
import os
import time
from typing import List, Dict, Any

def load_json_data(file_path: str) -> List[Dict[str, Any]]:
    """加载JSON数据文件"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"✅ 成功加载数据文件: {file_path}")
        print(f"📊 数据条数: {len(data)}")
        return data
    except Exception as e:
        print(f"❌ 加载数据文件失败: {e}")
        return []

def create_collection_via_http(api_key: str, tenant: str, database: str, collection_name: str):
    """通过HTTP API创建集合"""
    url = f"https://api.trychroma.com:8000/api/v2/tenants/{tenant}/databases/{database}/collections"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    data = {
        "name": collection_name,
        "metadata": {"description": "人文地理教材数据"}
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        if response.status_code == 201:
            print(f"✅ 成功创建集合: {collection_name}")
            return True
        elif response.status_code == 409:
            print(f"⚠️ 集合已存在: {collection_name}")
            return True
        else:
            print(f"❌ 创建集合失败: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ 创建集合异常: {e}")
        return False

def add_documents_via_http(api_key: str, tenant: str, database: str, collection_name: str, documents: List[Dict]):
    """通过HTTP API添加文档"""
    url = f"https://api.trychroma.com:8000/api/v2/tenants/{tenant}/databases/{database}/collections/{collection_name}/add"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # 准备数据
    ids = []
    contents = []
    metadatas = []
    
    for i, item in enumerate(documents):
        content = item.get('content', '')
        if not content.strip():
            continue
            
        metadata = item.get('metadata', {})
        simple_metadata = {
            'source': metadata.get('source', ''),
            'chunkIndex': metadata.get('chunkIndex', i),
            'method': metadata.get('method', ''),
            'textLength': metadata.get('textLength', 0)
        }
        
        ids.append(f"{collection_name}_chunk_{i}")
        contents.append(content)
        metadatas.append(simple_metadata)
    
    data = {
        "ids": ids,
        "documents": contents,
        "metadatas": metadatas
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        if response.status_code == 200:
            print(f"✅ 成功添加 {len(ids)} 个文档")
            return True
        else:
            print(f"❌ 添加文档失败: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ 添加文档异常: {e}")
        return False

def main():
    """主函数"""
    print("🚀 开始ChromaDB Cloud数据注入 (HTTP API)...")
    
    # 配置信息
    api_key = 'ck-DoWAAaxDQhJHjUN5sM6Xk16TQZmGiwZU35x9nLKFPnWF'
    tenant = 'ac97bc90-bba3-4f52-ab06-f0485262312e'
    database = 'teachai'
    collection_name = 'human_geography_http'
    
    # 数据文件路径
    data_file = "server/rag_data/chunks/义务教育教科书·人文地理上册.json"
    
    # 检查文件是否存在
    if not os.path.exists(data_file):
        print(f"❌ 数据文件不存在: {data_file}")
        return
    
    # 加载数据
    data = load_json_data(data_file)
    if not data:
        return
    
    # 创建集合
    if not create_collection_via_http(api_key, tenant, database, collection_name):
        return
    
    # 分批添加文档
    batch_size = 10
    total_success = 0
    
    for i in range(0, len(data), batch_size):
        batch = data[i:i + batch_size]
        print(f"📤 处理批次 {i//batch_size + 1}/{(len(data) + batch_size - 1)//batch_size}")
        
        if add_documents_via_http(api_key, tenant, database, collection_name, batch):
            total_success += len(batch)
        
        # 延迟避免API限制
        time.sleep(0.5)
    
    print(f"🎉 数据注入完成！成功注入 {total_success} 个文档")

if __name__ == "__main__":
    main()