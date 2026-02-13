#!/usr/bin/env python3
"""Generate static JSON archives for Mission Kontrol frontend."""
import json, os, glob, time, re

PUBLIC_DIR = '/data/.openclaw/workspace/mission-kontrol/public'

def generate_sessions():
    sessions = []
    for agent_dir in glob.glob('/data/.openclaw/agents/*/sessions/'):
        agent = agent_dir.split('/')[-3]
        meta = {}
        sfile = os.path.join(agent_dir, 'sessions.json')
        if os.path.exists(sfile):
            with open(sfile) as f:
                meta = json.load(f)
        
        for jf in sorted(glob.glob(os.path.join(agent_dir, '*.jsonl')), key=os.path.getmtime, reverse=True):
            sid = os.path.basename(jf).replace('.jsonl', '')
            stat = os.stat(jf)
            first_msg, model, msg_count, started = '', '', 0, ''
            messages_preview = []
            
            with open(jf) as f:
                for i, line in enumerate(f):
                    if i > 300: break
                    try:
                        d = json.loads(line)
                        if d.get('type') == 'session':
                            started = d.get('timestamp', '')
                        elif d.get('type') == 'model_change':
                            model = d.get('modelId', '')
                        elif d.get('type') == 'message':
                            msg_count += 1
                            msg = d.get('message', {})
                            role = msg.get('role', '')
                            content = msg.get('content', '')
                            text = ''
                            if isinstance(content, str):
                                text = content[:300]
                            elif isinstance(content, list):
                                for block in content:
                                    if isinstance(block, dict) and block.get('type') == 'text':
                                        text = block.get('text', '')[:300]
                                        break
                            if text and len(messages_preview) < 30:
                                messages_preview.append({'role': role, 'text': text, 'ts': msg.get('timestamp')})
                            if not first_msg and text:
                                first_msg = text[:150]
                    except: pass
            
            label, spawned_by = None, None
            for k, v in meta.items():
                if v.get('sessionId') == sid:
                    label = v.get('label')
                    spawned_by = v.get('spawnedBy')
                    break
            
            sessions.append({
                'sessionId': sid, 'agent': agent, 'label': label,
                'spawnedBy': spawned_by, 'startedAt': started,
                'updatedAt': int(stat.st_mtime * 1000), 'model': model,
                'messageCount': msg_count, 'firstMessage': first_msg,
                'status': 'active' if (int(stat.st_mtime * 1000) > (int(time.time() * 1000) - 300000)) else 'completed',
                'messages': messages_preview
            })
    
    with open(os.path.join(PUBLIC_DIR, 'sessions-archive.json'), 'w') as f:
        json.dump(sanitize_obj({'generatedAt': int(time.time() * 1000), 'sessions': sessions}), f)
    return len(sessions)

def generate_memory():
    entries = []
    for f in sorted(glob.glob('/data/.openclaw/workspace/memory/*.md'), reverse=True):
        name = os.path.basename(f)
        with open(f) as fh:
            entries.append({'date': name.replace('.md', ''), 'filename': name, 'content': fh.read()})
    
    with open(os.path.join(PUBLIC_DIR, 'memory-archive.json'), 'w') as f:
        json.dump(sanitize_obj({'generatedAt': int(time.time() * 1000), 'entries': entries}), f)
    return len(entries)

def sanitize(text):
    """Remove secrets from text."""
    if not isinstance(text, str): return text
    text = re.sub(r'ghp_[a-zA-Z0-9]{20,}', '[REDACTED]', text)
    text = re.sub(r'(Bearer\s+)[a-zA-Z0-9_\-]{20,}', r'\1[REDACTED]', text)
    return text

def sanitize_obj(obj):
    if isinstance(obj, dict): return {k: sanitize_obj(v) for k, v in obj.items()}
    elif isinstance(obj, list): return [sanitize_obj(v) for v in obj]
    elif isinstance(obj, str): return sanitize(obj)
    return obj

if __name__ == '__main__':
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    s = generate_sessions()
    m = generate_memory()
    print(f'Generated: {s} sessions, {m} memory entries')
