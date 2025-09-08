"""
CSV Upload Script for Dify Knowledge Base
Uploads all CSV files from the exported directory to Dify
"""

import os
import time
import json
from pathlib import Path
from typing import List, Dict, Any

import configs
from dify_api import DifyAPIClient

class CSVUploader:
    def __init__(self):
        self.client = DifyAPIClient()
        self.csv_dir = Path(configs.DOC_DIR)
        self.uploaded_files = []
        self.failed_files = []
        
    def get_csv_files(self) -> List[Path]:
        """Get all CSV files from the export directory"""
        if not self.csv_dir.exists():
            print(f"❌ CSV directory not found: {self.csv_dir}")
            return []
        
        csv_files = list(self.csv_dir.glob("*.csv"))
        csv_files.sort(key=lambda x: x.stat().st_size)  # Sort by file size (smallest first)
        
        print(f"📁 Found {len(csv_files)} CSV files in {self.csv_dir}")
        return csv_files
    
    def validate_csv_file(self, file_path: Path) -> bool:
        """Validate CSV file before upload"""
        try:
            # Check file size
            file_size = file_path.stat().st_size
            if file_size == 0:
                print(f"⚠️ Skipping empty file: {file_path.name}")
                return False
            
            if file_size > 50 * 1024 * 1024:  # 50MB limit
                print(f"⚠️ File too large (>50MB): {file_path.name} ({file_size:,} bytes)")
                return False
            
            # Check line count
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = sum(1 for _ in f)
            
            if lines < configs.DOC_MIN_LINES:
                print(f"⚠️ File has too few lines ({lines}): {file_path.name}")
                return False
            
            return True
            
        except Exception as e:
            print(f"⚠️ Error validating {file_path.name}: {str(e)}")
            return False
    
    def upload_single_csv(self, file_path: Path) -> bool:
        """Upload a single CSV file to Dify"""
        try:
            print(f"\n📤 Processing: {file_path.name}")
            
            # Validate file
            if not self.validate_csv_file(file_path):
                self.failed_files.append((str(file_path), "Validation failed"))
                return False
            
            # Create a clean filename for Dify (remove special characters)
            clean_filename = self.clean_filename(file_path.name)
            
            # Upload file
            success, message = self.client.upload_csv_file(str(file_path), clean_filename)
            
            if success:
                self.uploaded_files.append(str(file_path))
                print(f"✅ Successfully uploaded: {clean_filename}")
                return True
            else:
                self.failed_files.append((str(file_path), message))
                print(f"❌ Failed to upload: {clean_filename} - {message}")
                return False
                
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            self.failed_files.append((str(file_path), error_msg))
            print(f"❌ Error processing {file_path.name}: {error_msg}")
            return False
    
    def clean_filename(self, filename: str) -> str:
        """Clean filename for better compatibility with Dify"""
        # Replace problematic characters
        clean_name = filename
        
        # Replace Chinese punctuation and special characters
        replacements = {
            '（': '(',
            '）': ')',
            '·': '_',
            '：': '_',
            '，': '_',
            '。': '_',
            '？': '_',
            '！': '_'
        }
        
        for old, new in replacements.items():
            clean_name = clean_name.replace(old, new)
        
        # Remove multiple underscores
        while '__' in clean_name:
            clean_name = clean_name.replace('__', '_')
        
        # Ensure .csv extension
        if not clean_name.endswith('.csv'):
            clean_name += '.csv'
        
        return clean_name
    
    def upload_all_csvs(self, batch_size: int = 5, delay_between_batches: int = 10):
        """Upload all CSV files in batches"""
        print("🚀 Starting CSV upload to Dify knowledge base...")
        print("=" * 60)
        
        # Get all CSV files
        csv_files = self.get_csv_files()
        if not csv_files:
            print("❌ No CSV files found to upload")
            return
        
        # Process files in batches to avoid overwhelming the API
        total_files = len(csv_files)
        processed = 0
        
        for i in range(0, total_files, batch_size):
            batch = csv_files[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (total_files + batch_size - 1) // batch_size
            
            print(f"\n📦 Processing batch {batch_num}/{total_batches} ({len(batch)} files)")
            print("-" * 40)
            
            # Process each file in the batch
            for file_path in batch:
                self.upload_single_csv(file_path)
                processed += 1
                
                print(f"📊 Progress: {processed}/{total_files} files processed")
                
                # Small delay between individual files
                time.sleep(2)
            
            # Longer delay between batches (except for the last batch)
            if i + batch_size < total_files:
                print(f"⏳ Waiting {delay_between_batches}s before next batch...")
                time.sleep(delay_between_batches)
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print upload summary"""
        print("\n" + "=" * 60)
        print("📊 UPLOAD SUMMARY")
        print("=" * 60)
        
        total_files = len(self.uploaded_files) + len(self.failed_files)
        success_rate = (len(self.uploaded_files) / total_files * 100) if total_files > 0 else 0
        
        print(f"✅ Successfully uploaded: {len(self.uploaded_files)} files")
        print(f"❌ Failed uploads: {len(self.failed_files)} files")
        print(f"📈 Success rate: {success_rate:.1f}%")
        
        if self.failed_files:
            print("\n❌ Failed files:")
            for file_path, error in self.failed_files:
                filename = Path(file_path).name
                print(f"   - {filename}: {error}")
        
        if self.uploaded_files:
            print(f"\n✅ Uploaded files saved to knowledge base: {configs.DIFY_DOC_KB_ID}")
            print("   You can now use these documents in your Dify applications!")

def main():
    """Main function"""
    print("🔧 Validating configuration...")
    
    if not configs.validate_config():
        print("❌ Configuration validation failed. Please check your configs.py file.")
        return
    
    # Create uploader and start upload process
    uploader = CSVUploader()
    
    # Test API connection first
    print("🔌 Testing Dify API connection...")
    kb_info = uploader.client.get_knowledge_base_info()
    if not kb_info:
        print("❌ Failed to connect to Dify API. Please check your configuration.")
        return
    
    print(f"✅ Connected to knowledge base: {kb_info.get('name', 'Unknown')}")
    
    # Start upload process
    try:
        uploader.upload_all_csvs(
            batch_size=3,  # Process 3 files at a time
            delay_between_batches=15  # Wait 15s between batches
        )
    except KeyboardInterrupt:
        print("\n⏹️ Upload interrupted by user")
        uploader.print_summary()
    except Exception as e:
        print(f"\n❌ Upload failed with error: {str(e)}")
        uploader.print_summary()

if __name__ == "__main__":
    main()