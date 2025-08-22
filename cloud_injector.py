import chromadb
import json
import os
import glob
from typing import List, Dict, Any
import time

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

def create_chroma_client():
    """创建ChromaDB Cloud客户端"""
    try:
        client = chromadb.CloudClient(
            api_key='ck-DoWAAaxDQhJHjUN5sM6Xk16TQZmGiwZU35x9nLKFPnWF',
            tenant='ac97bc90-bba3-4f52-ab06-f0485262312e',
            database='teachai'
        )
        print("✅ 成功连接到ChromaDB Cloud")
        return client
    except Exception as e:
        print(f"❌ 连接ChromaDB Cloud失败: {e}")
        return None

def get_collection_name_from_file(file_path: str) -> str:
    """从文件名生成集合名称"""
    filename = os.path.basename(file_path)
    name_without_ext = os.path.splitext(filename)[0]
    # 移除特殊字符，只保留字母、数字和下划线
    collection_name = ''.join(c for c in name_without_ext if c.isalnum() or c == '_')
    return f"textbook_{collection_name}"

def inject_data_to_chroma(client, data: List[Dict[str, Any]], collection_name: str):
    """将数据注入到ChromaDB集合中"""
    try:
        # 检查集合是否存在，如果不存在则创建
        try:
            collection = client.get_collection(collection_name)
            print(f"📚 使用现有集合: {collection_name}")
        except:
            collection = client.create_collection(collection_name)
            print(f"📚 创建新集合: {collection_name}")
        
        # 准备数据
        documents = []
        metadatas = []
        ids = []
        
        for i, item in enumerate(data):
            content = item.get('content', '')
            metadata = item.get('metadata', {})
            
            if content.strip():  # 只添加非空内容
                documents.append(content)
                metadatas.append(metadata)
                ids.append(f"{collection_name}_chunk_{i}")
        
        print(f"📝 准备注入 {len(documents)} 个文档")
        
        # 分批注入数据（每批1000个）
        batch_size = 1000
        total_injected = 0
        
        for i in range(0, len(documents), batch_size):
            batch_docs = documents[i:i + batch_size]
            batch_metadatas = metadatas[i:i + batch_size]
            batch_ids = ids[i:i + batch_size]
            
            collection.add(
                documents=batch_docs,
                metadatas=batch_metadatas,
                ids=batch_ids
            )
            
            total_injected += len(batch_docs)
            print(f"📤 已注入 {total_injected}/{len(documents)} 个文档")
            
            # 添加小延迟避免API限制
            time.sleep(0.1)
        
        print(f"✅ 数据注入完成！总共注入 {total_injected} 个文档")
        
        # 获取集合信息
        collection_info = collection.count()
        print(f"📊 集合总文档数: {collection_info}")
        
        return True
        
    except Exception as e:
        print(f"❌ 数据注入失败: {e}")
        return False

def inject_single_file(file_path: str, client):
    """注入单个文件的数据"""
    print(f"\n🔄 处理文件: {file_path}")
    
    # 加载数据
    data = load_json_data(file_path)
    if not data:
        return False
    
    # 生成集合名称
    collection_name = get_collection_name_from_file(file_path)
    
    # 注入数据
    return inject_data_to_chroma(client, data, collection_name)

def inject_all_files(data_dir: str = "server/rag_data/chunks"):
    """注入目录下所有JSON文件的数据"""
    print("🚀 开始批量ChromaDB Cloud数据注入...")
    
    # 检查目录是否存在
    if not os.path.exists(data_dir):
        print(f"❌ 数据目录不存在: {data_dir}")
        return
    
    # 创建客户端
    client = create_chroma_client()
    if not client:
        return
    
    # 查找所有JSON文件
    json_files = glob.glob(os.path.join(data_dir, "*.json"))
    
    if not json_files:
        print(f"❌ 在目录 {data_dir} 中没有找到JSON文件")
        return
    
    print(f"📁 找到 {len(json_files)} 个JSON文件")
    
    # 处理每个文件
    success_count = 0
    for file_path in json_files:
        if inject_single_file(file_path, client):
            success_count += 1
    
    print(f"\n🎉 批量注入完成！成功处理 {success_count}/{len(json_files)} 个文件")

def main():
    """主函数"""
    import sys
    
    if len(sys.argv) > 1:
        # 如果提供了文件路径参数
        file_path = sys.argv[1]
        if os.path.exists(file_path):
            client = create_chroma_client()
            if client:
                inject_single_file(file_path, client)
        else:
            print(f"❌ 文件不存在: {file_path}")
    else:
        # 默认注入所有文件
        inject_all_files()

if __name__ == "__main__":
    main()