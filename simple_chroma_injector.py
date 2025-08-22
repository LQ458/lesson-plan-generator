import chromadb
import json
import os
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

def inject_data_simple(client, data: List[Dict[str, Any]], collection_name: str):
    """简化的数据注入方法"""
    try:
        print(f"📚 创建集合: {collection_name}")
        
        # 创建集合，使用最简单的配置
        collection = client.create_collection(
            name=collection_name,
            metadata={"description": "人文地理教材数据"}
        )
        
        print(f"📝 准备注入 {len(data)} 个文档")
        
        # 逐个注入文档，避免批量问题
        success_count = 0
        
        for i, item in enumerate(data):
            try:
                content = item.get('content', '')
                if not content.strip():
                    continue
                
                # 简化metadata，只保留基本字段
                metadata = item.get('metadata', {})
                simple_metadata = {
                    'source': metadata.get('source', ''),
                    'chunkIndex': metadata.get('chunkIndex', i),
                    'method': metadata.get('method', ''),
                    'textLength': metadata.get('textLength', 0)
                }
                
                # 添加文档
                collection.add(
                    documents=[content],
                    metadatas=[simple_metadata],
                    ids=[f"{collection_name}_chunk_{i}"]
                )
                
                success_count += 1
                if success_count % 10 == 0:
                    print(f"📤 已注入 {success_count}/{len(data)} 个文档")
                
                # 小延迟
                time.sleep(0.05)
                
            except Exception as e:
                print(f"❌ 文档 {i} 注入失败: {e}")
                continue
        
        print(f"✅ 数据注入完成！成功注入 {success_count} 个文档")
        
        # 获取集合信息
        try:
            count = collection.count()
            print(f"📊 集合总文档数: {count}")
        except:
            print("📊 无法获取集合文档数")
        
        return True
        
    except Exception as e:
        print(f"❌ 数据注入失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """主函数"""
    print("🚀 开始ChromaDB Cloud数据注入...")
    
    # 数据文件路径
    data_file = "server/rag_data/chunks/义务教育教科书·人文地理上册.json"
    
    # 检查文件是否存在
    if not os.path.exists(data_file):
        print(f"❌ 数据文件不存在: {data_file}")
        print(f"❌ 数据文件不存在: {data_file}")
        return
    
    # 加载数据
    data = load_json_data(data_file)
    if not data:
        return
    
    # 创建客户端
    client = create_chroma_client()
    if not client:
        return
    
    # 注入数据
    success = inject_data_simple(client, data, "human_geography_simple")
    
    if success:
        print("🎉 数据注入成功完成！")
    else:
        print("💥 数据注入失败！")

if __name__ == "__main__":
    main()