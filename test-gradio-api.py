#!/usr/bin/env python3
"""
Test HF Space RAG API using Gradio client
This simulates how your server actually calls the HF Space
"""

import requests
from gradio_client import Client
import json
import time

def test_gradio_rag_api():
    print("🧪 Testing HF Space RAG API via Gradio Client")
    print("=" * 50)
    
    try:
        # Connect to the HF Space
        print("🔌 Connecting to HF Space...")
        client = Client("https://lq458-teachai.hf.space", hf_token="os.getenv("RAG_SERVICE_TOKEN", "your_token_here")")
        print("✅ Connected successfully!")
        
        # Test cases
        test_cases = [
            {
                "name": "数学分数测试",
                "query": "数学 小学三年级 分数的基本概念",
                "subject": "数学",
                "grade": "小学三年级",
                "limit": 5
            },
            {
                "name": "语文汉字测试",
                "query": "语文 小学二年级 汉字识读",
                "subject": "语文", 
                "grade": "小学二年级",
                "limit": 3
            }
        ]
        
        for test_case in test_cases:
            print(f"\n🔍 {test_case['name']}")
            print(f"📋 Query: \"{test_case['query']}\"")
            print(f"🎯 Subject: {test_case['subject']}, Grade: {test_case['grade']}")
            
            try:
                # Call the search API endpoint
                result = client.predict(
                    query=test_case["query"],
                    subject=test_case["subject"],
                    grade=test_case["grade"],
                    limit=test_case["limit"],
                    api_name="/search"
                )
                
                print(f"✅ API Call Success!")
                print(f"📊 Response type: {type(result)}")
                
                if isinstance(result, dict):
                    if "results" in result:
                        results_count = len(result["results"]) if result["results"] else 0
                        print(f"📚 Found {results_count} results")
                        
                        if results_count > 0:
                            sample = result["results"][0]
                            print(f"📄 Sample result:")
                            print(f"   Subject: {sample.get('subject', 'N/A')}")
                            print(f"   Grade: {sample.get('grade', 'N/A')}")
                            print(f"   Similarity: {sample.get('similarity', 0) * 100:.1f}%")
                            print(f"   Content: {sample.get('content', '')[:100]}...")
                    elif "error" in result:
                        print(f"⚠️  API Error: {result['error']}")
                    else:
                        print(f"📊 Raw result: {str(result)[:200]}...")
                else:
                    print(f"📊 Raw result: {str(result)[:200]}...")
                    
            except Exception as e:
                print(f"❌ API Call Failed: {str(e)}")
                
            time.sleep(2)  # Wait between requests
            
    except Exception as e:
        print(f"💥 Connection Failed: {str(e)}")
        
        # Fallback: Test with direct HTTP to check basic connectivity
        print("\n🔄 Testing basic HTTP connectivity...")
        try:
            response = requests.get("https://lq458-teachai.hf.space", timeout=10)
            if response.status_code == 200:
                print("✅ HF Space is accessible via HTTP")
            else:
                print(f"⚠️  HF Space returned status: {response.status_code}")
        except Exception as http_error:
            print(f"❌ HTTP connectivity failed: {str(http_error)}")

if __name__ == "__main__":
    print("🚀 HF Space RAG API Testing via Gradio Client")
    print("=" * 50)
    test_gradio_rag_api()
    print("\n🏁 Testing Complete!")