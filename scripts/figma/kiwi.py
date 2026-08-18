import struct

BUILTIN = ['bool','byte','int','uint','float','string','int64','uint64']

class BB:
    __slots__=('d','i')
    def __init__(self, d): self.d=d; self.i=0
    def byte(self):
        v=self.d[self.i]; self.i+=1; return v
    def varuint(self):
        # kiwi readVarUint: tối đa 5 byte (shift < 35), kết quả uint32
        s=0; r=0; d=self.d; i=self.i
        while True:
            b=d[i]; i+=1
            r |= (b & 0x7f) << s
            s += 7
            if not (b & 0x80) or s >= 35: break
        self.i=i; return r & 0xFFFFFFFF
    def varuint64(self):
        # kiwi readVarUint64: 8 nhóm 7 bit, byte thứ 9 lấy TRỌN 8 bit (tối đa 9 byte).
        # Đọc kiểu LEB128 thuần sẽ nuốt lem sang field kế (bug làm lệch cả stream).
        d=self.d; i=self.i; r=0; s=0
        while s < 56:
            b=d[i]; i+=1
            r |= (b & 0x7f) << s
            if not (b & 0x80):
                self.i=i; return r
            s += 7
        b=d[i]; i+=1
        r |= b << 56
        self.i=i
        return r & 0xFFFFFFFFFFFFFFFF
    def varint(self):
        v=self.varuint(); return (v>>1) ^ -(v & 1)
    def varint64(self):
        v=self.varuint64(); return (v>>1) ^ -(v & 1)
    def varfloat(self):
        d=self.d; i=self.i
        first=d[i]
        if first==0:
            self.i=i+1; return 0.0
        bits = first | (d[i+1]<<8) | (d[i+2]<<16) | (d[i+3]<<24)
        self.i=i+4
        bits = ((bits << 23) | (bits >> 9)) & 0xFFFFFFFF
        return struct.unpack('<f', struct.pack('<I', bits))[0]
    def string(self):
        d=self.d; i=self.i; j=d.index(0, i); self.i=j+1
        return d[i:j].decode('utf-8','replace')

def decode_schema(buf):
    bb=BB(buf)
    n=bb.varuint()
    defs=[]
    for _ in range(n):
        name=bb.string(); kind=bb.byte(); fc=bb.varuint()
        fields=[]
        for _ in range(fc):
            fn=bb.string(); ft=bb.varint(); arr=bool(bb.byte() & 1); val=bb.varuint()
            fields.append({'name':fn,'type':ft,'array':arr,'value':val})
        defs.append({'name':name,'kind':['ENUM','STRUCT','MESSAGE'][kind],'fields':fields})
    return defs

class Decoder:
    def __init__(self, defs):
        self.defs=defs
        self.by_name={d['name']:i for i,d in enumerate(defs)}
    def typename(self, t):
        return BUILTIN[~t] if t<0 else self.defs[t]['name']
    def read_value(self, bb, t):
        if t<0:
            k=BUILTIN[~t]
            if k=='bool':   return bb.byte()!=0
            if k=='byte':   return bb.byte()
            if k=='int':    return bb.varint()
            if k=='uint':   return bb.varuint()
            if k=='float':  return bb.varfloat()
            if k=='string': return bb.string()
            if k=='int64':  return bb.varint64()
            if k=='uint64': return bb.varuint64()
            raise ValueError(k)
        d=self.defs[t]
        if d['kind']=='ENUM':
            v=bb.varuint()
            for f in d['fields']:
                if f['value']==v: return f['name']
            return v
        if d['kind']=='STRUCT':
            o={}
            for f in d['fields']:
                o[f['name']]=self.read_field(bb,f)
            return o
        # MESSAGE
        o={}
        byval={f['value']:f for f in d['fields']}
        while True:
            fid=bb.varuint()
            if fid==0: return o
            f=byval.get(fid)
            if f is None: raise ValueError(f"unknown field {fid} in {d['name']}")
            o[f['name']]=self.read_field(bb,f)
    def read_field(self, bb, f):
        if f['array']:
            n=bb.varuint()
            return [self.read_value(bb,f['type']) for _ in range(n)]
        return self.read_value(bb,f['type'])
