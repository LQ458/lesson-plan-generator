import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:provider/provider.dart';
import 'package:teachai_app/models/app_state.dart';
import 'package:teachai_app/screens/document_scan_screen.dart';
import 'package:teachai_app/screens/exercise_recommendation_screen.dart';
import 'package:teachai_app/screens/lesson_plan_screen.dart';
import 'package:teachai_app/screens/mistake_analysis_screen.dart';
import 'package:teachai_app/screens/saved_lessons_screen.dart';
import 'package:teachai_app/screens/user_profile_screen.dart';
import 'package:teachai_app/utils/app_theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, appState, child) {
        return CupertinoPageScaffold(
          navigationBar: CupertinoNavigationBar(
            middle: const Text(
              '毕节教师助手',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                letterSpacing: -0.4,
              ),
            ),
            trailing: CupertinoButton(
                padding: EdgeInsets.zero,
              onPressed: () => _navigateToProfile(),
              child: const Icon(CupertinoIcons.person, size: 24),
            ),
            backgroundColor: AppTheme.systemBackground,
          ),
          backgroundColor: AppTheme.systemBackground,
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 欢迎信息
                  const Text(
                    '欢迎使用',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimaryColor,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    '专为毕节山村教师设计的AI教学助手',
                    style: TextStyle(
                      fontSize: 16,
                      color: AppTheme.systemGray,
                    ),
                  ),
                  const SizedBox(height: 32),
                  
                  // 功能卡片网格
                  _buildFeatureGrid(context),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildFeatureGrid(BuildContext context) {
    return GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
      childAspectRatio: 0.9,
                children: [
                  // 教案自动生成
        _buildFeatureCard(
                    context,
          title: '教案生成',
          description: '智能生成教案，支持多学科',
          icon: CupertinoIcons.book_fill,
                    color: AppTheme.systemBlue,
          onTap: () => Navigator.push(
                        context,
                        CupertinoPageRoute(
                          builder: (context) => const LessonPlanScreen(),
                        ),
                    ),
                  ),
                  
                  // 分层练习推荐
        _buildFeatureCard(
                    context,
          title: '练习题生成',
          description: '分层练习题智能推荐',
          icon: CupertinoIcons.layers_alt_fill,
                    color: AppTheme.systemGreen,
          onTap: () => Navigator.push(
                        context,
                        CupertinoPageRoute(
                          builder: (context) => const ExerciseRecommendationScreen(),
                        ),
                    ),
                  ),
                  
                  // 错题分析
        _buildFeatureCard(
                    context,
                    title: '错题分析',
          description: '智能分析错题，找出薄弱点',
          icon: CupertinoIcons.chart_bar_fill,
                    color: AppTheme.systemOrange,
          onTap: () => Navigator.push(
                        context,
                        CupertinoPageRoute(
                          builder: (context) => const MistakeAnalysisScreen(),
                        ),
                    ),
                  ),
                  
                  // 已保存教案
        _buildFeatureCard(
                      context,
                      title: '已保存教案',
          description: '查看和管理您的教案',
          icon: CupertinoIcons.folder_fill,
                      color: AppTheme.systemPurple,
          onTap: () => Navigator.push(
                          context,
                          CupertinoPageRoute(
                            builder: (context) => const SavedLessonsScreen(),
                          ),
                    ),
                  ),
            ],
    );
  }
  
  Widget _buildFeatureCard(
    BuildContext context, {
    required String title,
    required String description,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.systemGray6,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppTheme.systemGray5,
            width: 0.5,
          ),
        ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
              width: 48,
              height: 48,
                decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                icon,
                color: color,
                  size: 24,
              ),
            ),
            const SizedBox(height: 16),
              Text(
                title,
              style: const TextStyle(
                fontSize: 16,
                  fontWeight: FontWeight.w600,
                color: AppTheme.textPrimaryColor,
                ),
              ),
              const SizedBox(height: 4),
            Text(
                description,
              style: const TextStyle(
                fontSize: 14,
                      color: AppTheme.systemGray,
                  ),
                ),
            ],
        ),
      ),
    );
  }
  
  void _navigateToProfile() {
    Navigator.push(
            context,
      CupertinoPageRoute(
        builder: (context) => const UserProfileScreen(),
      ),
    );
  }
} 