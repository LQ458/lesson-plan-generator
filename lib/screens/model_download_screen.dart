import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import '../services/local_ai_model_manager.dart';
import '../services/offline_ai_service.dart';
import '../services/permission_service.dart';
import '../utils/app_theme.dart';

class ModelDownloadScreen extends StatefulWidget {
  const ModelDownloadScreen({super.key});

  @override
  State<ModelDownloadScreen> createState() => _ModelDownloadScreenState();
}

class _ModelDownloadScreenState extends State<ModelDownloadScreen> {
  final LocalAIModelManager _modelManager = LocalAIModelManager();
  final OfflineAIService _offlineAI = OfflineAIService();
  final PermissionService _permissionService = PermissionService();

  List<ModelConfig> _availableModels = [];
  List<String> _downloadedModels = [];
  Map<String, bool> _deviceCompatibility = {};
  Map<String, double> _downloadProgress = {};
  Map<String, bool> _isDownloading = {};
  Map<String, String> _downloadErrors = {};

  @override
  void initState() {
    super.initState();
    _loadModelData();
  }

  Future<void> _loadModelData() async {
    try {
      final models = await _offlineAI.getAvailableModels();
      final downloaded = await _offlineAI.getDownloadedModels();
      final compatibility = await _offlineAI.getDeviceCompatibility();

      if (mounted) {
        setState(() {
          _availableModels = models;
          _downloadedModels = downloaded;
          _deviceCompatibility = compatibility;
        });
      }
    } catch (e) {
      debugPrint('加载模型数据失败: $e');
    }
  }

  Future<void> _downloadModel(String modelId) async {
    if (kIsWeb) {
      _showErrorDialog('Web平台不支持离线模型下载');
      return;
    }

    // 🔐 检查并请求存储权限
    debugPrint('🔐 检查存储权限...');
    final hasPermission = await _permissionService.requestStoragePermission(context);
    
    if (!hasPermission) {
      _showErrorDialog('需要存储权限才能下载AI模型\n\n请允许应用访问设备存储权限，以便下载和管理AI模型文件。');
      return;
    }
    
    debugPrint('✅ 存储权限检查通过');

    setState(() {
      _isDownloading[modelId] = true;
      _downloadProgress[modelId] = 0.0;
      _downloadErrors.remove(modelId);
    });

    try {
      await _modelManager.downloadModel(
        modelId,
        onProgress: (progress) {
          if (mounted) {
            setState(() {
              _downloadProgress[modelId] = progress;
            });
          }
        },
        onSuccess: () async {
          if (mounted) {
            // 重新加载数据以确保状态正确
            await _loadModelData();
            
            setState(() {
              _isDownloading[modelId] = false;
              _downloadProgress.remove(modelId);
              if (!_downloadedModels.contains(modelId)) {
                _downloadedModels.add(modelId);
              }
            });
            
            // 通知主AI服务重新初始化以检测新下载的模型
            try {
              await _offlineAI.initialize();
            } catch (e) {
              debugPrint('重新初始化AI服务失败: $e');
            }
            
            _showSuccessDialog('模型下载完成！离线AI功能已准备就绪。');
          }
        },
        onError: (error) {
          if (mounted) {
            setState(() {
              _isDownloading[modelId] = false;
              _downloadProgress.remove(modelId);
              _downloadErrors[modelId] = error;
            });
            _showErrorDialog('下载失败: $error');
          }
        },
      );
    } catch (e) {
      if (mounted) {
        setState(() {
          _isDownloading[modelId] = false;
          _downloadProgress.remove(modelId);
          _downloadErrors[modelId] = e.toString();
        });
        _showErrorDialog('下载失败: $e');
      }
    }
  }

  Future<void> _deleteModel(String modelId) async {
    final success = await _offlineAI.deleteModel(modelId);
    if (success) {
      setState(() {
        _downloadedModels.remove(modelId);
      });
      _showSuccessDialog('模型已删除');
    } else {
      _showErrorDialog('删除模型失败');
    }
  }

  Future<void> _switchModel(String modelId) async {
    final success = await _offlineAI.switchModel(modelId);
    if (success) {
      _showSuccessDialog('已切换到模型: ${_getModelName(modelId)}');
    } else {
      _showErrorDialog('切换模型失败');
    }
  }

  String _getModelName(String modelId) {
    final model = _availableModels.firstWhere(
      (m) => m.id == modelId,
      orElse: () => const ModelConfig(
        id: '',
        name: '未知模型',
        description: '',
        size: 0,
        downloadUrl: '',
        mirrorUrls: [],
        sha256: '',
        format: '',
        capabilities: [],
        requirements: {},
      ),
    );
    return model.name;
  }

