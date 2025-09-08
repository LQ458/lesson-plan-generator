"""
Simplified CSV Upload Script for Dify
Uploads CSV files without waiting for processing completion
"""

import os
import time
import json
from pathlib import Path
from typing import List, Dict, Any
import requests

import configs

class SimpleCSVUploader:
    def __init__(self):
        self.api_url = configs.API_URL.rstrip('/')
        self.kb_id = configs.DIFY_DOC_KB_ID
        self.csv_dir = Path(configs.DOC_DIR)
        self.uploaded_files = []
        self.failed_files = []
        
    def clean_filename(self, filename: str) -> str:
        """Clean filename for better compatibility"""
        clean_name = filename
        replacements = {
            '（': '(',
            '）': ')',
            '·': '_',
            '：': '_',
            '，': '_',
            '。': '_',
        }
        
        for old, new in replacements.items():
            clean_name = clean_name.replace(old, new)
        
        while '__' in clean_name:
            clean_name = clean_name.replace('__', '_')
        
        return clean_name
    
    def upload_single_csv(self, file_path: Path) -> bool:
        """Upload a single CSV file to Dify (no waiting)"""
        try:
            print(f"\n📤 Processing: {file_path.name}")
            
            # Check file size
            file_size = file_path.stat().st_size
            if file_size == 0:
                print(f"⚠️ Skipping empty file")
                self.failed_files.append((str(file_path), "Empty file"))
                return False
            
            if file_size > 50 * 1024 * 1024:  # 50MB limit
                print(f"⚠️ File too large: {file_size:,} bytes")
                self.failed_files.append((str(file_path), "File too large"))
                return False
            
            print(f"📤 Uploading: {file_size:,} bytes")
            
            # Clean filename
            clean_filename = self.clean_filename(file_path.name)
            
            # Upload request
            url = f"{self.api_url}/datasets/{self.kb_id}/document/create_by_file"
            
            with open(file_path, 'rb') as f:
                files = {
                    'file': (clean_filename, f, 'text/csv')
                }
                
                data = {
                    'data': json.dumps(configs.DOC_COMMON_DATA)
                }
                
                headers = configs.get_upload_header()
                
                response = requests.post(
                    url, 
                    files=files, 
                    data=data, 
                    headers=headers,
                    timeout=120  # 2 minutes timeout
                )
            
            if response.status_code == 200:
                result = response.json()
                
                if 'document' in result:
                    doc_id = result['document']['id']
                    print(f"✅ Upload successful! Document ID: {doc_id}")
                    self.uploaded_files.append((str(file_path), doc_id))
                    return True
                else:
                    print(f"❌ Upload response missing document info")
                    self.failed_files.append((str(file_path), "Invalid response format"))
                    return False
            else:
                error_msg = f"HTTP {response.status_code}: {response.text}"
                print(f"❌ Upload failed: {error_msg}")
                self.failed_files.append((str(file_path), error_msg))
                return False
                
        except Exception as e:
            error_msg = f"Error: {str(e)}"
            print(f"❌ {error_msg}")
            self.failed_files.append((str(file_path), error_msg))
            return False
    
    def upload_all_csvs(self, batch_size: int = 5, delay: int = 3):
        """Upload all CSV files"""
        print("🚀 Starting simplified CSV upload...")
        print("=" * 50)
        
        # Get all CSV files
        csv_files = list(self.csv_dir.glob("*.csv"))
        csv_files.sort(key=lambda x: x.stat().st_size)  # Smallest first
        
        if not csv_files:
            print("❌ No CSV files found")
            return
        
        print(f"📁 Found {len(csv_files)} CSV files")
        
        total_files = len(csv_files)
        processed = 0
        
        for i, file_path in enumerate(csv_files, 1):
            print(f"\n[{i}/{total_files}] ", end="")
            
            success = self.upload_single_csv(file_path)
            processed += 1
            
            # Progress update
            success_rate = len(self.uploaded_files) / processed * 100
            print(f"📊 Progress: {processed}/{total_files} | Success: {success_rate:.1f}%")
            
            # Delay between uploads
            if processed < total_files:
                print(f"⏳ Waiting {delay}s...")
                time.sleep(delay)
            
            # Batch processing (longer pause every batch_size uploads)
            if processed % batch_size == 0 and processed < total_files:
                print(f"📦 Completed batch of {batch_size}, pausing 10s...")
                time.sleep(10)
        
        self.print_summary()
    
    def print_summary(self):
        """Print upload summary"""
        print("\n" + "=" * 50)
        print("📊 UPLOAD SUMMARY")
        print("=" * 50)
        
        total = len(self.uploaded_files) + len(self.failed_files)
        success_rate = len(self.uploaded_files) / total * 100 if total > 0 else 0
        
        print(f"✅ Successfully uploaded: {len(self.uploaded_files)} files")
        print(f"❌ Failed uploads: {len(self.failed_files)} files")
        print(f"📈 Success rate: {success_rate:.1f}%")
        
        if self.uploaded_files:
            print(f"\n🎉 {len(self.uploaded_files)} files are now in your Dify knowledge base!")
            print("📚 Document processing will continue in the background.")
            
        if self.failed_files:
            print("\n❌ Failed files:")
            for file_path, error in self.failed_files:
                filename = Path(file_path).name
                print(f"   - {filename}: {error}")

def main():
    """Main function"""
    print("🔧 Validating configuration...")
    
    if not configs.validate_config():
        return
    
    uploader = SimpleCSVUploader()
    
    try:
        uploader.upload_all_csvs(
            batch_size=5,    # 5 files per batch
            delay=2         # 2 seconds between files
        )
    except KeyboardInterrupt:
        print("\n⏹️ Upload interrupted by user")
        uploader.print_summary()
    except Exception as e:
        print(f"\n❌ Upload failed: {str(e)}")
        uploader.print_summary()

if __name__ == "__main__":
    main()