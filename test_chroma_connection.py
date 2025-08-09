import chromadb

def test_chroma_connection():
    """测试ChromaDB Cloud连接"""
    try:
        print("🔗 测试ChromaDB Cloud连接...")
        
        client = chromadb.CloudClient(
            api_key='ck-DoWAAaxDQhJHjUN5sM6Xk16TQZmGiwZU35x9nLKFPnWF',
            tenant='ac97bc90-bba3-4f52-ab06-f0485262312e',
            database='teachai'
        )
        
        print("✅ 连接成功！")
        
        # 列出所有集合
        collections = client.list_collections()
        print(f"📚 现有集合数量: {len(collections)}")
        
        for collection in collections:
            print(f"  - {collection.name} (文档数: {collection.count()})")
        
        return True
        
    except Exception as e:
        print(f"❌ 连接失败: {e}")
        return False

if __name__ == "__main__":
    test_chroma_connection()