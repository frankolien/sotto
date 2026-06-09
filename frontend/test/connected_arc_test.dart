import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sotto/features/payouts/data/repositories/mock_ledger_repository.dart';
import 'package:sotto/features/payouts/presentation/state/ledger_providers.dart';
import 'package:sotto/main.dart';

/// Drives the connected arc end to end: onboarding → payer wallet → role-switch
/// to recipient (privacy redaction) → auditor (full batch). Proves the app
/// builds and the lenses render without runtime errors.
void main() {
  testWidgets('connected arc: payer → recipient → auditor', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    // The headless test font sizes every glyph as a fontSize-wide box, so large
    // text "overflows" in tests though it fits with real SF on device. Tolerate
    // those layout warnings here — this test verifies the flow, not pixel layout.
    final originalOnError = FlutterError.onError!;
    FlutterError.onError = (details) {
      if (details.exceptionAsString().contains('overflowed')) return;
      originalOnError(details);
    };
    addTearDown(() => FlutterError.onError = originalOnError);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [ledgerRepositoryProvider.overrideWithValue(MockLedgerRepository())],
        child: const SottoApp(),
      ),
    );
    await tester.pumpAndSettle();

    // Welcome
    expect(find.text('Sotto'), findsOneWidget);
    expect(find.text('Set up your rail'), findsOneWidget);

    // Skip straight to the demo → payer wallet
    await tester.tap(find.text('Skip to the demo'));
    await tester.pumpAndSettle();
    expect(find.text('Total balance'), findsOneWidget);
    expect(find.text('Lumen Studio'), findsOneWidget);
    expect(find.text('Pay out'), findsOneWidget);

    // Open the "view as" sheet from the account header
    await tester.tap(find.text('Lumen Studio'));
    await tester.pumpAndSettle();
    expect(find.text('View as'), findsOneWidget);

    // Switch to the recipient lens → only their own payment + redacted others
    await tester.tap(find.text('Sees only their own payment.'));
    await tester.pumpAndSettle();
    expect(find.text('Amara Okafor'), findsWidgets);
    expect(find.textContaining('invisible to you'), findsOneWidget);

    // Switch to the auditor lens → the whole batch
    await tester.tap(find.text('Amara Okafor').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sees every receipt in the batch.'));
    await tester.pumpAndSettle();
    expect(find.text('Receipts'), findsOneWidget);
    expect(find.textContaining('full visibility'), findsOneWidget);
  });
}
