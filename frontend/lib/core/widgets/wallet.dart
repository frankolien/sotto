import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../icons/sotto_icon.dart';
import '../theme/sotto_colors.dart';
import '../utils/format.dart';
import 'primitives.dart';

/// Identity selector that doubles as the "view as" switch.
class AccountHeader extends StatelessWidget {
  final String name;
  final String sub;
  final VoidCallback onOpen;
  final Widget? right;
  const AccountHeader({
    super.key,
    required this.name,
    required this.sub,
    required this.onOpen,
    this.right,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 50, 18, 6),
      child: Row(
        children: [
          Expanded(
            child: Pressable(
              onTap: onOpen,
              child: Row(
                children: [
                  Avatar(name: name, size: 42),
                  const SizedBox(width: 11),
                  Flexible(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Flexible(
                              child: Text(name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                      color: c.text,
                                      fontSize: 17,
                                      fontWeight: FontWeight.w600,
                                      letterSpacing: -0.3)),
                            ),
                            const SizedBox(width: 5),
                            SottoIcon('chevdown', size: 16, weight: 2, color: c.sec),
                          ],
                        ),
                        const SizedBox(height: 1),
                        Text(sub,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: c.sec, fontSize: 12.5)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          ?right,
        ],
      ),
    );
  }
}

/// Big balance with greyed cents.
class BigBalance extends StatelessWidget {
  final String label;
  final double value;
  final String suffix;
  const BigBalance({
    super.key,
    required this.label,
    required this.value,
    this.suffix = 'USDCx',
  });

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final parts = fmt(value).split('.');
    final whole = parts[0];
    final cents = parts.length > 1 ? parts[1] : '00';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: TextStyle(
                color: c.sec,
                fontSize: 13.5,
                fontWeight: FontWeight.w500,
                letterSpacing: -0.1)),
        const SizedBox(height: 7),
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Flexible(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text.rich(
                  TextSpan(children: [
                    TextSpan(
                      text: whole,
                      style: TextStyle(
                          color: c.text,
                          fontSize: 44 * c.scale,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -1.6,
                          height: 1),
                    ),
                    TextSpan(
                      text: '.$cents',
                      style: TextStyle(
                          color: c.ter,
                          fontSize: 44 * c.scale,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -1.6,
                          height: 1),
                    ),
                  ]),
                  maxLines: 1,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(suffix,
                  style: TextStyle(
                      color: c.ter, fontSize: 15, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ],
    );
  }
}

/// One monochrome action tile (icon + label).
class ActionTile extends StatelessWidget {
  final String icon;
  final String label;
  final VoidCallback? onTap;
  const ActionTile({super.key, required this.icon, required this.label, this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Expanded(
      child: Pressable(
        onTap: onTap,
        child: Column(
          children: [
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 64),
                child: AspectRatio(
                  aspectRatio: 1,
                  child: Container(
                    decoration: BoxDecoration(
                      color: c.surface,
                      borderRadius: BorderRadius.circular(math.min(c.radius, 16)),
                      border: Border.all(color: c.hair2, width: 0.5),
                    ),
                    child: Center(
                      child: SottoIcon(icon, size: 22, weight: 1.9, color: c.text),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(label,
                maxLines: 1,
                style: TextStyle(
                    color: c.sec,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    letterSpacing: -0.1)),
          ],
        ),
      ),
    );
  }
}

class ActionRow extends StatelessWidget {
  final List<Widget> children;
  const ActionRow({super.key, required this.children});
  @override
  Widget build(BuildContext context) {
    final spaced = <Widget>[];
    for (var i = 0; i < children.length; i++) {
      spaced.add(children[i]);
      if (i < children.length - 1) spaced.add(const SizedBox(width: 12));
    }
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: spaced);
  }
}

class DateLabel extends StatelessWidget {
  final String text;
  const DateLabel(this.text, {super.key});
  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Padding(
      padding: const EdgeInsets.fromLTRB(2, 4, 2, 2),
      child: Text(text,
          style: TextStyle(color: c.ter, fontSize: 13, fontWeight: FontWeight.w500)),
    );
  }
}

class ActivityRow extends StatelessWidget {
  final String name;
  final String sub;
  final double amount;
  final bool income;
  final bool you;
  final bool last;
  const ActivityRow({
    super.key,
    required this.name,
    required this.sub,
    required this.amount,
    this.income = false,
    this.you = false,
    this.last = false,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 2),
      decoration: BoxDecoration(
        border: last
            ? null
            : Border(bottom: BorderSide(color: c.hair, width: 0.5)),
      ),
      child: Row(
        children: [
          Avatar(name: name, size: 38, you: you),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        color: c.text,
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        letterSpacing: -0.2)),
                Text(sub,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: c.sec, fontSize: 12.5)),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Text('${income ? '+' : '–'}${fmt(amount)}',
              style: TextStyle(
                  color: c.text,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  fontFeatures: const [FontFeature.tabularFigures()])),
        ],
      ),
    );
  }
}

class TabItem {
  final String id;
  final String icon;
  final String label;
  const TabItem(this.id, this.icon, this.label);
}

class SottoTabBar extends StatelessWidget {
  final String active;
  final ValueChanged<String> onTap;
  final List<TabItem> items;
  const SottoTabBar({
    super.key,
    required this.active,
    required this.onTap,
    required this.items,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Container(
      decoration: BoxDecoration(
        color: c.bg,
        border: Border(top: BorderSide(color: c.hair, width: 0.5)),
      ),
      padding: const EdgeInsets.only(top: 8, bottom: 22),
      child: Row(
        children: [
          for (final it in items)
            Expanded(
              child: Pressable(
                onTap: () => onTap(it.id),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SottoIcon(it.icon,
                        size: 24,
                        weight: it.id == active ? 2.1 : 1.8,
                        color: it.id == active ? c.text : c.ter),
                    const SizedBox(height: 4),
                    Text(it.label,
                        style: TextStyle(
                            color: it.id == active ? c.text : c.ter,
                            fontSize: 10.5,
                            fontWeight: it.id == active
                                ? FontWeight.w600
                                : FontWeight.w500,
                            letterSpacing: 0.1)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
