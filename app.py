import os
import time
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__, template_folder='templates', static_folder='static')

# Cache configuration
feed_cache = {
    'data': None,
    'expiry': 0
}
CACHE_DURATION = 300  # 5 minutes

def fetch_bigquery_notes():
    global feed_cache
    now = time.time()
    
    # Check cache unless bypass is requested
    bypass_cache = request.args.get('refresh', 'false').lower() == 'true'
    if feed_cache['data'] and now < feed_cache['expiry'] and not bypass_cache:
        return feed_cache['data']

    url = 'https://docs.cloud.google.com/feeds/bigquery-release-notes.xml'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse XML
        root = ET.fromstring(response.content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry_elem in root.findall('atom:entry', ns):
            title = entry_elem.find('atom:title', ns)
            id_elem = entry_elem.find('atom:id', ns)
            updated = entry_elem.find('atom:updated', ns)
            content = entry_elem.find('atom:content', ns)
            
            # Extract links
            link = ''
            for l in entry_elem.findall('atom:link', ns):
                if l.get('rel') == 'alternate' or not l.get('rel'):
                    link = l.get('href')
                    break
                    
            entries.append({
                'title': title.text.strip() if title is not None and title.text else '',
                'id': id_elem.text.strip() if id_elem is not None and id_elem.text else '',
                'updated': updated.text.strip() if updated is not None and updated.text else '',
                'link': link,
                'content': content.text if content is not None and content.text else ''
            })
            
        # Update cache
        feed_cache['data'] = entries
        feed_cache['expiry'] = now + CACHE_DURATION
        return entries
    except Exception as e:
        # If fetch fails but we have stale cache, return it as fallback
        if feed_cache['data']:
            return feed_cache['data']
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        notes = fetch_bigquery_notes()
        return jsonify({
            'success': True,
            'releases': notes
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Run Flask server
    app.run(debug=True, port=5000)
