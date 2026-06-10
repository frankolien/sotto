import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/icons/mark.dart';
import '../../../core/icons/sotto_icon.dart';
import '../../../core/theme/sotto_colors.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/primitives.dart';
import '../../payouts/domain/entities/rail_config.dart';
import '../../payouts/presentation/state/ledger_providers.dart';
import '../../shell/presentation/state/shell_providers.dart';
import '../domain/entities/concept.dart';
import '../domain/entities/setup_draft.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});
  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  String _view = 'welcome';
  SetupDraft _draft = const SetupDraft();

  void _finish(SetupDraft? cfg) {
    if (cfg != null) {
      ref.read(ledgerControllerProvider.notifier).configure(cfg.toRailConfig());
    }
    ref.read(shellControllerProvider.notifier).enterApp();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return ColoredBox(
      color: c.bg,
      child: Padding(
        padding: const EdgeInsets.only(top: 52),
        child: switch (_view) {
          'concept' => _Concept(
              onBack: () => setState(() => _view = 'welcome'),
              onDone: () => setState(() => _view = 'setup'),
            ),
          'setup' => _Setup(
              draft: _draft,
              onChange: (d) => setState(() => _draft = d),
              onBack: () => setState(() => _view = 'concept'),
              onFinish: () => _finish(_draft),
            ),
          _ => _Welcome(
              onStart: () => setState(() => _view = 'concept'),
              onSkip: () => _finish(null),
            ),
        },
      ),
    );
  }
}

// ── Welcome ──
class _Welcome extends StatelessWidget {
  final VoidCallback onStart;
  final VoidCallback onSkip;
  const _Welcome({required this.onStart, required this.onSkip});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Padding(
      padding: const EdgeInsets.fromLTRB(26, 0, 26, 26),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SottoMark(size: 56, color: c.text),
                const SizedBox(height: 22),
                Text('Sotto',
                    style: TextStyle(color: c.text, fontSize: 44, fontWeight: FontWeight.w700, letterSpacing: -0.5)),
                const SizedBox(height: 14),
                Text('Confidential payout infrastructure.',
                    style: TextStyle(color: c.text, fontSize: 19, fontWeight: FontWeight.w600, letterSpacing: -0.3, height: 1.25)),
                const SizedBox(height: 10),
                Text(
                  'Pay many people in one batch. Each sees only their own payment. An auditor verifies everything. Privacy is a property of the rail — not a feature of the app.',
                  style: TextStyle(color: c.sec, fontSize: 15.5, height: 1.5, letterSpacing: -0.1),
                ),
              ],
            ),
          ),
          AppButton(label: 'Set up your rail', icon: 'fwd', onTap: onStart),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: onSkip,
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Text('Skip to the demo',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: c.sec, fontSize: 15, fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Concept slides ──
class _Concept extends StatefulWidget {
  final VoidCallback onBack;
  final VoidCallback onDone;
  const _Concept({required this.onBack, required this.onDone});
  @override
  State<_Concept> createState() => _ConceptState();
}

class _ConceptState extends State<_Concept> {
  int _p = 0;
  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final concept = kConcepts[_p];
    void next() => _p < kConcepts.length - 1 ? setState(() => _p++) : widget.onDone();
    void prev() => _p > 0 ? setState(() => _p--) : widget.onBack();
    return Padding(
      padding: const EdgeInsets.fromLTRB(26, 0, 26, 26),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Pressable(
                onTap: prev,
                child: Padding(
                  padding: const EdgeInsets.all(6),
                  child: SottoIcon('back', size: 24, weight: 2, color: c.text),
                ),
              ),
              GestureDetector(
                onTap: widget.onDone,
                child: Padding(
                  padding: const EdgeInsets.all(6),
                  child: Text('Skip', style: TextStyle(color: c.sec, fontSize: 14, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 76,
                  height: 76,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: c.surface,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: c.hair2, width: 1.5),
                  ),
                  child: SottoIcon(concept.iconName, size: 34, weight: 1.7, color: c.text),
                ),
                const SizedBox(height: 26),
                Text(concept.title,
                    style: TextStyle(color: c.text, fontSize: 28, fontWeight: FontWeight.w700, letterSpacing: -0.6, height: 1.1)),
                const SizedBox(height: 14),
                Text(concept.body, style: TextStyle(color: c.sec, fontSize: 16, height: 1.5, letterSpacing: -0.1)),
              ],
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  for (var i = 0; i < kConcepts.length; i++)
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      margin: const EdgeInsets.only(right: 7),
                      width: i == _p ? 22 : 7,
                      height: 7,
                      decoration: BoxDecoration(
                        color: i == _p ? c.text : c.hair2,
                        borderRadius: BorderRadius.circular(7),
                      ),
                    ),
                ],
              ),
              AppButton(label: _p < kConcepts.length - 1 ? 'Next' : 'Set up', full: false, onTap: next),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Setup wizard ──
