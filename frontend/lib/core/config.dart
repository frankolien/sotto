/// Runtime configuration, overridable at build time with --dart-define.
///
///   flutter run --dart-define=BACKEND_URL=http://localhost:8080
///   flutter run --dart-define=USE_MOCK=true     # offline, no backend
class AppConfig {
  /// Base URL of the Sotto backend (REST over Canton's JSON Ledger API).
  static const backendBaseUrl = String.fromEnvironment(
    'BACKEND_URL',
    defaultValue: 'http://localhost:8080',
  );

  /// When true, run against the in-memory mock instead of the real backend.
  static const useMock = bool.fromEnvironment('USE_MOCK', defaultValue: false);
}
