import chromadb
import json

def test_chroma_query():
    """测试ChromaDB查询功能"""
    try:
        print("🔍 测试ChromaDB查询功能...")
        
        # 创建客户端
        client = chromadb.CloudClient(
            api_key='ck-DoWAAaxDQhJHjUN5sM6Xk16TQZmGiwZU35x9nLKFPnWF',
            tenant='ac97bc90-bba3-4f52-ab06-f0485262312e',
            database='teachai'
        )
        
        # 获取集合
        collection = client.get_collection("human_geography_textbook_v2")
        
        print(f"📚 集合名称: {collection.name}")
        print(f"📊 文档总数: {collection.count()}")
        
        # 测试1: 查询包含"地图"的文档
        print("\n🔍 测试1: 查询包含'地图'的文档")
        results = collection.query(
            query_texts=["地图"],
            n_results=3
        )
        
        for i, (doc, metadata, distance) in enumerate(zip(results['documents'][0], results['metadatas'][0], results['distances'][0])):
            print(f"\n结果 {i+1} (相似度: {1-distance:.3f}):")
            print(f"内容预览: {doc[:100]}...")
            print(f"来源: {metadata.get('source', 'N/A')}")
            print(f"行号: {metadata.get('line_from', 'N/A')}-{metadata.get('line_to', 'N/A')}")
        
        # 测试2: 查询包含"社区"的文档
        print("\n🔍 测试2: 查询包含'社区'的文档")
        results = collection.query(
            query_texts=["社区"],
            n_results=3
        )
        
        for i, (doc, metadata, distance) in enumerate(zip(results['documents'][0], results['metadatas'][0], results['distances'][0])):
            print(f"\n结果 {i+1} (相似度: {1-distance:.3f}):")
            print(f"内容预览: {doc[:100]}...")
            print(f"来源: {metadata.get('source', 'N/A')}")
            print(f"行号: {metadata.get('line_from', 'N/A')}-{metadata.get('line_to', 'N/A')}")
        
        # 测试3: 查询包含"地理"的文档
        print("\n🔍 测试3: 查询包含'地理'的文档")
        results = collection.query(
            query_texts=["地理"],
            n_results=3
        )
        
        for i, (doc, metadata, distance) in enumerate(zip(results['documents'][0], results['metadatas'][0], results['distances'][0])):
            print(f"\n结果 {i+1} (相似度: {1-distance:.3f}):")
            print(f"内容预览: {doc[:100]}...")
            print(f"来源: {metadata.get('source', 'N/A')}")
            print(f"来源: {metadata.get('source', 'N/A')}")
            print(f"行号: {metadata.get('line_from', 'N/A')}-{metadata.get('line_to', 'N/A')}")
        
        # 测试4: 获取所有文档的metadata统计
        print("\n📊 测试4: 获取文档统计信息")
        all_results = collection.get()
        
        print(f"总文档数: {len(all_results['ids'])}")
        
        # 统计来源文件
        sources = {}
        for metadata in all_results['metadatas']:
            source = metadata.get('source', 'unknown')
            sources[source] = sources.get(source, 0) + 1
        
        print("来源文件统计:")
        for source, count in sources.items():
            print(f"  - {source}: {count} 个文档")
        
        # 统计质量指标
        quality_scores = []
        for metadata in all_results['metadatas']:
            if 'quality_chineseCharRatio' in metadata:
                quality_scores.append(metadata['quality_chineseCharRatio'])
        
        if quality_scores:
            avg_quality = sum(quality_scores) / len(quality_scores)
            print(f"平均中文字符比例: {avg_quality:.3f}")
        
        print("\n✅ 查询测试完成！")
        return True
        
    except Exception as e:
        print(f"❌ 查询测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_chroma_query()