  void _showErrorDialog(String message) {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('错误'),
        content: Text(message),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.pop(context),
            child: const Text('确定'),
          ),
        ],
      ),
    );
  }

  void _showSuccessDialog(String message) {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('成功'),
        content: Text(message),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.pop(context),
            child: const Text('确定'),
          ),
        ],
      ),
    );
  }

  void _showDeleteConfirmDialog(String modelId, String modelName) {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('删除模型'),
        content: Text('确定要删除"$modelName"吗？'),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          CupertinoDialogAction(
            isDestructiveAction: true,
            onPressed: () {
              Navigator.pop(context);
              _deleteModel(modelId);
            },
            child: const Text('删除'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('AI模型管理'),
      ),
      child: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadModelData,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _buildHeader(),
              const SizedBox(height: 20),
              if (kIsWeb)
                _buildWebNotice()
              else
                ..._buildModelCards(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.systemGray6,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '🤖 AI模型管理',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '下载并管理本地AI模型，实现离线教案生成',
            style: TextStyle(
              fontSize: 14,
              color: AppTheme.secondaryText,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.systemBlue.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(
                  CupertinoIcons.lightbulb,
                  color: AppTheme.systemBlue,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '建议选择轻量版模型，适合中低端设备运行',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.systemBlue,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWebNotice() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.systemOrange.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.systemOrange.withOpacity(0.3),
        ),
      ),
      child: Column(
        children: [
          Icon(
            CupertinoIcons.globe,
            color: AppTheme.systemOrange,
            size: 48,
          ),
          const SizedBox(height: 12),
          const Text(
            'Web版本限制',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Web平台不支持离线AI模型下载和运行\n请使用移动端应用体验离线AI功能',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: AppTheme.secondaryText,
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildModelCards() {
    return _availableModels.map((model) => _buildModelCard(model)).toList();
  }

  Widget _buildModelCard(ModelConfig model) {
    final isDownloaded = _downloadedModels.contains(model.id);
    final isCompatible = _deviceCompatibility[model.id] ?? false;
    final isDownloading = _isDownloading[model.id] ?? false;
    final downloadProgress = _downloadProgress[model.id] ?? 0.0;
    final downloadError = _downloadErrors[model.id];
    final isCurrentModel = _offlineAI.currentModelId == model.id;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: CupertinoColors.systemBackground,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isCurrentModel 
              ? AppTheme.systemGreen 
              : AppTheme.systemGray5,
          width: isCurrentModel ? 2 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          model.name,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (isCurrentModel) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: AppTheme.systemGreen,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              '当前',
                              style: TextStyle(
                                fontSize: 10,
                                color: CupertinoColors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      model.description,
                      style: TextStyle(
                        fontSize: 12,
                        color: AppTheme.secondaryText,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                model.formattedSize,
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.secondaryText,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          
          // 功能标签
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: model.capabilities.map((capability) => 
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppTheme.systemBlue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  capability,
                  style: TextStyle(
                    fontSize: 10,
                    color: AppTheme.systemBlue,
                  ),
                ),
              ),
            ).toList(),
          ),
          
          const SizedBox(height: 12),
          
          // 设备兼容性
          if (!isCompatible)
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.systemRed.withOpacity(0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                children: [
                  Icon(
                    CupertinoIcons.exclamationmark_triangle,
                    color: AppTheme.systemRed,
                    size: 16,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '设备不兼容：需要更多RAM或存储空间',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppTheme.systemRed,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          
          // 下载进度
          if (isDownloading) ...[
            const SizedBox(height: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      '下载中...',
                      style: TextStyle(fontSize: 12),
                    ),
                    Text(
                      '${(downloadProgress * 100).toInt()}%',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                LinearProgressIndicator(
                  value: downloadProgress,
                  backgroundColor: AppTheme.systemGray5,
                  valueColor: AlwaysStoppedAnimation<Color>(AppTheme.systemBlue),
                ),
              ],
            ),
          ],
          
          // 错误信息
          if (downloadError != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.systemRed.withOpacity(0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                '下载失败: $downloadError',
                style: TextStyle(
                  fontSize: 11,
                  color: AppTheme.systemRed,
                ),
              ),
            ),
          ],
          
          const SizedBox(height: 12),
          
          // 操作按钮
          Row(
            children: [
              if (!isDownloaded && !isDownloading) ...[
                Expanded(
                  child: CupertinoButton(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    color: isCompatible ? AppTheme.systemBlue : AppTheme.systemGray,
                    onPressed: isCompatible ? () => _downloadModel(model.id) : null,
                    child: Text(
                      isCompatible ? '下载' : '不兼容',
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                ),
              ] else if (isDownloading) ...[
                Expanded(
                  child: CupertinoButton(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    color: AppTheme.systemGray,
                    onPressed: null,
                    child: const Text(
                      '下载中...',
                      style: TextStyle(fontSize: 14),
                    ),
                  ),
                ),
              ] else ...[
                if (!isCurrentModel)
                  Expanded(
                    child: CupertinoButton(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      color: AppTheme.systemGreen,
                      onPressed: () => _switchModel(model.id),
                      child: const Text(
                        '使用',
                        style: TextStyle(fontSize: 14),
                      ),
                    ),
                  )
                else
                  Expanded(
                    child: CupertinoButton(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      color: AppTheme.systemGray,
                      onPressed: null,
                      child: const Text(
                        '当前使用',
                        style: TextStyle(fontSize: 14),
                      ),
                    ),
                  ),
                const SizedBox(width: 8),
                CupertinoButton(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  color: AppTheme.systemRed,
                  onPressed: () => _showDeleteConfirmDialog(model.id, model.name),
                  child: const Text(
                    '删除',
                    style: TextStyle(fontSize: 14),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
} 