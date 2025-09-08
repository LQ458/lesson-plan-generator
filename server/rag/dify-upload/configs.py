"""
Dify Upload Configuration
Configure your Dify API credentials and upload settings here
"""

# ================== Dify API Configuration ==================
# Your Dify API base URL (replace with your actual Dify instance)
API_URL = 'https://api.dify.ai/v1'

# Your Dify API authorization token (get this from Dify console)
# 请替换为你的数据集API token (格式: dataset-xxxxxxxxxxxxxxxxxxxx)
AUTHORIZATION = 'Bearer dataset-hyi5rqQxPGQLYjPDdryxEjFB'

# Your knowledge base ID (get this from Dify knowledge base URL)
DIFY_DOC_KB_ID = '33ae16b6-6da6-40f8-89fc-3b2609eb8eda'

# ================== Document Upload Settings ==================
DOC_COMMON_DATA = {
    "indexing_technique": "high_quality",  # Options: "economy", "high_quality"
    "process_rule": {
        "rules": {
            "pre_processing_rules": [
                {
                    "id": "remove_extra_spaces",
                    "enabled": True
                },
                {
                    "id": "remove_urls_emails", 
                    "enabled": False
                }
            ],
            "segmentation": {
                "separator": "\\n\\n",  # Separator for text chunks
                "max_tokens": 1000      # Max tokens per chunk
            }
        },
        "mode": "automatic"  # Options: "automatic", "manual"
    }
}

# ================== File Processing Settings ==================
# Directory containing CSV files to upload
DOC_DIR = '/Users/LeoQin/Documents/GitHub/lesson-plan-generator/server/rag/exported_csv'

# File extensions to process (adding CSV support)
DOC_SUFFIX = 'csv'

# Minimum lines required in file to process
DOC_MIN_LINES = 2  # CSV needs at least header + 1 data row

# ================== Database Configuration (Optional) ==================
# PostgreSQL configuration for tracking uploaded files
PG_HOST = 'localhost'
PG_PORT = 5432
PG_USER = 'your_username'
PG_PASSWORD = 'your_password' 
PG_DATABASE = 'dify_upload'

# ================== Helper Functions ==================
def get_header():
    """Get authorization headers for Dify API"""
    return {
        'Authorization': AUTHORIZATION,
        'Content-Type': 'application/json'
    }

def get_upload_header():
    """Get headers for file upload (no Content-Type for multipart)"""
    return {
        'Authorization': AUTHORIZATION
    }

# ================== Configuration Validation ==================
def validate_config():
    """Validate configuration settings"""
    errors = []
    
    if not API_URL:
        errors.append("API_URL is required")
    
    if not AUTHORIZATION or AUTHORIZATION == 'Bearer dataset-xxxxxxxxxxxxxxxxxxxxxxxxxxxx':
        errors.append("AUTHORIZATION token is required (get from Dify console)")
    
    if not DIFY_DOC_KB_ID or DIFY_DOC_KB_ID == 'your-knowledge-base-id-here':
        errors.append("DIFY_DOC_KB_ID is required (get from Dify knowledge base)")
    
    if not DOC_DIR:
        errors.append("DOC_DIR is required")
    
    if errors:
        print("❌ Configuration errors:")
        for error in errors:
            print(f"   - {error}")
        return False
    
    print("✅ Configuration validated successfully")
    return True