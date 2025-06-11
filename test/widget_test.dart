// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:provider/provider.dart';

import 'package:teachai_app/main.dart';
import 'package:teachai_app/models/app_state.dart';
import 'package:teachai_app/models/lesson_plan.dart';
import 'package:teachai_app/models/exercise.dart';
import 'package:teachai_app/models/mistake_record.dart';
import 'package:teachai_app/services/data_service.dart';

void main() {
  group('Widget Tests', () {
    setUpAll(() async {
      // 初始化Hive for测试
      await Hive.initFlutter();
      
      // 注册适配器
      if (!Hive.isAdapterRegistered(0)) {
        Hive.registerAdapter(LessonPlanAdapter());
      }
      if (!Hive.isAdapterRegistered(1)) {
        Hive.registerAdapter(ExerciseAdapter());
      }
      if (!Hive.isAdapterRegistered(2)) {
        Hive.registerAdapter(MistakeRecordAdapter());
      }
    });

    tearDownAll(() async {
      // 清理测试数据
      await Hive.deleteFromDisk();
    });

    testWidgets('App loads correctly with providers', (WidgetTester tester) async {
      // 创建一个包含必要providers的测试应用
      await tester.pumpWidget(
        ChangeNotifierProvider(
          create: (context) => AppState(),
          child: const TeachAIApp(),
        ),
      );

      // 等待所有异步操作完成
      await tester.pumpAndSettle();

      // 验证应用程序正确加载
    expect(find.byType(MaterialApp), findsOneWidget);
    });

    testWidgets('Navigation works correctly', (WidgetTester tester) async {
      await tester.pumpWidget(
        ChangeNotifierProvider(
          create: (context) => AppState(),
          child: const TeachAIApp(),
        ),
      );

      await tester.pumpAndSettle();

      // 查找底部导航栏
      expect(find.byType(BottomNavigationBar), findsOneWidget);
      
      // 验证有导航项目
      expect(find.byIcon(Icons.home), findsOneWidget);
    });
  });
}
