from flask import Flask, jsonify, request
from ytmusicapi import YTMusic

app = Flask(__name__)
yt = YTMusic()

@app.get('/api/search')
def search():
    q = request.args.get('q','')
    res = yt.search(q, filter='songs', limit=10)
    items = []
    for r in res:
        vid = r.get('videoId')
        if not vid:
            continue
        items.append({
            'id': vid,
            'title': r.get('title'),
            'artists': ', '.join(a['name'] for a in r.get('artists', []))
        })
    return jsonify(items)

@app.get('/api/playlist/<plid>')
def playlist(plid):
    pl = yt.get_playlist(plid)
    out = []
    for t in pl.get('tracks', []):
        vid = t.get('videoId')
        if not vid:
            continue
        out.append({
            'id': vid,
            'title': t.get('title'),
            'artists': ', '.join(a['name'] for a in t.get('artists', []))
        })
    return jsonify(out)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
