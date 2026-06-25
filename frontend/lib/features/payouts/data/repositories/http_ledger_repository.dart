import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../domain/entities/ledger_info.dart';
import '../../domain/entities/ledger_state.dart';
import '../../domain/entities/rail_config.dart';
import '../../domain/entities/role.dart';
import '../../domain/repositories/ledger_repository.dart';
import '../ledger_mapper.dart';

/// Talks to the Sotto backend, which runs the flow on real Canton and returns
/// each role's state from a per-party query of the JSON Ledger API.
///
/// Session-aware: it signs in as the role being viewed (a real Sotto session,
/// scoped server-side to that role) and carries the session token on every call.
/// Switching role is a real re-login — the client never holds more than the one
/// session it is currently using, and the server only serves that role's view.
class HttpLedgerRepository implements LedgerRepository {
  final String baseUrl;
  final http.Client _client;
  String? _token;
  Role? _role;

  HttpLedgerRepository(this.baseUrl, {http.Client? client})
      : _client = client ?? http.Client();

  /// Ensure the current session is for [role], logging in (again) if not.
  Future<void> _ensure(Role role) async {
    if (_token != null && _role == role) return;
    final res = await _client.post(
      Uri.parse('$baseUrl/api/login'),
      headers: const {'content-type': 'application/json'},
      body: jsonEncode({'role': role.name}),
    );
    if (res.statusCode != 200) {
      throw Exception('login(${role.name}) failed: ${res.statusCode} ${res.body}');
    }
    _token = (jsonDecode(res.body) as Map<String, dynamic>)['token'] as String;
    _role = role;
  }

  Map<String, String> get _headers => {
        'content-type': 'application/json',
        if (_token != null) 'authorization': 'Bearer $_token',
      };

  @override
  Future<LedgerState> stateFor(Role role) async {
    await _ensure(role);
    final res = await _client.get(Uri.parse('$baseUrl/api/state'), headers: _headers);
    if (res.statusCode != 200) {
      throw Exception('state(${role.name}) failed: ${res.statusCode} ${res.body}');
    }
    return ledgerStateFromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  @override
  Future<LedgerInfo> ledgerInfo(Role role) async {
    await _ensure(role);
    final res = await _client.get(Uri.parse('$baseUrl/api/ledger'), headers: _headers);
    if (res.statusCode != 200) {
      throw Exception('ledger(${role.name}) failed: ${res.statusCode} ${res.body}');
    }
    return ledgerInfoFromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  @override
  Future<void> configure(RailConfig config) async {
    await _ensure(Role.payer); // only the payer may configure the rail
    await _post('/api/configure', railConfigToJson(config));
  }

  @override
  Future<void> settle() async {
    await _ensure(Role.payer);
    await _post('/api/settle');
  }

  @override
  Future<void> approve(String lineId) async {
    await _ensure(Role.approver); // the maker-checker: only the approver signs off
    await _post('/api/approve/$lineId');
  }

  @override
  Future<void> reject(String lineId) async {
    await _ensure(Role.approver);
    await _post('/api/reject/$lineId');
  }

  @override
  Future<void> reset() async {
    await _ensure(Role.payer);
    await _post('/api/reset');
  }

  Future<void> _post(String path, [Map<String, dynamic>? body]) async {
    final res = await _client.post(
      Uri.parse('$baseUrl$path'),
      headers: _headers,
      body: body == null ? null : jsonEncode(body),
    );
    if (res.statusCode != 200) {
      throw Exception('$path failed: ${res.statusCode} ${res.body}');
    }
  }
}
