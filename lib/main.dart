import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:provider/provider.dart';
import 'package:teachai_app/screens/home_screen.dart';
import 'package:teachai_app/utils/app_theme.dart';
import 'package:teachai_app/models/app_state.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // 初始化Hive本地数据库
  await Hive.initFlutter();
  
  // 注册Hive适配器（后续实现）
  // await Hive.registerAdapter(LessonPlanAdapter());
  
  runApp(
    ChangeNotifierProvider(
      create: (context) => AppState(),
      child: const TeachAIApp(),
    ),
  );
}

class TeachAIApp extends StatelessWidget {
  const TeachAIApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '毕节教师助手',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      debugShowCheckedModeBanner: false,
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('zh', 'CN'),
      ],
      home: const HomeScreen(),
    );
  }
} 