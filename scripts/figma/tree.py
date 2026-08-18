import pickle, sys
SP="/private/tmp/claude-501/-Users-nct-Documents-Projects-khu-pho-yeu-thuong/a4b8a443-626d-4267-adf6-aa4028589f9b/scratchpad"

def load():
    with open(SP+"/nodes.pkl","rb") as f: return pickle.load(f)

def gid(g): return f"{g['sessionID']}:{g['localID']}" if g else None

def build(nc):
    by={}
    for n in nc:
        g=n.get('guid')
        if g: by[gid(g)]=n
    kids={}
    for n in nc:
        pi=n.get('parentIndex')
        if pi and pi.get('guid'):
            kids.setdefault(gid(pi['guid']),[]).append(n)
    for k in kids:
        kids[k].sort(key=lambda n: n['parentIndex'].get('position') or '')
    return by, kids

def hexcol(c):
    if not c: return None
    r,g,b=[max(0,min(255,round(c[k]*255))) for k in 'rgb']
    a=c.get('a',1)
    s=f"#{r:02X}{g:02X}{b:02X}"
    return s if abs(a-1)<1e-3 else f"{s} {round(a*100)}%"

def paints(ps):
    out=[]
    for p in ps or []:
        if p.get('visible') is False: continue
        t=p.get('type')
        if t=='SOLID': out.append(hexcol(p.get('color')))
        elif t and 'GRADIENT' in t:
            stops=[hexcol(s.get('color')) for s in p.get('stops') or []]
            out.append(f"{t}({'→'.join(x for x in stops if x)})")
        elif t=='IMAGE': out.append(f"IMAGE:{(p.get('image') or {}).get('hash','?')}")
        else: out.append(t)
    return [x for x in out if x]
