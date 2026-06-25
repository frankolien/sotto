import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/persistence/session_store.dart';
import 'core/theme/sotto_theme.dart';
import 'core/theme/tweaks.dart';
import 'features/shell/presentation/app_shell.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  runApp(
    ProviderScope(
      overrides: [sessionStoreProvider.overrideWithValue(SessionStore(prefs))],
      child: const SottoApp(),
    ),
  );
}

class SottoApp extends ConsumerWidget {
  const SottoApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tweaks = ref.watch(tweaksProvider);
    return MaterialApp(
      title: 'Sotto',
      debugShowCheckedModeBanner: false,
      theme: buildSottoTheme(tweaks),
      home: const AppShell(),
    );
  }
} 
