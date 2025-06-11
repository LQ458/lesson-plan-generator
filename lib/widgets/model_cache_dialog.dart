import 'package:flutter/material.dart';
import '../services/model_cache_manager.dart';

/// 模型缓存管理对话框
class ModelCacheDialog extends StatefulWidget {
  const ModelCacheDialog({Key? key}) : super(key: key);

  @override
  _ModelCacheDialogState createState() => _ModelCacheDialogState();
}

class _ModelCacheDialogState extends State<ModelCacheDialog> {
  final ModelCacheManager _cacheManager = ModelCacheManager();
  Map<String, dynamic>? _cacheInfo;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadCacheInfo();
  }

  Future<void> _loadCacheInfo() async {
    setState(() => _loading = true);
    try {
      final info = await _cacheManager.getCacheInfo();
      setState(() {
        _cacheInfo = info;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('获取缓存信息失败: $e')),
      );
    }
  }

  Future<void> _clearAllCache() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('🗑️ 清理所有缓存'),
        content: const Text('确定要清理所有已下载的AI模型吗？\n\n这将删除所有缓存文件，下次使用时需要重新下载。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('确认清理'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await _cacheManager.clearAllCache();
        await _loadCacheInfo();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ 缓存已清理')),
        );
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('清理失败: $e')),
        );
      }
    }
  }

  Future<void> _clearModelCache(String modelId) async {
    try {
      await _cacheManager.clearModelCache(modelId);
      await _loadCacheInfo();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('✅ 已清理模型: $modelId')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('清理失败: $e')),
      );
    }
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Container(
        width: MediaQuery.of(context).size.width * 0.8,
        height: MediaQuery.of(context).size.height * 0.7,
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 标题栏
            Row(
              children: [
                const Icon(Icons.storage, size: 24),
                const SizedBox(width: 8),
                const Text(
                  '💾 AI模型缓存管理',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const Divider(),
            
            // 缓存概览
            if (_loading)
              const Center(child: CircularProgressIndicator())
            else if (_cacheInfo != null) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '📊 缓存概览',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.blue.shade700,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text('已缓存模型: ${_cacheInfo!['modelCount']} 个'),
                          Text('总大小: ${_formatFileSize(_cacheInfo!['totalSize'])}'),
                        ],
                      ),
                    ),
                    FilledButton.icon(
                      onPressed: _clearAllCache,
                      icon: const Icon(Icons.delete_sweep),
                      label: const Text('清理全部'),
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.red,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              
              // 模型列表
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '📋 已缓存的模型',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Expanded(
                      child: _cacheInfo!['models'].isEmpty
                          ? const Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.inbox, size: 64, color: Colors.grey),
                                  SizedBox(height: 16),
                                  Text(
                                    '😊 还没有缓存的AI模型',
                                    style: TextStyle(
                                      fontSize: 16,
                                      color: Colors.grey,
                                    ),
                                  ),
                                  Text(
                                    '下载模型后，这里会显示缓存信息',
                                    style: TextStyle(color: Colors.grey),
                                  ),
                                ],
                              ),
                            )
                          : ListView.builder(
                              itemCount: _cacheInfo!['models'].length,
                              itemBuilder: (context, index) {
                                final modelId = _cacheInfo!['models'].keys.elementAt(index);
                                final modelInfo = _cacheInfo!['models'][modelId];
                                
                                return Card(
                                  child: ListTile(
                                    leading: Icon(
                                      modelInfo['exists'] ? Icons.check_circle : Icons.error,
                                      color: modelInfo['exists'] ? Colors.green : Colors.red,
                                    ),
                                    title: Text(modelId),
                                    subtitle: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('大小: ${_formatFileSize(modelInfo['size'])}'),
                                        Text(
                                          '状态: ${modelInfo['exists'] ? '✅ 可用' : '❌ 文件缺失'}',
                                          style: TextStyle(
                                            color: modelInfo['exists'] ? Colors.green : Colors.red,
                                          ),
                                        ),
                                      ],
                                    ),
                                    trailing: IconButton(
                                      onPressed: () => _clearModelCache(modelId),
                                      icon: const Icon(Icons.delete, color: Colors.red),
                                      tooltip: '删除这个模型',
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            ],
            
            // 底部按钮
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _loadCacheInfo,
                    icon: const Icon(Icons.refresh),
                    label: const Text('刷新'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.check),
                    label: const Text('完成'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
} 