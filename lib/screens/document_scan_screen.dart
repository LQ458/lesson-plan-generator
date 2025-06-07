import 'dart:io';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:teachai_app/models/app_state.dart';
import 'package:teachai_app/utils/app_theme.dart';
import 'package:teachai_app/utils/app_theme.dart';

class DocumentScanScreen extends StatefulWidget {
  const DocumentScanScreen({super.key});

  @override
  State<DocumentScanScreen> createState() => _DocumentScanScreenState();
}

class _DocumentScanScreenState extends State<DocumentScanScreen> {
  final ImagePicker _picker = ImagePicker();
  XFile? _imageFile;
  bool _isProcessing = false;
  String? _recognizedText;

  Future<void> _takePicture() async {
    final XFile? photo = await _picker.pickImage(source: ImageSource.camera);
    if (photo != null) {
      setState(() {
        _imageFile = photo;
        _recognizedText = null;
      });
    }
  }

  Future<void> _pickFromGallery() async {
    final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      setState(() {
        _imageFile = image;
        _recognizedText = null;
      });
    }
  }

  Future<void> _processImage() async {
    if (_imageFile == null) return;

    setState(() {
      _isProcessing = true;
    });

    // 使用真实的OCR服务识别文本
    final appState = Provider.of<AppState>(context, listen: false);
    try {
      final recognizedText = await appState.recognizeText(_imageFile!.path);
      
      setState(() {
        _isProcessing = false;
        _recognizedText = recognizedText;
      });
    } catch (e) {
      setState(() {
        _isProcessing = false;
        _recognizedText = '识别失败：$e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('纸质资料数字化'),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '拍摄或选择纸质资料',
                style: CupertinoTheme.of(context).textTheme.navTitleTextStyle,
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Expanded(
                    child: CupertinoButton.filled(
                      onPressed: _takePicture,
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(CupertinoIcons.camera, color: CupertinoColors.white),
                          SizedBox(width: 8),
                          Text('拍照'),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: CupertinoButton(
                      onPressed: _pickFromGallery,
                      color: CupertinoColors.systemGrey5,
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(CupertinoIcons.photo, color: CupertinoColors.systemBlue),
                          SizedBox(width: 8),
                          Text('从相册选择', style: TextStyle(color: CupertinoColors.systemBlue)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              
              if (_imageFile != null) ...[
                Text(
                  '预览图片',
                  style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.file(
                    File(_imageFile!.path),
                    height: 200,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(height: 16),
                Center(
                  child: CupertinoButton.filled(
                    onPressed: _isProcessing ? null : _processImage,
                    child: _isProcessing
                        ? const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              SizedBox(
                                width: 16,
                                height: 16,
                                child: CupertinoActivityIndicator(
                                  color: CupertinoColors.white,
                                ),
                              ),
                              SizedBox(width: 8),
                              Text('正在识别...'),
                            ],
                          )
                        : const Text('开始识别'),
                  ),
                ),
              ],
              
              if (_recognizedText != null) ...[
                const SizedBox(height: 24),
                Text(
                  '识别结果',
                  style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: AppTheme.iosCardDecoration(isDark: isDark),
                      child: SingleChildScrollView(
                        child: Text(
                          _recognizedText!,
                          style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                            height: 1.5,
                          ),
                        ),
                      ),
                    ),
                  ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: CupertinoButton(
                        color: CupertinoColors.systemGrey5,
                        onPressed: () {
                          // TODO: 编辑识别结果
                        },
                        child: const Text('编辑', style: TextStyle(color: CupertinoColors.systemBlue)),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: CupertinoButton.filled(
                        onPressed: () {
                          // TODO: 保存识别结果
                          _showAlert('内容已保存');
                        },
                        child: const Text('保存'),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _showAlert(String message) {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('提示'),
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
} 