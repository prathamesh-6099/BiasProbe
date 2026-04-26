import urllib.request, urllib.error, json
req = urllib.request.Request('http://127.0.0.1:8000/api/audit/create', method='POST', headers={'Content-Type': 'application/json'}, data=json.dumps({'label': 'test', 'scenario': 'loan_advisor', 'num_probes': 10, 'connector': {'provider': 'gemini', 'api_key': 'test', 'model': 'test'}}).encode('utf-8'))
try:
    print(urllib.request.urlopen(req).read().decode())
except urllib.error.HTTPError as e:
    print(e.read().decode())
