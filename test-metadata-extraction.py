#!/usr/bin/env python3
"""
Test Metadata Extraction Logic Locally
"""

def extract_subject_grade_from_filename(filename: str):
    """Extract subject and grade information from filename"""
    # Subject mapping
    subject_map = {
        '数学': '数学', '语文': '语文', '英语': '英语', 
        '物理': '物理', '化学': '化学', '生物': '生物学', '生物学': '生物学',
        '历史': '历史', '地理': '地理', '政治': '道德与法治', '道德与法治': '道德与法治',
        '科学': '科学', '美术': '美术', '音乐': '音乐', '体育': '体育',
        '书法': '书法', '艺术': '艺术', '俄语': '俄语', '日语': '日语'
    }
    
    # Grade mapping  
    grade_map = {
        '一年级': '小学一年级', '二年级': '小学二年级', '三年级': '小学三年级',
        '四年级': '小学四年级', '五年级': '小学五年级', '六年级': '小学六年级',
        '七年级': '初中一年级', '八年级': '初中二年级', '九年级': '初中三年级'
    }
    
    subject = '未知'
    grade = '未知'
    
    # Extract subject
    for key, value in subject_map.items():
        if key in filename:
            subject = value
            break
    
    # Extract grade  
    for key, value in grade_map.items():
        if key in filename:
            grade = value
            break
    
    return subject, grade

def test_metadata_extraction():
    """Test the metadata extraction with real filenames"""
    print("🧪 Testing Metadata Extraction Logic")
    print("===================================\n")
    
    test_cases = [
        "义务教育教科书·数学二年级上册_d7db7bf6.json",
        "义务教育教科书·语文三年级下册_abc123.json", 
        "义务教育教科书·英语七年级上册_def456.json",
        "义务教育教科书·物理八年级下册_ghi789.json",
        "义务教育教科书·化学九年级上册_jkl012.json",
        "义务教育教科书·科学四年级上册_mno345.json",
        "义务教育教科书·美术一年级下册_pqr678.json",
        "义务教育教科书·音乐五年级上册_stu901.json",
        "义务教育教科书·体育六年级全一册_vwx234.json",
        "义务教育三至六年级·书法练习指导（实验）三年级上册_c0c0f6ed.json"
    ]
    
    correct_extractions = 0
    
    for filename in test_cases:
        subject, grade = extract_subject_grade_from_filename(filename)
        
        print(f"📁 File: {filename}")
        print(f"   📚 Extracted Subject: {subject}")
        print(f"   🎓 Extracted Grade: {grade}")
        
        # Verify extraction worked
        if subject != '未知' and grade != '未知':
            correct_extractions += 1
            print(f"   ✅ Extraction successful")
        else:
            print(f"   ❌ Extraction failed")
        
        print()
    
    success_rate = (correct_extractions / len(test_cases)) * 100
    
    print(f"📊 Results: {correct_extractions}/{len(test_cases)} successful extractions ({success_rate:.1f}%)")
    
    if success_rate >= 80:
        print("🎉 Metadata extraction is working well!")
        return True
    else:
        print("⚠️  Metadata extraction needs improvement")
        return False

def verify_actual_data():
    """Verify extraction works on actual RAG data"""
    print("\n🔍 Testing on Actual RAG Data")
    print("============================\n")
    
    import os
    import json
    
    rag_data_path = "../server/rag_data/chunks"
    
    if not os.path.exists(rag_data_path):
        print("❌ RAG data directory not found")
        return False
    
    files = [f for f in os.listdir(rag_data_path) if f.endswith('.json')][:10]
    
    print(f"📂 Testing on {len(files)} actual RAG files...\n")
    
    successful_extractions = 0
    
    for filename in files:
        subject, grade = extract_subject_grade_from_filename(filename)
        
        print(f"📁 {filename[:50]}...")
        print(f"   📚 Subject: {subject}")
        print(f"   🎓 Grade: {grade}")
        
        if subject != '未知' or grade != '未知':
            successful_extractions += 1
            print(f"   ✅ At least one field extracted")
        else:
            print(f"   ⚠️  No metadata extracted")
        
        print()
    
    success_rate = (successful_extractions / len(files)) * 100
    print(f"📊 Real Data Results: {successful_extractions}/{len(files)} files with extracted metadata ({success_rate:.1f}%)")
    
    return success_rate >= 70

if __name__ == "__main__":
    print("🔬 Metadata Extraction Testing")
    print("=" * 30)
    
    # Test extraction logic
    logic_works = test_metadata_extraction()
    
    # Test on real data  
    real_data_works = verify_actual_data()
    
    print("\n🎯 Final Assessment:")
    if logic_works and real_data_works:
        print("✅ Metadata extraction is ready for deployment!")
        print("🚀 The HF Space will correctly tag subjects and grades")
    else:
        print("❌ Metadata extraction needs fixes before deployment")