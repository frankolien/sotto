import 'package:intl/intl.dart';

/// Direction of a wallet activity row.
enum ActivityDir { income, out }

/// One row in a wallet activity feed.
class ActivityItem {
  final String name;
  final String sub;
  final double amount;
  final ActivityDir dir;
  final bool you;

  const ActivityItem({
    required this.name,
    required this.sub,
    required this.amount,
    this.dir = ActivityDir.out,
    this.you = false,
  });
}

/// A date-grouped block of activity rows.
class ActivityGroup {
  final String day;
  final List<ActivityItem> rows;
  const ActivityGroup({required this.day, required this.rows});
}

/// A real on-ledger activity entry (a settled payment) with its real timestamp
/// and receipt contract id — straight from Canton, not fabricated history.
class ActivityEntry {
  final String name;
  final String sub;
  final double amount;
  final bool income;
  final DateTime at;
  final String cid;
  const ActivityEntry({
    required this.name,
    required this.sub,
    required this.amount,
    required this.income,
    required this.at,
    required this.cid,
  });
}

String _dayLabel(DateTime at, DateTime now) {
  final d = DateTime(at.year, at.month, at.day);
  final diff = DateTime(now.year, now.month, now.day).difference(d).inDays;
  if (diff <= 0) return 'Today';
  if (diff == 1) return 'Yesterday';
  return DateFormat('d MMM yyyy').format(at);
}

/// Group real activity entries by day into the render model (newest first).
List<ActivityGroup> groupActivity(List<ActivityEntry> entries) {
  final now = DateTime.now();
  final sorted = [...entries]..sort((a, b) => b.at.compareTo(a.at));
  final order = <String>[];
  final byDay = <String, List<ActivityItem>>{};
  for (final e in sorted) {
    final day = _dayLabel(e.at, now);
    if (!byDay.containsKey(day)) {
      byDay[day] = [];
      order.add(day);
    }
    byDay[day]!.add(ActivityItem(
      name: e.name,
      sub: e.sub,
      amount: e.amount,
      dir: e.income ? ActivityDir.income : ActivityDir.out,
    ));
  }
  return [for (final d in order) ActivityGroup(day: d, rows: byDay[d]!)];
}
