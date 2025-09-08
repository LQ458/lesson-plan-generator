"""
Segmented CSV Upload Script for Dify with Resume Support
Upload 10 files per minute with automatic resume capability
"""

import os
import json
import time
from pathlib import Path
from typing import List, Dict, Any, Tuple
import requests
from datetime import datetime

import configs

class SegmentedCSVUploader:
    def __init__(self):
        self.api_url = configs.API_URL.rstrip('/')
        self.kb_id = configs.DIFY_DOC_KB_ID
        self.csv_dir = Path(configs.DOC_DIR)
        
        # Progress tracking
        self.progress_file = Path(__file__).parent / 'upload_progress.json'
        self.uploaded_files = []
        self.failed_files = []
        self.current_segment = 0
        
        # Rate limiting: 10 files per minute
        self.files_per_minute = 10
        self.seconds_per_file = 60 / self.files_per_minute  # 6 seconds per file
        
    def load_progress(self) -> Dict[str, Any]:
        """Load previous upload progress"""
        if self.progress_file.exists():
            try:
                with open(self.progress_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"⚠️ Could not load progress file: {e}")
        
        return {
            'last_segment': 0,
            'uploaded_files': [],
            'failed_files': [],
            'total_uploaded': 0,
            'last_upload_time': None,
            'start_time': datetime.now().isoformat()
        }
    
    def save_progress(self, progress_data: Dict[str, Any]):
        """Save current upload progress"""
        try:
            with open(self.progress_file, 'w', encoding='utf-8') as f:
                json.dump(progress_data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"⚠️ Could not save progress: {e}")
    
    def get_csv_files(self) -> List[Path]:
        """Get all CSV files sorted by size"""
        csv_files = list(self.csv_dir.glob("*.csv"))
        csv_files.sort(key=lambda x: x.stat().st_size)
        return csv_files
    
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
    
    def upload_single_csv(self, file_path: Path) -> Tuple[bool, str]:
        """Upload a single CSV file"""
        try:
            file_size = file_path.stat().st_size
            if file_size == 0:
                return False, "Empty file"
            
            if file_size > 50 * 1024 * 1024:
                return False, "File too large (>50MB)"
            
            print(f"  📤 Uploading: {file_path.name} ({file_size:,} bytes)")
            
            clean_filename = self.clean_filename(file_path.name)
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
                    print(f"  ✅ Success! Document ID: {doc_id}")
                    return True, doc_id
                else:
                    return False, "Invalid response format"
                    
            elif response.status_code == 403:
                return False, "Rate limited - will retry in next segment"
                
            elif response.status_code == 429:
                return False, "Too many requests - will retry in next segment"
                
            else:
                error_text = response.text[:200] + "..." if len(response.text) > 200 else response.text
                return False, f"HTTP {response.status_code}: {error_text}"
                
        except requests.exceptions.Timeout:
            return False, "Upload timeout"
        except Exception as e:
            return False, f"Error: {str(e)}"
    
    def upload_segment(self, files: List[Path], segment_num: int) -> Dict[str, Any]:
        """Upload a segment of files (max 10 files)"""
        print(f"\n📦 SEGMENT {segment_num}")
        print(f"🕐 Starting at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"📁 Files in this segment: {len(files)}")
        print("-" * 50)
        
        segment_results = {
            'successful': [],
            'failed': [],
            'start_time': datetime.now().isoformat()
        }
        
        for i, file_path in enumerate(files, 1):
            upload_start = time.time()
            
            print(f"[{i}/{len(files)}] ", end="")
            success, message = self.upload_single_csv(file_path)
            
            if success:
                segment_results['successful'].append({
                    'file': str(file_path),
                    'filename': file_path.name,
                    'document_id': message,
                    'size': file_path.stat().st_size,
                    'upload_time': datetime.now().isoformat()
                })
            else:
                segment_results['failed'].append({
                    'file': str(file_path),
                    'filename': file_path.name,
                    'error': message,
                    'upload_time': datetime.now().isoformat()
                })
                print(f"  ❌ Failed: {message}")
            
            # Rate limiting: ensure we don't exceed 10 files per minute
            upload_duration = time.time() - upload_start
            required_delay = self.seconds_per_file - upload_duration
            
            if required_delay > 0 and i < len(files):
                print(f"  ⏳ Rate limit delay: {required_delay:.1f}s")
                time.sleep(required_delay)
        
        segment_results['end_time'] = datetime.now().isoformat()
        return segment_results
    
    def print_segment_summary(self, segment_results: Dict[str, Any], segment_num: int):
        """Print summary for a completed segment"""
        successful = len(segment_results['successful'])
        failed = len(segment_results['failed'])
        total = successful + failed
        
        print("\n" + "="*50)
        print(f"📊 SEGMENT {segment_num} SUMMARY")
        print("="*50)
        print(f"✅ Successful uploads: {successful}")
        print(f"❌ Failed uploads: {failed}")
        print(f"📈 Success rate: {(successful/total*100):.1f}%" if total > 0 else "N/A")
        
        if segment_results['failed']:
            print("\n❌ Failed files in this segment:")
            for failed in segment_results['failed']:
                print(f"   - {failed['filename']}: {failed['error']}")
    
    def upload_all_segments(self, resume: bool = True):
        """Upload all files in segments of 10 with resume support"""
        print("🚀 Starting Segmented CSV Upload")
        print("⚡ Rate limit: 10 files per minute (6s per file)")
        print("💾 Progress is automatically saved and can be resumed")
        print("="*60)
        
        # Load previous progress
        progress = self.load_progress()
        
        if resume and progress['total_uploaded'] > 0:
            print(f"📂 Resuming from previous session:")
            print(f"   - Last segment: {progress['last_segment']}")
            print(f"   - Total uploaded: {progress['total_uploaded']}")
            print(f"   - Previous failures: {len(progress['failed_files'])}")
            
            response = input(f"\n🤔 Continue from segment {progress['last_segment'] + 1}? (y/n): ").lower().strip()
            if response not in ['y', 'yes']:
                print("🔄 Starting fresh upload...")
                progress = {
                    'last_segment': 0,
                    'uploaded_files': [],
                    'failed_files': [],
                    'total_uploaded': 0,
                    'last_upload_time': None,
                    'start_time': datetime.now().isoformat()
                }
        
        # Get all CSV files
        all_files = self.get_csv_files()
        total_files = len(all_files)
        
        print(f"\n📁 Total files to upload: {total_files}")
        
        # Calculate segments
        files_per_segment = 10
        total_segments = (total_files + files_per_segment - 1) // files_per_segment
        
        # Skip already uploaded files
        start_index = progress['last_segment'] * files_per_segment
        remaining_files = all_files[start_index:]
        
        print(f"📦 Total segments: {total_segments}")
        print(f"🔄 Starting from segment: {progress['last_segment'] + 1}")
        print(f"📋 Remaining files: {len(remaining_files)}")
        
        if not remaining_files:
            print("🎉 All files already uploaded!")
            return
        
        # Process segments
        current_segment = progress['last_segment']
        
        try:
            for i in range(0, len(remaining_files), files_per_segment):
                current_segment += 1
                segment_files = remaining_files[i:i + files_per_segment]
                
                # Upload this segment
                segment_results = self.upload_segment(segment_files, current_segment)
                
                # Update progress
                progress['last_segment'] = current_segment
                progress['uploaded_files'].extend(segment_results['successful'])
                progress['failed_files'].extend(segment_results['failed'])
                progress['total_uploaded'] = len(progress['uploaded_files'])
                progress['last_upload_time'] = datetime.now().isoformat()
                
                # Save progress
                self.save_progress(progress)
                
                # Print segment summary
                self.print_segment_summary(segment_results, current_segment)
                
                # Inter-segment pause (longer break)
                if i + files_per_segment < len(remaining_files):
                    next_segment = current_segment + 1
                    print(f"\n⏳ Preparing for segment {next_segment}...")
                    print("🛌 Taking 30-second break between segments...")
                    time.sleep(30)
        
        except KeyboardInterrupt:
            print("\n⏹️ Upload interrupted by user")
            print("💾 Progress has been saved - you can resume later")
        
        except Exception as e:
            print(f"\n❌ Unexpected error: {str(e)}")
            print("💾 Progress has been saved")
        
        finally:
            self.print_final_summary(progress)
    
    def print_final_summary(self, progress: Dict[str, Any]):
        """Print final upload summary"""
        print("\n" + "="*60)
        print("🏁 FINAL UPLOAD SUMMARY")
        print("="*60)
        
        total_uploaded = progress['total_uploaded']
        total_failed = len(progress['failed_files'])
        total_processed = total_uploaded + total_failed
        
        print(f"✅ Successfully uploaded: {total_uploaded} files")
        print(f"❌ Failed uploads: {total_failed} files")
        print(f"📊 Total processed: {total_processed} files")
        print(f"🎯 Success rate: {(total_uploaded/total_processed*100):.1f}%" if total_processed > 0 else "N/A")
        
        if progress['start_time']:
            start_time = datetime.fromisoformat(progress['start_time'])
            duration = datetime.now() - start_time
            print(f"⏱️ Total duration: {duration}")
        
        if total_uploaded > 0:
            print(f"\n🎉 Your Dify knowledge base now contains {total_uploaded} educational documents!")
            print(f"📚 You can now use these documents in your Dify applications.")
        
        if progress['failed_files']:
            print(f"\n💡 To retry failed uploads, run this script again.")
            print(f"🔄 The script will automatically resume from where it left off.")

def main():
    """Main function"""
    print("🔧 Validating configuration...")
    
    if not configs.validate_config():
        return
    
    uploader = SegmentedCSVUploader()
    
    # Check if there's existing progress
    if uploader.progress_file.exists():
        print(f"📂 Found existing progress file: {uploader.progress_file}")
    
    uploader.upload_all_segments(resume=True)

if __name__ == "__main__":
    main()