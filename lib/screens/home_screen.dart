import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:teachai_app/models/app_state.dart';
import 'package:teachai_app/screens/document_scan_screen.dart';
import 'package:teachai_app/screens/exercise_recommendation_screen.dart';
import 'package:teachai_app/screens/lesson_plan_screen.dart';
import 'package:teachai_app/utils/app_theme.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('毕节教师助手'),
        actions: [
          // 离线模式开关
          Switch(
            value: appState.isOfflineMode,
            onChanged: (value) {
              appState.toggleOfflineMode();
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 欢迎信息
              const Text(
                '欢迎使用毕节教师助手',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                appState.isOfflineMode 
                    ? '当前为离线模式，部分功能可能受限' 
                    : '当前为在线模式，可使用全部功能',
                style: TextStyle(
                  color: AppTheme.textSecondaryColor,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 24),
              
              // 功能模块标题
              const Text(
                '核心功能',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              
              // 功能卡片网格
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                children: [
                  // 教案自动生成
                  _buildFeatureCard(
                    context,
                    title: '教案自动生成',
                    description: '快速生成符合教学要求的教案',
                    icon: Icons.auto_stories,
                    isOfflineAvailable: true,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const LessonPlanScreen(),
                        ),
                      );
                    },
                  ),
                  
                  // 分层练习推荐
                  _buildFeatureCard(
                    context,
                    title: '分层练习推荐',
                    description: '根据学生水平推荐适合的练习题',
                    icon: Icons.layers,
                    isOfflineAvailable: true,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const ExerciseRecommendationScreen(),
                        ),
                      );
                    },
                  ),
                  
                  // 错题分析
                  _buildFeatureCard(
                    context,
                    title: '错题分析',
                    description: '智能分析学生错题，找出知识薄弱点',
                    icon: Icons.analytics,
                    isOfflineAvailable: false,
                    onTap: () {
                      // TODO: 导航到错题分析页面
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('错题分析功能开发中...'),
                        ),
                      );
                    },
                  ),
                  
                  // 纸质资料数字化
                  _buildFeatureCard(
                    context,
                    title: '纸质资料数字化',
                    description: '拍照将纸质资料转为电子版',
                    icon: Icons.document_scanner,
                    isOfflineAvailable: true,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const DocumentScanScreen(),
                        ),
                      );
                    },
                  ),
                ],
              ),
              
              const SizedBox(height: 24),
              
              // 离线模型状态
              _buildOfflineModelStatus(context),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildFeatureCard(
    BuildContext context, {
    required String title,
    required String description,
    required IconData icon,
    required bool isOfflineAvailable,
    required VoidCallback onTap,
  }) {
    final appState = Provider.of<AppState>(context);
    final isDisabled = appState.isOfflineMode && !isOfflineAvailable;
    
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: InkWell(
        onTap: isDisabled ? null : onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                icon,
                size: 32,
                color: isDisabled 
                    ? Colors.grey 
                    : AppTheme.primaryColor,
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDisabled 
                      ? Colors.grey 
                      : AppTheme.textPrimaryColor,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                description,
                style: TextStyle(
                  fontSize: 12,
                  color: isDisabled 
                      ? Colors.grey 
                      : AppTheme.textSecondaryColor,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              if (isDisabled)
                const Padding(
                  padding: EdgeInsets.only(top: 8.0),
                  child: Text(
                    '离线模式不可用',
                    style: TextStyle(
                      fontSize: 10,
                      color: Colors.red,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildOfflineModelStatus(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: appState.isModelLoaded 
            ? AppTheme.successColor.withOpacity(0.1)
            : AppTheme.warningColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(
            appState.isModelLoaded 
                ? Icons.check_circle
                : Icons.warning,
            color: appState.isModelLoaded 
                ? AppTheme.successColor
                : AppTheme.warningColor,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  appState.isModelLoaded 
                      ? '离线AI模型已加载'
                      : '离线AI模型未加载',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  appState.isModelLoaded 
                      ? '可在无网络环境下使用AI功能'
                      : '点击下载离线AI模型，支持无网络使用',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondaryColor,
                  ),
                ),
                if (appState.isLoading && appState.downloadProgress > 0)
                  Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '下载中: ${(appState.downloadProgress * 100).toStringAsFixed(1)}%',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.textSecondaryColor,
                          ),
                        ),
                        const SizedBox(height: 4),
                        LinearProgressIndicator(
                          value: appState.downloadProgress,
                          backgroundColor: Colors.grey.shade300,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            AppTheme.primaryColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                if (appState.downloadError != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: Text(
                      '错误: ${appState.downloadError}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.red,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          if (!appState.isModelLoaded)
            ElevatedButton(
              onPressed: appState.isLoading 
                  ? null 
                  : () async {
                      final result = await appState.downloadAndInitModel();
                      if (result) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('AI模型下载并初始化成功！'),
                            backgroundColor: AppTheme.successColor,
                          ),
                        );
                      } else if (appState.downloadError != null) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('下载失败: ${appState.downloadError}'),
                            backgroundColor: AppTheme.errorColor,
                          ),
                        );
                      }
                    },
              child: appState.isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('下载'),
            ),
        ],
      ),
    );
  }
} 