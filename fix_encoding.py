import urllib.request
import json
import ssl

url = 'https://rncjgtyqzjewnmxycexp.supabase.co/rest/v1/lotto_history?drw_no=eq.1211'
headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuY2pndHlxempld25teHljZXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NzI4MzEsImV4cCI6MjA4NTE0ODgzMX0.kMQxGUe6BOCTlaGbEQyoeS11VUDUYoTCoTo_tw8bpxE',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuY2pndHlxempld25teHljZXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NzI4MzEsImV4cCI6MjA4NTE0ODgzMX0.kMQxGUe6BOCTlaGbEQyoeS11VUDUYoTCoTo_tw8bpxE',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}
data = json.dumps({
    'total_sell_amnt': 134945802000,
    'first_how': '\uc790\ub3d9 13, \uc218\ub3d9 1'
}, ensure_ascii=False).encode('utf-8')

req = urllib.request.Request(url, data=data, headers=headers, method='PATCH')
try:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    with urllib.request.urlopen(req, context=ctx) as response:
        print("Success!")
except Exception as e:
    print('Error:', e)
