import sys
SP="/private/tmp/claude-501/-Users-nct-Documents-Projects-khu-pho-yeu-thuong/a4b8a443-626d-4267-adf6-aa4028589f9b/scratchpad"
sys.path.insert(0,SP)
from tree import load, build, gid, hexcol, paints

nc=load(); by,kids=build(nc)

def num(v):
    if v is None: return None
    return int(v) if abs(v-round(v))<0.05 else round(v,1)

def textinfo(n):
    bits=[]
    fn=n.get('fontName') or {}
    if fn: bits.append(f"{fn.get('family')} {fn.get('style')}")
    if n.get('fontSize') is not None: bits.append(f"{num(n['fontSize'])}px")
    lh=n.get('lineHeight')
    if isinstance(lh,dict):
        u=lh.get('units'); v=lh.get('value')
        if u=='PIXELS': bits.append(f"lh {num(v)}px")
        elif u=='PERCENT': bits.append(f"lh {num(v)}%")
        elif u=='RAW': bits.append("lh auto")
    ls=n.get('letterSpacing')
    if isinstance(ls,dict) and ls.get('value'):
        bits.append(f"ls {num(ls['value'])}{'%' if ls.get('units')=='PERCENT' else 'px'}")
    if n.get('textAlignHorizontal'): bits.append(n['textAlignHorizontal'])
    if n.get('textCase') and n['textCase']!='ORIGINAL': bits.append(n['textCase'])
    return " · ".join(b for b in bits if b)

def line(n, depth, ax, ay):
    t=n.get('transform') or {}; s=n.get('size') or {}
    x=ax+(t.get('m02') or 0); y=ay+(t.get('m12') or 0)
    w=s.get('x'); h=s.get('y')
    parts=[f"{'  '*depth}{n.get('name','?')}", f"[{n.get('type')}]",
           f"x={num(x)} y={num(y)} w={num(w)} h={num(h)}"]
    r=n.get('cornerRadius')
    rs=[n.get(k) for k in ('rectangleTopLeftCornerRadius','rectangleTopRightCornerRadius','rectangleBottomRightCornerRadius','rectangleBottomLeftCornerRadius')]
    if any(v is not None for v in rs) and len(set(rs))>1:
        parts.append("r=" + "/".join(str(num(v or 0)) for v in rs))
    elif r: parts.append(f"r={num(r)}")
    f=paints(n.get('fillPaints'))
    if f: parts.append("fill="+",".join(map(str,f)))
    st=paints(n.get('strokePaints'))
    if st: parts.append(f"stroke={','.join(map(str,st))} {num(n.get('strokeWeight') or 0)}px")
    if n.get('type')=='TEXT':
        ti=textinfo(n)
        if ti: parts.append("| "+ti)
    if n.get('stackMode') and n['stackMode']!='NONE':
        pad=[n.get(k) for k in ('stackTopPadding','stackRightPadding','stackBottomPadding','stackLeftPadding')]
        parts.append(f"autolayout {n['stackMode']} gap={num(n.get('stackSpacing') or 0)} pad={'/'.join(str(num(p or 0)) for p in pad)}")
    return "  ".join(parts), x, y

def walk(g, depth=0, ax=0, ay=0, out=None, maxdepth=99):
    n=by[g]
    s,x,y = line(n, depth, ax, ay)
    out.append(s)
    if depth<maxdepth:
        for c in kids.get(g,[]):
            walk(gid(c['guid']), depth+1, x, y, out, maxdepth)
    return out

if __name__=='__main__':
    root=sys.argv[1] if len(sys.argv)>1 else '7217:1990'
    md=int(sys.argv[2]) if len(sys.argv)>2 else 99
    out=[]
    # gốc bắt đầu ở 0,0
    n=by[root]; t=n.get('transform') or {}
    walk(root, 0, -(t.get('m02') or 0), -(t.get('m12') or 0), out, md)
    print("\n".join(out))
