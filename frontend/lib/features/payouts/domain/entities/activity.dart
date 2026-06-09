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
