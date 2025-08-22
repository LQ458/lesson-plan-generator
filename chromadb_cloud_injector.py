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

def clean_metadata(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """清理metadata，移除可能导致问题的字段"""
    cleaned = {}
    for key, value in metadata.items():
        # 只保留字符串、数字、布尔值等基本类型
        if isinstance(value, (str, int, float, bool)):
            cleaned[key] = value
        elif isinstance(value, dict):
            # 对于嵌套字典，将其转换为字符串或提取关键信息
            if key == 'loc' and isinstance(value, dict):
                # 处理loc字段，提取行号信息
                if 'lines' in value and isinstance(value['lines'], dict):
                    lines = value['lines']
                    if 'from' in lines and 'to' in lines:
                        cleaned['line_from'] = lines['from']
                        cleaned['line_to'] = lines['to']
            elif key == 'qualityMetrics' and isinstance(value, dict):
                # 处理qualityMetrics字段，提取关键指标
                for metric_key, metric_value in value.items():
                    if isinstance(metric_value, (str, int, float, bool)):
                        cleaned[f'quality_{metric_key}'] = metric_value
            else:
                # 其他嵌套字典转换为JSON字符串
                try:
                    cleaned[key] = json.dumps(value, ensure_ascii=False)
                except:
                    cleaned[key] = str(value)
        elif value is None:
            # 保留None值
            cleaned[key] = None
        else:
            # 其他类型转换为字符串
            cleaned[key] = str(value)
    return cleaned

def inject_data_to_chroma(client, data: List[Dict[str, Any]], collection_name: str = "textbook_chunks"):
    """将数据注入到ChromaDB集合中"""
    try:
        # 尝试删除现有集合（如果存在）
        try:
            client.delete_collection(collection_name)
            print(f"🗑️ 删除现有集合: {collection_name}")
        except:
            pass
        
        # 创建新集合
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
                # 清理metadata
                cleaned_metadata = clean_metadata(metadata)
                
                documents.append(content)
                metadatas.append(cleaned_metadata)
                ids.append(f"chunk_{i}")
        
        print(f"📝 准备注入 {len(documents)} 个文档")
        
        # 分批注入数据（每批1000个）
        batch_size = 1000
        total_injected = 0
        
        for i in range(0, len(documents), batch_size):
            batch_docs = documents[i:i + batch_size]
            batch_metadatas = metadatas[i:i + batch_size]
            batch_ids = ids[i:i + batch_size]
            
            try:
                collection.add(
                    documents=batch_docs,
                    metadatas=batch_metadatas,
                    ids=batch_ids
                )
                
                total_injected += len(batch_docs)
                print(f"📤 已注入 {total_injected}/{len(documents)} 个文档")
                
            except Exception as batch_error:
                print(f"❌ 批次 {i//batch_size + 1} 注入失败: {batch_error}")
                # 尝试逐个注入
                for j, (doc, meta, doc_id) in enumerate(zip(batch_docs, batch_metadatas, batch_ids)):
                    try:
                        collection.add(
                            documents=[doc],
                            metadatas=[meta],
                            ids=[doc_id]
                        )
                        total_injected += 1
                        print(f"📤 已注入 {total_injected}/{len(documents)} 个文档 (逐个)")
                    except Exception as single_error:
                        print(f"❌ 文档 {doc_id} 注入失败: {single_error}")
            
            # 添加小延迟避免API限制
            time.sleep(0.1)
        
        print(f"✅ 数据注入完成！总共注入 {total_injected} 个文档")
        
        # 获取集合信息
        collection_info = collection.count()
        print(f"📊 集合总文档数: {collection_info}")
        
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
    success = inject_data_to_chroma(client, data, "human_geography_textbook_v2")
    
    if success:
        print("🎉 数据注入成功完成！")
    else:
        print("💥 数据注入失败！")

if __name__ == "__main__":
    main()