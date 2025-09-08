"""
Progress Manager for Segmented CSV Upload
View, manage, and resume upload progress
"""

import json
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List

class ProgressManager:
    def __init__(self):
        self.progress_file = Path(__file__).parent / 'upload_progress.json'
        self.csv_dir = Path(__file__).parent.parent.parent / 'exported_csv'
    
    def load_progress(self) -> Dict[str, Any]:
        """Load current progress"""
        if not self.progress_file.exists():
            return {
                'last_segment': 0,
                'uploaded_files': [],
                'failed_files': [],
                'total_uploaded': 0,
                'start_time': None
            }
        
        try:
            with open(self.progress_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"❌ Error loading progress: {e}")
            return {}
    
    def get_csv_files(self) -> List[Path]:
        """Get all CSV files"""
        if not self.csv_dir.exists():
            return []
        return sorted(list(self.csv_dir.glob("*.csv")), key=lambda x: x.stat().st_size)
    
    def show_progress(self):
        """Display current upload progress"""
        progress = self.load_progress()
        all_files = self.get_csv_files()
        total_files = len(all_files)
        
        print("📊 UPLOAD PROGRESS REPORT")
        print("=" * 50)
        
        if not progress or progress['total_uploaded'] == 0:
            print("📝 No upload progress found")
            print(f"📁 Total files ready for upload: {total_files}")
            return
        
        # Basic stats
        uploaded = progress['total_uploaded']
        failed = len(progress.get('failed_files', []))
        processed = uploaded + failed
        remaining = total_files - uploaded
        
        print(f"📁 Total CSV files: {total_files}")
        print(f"✅ Successfully uploaded: {uploaded}")
        print(f"❌ Failed uploads: {failed}")
        print(f"📋 Remaining: {remaining}")
        print(f"📈 Success rate: {(uploaded/processed*100):.1f}%" if processed > 0 else "N/A")
        
        # Time information
        if progress.get('start_time'):
            start_time = datetime.fromisoformat(progress['start_time'])
            if progress.get('last_upload_time'):
                last_time = datetime.fromisoformat(progress['last_upload_time'])
                print(f"🕐 Started: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"🕐 Last upload: {last_time.strftime('%Y-%m-%d %H:%M:%S')}")
            
            # Time estimation
            if uploaded > 0:
                elapsed = datetime.now() - start_time
                avg_time_per_file = elapsed.total_seconds() / uploaded
                estimated_remaining = avg_time_per_file * remaining
                estimated_hours = estimated_remaining / 3600
                print(f"⏱️ Estimated time remaining: {estimated_hours:.1f} hours")
        
        # Segment information
        last_segment = progress.get('last_segment', 0)
        total_segments = (total_files + 9) // 10  # Ceiling division
        print(f"📦 Last completed segment: {last_segment}")
        print(f"📦 Total segments: {total_segments}")
        print(f"📦 Next segment: {last_segment + 1}")
        
        # Recent failures
        failed_files = progress.get('failed_files', [])
        if failed_files:
            print(f"\n❌ Recent failed uploads ({min(5, len(failed_files))} of {len(failed_files)}):")
            for failure in failed_files[-5:]:
                filename = Path(failure['file']).name
                error = failure['error'][:50] + "..." if len(failure['error']) > 50 else failure['error']
                print(f"   - {filename}: {error}")
    
    def list_uploaded_files(self, limit: int = 10):
        """List recently uploaded files"""
        progress = self.load_progress()
        uploaded_files = progress.get('uploaded_files', [])
        
        if not uploaded_files:
            print("📝 No uploaded files found")
            return
        
        print(f"📄 RECENTLY UPLOADED FILES (showing {min(limit, len(uploaded_files))} of {len(uploaded_files)})")
        print("-" * 60)
        
        for upload in uploaded_files[-limit:]:
            filename = upload.get('filename', Path(upload['file']).name)
            doc_id = upload.get('document_id', 'unknown')
            size = upload.get('size', 0)
            upload_time = upload.get('upload_time', 'unknown')
            
            if upload_time != 'unknown':
                try:
                    time_obj = datetime.fromisoformat(upload_time)
                    time_str = time_obj.strftime('%m-%d %H:%M')
                except:
                    time_str = upload_time[:16]
            else:
                time_str = 'unknown'
            
            print(f"{time_str} | {filename}")
            print(f"         | Size: {size:,} bytes | Doc ID: {doc_id[:8]}...")
            print()
    
    def clear_progress(self):
        """Clear all progress (use with caution)"""
        if not self.progress_file.exists():
            print("📝 No progress file to clear")
            return
        
        print("⚠️  WARNING: This will clear all upload progress!")
        print("💡 You will need to re-upload all files from the beginning.")
        
        confirm = input("🤔 Are you sure? Type 'yes' to confirm: ").lower().strip()
        
        if confirm == 'yes':
            try:
                os.remove(self.progress_file)
                print("✅ Progress cleared successfully")
            except Exception as e:
                print(f"❌ Error clearing progress: {e}")
        else:
            print("❌ Operation cancelled")
    
    def export_progress_report(self):
        """Export detailed progress report to file"""
        progress = self.load_progress()
        all_files = self.get_csv_files()
        
        report = {
            'generated_at': datetime.now().isoformat(),
            'summary': {
                'total_files': len(all_files),
                'uploaded_files': progress.get('total_uploaded', 0),
                'failed_files': len(progress.get('failed_files', [])),
                'remaining_files': len(all_files) - progress.get('total_uploaded', 0),
                'last_segment': progress.get('last_segment', 0),
                'start_time': progress.get('start_time'),
                'last_upload_time': progress.get('last_upload_time')
            },
            'uploaded_files': progress.get('uploaded_files', []),
            'failed_files': progress.get('failed_files', [])
        }
        
        report_file = Path(__file__).parent / f'progress_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        
        try:
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            
            print(f"📋 Progress report exported to: {report_file}")
            print(f"📊 Report contains {len(report['uploaded_files'])} uploads and {len(report['failed_files'])} failures")
            
        except Exception as e:
            print(f"❌ Error exporting report: {e}")
    
    def interactive_menu(self):
        """Interactive progress management menu"""
        while True:
            print("\n" + "="*50)
            print("📊 UPLOAD PROGRESS MANAGER")
            print("="*50)
            print("1. 📊 Show current progress")
            print("2. 📄 List recent uploads (10)")
            print("3. 📄 List recent uploads (50)")
            print("4. 📋 Export progress report")
            print("5. 🗑️  Clear progress (dangerous!)")
            print("6. 🚀 Resume upload")
            print("7. ❌ Exit")
            
            try:
                choice = input("\n🤔 Select option (1-7): ").strip()
                
                if choice == '1':
                    self.show_progress()
                
                elif choice == '2':
                    self.list_uploaded_files(10)
                
                elif choice == '3':
                    self.list_uploaded_files(50)
                
                elif choice == '4':
                    self.export_progress_report()
                
                elif choice == '5':
                    self.clear_progress()
                
                elif choice == '6':
                    print("🚀 To resume upload, run:")
                    print("   python segmented_upload.py")
                    break
                
                elif choice == '7':
                    print("👋 Goodbye!")
                    break
                
                else:
                    print("❌ Invalid choice. Please select 1-7.")
                    
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")

def main():
    """Main function"""
    manager = ProgressManager()
    manager.interactive_menu()

if __name__ == "__main__":
    main()