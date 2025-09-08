"""
Test script to validate Dify API connection and configuration
"""

import sys
import os
from pathlib import Path

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import configs
from dify_api import DifyAPIClient

def test_configuration():
    """Test basic configuration"""
    print("🔧 Testing Configuration...")
    print("-" * 40)
    
    # Check required fields
    checks = [
        ("API_URL", configs.API_URL, "API base URL"),
        ("AUTHORIZATION", configs.AUTHORIZATION, "Authorization token"),
        ("DIFY_DOC_KB_ID", configs.DIFY_DOC_KB_ID, "Knowledge base ID"),
        ("DOC_DIR", configs.DOC_DIR, "CSV directory path")
    ]
    
    all_good = True
    
    for field, value, description in checks:
        if not value or "your-" in str(value) or "xxxx" in str(value):
            print(f"❌ {field}: Not configured ({description})")
            all_good = False
        else:
            # Mask sensitive data
            display_value = value
            if "Bearer" in str(value):
                display_value = f"Bearer dataset-{'*' * 20}..."
            elif len(str(value)) > 30:
                display_value = f"{str(value)[:10]}...{str(value)[-5:]}"
            
            print(f"✅ {field}: {display_value}")
    
    # Check CSV directory
    csv_dir = Path(configs.DOC_DIR)
    if csv_dir.exists():
        csv_files = list(csv_dir.glob("*.csv"))
        print(f"✅ CSV Directory: Found {len(csv_files)} CSV files")
    else:
        print(f"❌ CSV Directory: Not found at {csv_dir}")
        all_good = False
    
    return all_good

def test_api_connection():
    """Test API connection to Dify"""
    print("\n🔌 Testing API Connection...")
    print("-" * 40)
    
    try:
        client = DifyAPIClient()
        
        # Test knowledge base info
        print("📡 Fetching knowledge base info...")
        kb_info = client.get_knowledge_base_info()
        
        if kb_info and 'id' in kb_info:
            print(f"✅ Connected successfully!")
            print(f"   📚 Knowledge Base: {kb_info.get('name', 'Unknown')}")
            print(f"   🆔 ID: {kb_info.get('id', 'Unknown')}")
            print(f"   📄 Document Count: {kb_info.get('document_count', 0)}")
            return True
        else:
            print("❌ Failed to get knowledge base info")
            print(f"   Response: {kb_info}")
            return False
            
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        return False

def test_sample_upload():
    """Test upload with a small sample CSV"""
    print("\n📤 Testing Sample Upload...")
    print("-" * 40)
    
    try:
        # Find the smallest CSV file for testing
        csv_dir = Path(configs.DOC_DIR)
        csv_files = list(csv_dir.glob("*.csv"))
        
        if not csv_files:
            print("❌ No CSV files found for testing")
            return False
        
        # Sort by size and pick the smallest
        csv_files.sort(key=lambda x: x.stat().st_size)
        test_file = csv_files[0]
        
        print(f"📄 Testing with: {test_file.name} ({test_file.stat().st_size:,} bytes)")
        
        client = DifyAPIClient()
        success, message = client.upload_csv_file(str(test_file))
        
        if success:
            print(f"✅ Sample upload successful!")
            print(f"   Message: {message}")
            return True
        else:
            print(f"❌ Sample upload failed: {message}")
            return False
            
    except Exception as e:
        print(f"❌ Sample upload error: {str(e)}")
        return False

def main():
    """Main test function"""
    print("🧪 Dify Upload Configuration Test")
    print("=" * 50)
    
    # Test configuration
    config_ok = test_configuration()
    
    if not config_ok:
        print("\n❌ Configuration test failed!")
        print("Please check your configs.py file and fix the issues above.")
        return
    
    # Test API connection
    connection_ok = test_api_connection()
    
    if not connection_ok:
        print("\n❌ API connection test failed!")
        print("Please check your API credentials and network connection.")
        return
    
    # Ask user if they want to test upload
    print("\n" + "=" * 50)
    response = input("🤔 Do you want to test upload with a sample file? (y/n): ").lower().strip()
    
    if response == 'y' or response == 'yes':
        upload_ok = test_sample_upload()
        
        if upload_ok:
            print("\n🎉 All tests passed! You're ready to upload your CSV files.")
            print("Run: python upload_csv.py")
        else:
            print("\n❌ Upload test failed. Please check the error messages above.")
    else:
        print("\n✅ Configuration and connection tests passed!")
        print("You can now run: python upload_csv.py")

if __name__ == "__main__":
    main()