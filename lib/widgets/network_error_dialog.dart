import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class NetworkErrorDialog extends StatelessWidget {
  final String title;
  final String error;
  final VoidCallback? onRetry;
  final VoidCallback? onCancel;

  const NetworkErrorDialog({
    Key? key,
    required this.title,
    required this.error,
    this.onRetry,
    this.onCancel,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      title: Row(
        children: [
          Icon(
            Icons.error_outline,
            color: Theme.of(context).colorScheme.error,
            size: 28,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _getErrorMessage(error),
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 16),
            _buildSolutionSection(context),
            const SizedBox(height: 16),
            _buildTechnicalDetails(context),
          ],
        ),
      ),
      actions: [
        if (onCancel != null)
          TextButton(
            onPressed: onCancel,
            child: const Text('取消'),
          ),
        if (onRetry != null)
          ElevatedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh, size: 18),
            label: const Text('重试'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).primaryColor,
              foregroundColor: Colors.white,
            ),
          ),
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('确定'),
        ),
      ],
    );
  }

  String _getErrorMessage(String error) {
    if (error.contains('HandshakeException')) {
      return '🔐 SSL连接握手失败\n\n这通常是由于网络安全设置或服务器证书问题导致的。';
    } else if (error.contains('SocketException')) {
      return '🌐 网络连接失败\n\n无法建立网络连接，请检查您的网络设置。';
    } else if (error.contains('TimeoutException')) {
      return '⏰ 连接超时\n\n网络响应时间过长，请检查网络速度。';
    } else if (error.contains('DioException')) {
      return '📡 网络请求失败\n\n下载过程中遇到网络问题。';
    } else {
      return error;
    }
  }

  Widget _buildSolutionSection(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.lightbulb_outline, color: Colors.blue.shade700, size: 20),
              const SizedBox(width: 8),
              Text(
                '💡 解决建议',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.blue.shade700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ..._getSolutions(),
        ],
      ),
    );
  }

  List<Widget> _getSolutions() {
    return [
      _buildSolutionItem('1. 检查WiFi或移动网络连接是否正常'),
      _buildSolutionItem('2. 尝试切换网络环境（WiFi ↔ 移动网络）'),
      _buildSolutionItem('3. 关闭VPN或代理软件（如果正在使用）'),
      _buildSolutionItem('4. 重启应用后再次尝试'),
      _buildSolutionItem('5. 稍后再试（可能是服务器临时问题）'),
    ];
  }

  Widget _buildSolutionItem(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Text(
        text,
        style: const TextStyle(fontSize: 14),
      ),
    );
  }

  Widget _buildTechnicalDetails(BuildContext context) {
    return ExpansionTile(
      title: const Text(
        '🔧 技术详情',
        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
      ),
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.grey.shade100,
            borderRadius: BorderRadius.circular(4),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SelectableText(
                error,
                style: const TextStyle(
                  fontSize: 12,
                  fontFamily: 'monospace',
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: error));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('错误信息已复制到剪贴板'),
                            duration: Duration(seconds: 2),
                          ),
                        );
                      },
                      icon: const Icon(Icons.copy, size: 16),
                      label: const Text('复制错误信息'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.grey.shade300,
                        foregroundColor: Colors.black87,
                        textStyle: const TextStyle(fontSize: 12),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  static void show(
    BuildContext context, {
    required String title,
    required String error,
    VoidCallback? onRetry,
    VoidCallback? onCancel,
  }) {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return NetworkErrorDialog(
          title: title,
          error: error,
          onRetry: onRetry,
          onCancel: onCancel,
        );
      },
    );
  }
} 