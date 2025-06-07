import 'package:flutter/cupertino.dart';
import 'package:loader_overlay/loader_overlay.dart';
import 'package:loading_animation_widget/loading_animation_widget.dart';

class LoadingService {
  // 显示loading
  static void show(BuildContext context, {String? message}) {
    context.loaderOverlay.show(progress: message);
  }

  // 隐藏loading
  static void hide(BuildContext context) {
    context.loaderOverlay.hide();
  }

  // 检查loading是否显示
  static bool isVisible(BuildContext context) {
    return context.loaderOverlay.visible;
  }

  // 更新loading消息
  static void updateProgress(BuildContext context, String message) {
    context.loaderOverlay.progress(message);
  }

  // 执行异步操作并显示loading
  static Future<T> withLoading<T>(
    BuildContext context,
    Future<T> Function() operation, {
    String? loadingMessage,
    String? successMessage,
  }) async {
    try {
      show(context, message: loadingMessage ?? '正在处理...');
      final result = await operation();
      hide(context);
      
      if (successMessage != null) {
        _showSuccessMessage(context, successMessage);
      }
      
      return result;
    } catch (e) {
      hide(context);
      _showErrorMessage(context, '操作失败: ${e.toString()}');
      rethrow;
    }
  }

  // 显示成功消息
  static void _showSuccessMessage(BuildContext context, String message) {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(CupertinoIcons.checkmark_circle, color: CupertinoColors.systemGreen),
            SizedBox(width: 8),
            Text('成功'),
          ],
        ),
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

  // 显示错误消息
  static void _showErrorMessage(BuildContext context, String message) {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(CupertinoIcons.exclamationmark_triangle, color: CupertinoColors.systemRed),
            SizedBox(width: 8),
            Text('错误'),
          ],
        ),
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

  // 显示确认对话框
  static Future<bool> showConfirmDialog(
    BuildContext context, {
    required String title,
    required String content,
    String confirmText = '确定',
    String cancelText = '取消',
  }) async {
    final result = await showCupertinoDialog<bool>(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: Text(title),
        content: Text(content),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.pop(context, false),
            child: Text(cancelText),
          ),
          CupertinoDialogAction(
            onPressed: () => Navigator.pop(context, true),
            child: Text(confirmText),
          ),
        ],
      ),
    );
    return result ?? false;
  }
} 