#!/usr/bin/env node

/**
 * Upload Only Failed Files
 * Simple script to retry just the 9 failed files
 */

const { exec } = require('child_process');
const path = require('path');

const failedFiles = [
    '义务教育三至六年级·书法练习指导（实验）三年级上册_e55cd9ef.json',
    '义务教育教科书·化学九年级上册_1268b174.json', 
    '义务教育教科书·数学二年级下册_6cea9cae.json',
    '义务教育教科书·数学五年级下册_88c59ed1.json',
    '义务教育教科书·数学八年级上册_ef4b30bb.json',
    '义务教育教科书·音乐（五线谱）五年级上册.json',
    '义务教育教科书·音乐（简谱）九年级下册_a4a1489a.json',
    '科普版_七年级_义务教育教科书·地理七年级下册.json',
    '统编版-人民教育出版社_七年级_义务教育教科书·中国历史七年级上册.json'
];

async function uploadFile(filename) {
    const filePath = path.join('server/rag_data/chunks', filename);
    
    return new Promise((resolve) => {
        console.log(`\n📤 Uploading: ${filename}`);
        console.log(`📂 Path: ${filePath}`);
        
        const command = `node upload-to-cloud.js "${filePath}"`;
        
        const child = exec(command, { timeout: 300000 }); // 5 minute timeout
        
        let output = '';
        let errorOutput = '';
        
        child.stdout.on('data', (data) => {
            output += data;
            process.stdout.write(data);
        });
        
        child.stderr.on('data', (data) => {
            errorOutput += data;
            process.stderr.write(data);
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${filename} - SUCCESS`);
                resolve({ filename, success: true, code });
            } else {
                console.log(`❌ ${filename} - FAILED (exit code: ${code})`);
                resolve({ filename, success: false, code, error: errorOutput });
            }
        });
        
        child.on('error', (error) => {
            console.log(`💥 ${filename} - ERROR: ${error.message}`);
            resolve({ filename, success: false, error: error.message });
        });
    });
}

async function uploadAllFailedFiles() {
    console.log('🚀 Upload Failed Files Only');
    console.log('===========================\n');
    console.log(`📁 Processing ${failedFiles.length} failed files...\n`);
    
    const results = [];
    let successCount = 0;
    
    for (let i = 0; i < failedFiles.length; i++) {
        const filename = failedFiles[i];
        
        console.log(`\n[${i+1}/${failedFiles.length}] Processing: ${filename}`);
        
        const result = await uploadFile(filename);
        results.push(result);
        
        if (result.success) {
            successCount++;
        }
        
        // Wait between files
        if (i < failedFiles.length - 1) {
            console.log('\n⏳ Waiting 10 seconds before next file...');
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }
    
    // Summary
    console.log('\n🎯 Final Results:');
    console.log('================');
    console.log(`✅ Successful: ${successCount}/${failedFiles.length}`);
    console.log(`❌ Failed: ${failedFiles.length - successCount}/${failedFiles.length}`);
    console.log(`📊 Success Rate: ${((successCount/failedFiles.length)*100).toFixed(1)}%`);
    
    if (successCount < failedFiles.length) {
        console.log('\nStill Failed:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`  - ${r.filename} (exit code: ${r.code})`);
        });
    } else {
        console.log('\n🎉 All files uploaded successfully!');
    }
    
    return results;
}

uploadAllFailedFiles().catch(console.error);