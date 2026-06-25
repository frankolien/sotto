import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/icons/mark.dart';
import '../../../core/icons/sotto_icon.dart';
import '../../../core/motion/motion.dart';
import '../../../core/theme/sotto_colors.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/primitives.dart';
import '../../payouts/domain/entities/rail_config.dart';
import '../../payouts/domain/entities/role.dart';
import '../../payouts/presentation/state/ledger_providers.dart';
import '../../shell/presentation/state/shell_providers.dart';
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
    ref.read(shellControllerProvider.notifier).toSignIn();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return ColoredBox(
      color: c.bg,
      child: Padding(
        padding: const EdgeInsets.only(top: 52),
        child: switch (_view) {
          'setup' => _Setup(
              draft: _draft,
              onChange: (d) => setState(() => _draft = d),
              onBack: () => setState(() => _view = 'welcome'),
              onFinish: () => _finish(_draft),
            ),
          _ => _BatchHero(
              onStepIn: () => _finish(null),
              onTune: () => setState(() => _view = 'setup'),
            ),
        },
      ),
    );
  }
}

// ── The Batch — the interactive hero. The SAME six-row ledger, re-rendered live
//    for each lens, IS the demonstration: tap a role and watch what it may see. ──

/// One contributor line in the sample batch (mirrors the demo's seed roster).
class _BatchRow {
  final String name;
  final String role;
  final double amount;
  const _BatchRow(this.name, this.role, this.amount);
}

const double _kThreshold = 25000;
const int _kYou = 0; // the Recipient lens follows Amara (row 0)
const double _kTotal = 52550; // verified sum of the six amounts below
const List<_BatchRow> _kBatch = [
  _BatchRow('Amara Okafor', 'Sound design', 4200),
  _BatchRow('Tobi Adeyemi', 'Motion', 3850),
  _BatchRow('Chen Wei', 'Edit', 5500),
  _BatchRow('Diego Marquez', 'Color', 2900),
  _BatchRow('Fatima Bello', 'Production', 4100),
  _BatchRow('Kwame Nyong', 'Score · milestone', 32000), // over threshold → needs approval
];

// ── Monospace "ledger" type — amounts, captions and labels read like a precise
//    financial instrument (IBM Plex Mono). ──
const String _kMono = 'IBMPlexMono';

TextStyle _monoStyle(Color color,
        {double size = 11.5, double ls = 0.4, FontWeight weight = FontWeight.w600, double height = 1.4}) =>
    TextStyle(fontFamily: _kMono, color: color, fontSize: size, fontWeight: weight, letterSpacing: ls, height: height);

/// The hero's lens-aware lead line — written from the active party's point of view.
String _heroSub(Role lens) => switch (lens) {
      Role.payer => "You're Lumen Studio. You see every name, role and amount before it leaves.",
      Role.recipient => "You're Amara Okafor. You see your own line — and nothing else in the batch.",
      Role.auditor => "You're Hale & Co. Every receipt, read-only. Visibility is granted, never assumed.",
      Role.approver => "You're Priya Raman. Only what crosses the threshold needs a second signer.",
    };

/// What the active lens is allowed to reveal — the caption above the ledger.
String _reveals(Role lens) => switch (lens) {
      Role.payer => 'Reveals · names · roles · amounts · total',
      Role.recipient => 'Reveals · your own line only',
      Role.auditor => 'Reveals · every receipt · read-only',
      Role.approver => 'Reveals · over-threshold only',
    };

/// The ledger footer per lens: (label, sub-line, amount).
(String, String, double) _footerFor(Role lens) => switch (lens) {
      Role.payer => ('Batch total', '6 contributors · 1 confidential transfer', _kTotal),
      Role.recipient => ('Your payment', "1 of 6 · the rest aren't yours to see", _kBatch[_kYou].amount),
      Role.auditor => ('Auditor view', '6 of 6 receipts · read-only', _kTotal),
      Role.approver => ('Needs your signature', '1 of 6 · over the 25,000 threshold', 32000),
    };