class _Setup extends StatefulWidget {
  final SetupDraft draft;
  final ValueChanged<SetupDraft> onChange;
  final VoidCallback onBack;
  final VoidCallback onFinish;
  const _Setup({required this.draft, required this.onChange, required this.onBack, required this.onFinish});
  @override
  State<_Setup> createState() => _SetupState();
}

class _SetupState extends State<_Setup> {
  static const _steps = 4;
  int _step = 0;
  late final TextEditingController _org = TextEditingController(text: widget.draft.org);
  late final TextEditingController _treasury =
      TextEditingController(text: widget.draft.treasury.toStringAsFixed(0));

  @override
  void dispose() {
    _org.dispose();
    _treasury.dispose();
    super.dispose();
  }

  SetupDraft get d => widget.draft;
  bool get _canNext => switch (_step) {
        0 => _org.text.trim().isNotEmpty && d.treasury > 0,
        2 => d.recipients.any((r) => r.name.isNotEmpty && r.amount > 0),
        _ => true,
      };

  void _next() => _step < _steps ? setState(() => _step++) : widget.onFinish();
  void _back() => _step > 0 ? setState(() => _step--) : widget.onBack();

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 6, 20, 8),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Pressable(
                    onTap: _back,
                    child: Padding(
                      padding: const EdgeInsets.all(6),
                      child: SottoIcon('back', size: 24, weight: 2, color: c.text),
                    ),
                  ),
                  Text('${(_step + 1).clamp(1, _steps)} of $_steps',
                      style: TextStyle(color: c.sec, fontSize: 13, fontWeight: FontWeight.w600)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  for (var i = 0; i < _steps; i++)
                    Expanded(
                      child: Container(
                        height: 4,
                        margin: EdgeInsets.only(right: i < _steps - 1 ? 6 : 0),
                        decoration: BoxDecoration(
                          color: i <= _step ? c.text : c.hair2,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            child: switch (_step) {
              0 => _step0(c),
              1 => _step1(c),
              2 => _stepRoster(c),
              3 => _step2(c),
              _ => _review(c),
            },
          ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 22),
          decoration: BoxDecoration(
            color: c.bg,
            border: Border(top: BorderSide(color: c.hair, width: 0.5)),
          ),
          child: AppButton(
            label: _step < _steps ? 'Continue' : 'Enter Sotto',
            icon: _step < _steps ? null : 'fwd',
            disabled: !_canNext,
            onTap: _next,
          ),
        ),
      ],
    );
  }

  Widget _heading(SottoColors c, String title, String sub) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(color: c.text, fontSize: 27, fontWeight: FontWeight.w700, letterSpacing: -0.6)),
          const SizedBox(height: 6),
          Text(sub, style: TextStyle(color: c.sec, fontSize: 15, height: 1.45)),
        ],
      );

  Widget _field(SottoColors c, String label, Widget child) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionLabel(label),
          const SizedBox(height: 10),
          child,
        ],
      );

  Widget _step0(SottoColors c) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _heading(c, 'Your organisation', 'The payer. This name never appears to recipients of other payments.'),
          const SizedBox(height: 24),
          _field(
            c,
            'Organisation name',
            _WizField(
              controller: _org,
              hint: 'e.g. Lumen Studio',
              onChanged: (v) {
                widget.onChange(d.copyWith(org: v));
                setState(() {});
              },
            ),
          ),
          const SizedBox(height: 24),
          _field(
            c,
            'Fund the treasury · USDCx',
            _WizField(
              controller: _treasury,
              hint: 'e.g. 312480',
              number: true,
              onChanged: (v) {
                widget.onChange(d.copyWith(treasury: _parseAmount(v)));
                setState(() {});
              },
            ),
          ),
        ],
      );

  Widget _stepRoster(SottoColors c) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _heading(c, 'Who gets paid',
              'Your contributor roster. Each payee becomes their own party on the ledger and sees only their own payment.'),
          const SizedBox(height: 20),
          _RosterEditor(
            value: d.recipients,
            threshold: d.threshold,
            onChange: (rs) => widget.onChange(d.copyWith(recipients: rs)),
          ),
        ],
      );

  Widget _step1(SottoColors c) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _heading(c, 'Spending rules', 'Encoded in the mandate, enforced on the ledger. A payout that breaks a rule can’t settle.'),
          const SizedBox(height: 24),
          _field(
            c,
            'Per-cycle cap · USDCx',
            _ChipRow(
              value: d.cap,
              options: const [('100,000', 100000.0), ('200,000', 200000.0), ('500,000', 500000.0)],
              onChange: (v) => widget.onChange(d.copyWith(cap: v)),
            ),
          ),
          const SizedBox(height: 24),
          _field(
            c,
            'Approval threshold · USDCx',
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _ChipRow(
                  value: d.threshold,
                  options: const [('10,000', 10000.0), ('25,000', 25000.0), ('50,000', 50000.0)],
                  onChange: (v) => widget.onChange(d.copyWith(threshold: v)),
                ),
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SottoIcon('shield', size: 15, color: c.ter),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text('Any single payment above this needs a second signer before it can settle.',
                          style: TextStyle(color: c.sec, fontSize: 13, height: 1.45)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      );

  Widget _step2(SottoColors c) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _heading(c, 'Approver & auditor', 'Who signs off large payments, and who can verify the books.'),
          const SizedBox(height: 24),
          _field(
            c,
            'Approver · second signer',
            Column(
              children: [
                for (final a in kApprovers)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 9),
                    child: _SelectRow(
                      title: a.name,
                      sub: a.role,
                      on: d.approver == a.name,
                      onTap: () => widget.onChange(d.copyWith(approver: a.name, approverRole: a.role)),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          _field(
            c,
            'Auditor · read-only',
            Column(
              children: [
                for (final a in kAuditors)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 9),
                    child: _SelectRow(
                      title: a.name,
                      sub: a.role,
                      on: d.auditor == a.name,
                      onTap: () => widget.onChange(d.copyWith(auditor: a.name, auditorRole: a.role)),
                    ),
                  ),
              ],
            ),
          ),
        ],
      );

  Widget _review(SottoColors c) {
    final payees = d.recipients.where((r) => r.name.isNotEmpty).length;
    final rows = [
      ('Organisation', d.org),
      ('Treasury', '${fmt0(d.treasury)} USDCx'),
      ('Recipients', '$payees payee${payees == 1 ? '' : 's'}'),
      ('Per-cycle cap', '${fmt0(d.cap)} USDCx'),
      ('Approval threshold', '${fmt0(d.threshold)} USDCx'),
      ('Approver', d.approver),
      ('Auditor', d.auditor),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Column(
          children: [
            SottoMark(size: 44, color: c.text),
            const SizedBox(height: 12),
            Text('Your rail is ready', style: TextStyle(color: c.text, fontSize: 24, fontWeight: FontWeight.w700, letterSpacing: -0.5)),
            const SizedBox(height: 5),
            Text('Review and step into ${d.org}.', style: TextStyle(color: c.sec, fontSize: 14.5)),
          ],
        ),
        const SizedBox(height: 20),
        AppCard(
          pad: 0,
          child: Column(
            children: [
              for (var i = 0; i < rows.length; i++)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    border: i < rows.length - 1 ? Border(bottom: BorderSide(color: c.hair, width: 0.5)) : null,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(rows[i].$1, style: TextStyle(color: c.sec, fontSize: 14.5)),
                      Flexible(
                        child: Text(rows[i].$2,
                            textAlign: TextAlign.right,
                            style: TextStyle(color: c.text, fontSize: 14.5, fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

double _parseAmount(String s) =>
    double.tryParse(s.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0;

InputDecoration _inputDec(SottoColors c, String hint) => InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: c.surface,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      hintStyle: TextStyle(color: c.ter, fontSize: 15, fontWeight: FontWeight.w500),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: c.hair2, width: 0.5)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: c.hair2, width: 0.5)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: c.text, width: 1)),
    );

/// A styled wizard text field. `number` swaps in the numeric keyboard.
class _WizField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final bool number;
  final ValueChanged<String> onChanged;
  const _WizField({required this.controller, required this.hint, required this.onChanged, this.number = false});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return TextField(
      controller: controller,
      keyboardType: number ? const TextInputType.numberWithOptions(decimal: true) : TextInputType.text,
      onChanged: onChanged,
      decoration: _inputDec(c, hint),
      style: TextStyle(color: c.text, fontSize: 16, fontWeight: FontWeight.w600, letterSpacing: -0.2),
    );
  }
}

/// Editable contributor roster. Owns a controller set per row so adding/removing
/// a payee never disturbs the others' cursors; emits the named rows up on change.
class _RosterEditor extends StatefulWidget {
  final List<RailRecipient> value;
  final double threshold;
  final ValueChanged<List<RailRecipient>> onChange;
  const _RosterEditor({required this.value, required this.threshold, required this.onChange});

  @override
  State<_RosterEditor> createState() => _RosterEditorState();
}

class _RosterRow {
  final int id;
  final TextEditingController name;
  final TextEditingController role;
  final TextEditingController amount;
  _RosterRow(this.id, RailRecipient r)
      : name = TextEditingController(text: r.name),
        role = TextEditingController(text: r.role),
        amount = TextEditingController(text: r.amount > 0 ? r.amount.toStringAsFixed(0) : '');

  RailRecipient toRecipient() =>
      RailRecipient(name: name.text.trim(), role: role.text.trim(), amount: _parseAmount(amount.text));

  void dispose() {
    name.dispose();
    role.dispose();
    amount.dispose();
  }
}

class _RosterEditorState extends State<_RosterEditor> {
  late final List<_RosterRow> _rows;
  int _seq = 0;

  @override
  void initState() {
    super.initState();
    _rows = widget.value.map((r) => _RosterRow(_seq++, r)).toList();
    if (_rows.isEmpty) _rows.add(_RosterRow(_seq++, const RailRecipient(name: '', role: '', amount: 0)));
  }

  @override
  void dispose() {
    for (final r in _rows) {
      r.dispose();
    }
    super.dispose();
  }

  void _emit() => widget.onChange(
        _rows.map((r) => r.toRecipient()).where((r) => r.name.isNotEmpty).toList(),
      );

  void _add() {
    setState(() => _rows.add(_RosterRow(_seq++, const RailRecipient(name: '', role: '', amount: 0))));
    _emit();
  }

  void _remove(int id) {
    setState(() {
      final i = _rows.indexWhere((r) => r.id == id);
      if (i >= 0) {
        _rows[i].dispose();
        _rows.removeAt(i);
      }
    });
    _emit();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final total = _rows.fold<double>(0, (a, r) => a + _parseAmount(r.amount.text));
    final count = _rows.where((r) => r.name.text.trim().isNotEmpty).length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final row in _rows)
          Padding(
            key: ValueKey(row.id),
            padding: const EdgeInsets.only(bottom: 10),
            child: _card(c, row),
          ),
        GestureDetector(
          onTap: _add,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 14),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(13),
              border: Border.all(color: c.hair2, width: 1),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SottoIcon('plus', size: 17, weight: 2.2, color: c.text),
                const SizedBox(width: 8),
                Text('Add recipient',
                    style: TextStyle(color: c.text, fontSize: 15, fontWeight: FontWeight.w600, letterSpacing: -0.2)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('$count recipient${count == 1 ? '' : 's'}',
                style: TextStyle(color: c.sec, fontSize: 13.5, fontWeight: FontWeight.w600)),
            Text('${fmt0(total)} USDCx',
                style: TextStyle(color: c.text, fontSize: 13.5, fontWeight: FontWeight.w700, letterSpacing: -0.2)),
          ],
        ),
      ],
    );
  }

  Widget _card(SottoColors c, _RosterRow row) {
    final over = _parseAmount(row.amount.text) > widget.threshold;
    return Container(
      padding: const EdgeInsets.fromLTRB(13, 12, 10, 13),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: c.hair2, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: _WizField(
                  controller: row.name,
                  hint: 'Name',
                  onChanged: (_) {
                    _emit();
                    setState(() {});
                  },
                ),
              ),
              GestureDetector(
                onTap: () => _remove(row.id),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(8, 4, 4, 4),
                  child: SottoIcon('x', size: 18, weight: 2, color: c.ter),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                flex: 3,
                child: _WizField(controller: row.role, hint: 'Role', onChanged: (_) => _emit()),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 2,
                child: _WizField(
                  controller: row.amount,
                  hint: 'USDCx',
                  number: true,
                  onChanged: (_) {
                    _emit();
                    setState(() {});
                  },
                ),
              ),
            ],
          ),
          if (over) ...[
            const SizedBox(height: 9),
            Row(
              children: [
                SottoIcon('shield', size: 14, color: c.ter),
                const SizedBox(width: 7),
                Text('Over threshold — needs approval to settle',
                    style: TextStyle(color: c.sec, fontSize: 12.5)),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _ChipRow extends StatelessWidget {
  final double value;
  final List<(String, double)> options;
  final ValueChanged<double> onChange;
  const _ChipRow({required this.value, required this.options, required this.onChange});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Row(
      children: [
        for (var i = 0; i < options.length; i++) ...[
          Expanded(
            child: GestureDetector(
              onTap: () => onChange(options[i].$2),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: value == options[i].$2 ? c.inv : c.surface,
                  borderRadius: BorderRadius.circular(13),
                  border: Border.all(
                      color: value == options[i].$2 ? Colors.transparent : c.hair2, width: 0.5),
                ),
                child: Text(options[i].$1,
                    style: TextStyle(
                        color: value == options[i].$2 ? c.invText : c.text,
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        letterSpacing: -0.2,
                        fontFeatures: const [FontFeature.tabularFigures()])),
              ),
            ),
          ),
          if (i < options.length - 1) const SizedBox(width: 8),
        ],
      ],
    );
  }
}

class _SelectRow extends StatelessWidget {
  final String title;
  final String sub;
  final bool on;
  final VoidCallback onTap;
  const _SelectRow({required this.title, required this.sub, required this.on, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final fg = on ? c.invText : c.text;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 14),
        decoration: BoxDecoration(
          color: on ? c.inv : c.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: on ? Colors.transparent : c.hair2, width: 0.5),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(color: fg, fontSize: 15.5, fontWeight: FontWeight.w600, letterSpacing: -0.2)),
                  const SizedBox(height: 2),
                  Text(sub, style: TextStyle(color: on ? fg.withValues(alpha: 0.72) : c.sec, fontSize: 13)),
                ],
              ),
            ),
            Container(
              width: 22,
              height: 22,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: on ? const Color(0x40808080) : Colors.transparent,
                border: on ? null : Border.all(color: c.hair2, width: 1.6),
              ),
              child: on ? SottoIcon('check', size: 14, weight: 2.6, color: fg) : null,
            ),
          ],
        ),
      ),
    );
  }
}
