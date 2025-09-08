"""
Slow CSV Upload Script for Dify - Respects Rate Limits
Upload with much longer delays to avoid rate limiting
"""

import os
import time
import json
from pathlib import Path
from typing import List, Dict, Any
import requests

import configs

class SlowCSVUploader:
    def __init__(self):
        self.api_url = configs.API_URL.rstrip('/')
        self.kb_id = configs.DIFY_DOC_KB_ID
        self.csv_dir = Path(configs.DOC_DIR)
        self.uploaded_files = []
        self.failed_files = []
        self.rate_limited = False
        
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
    
    def upload_single_csv(self, file_path: Path) -> tuple[bool, str]:
        """Upload a single CSV file to Dify"""
        try:
            print(f"\n📤 Processing: {file_path.name}")
            
            # Check file size
            file_size = file_path.stat().st_size
            if file_size == 0:
                return False, "Empty file"
            
            if file_size > 50 * 1024 * 1024:  # 50MB limit
                return False, "File too large"
            
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
                    timeout=120
                )
            
            if response.status_code == 200:
                result = response.json()
                if 'document' in result:
                    doc_id = result['document']['id']
                    print(f"✅ Upload successful! Document ID: {doc_id}")
                    return True, doc_id
                else:
                    return False, "Invalid response format"
                    
            elif response.status_code == 403:
                # Rate limited
                self.rate_limited = True
                return False, "Rate limited"
                
            else:
                error_msg = f"HTTP {response.status_code}: {response.text}"
                return False, error_msg
                
        except Exception as e:
            return False, f"Error: {str(e)}"
    
    def upload_all_csvs_slowly(self):
        """Upload CSV files with long delays to respect rate limits"""
        print("🐌 Starting SLOW CSV upload to respect rate limits...")
        print("⚠️  This will take several hours to complete all 543 files")
        print("=" * 60)
        
        # Get CSV files, starting from where we left off
        csv_files = list(self.csv_dir.glob("*.csv"))
        csv_files.sort(key=lambda x: x.stat().st_size)
        
        # Skip the first 10 files that were already uploaded
        remaining_files = csv_files[10:]
        
        print(f"📁 Remaining files to upload: {len(remaining_files)}")
        print(f"📊 Already uploaded: 10 files")
        
        if not remaining_files:
            print("✅ All files already uploaded!")
            return
        
        # Very conservative timing
        base_delay = 30  # 30 seconds between uploads
        rate_limit_delay = 300  # 5 minutes if rate limited
        
        total_uploaded = 10  # Already uploaded
        
        for i, file_path in enumerate(remaining_files, 11):
            print(f"\n[{i}/543] ", end="")
            
            success, message = self.upload_single_csv(file_path)
            
            if success:
                self.uploaded_files.append((str(file_path), message))
                total_uploaded += 1
                print(f"✅ Success! Total uploaded: {total_uploaded}/543")
                
                # Normal delay after success
                if i < 543:
                    print(f"⏳ Waiting {base_delay}s before next upload...")
                    time.sleep(base_delay)
                    
            else:
                self.failed_files.append((str(file_path), message))
                
                if self.rate_limited or "rate limit" in message.lower():
                    print(f"🛑 Rate limited! Waiting {rate_limit_delay}s...")
                    time.sleep(rate_limit_delay)
                    self.rate_limited = False
                    
                    # Retry once after rate limit
                    print("🔄 Retrying after rate limit pause...")
                    success, message = self.upload_single_csv(file_path)
                    
                    if success:
                        self.uploaded_files.append((str(file_path), message))
                        total_uploaded += 1
                        print(f"✅ Retry success! Total: {total_uploaded}/543")
                    else:
                        print(f"❌ Retry failed: {message}")
                else:
                    print(f"❌ Failed: {message}")
            
            # Progress update
            if total_uploaded > 10:
                success_rate = total_uploaded / i * 100
                print(f"📈 Progress: {i}/543 files | Success: {success_rate:.1f}%")
            
            # Every 10 uploads, take a longer break
            if i % 10 == 0:
                print(f"📦 Completed 10 uploads, taking 2-minute break...")
                time.sleep(120)
        
        self.print_summary(total_uploaded)
    
    def print_summary(self, total_uploaded):
        """Print upload summary"""
        print("\n" + "=" * 60)
        print("📊 SLOW UPLOAD SUMMARY")
        print("=" * 60)
        
        new_uploads = len(self.uploaded_files)
        failed_uploads = len(self.failed_files)
        
        print(f"✅ Total uploaded (including previous): {total_uploaded} files")
        print(f"✅ New uploads in this session: {new_uploads} files")
        print(f"❌ Failed uploads: {failed_uploads} files")
        
        if total_uploaded > 0:
            success_rate = total_uploaded / 543 * 100
            print(f"📈 Overall success rate: {success_rate:.1f}%")
            print(f"\n🎉 Your Dify knowledge base now contains {total_uploaded} educational documents!")
        
        if self.failed_files:
            print("\n❌ Failed files in this session:")
            for file_path, error in self.failed_files:
                filename = Path(file_path).name
                print(f"   - {filename}: {error}")

def main():
    """Main function"""
    print("🔧 Validating configuration...")
    
    if not configs.validate_config():
        return
    
    # Ask user to confirm slow upload
    print("\n⚠️  WARNING: This will upload remaining 533 files very slowly")
    print("⏰ Estimated time: 4-6 hours (30s delay + processing time)")
    print("💡 You can stop anytime with Ctrl+C and resume later")
    
    response = input("\n🤔 Continue with slow upload? (y/n): ").lower().strip()
    
    if response not in ['y', 'yes']:
        print("❌ Upload cancelled")
        return
    
    uploader = SlowCSVUploader()
    
    try:
        uploader.upload_all_csvs_slowly()
    except KeyboardInterrupt:
        print("\n⏹️ Upload interrupted by user")
        uploader.print_summary(10 + len(uploader.uploaded_files))
    except Exception as e:
        print(f"\n❌ Upload failed: {str(e)}")
        uploader.print_summary(10 + len(uploader.uploaded_files))

if __name__ == "__main__":
    main()