/// A monospaced amount with a greyed USDCx suffix — the ledger's numerals.
class _Amount extends StatelessWidget {
  final double value;
  final double size;
  final bool dim;
  const _Amount(this.value, {this.size = 15.5, this.dim = false});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Text.rich(
      TextSpan(children: [
        TextSpan(
            text: fmt(value),
            style: TextStyle(fontFamily: _kMono, fontSize: size, fontWeight: FontWeight.w700, color: dim ? c.ter : c.text, letterSpacing: -0.3)),
        TextSpan(
            text: ' USDCx',
            style: TextStyle(fontFamily: _kMono, fontSize: size * 0.6, fontWeight: FontWeight.w500, color: c.ter)),
      ]),
      maxLines: 1,
      softWrap: false,
      overflow: TextOverflow.visible,
    );
  }
}

/// A monospaced outline pill (the "SAMPLE BATCH ›" tag).
class _MonoTag extends StatelessWidget {
  final String text;
  const _MonoTag(this.text);

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Container(
      padding: const EdgeInsets.fromLTRB(11, 6, 8, 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: c.hair2, width: 0.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(text.toUpperCase(), style: _monoStyle(c.text, size: 11, ls: 0.6, height: 1.0)),
          const SizedBox(width: 5),
          SottoIcon('fwd', size: 12, weight: 2, color: c.ter),
        ],
      ),
    );
  }
}

class _BatchHero extends StatefulWidget {
  final VoidCallback onStepIn;
  final VoidCallback onTune;
  const _BatchHero({required this.onStepIn, required this.onTune});
  @override
  State<_BatchHero> createState() => _BatchHeroState();
}

class _BatchHeroState extends State<_BatchHero> {
  Role _lens = Role.payer;
  final Set<Role> _seen = {Role.payer};
  Timer? _auto;
  bool _userTook = false;

  /// Under the test binding the auto-advance Timer must never start — a
  /// perpetually scheduling frame makes `pumpAndSettle()` time out. Detected by
  /// binding type so no test setup is needed (and it stays web-safe).
  bool get _inTest => WidgetsBinding.instance.runtimeType.toString().contains('Test');

  @override
  void initState() {
    super.initState();
    // The tour performs itself — walk the four lenses on a timer so the user sees
    // the redaction happen without lifting a finger. The first tap hands over
    // control and ends the tour. Off under tests / reduce-motion.
    if (!_inTest) {
      _auto = Timer.periodic(const Duration(milliseconds: 2200), (_) {
        if (!mounted || _userTook || Motion.reduced(context)) return;
        final roles = Role.values;
        final next = roles[(roles.indexOf(_lens) + 1) % roles.length];
        setState(() {
          _lens = next;
          _seen.add(next);
        });
      });
    }
  }

  @override
  void dispose() {
    _auto?.cancel();
    super.dispose();
  }

