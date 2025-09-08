"""
Dify API Client for uploading CSV files to knowledge base
"""

import os
import time
import json
import requests
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

import configs

class DifyAPIClient:
    def __init__(self):
        self.api_url = configs.API_URL.rstrip('/')
        self.kb_id = configs.DIFY_DOC_KB_ID
        
    def upload_csv_file(self, file_path: str, filename: Optional[str] = None) -> Tuple[bool, str]:
        """
        Upload CSV file to Dify knowledge base
        
        Args:
            file_path: Path to CSV file
            filename: Optional custom filename (defaults to original filename)
            
        Returns:
            Tuple of (success: bool, message: str)
        """
        try:
            if not os.path.exists(file_path):
                return False, f"File not found: {file_path}"
            
            file_size = os.path.getsize(file_path)
            if file_size == 0:
                return False, "File is empty"
            
            # Use original filename if not specified
            if not filename:
                filename = os.path.basename(file_path)
            
            print(f"📤 Uploading: {filename} ({file_size:,} bytes)")
            
            # Prepare upload request
            url = f"{self.api_url}/datasets/{self.kb_id}/document/create_by_file"
            
            # Prepare file and data
            with open(file_path, 'rb') as f:
                files = {
                    'file': (filename, f, 'text/csv')
                }
                
                data = {
                    'data': json.dumps(configs.DOC_COMMON_DATA)
                }
                
                headers = configs.get_upload_header()
                
                # Upload file
                response = requests.post(
                    url, 
                    files=files, 
                    data=data, 
                    headers=headers,
                    timeout=300  # 5 minutes timeout
                )
            
            if response.status_code == 200:
                result = response.json()
                
                # Check if upload was successful
                if 'document' in result:
                    doc_id = result['document']['id']
                    print(f"✅ Upload successful! Document ID: {doc_id}")
                    
                    # Wait for processing to complete
                    return self._wait_for_processing(doc_id)
                else:
                    return False, f"Upload response missing document info: {result}"
            
            else:
                error_msg = f"Upload failed with status {response.status_code}: {response.text}"
                print(f"❌ {error_msg}")
                return False, error_msg
                
        except requests.exceptions.Timeout:
            return False, "Upload timed out after 5 minutes"
        except requests.exceptions.RequestException as e:
            return False, f"Network error: {str(e)}"
        except Exception as e:
            return False, f"Unexpected error: {str(e)}"
    
    def _wait_for_processing(self, doc_id: str, max_wait: int = 300) -> Tuple[bool, str]:
        """
        Wait for document processing to complete
        
        Args:
            doc_id: Document ID to check
            max_wait: Maximum wait time in seconds
            
        Returns:
            Tuple of (success: bool, message: str)
        """
        print("⏳ Waiting for document processing...")
        
        url = f"{self.api_url}/datasets/{self.kb_id}/documents/{doc_id}"
        headers = configs.get_header()
        
        start_time = time.time()
        
        while (time.time() - start_time) < max_wait:
            try:
                response = requests.get(url, headers=headers, timeout=30)
                
                if response.status_code == 200:
                    result = response.json()
                    
                    if 'document' in result:
                        status = result['document'].get('indexing_status', 'unknown')
                        
                        if status == 'completed':
                            print("✅ Document processing completed!")
                            return True, "Processing completed successfully"
                        elif status == 'error':
                            error_msg = result['document'].get('error', 'Unknown processing error')
                            print(f"❌ Processing failed: {error_msg}")
                            return False, f"Processing failed: {error_msg}"
                        else:
                            print(f"📊 Processing status: {status}")
                    else:
                        print("⚠️ No document info in response")
                else:
                    print(f"⚠️ Status check failed: {response.status_code}")
                
                # Wait before next check
                time.sleep(5)
                
            except Exception as e:
                print(f"⚠️ Error checking status: {str(e)}")
                time.sleep(5)
        
        return False, f"Processing timeout after {max_wait} seconds"
    
    def list_documents(self) -> Dict[str, Any]:
        """List all documents in the knowledge base"""
        try:
            url = f"{self.api_url}/datasets/{self.kb_id}/documents"
            headers = configs.get_header()
            
            response = requests.get(url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Failed to list documents: {response.status_code} - {response.text}")
                return {}
                
        except Exception as e:
            print(f"❌ Error listing documents: {str(e)}")
            return {}
    
    def delete_document(self, doc_id: str) -> bool:
        """Delete a document from the knowledge base"""
        try:
            url = f"{self.api_url}/datasets/{self.kb_id}/documents/{doc_id}"
            headers = configs.get_header()
            
            response = requests.delete(url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                print(f"✅ Document {doc_id} deleted successfully")
                return True
            else:
                print(f"❌ Failed to delete document: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error deleting document: {str(e)}")
            return False
    
    def get_knowledge_base_info(self) -> Dict[str, Any]:
        """Get information about the knowledge base"""
        try:
            url = f"{self.api_url}/datasets/{self.kb_id}"
            headers = configs.get_header()
            
            response = requests.get(url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Failed to get KB info: {response.status_code} - {response.text}")
                return {}
                
        except Exception as e:
            print(f"❌ Error getting KB info: {str(e)}")
            return {}