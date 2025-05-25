import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:teachai_app/models/app_state.dart';
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('纸质资料数字化'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '拍摄或选择纸质资料',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _takePicture,
                      icon: const Icon(Icons.camera_alt),
                      label: const Text('拍照'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _pickFromGallery,
                      icon: const Icon(Icons.photo_library),
                      label: const Text('从相册选择'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              
              if (_imageFile != null) ...[
                const Text(
                  '预览图片',
                  style: TextStyle(
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
                  child: ElevatedButton(
                    onPressed: _isProcessing ? null : _processImage,
                    child: _isProcessing
                        ? const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
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
                const Text(
                  '识别结果',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: SingleChildScrollView(
                      child: Text(
                        _recognizedText!,
                        style: const TextStyle(
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
                      child: OutlinedButton(
                        onPressed: () {
                          // TODO: 编辑识别结果
                        },
                        child: const Text('编辑'),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () {
                          // TODO: 保存识别结果
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('内容已保存'),
                            ),
                          );
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
} 