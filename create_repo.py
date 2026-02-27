import urllib.request, json

token = open(r"C:\Users\Дмитрий\Desktop\Polybot\bitpredict\.gh_token").read().strip()
data = json.dumps({"name": "BitPredict", "description": "AI Prediction Markets on Bitcoin L1 via OP_NET", "public": True}).encode()
req = urllib.request.Request("https://api.github.com/user/repos", data=data, headers={
    "Authorization": f"token {token}",
    "Content-Type": "application/json",
    "Accept": "application/vnd.github+json"
})
try:
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read())
    print(f"Created: {result['html_url']}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"Error {e.code}: {body}")