  void _select(Role r) {
    _userTook = true; // the user is driving now — stop the tour
    _auto?.cancel();
    if (r == _lens) return;
    setState(() {
      _lens = r;
      _seen.add(r);
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final seenAll = _seen.length == Role.values.length;
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 4, 22, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Wordmark + an honest "this is sample data" tag.
          Reveal(
            child: Row(
              children: [
                SottoMark(size: 24, color: c.text),
                const SizedBox(width: 9),
                Text('Sotto',
                    style: TextStyle(color: c.text, fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
                const Spacer(),
                const _MonoTag('Sample batch'),
              ],
            ),
          ),
          const SizedBox(height: 22),
          Reveal(
            delay: const Duration(milliseconds: 60),
            child: Text('One batch.\nFour kinds of eyes.',
                style: TextStyle(color: c.text, fontSize: 30, fontWeight: FontWeight.w800, letterSpacing: -0.7, height: 1.05)),
          ),
          const SizedBox(height: 12),
          // Lens-aware lead line, monospaced, written from the active party's POV.
          Reveal(
            delay: const Duration(milliseconds: 110),
            child: SizedBox(
              height: 58,
              child: AnimatedSwitcher(
                duration: Motion.base,
                child: Align(
                  key: ValueKey(_lens),
                  alignment: Alignment.topLeft,
                  child: Text(_heroSub(_lens).toUpperCase(),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: _monoStyle(c.sec, size: 11.5, ls: 0.3, weight: FontWeight.w500, height: 1.6)),
                ),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Reveal(delay: const Duration(milliseconds: 160), child: _LensBar(active: _lens, onChanged: _select)),
          const SizedBox(height: 12),
          // What THIS lens is allowed to reveal — relabels the demonstration live.
          SizedBox(
            height: 16,
            child: AnimatedSwitcher(
              duration: Motion.base,
              child: Align(
                key: ValueKey('rev-$_lens'),
                alignment: Alignment.centerLeft,
                child: Text(_reveals(_lens).toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: _monoStyle(c.ter, size: 11, ls: 0.5, height: 1.0)),
              ),
            ),
          ),
          const SizedBox(height: 10),
          // The ledger — scrolls internally on a short device.
          Expanded(
            child: Reveal(
              delay: const Duration(milliseconds: 210),
              child: SingleChildScrollView(child: _LedgerCard(lens: _lens)),
            ),
          ),
          const SizedBox(height: 14),
          _LensProgress(seen: _seen),
          const SizedBox(height: 14),
          // The no-friction path is now PRIMARY; configuration is the opt-in. The
          // CTA is always tappable but stays at low emphasis until all four lenses
          // have been seen — never trapped, just nudged.
          AnimatedOpacity(
            duration: Motion.base,
            opacity: seenAll ? 1.0 : 0.6,
            child: AppButton(label: 'Step into the rail', icon: 'fwd', onTap: widget.onStepIn),
          ),
          const SizedBox(height: 6),
          Pressable(
            onTap: widget.onTune,
            haptic: false,
            child: Padding(
              padding: const EdgeInsets.all(9),
              child: Text('Tune the numbers first',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: c.sec, fontSize: 14.5, fontWeight: FontWeight.w600, letterSpacing: -0.1)),
            ),
          ),
        ],
      ),
    );
  }
}

/// The four-lens selector: a pill with a sliding inverse chip behind the active
/// segment. Tapping a segment re-renders the whole ledger for that party.
class _LensBar extends StatelessWidget {
  final Role active;
  final ValueChanged<Role> onChanged;
  const _LensBar({required this.active, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final roles = Role.values;
    final i = roles.indexOf(active);
    return Container(
      height: 50,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: c.surface2,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.hair, width: 0.5),
      ),
      child: Stack(
        children: [
          AnimatedAlign(
            duration: Motion.base,
            curve: Motion.emphasized,
            alignment: Alignment((i - 1.5) / 1.5, 0),
            child: FractionallySizedBox(
              widthFactor: 1 / roles.length,
              heightFactor: 1,
              child: Container(
                decoration: BoxDecoration(color: c.inv, borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          Row(
            children: [
              for (final r in roles)
                Expanded(
                  child: Pressable(
                    onTap: () => onChanged(r),
                    child: Center(
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            SottoIcon(r.iconName, size: 14, weight: 2, color: r == active ? c.invText : c.sec),
                            const SizedBox(width: 5),
                            Text(r.label,
                                style: TextStyle(
                                    color: r == active ? c.invText : c.sec,
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: -0.2)),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// The six-row ledger card + a footer total, both re-rendered for the active lens.
class _LedgerCard extends StatelessWidget {
  final Role lens;
  const _LedgerCard({required this.lens});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final (label, subline, value) = _footerFor(lens);
    return AppCard(
      pad: 0,
      child: Column(
        children: [
          for (var i = 0; i < _kBatch.length; i++) ...[
            _LedgerRow(row: _kBatch[i], lens: lens, isYou: i == _kYou),
            if (i < _kBatch.length - 1)
              Divider(height: 0.5, thickness: 0.5, color: c.hair, indent: 14, endIndent: 14),
          ],
          Container(
            padding: const EdgeInsets.fromLTRB(15, 13, 15, 14),
            decoration: BoxDecoration(border: Border(top: BorderSide(color: c.hair, width: 0.5))),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: AnimatedSwitcher(
                    duration: Motion.base,
                    child: Column(
                      key: ValueKey(label),
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(label.toUpperCase(), style: _monoStyle(c.ter, size: 11, ls: 0.5, height: 1.0)),
                        const SizedBox(height: 4),
                        Text(subline,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: c.sec, fontSize: 12.5, letterSpacing: -0.1)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                AnimatedAmount(value: value, builder: (ctx, v) => _Amount(v, size: 20)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// One ledger row, rendered for the active lens: full, redacted (recipient),
/// dimmed (approver, under threshold) or flagged (approver, over threshold).
class _LedgerRow extends StatelessWidget {
  final _BatchRow row;
  final Role lens;
  final bool isYou;
  const _LedgerRow({required this.row, required this.lens, required this.isYou});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final over = row.amount > _kThreshold;
    final redacted = lens == Role.recipient && !isYou;
    final dimmed = lens == Role.approver && !over;
    final lifted = lens == Role.recipient && isYou;
    final flagged = lens == Role.approver && over;

    final money = redacted ? const _RedactionPill() : _Amount(row.amount, size: 15.5, dim: dimmed);

    final Widget subtitle = flagged
        ? Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SottoIcon('shield', size: 13, weight: 2, color: c.text),
              const SizedBox(width: 6),
              Flexible(
                child: Text('Over threshold — second signer required',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: c.sec, fontSize: 12.5, fontWeight: FontWeight.w600)),
              ),
            ],
          )
        : Text(redacted ? 'Confidential' : row.role,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(color: dimmed ? c.ter : c.sec, fontSize: 13));

    return AnimatedOpacity(
      duration: Motion.base,
      opacity: dimmed ? 0.5 : 1.0,
      child: AnimatedContainer(
        duration: Motion.base,
        curve: Motion.emphasized,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        color: lifted ? c.surface2 : Colors.transparent,
        child: Row(
          children: [
            Avatar(name: redacted ? '·' : row.name, size: 38, you: lifted),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(redacted ? '—' : row.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          color: redacted || dimmed ? c.ter : c.text,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          letterSpacing: -0.2)),
                  const SizedBox(height: 2),
                  subtitle,
                ],
              ),
            ),
            const SizedBox(width: 10),
            AnimatedSwitcher(
              duration: Motion.base,
              switchInCurve: Motion.emphasized,
              child: KeyedSubtree(
                key: ValueKey(redacted ? 'r' : dimmed ? 'd' : 'f'),
                child: money,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The "this line is private to its recipient" pill — the one element that could
/// only belong to Sotto.
class _RedactionPill extends StatelessWidget {
  const _RedactionPill();

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: c.surface2,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: c.hair, width: 0.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SottoIcon('lock', size: 12, weight: 2, color: c.ter),
          const SizedBox(width: 6),
          Text('••••• · CONFIDENTIAL', style: _monoStyle(c.ter, size: 10.5, ls: 0.3, height: 1.0)),
        ],
      ),
    );
  }
}

/// Four dots that fill as each lens is first viewed, with a nudge that fades once
/// the user has seen all four — gating the CTA's full emphasis.
class _LensProgress extends StatelessWidget {
  final Set<Role> seen;
  const _LensProgress({required this.seen});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final all = seen.length == Role.values.length;
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (final r in Role.values)
          AnimatedContainer(
            duration: Motion.base,
            curve: Motion.emphasized,
            margin: const EdgeInsets.symmetric(horizontal: 3),
            width: 7,
            height: 7,
            decoration: BoxDecoration(shape: BoxShape.circle, color: seen.contains(r) ? c.text : c.hair2),
          ),
        const SizedBox(width: 10),
        AnimatedOpacity(
          duration: Motion.base,
          opacity: all ? 0 : 1,
          child: Text('See it from all four',
              style: TextStyle(color: c.ter, fontSize: 12.5, fontWeight: FontWeight.w600)),
        ),
      ],
    );
  }
}

// ── Setup wizard (reached via "Tune the numbers first") ──
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
