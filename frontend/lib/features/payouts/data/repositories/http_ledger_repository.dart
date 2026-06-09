import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../domain/entities/ledger_state.dart';
import '../../domain/entities/rail_config.dart';
import '../../domain/entities/role.dart';
import '../../domain/repositories/ledger_repository.dart';
import '../ledger_mapper.dart';

/// Talks to the Sotto backend, which runs the flow on real Canton and returns
/// each role's state from a per-party query of the JSON Ledger API.
class HttpLedgerRepository implements LedgerRepository {
  final String baseUrl;
  final http.Client _client;

  HttpLedgerRepository(this.baseUrl, {http.Client? client})
      : _client = client ?? http.Client();

  @override
  Future<LedgerState> stateFor(Role role) async {
    final res = await _client.get(Uri.parse('$baseUrl/api/state/${role.name}'));
    if (res.statusCode != 200) {
      throw Exception('state(${role.name}) failed: ${res.statusCode} ${res.body}');
    }
    return ledgerStateFromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  @override
  Future<void> configure(RailConfig config) =>
      _post('/api/configure', railConfigToJson(config));

  @override
  Future<void> settle() => _post('/api/settle');

  @override
  Future<void> approve(String lineId) => _post('/api/approve/$lineId');

  @override
  Future<void> reject(String lineId) => _post('/api/reject/$lineId');

  @override
  Future<void> reset() => _post('/api/reset');

  Future<void> _post(String path, [Map<String, dynamic>? body]) async {
    final res = await _client.post(
      Uri.parse('$baseUrl$path'),
      headers: const {'content-type': 'application/json'},
      body: body == null ? null : jsonEncode(body),
    );
    if (res.statusCode != 200) {
      throw Exception('$path failed: ${res.statusCode} ${res.body}');
    }
  }
}
