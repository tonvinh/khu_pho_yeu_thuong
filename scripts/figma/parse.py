"""Giải nén canvas.fig -> nodes.pkl để dump.py/tree.py đọc được.

    python3 scripts/figma/parse.py [docs/lp/LandingpageFCM.fig]

BẪY định dạng (mất cả buổi nếu không biết):
  · canvas.fig = "fig-kiwi" + uint32 version + các chunk [uint32 len][data]
  · chunk 0 (SCHEMA) nén bằng **raw deflate** (zlib, wbits=-15) — KHÔNG phải zstd
  · chunk 1 (DATA)   nén bằng **zstd** (magic 28 b5 2f fd) → gọi CLI `zstd -d`
  · uint64 của kiwi không phải LEB128 thuần — xem chú thích trong kiwi.py
nodes.pkl ghi cạnh script này; dump.py/tree.py trỏ SP tới thư mục chứa nó.
"""
import sys, os, zipfile, struct, subprocess, pickle, zlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kiwi import BB, decode_schema, Decoder

FIG = sys.argv[1] if len(sys.argv) > 1 else 'docs/lp/LandingpageFCM.fig'
OUT = os.path.dirname(os.path.abspath(__file__)) + '/nodes.pkl'

raw = zipfile.ZipFile(FIG).read('canvas.fig')
assert raw[:8] == b'fig-kiwi'
i = 12
chunks = []
while i + 4 <= len(raw):
    (n,) = struct.unpack_from('<I', raw, i); i += 4
    chunk = raw[i:i+n]; i += n
    if chunk[:4] == b'\x28\xb5\x2f\xfd':
        chunk = subprocess.run(['zstd', '-d', '-c'], input=chunk,
                               stdout=subprocess.PIPE, stderr=subprocess.DEVNULL).stdout
    else:
        chunk = zlib.decompressobj(-15).decompress(chunk)
    chunks.append(chunk)
    if len(chunks) == 2: break

defs = decode_schema(chunks[0])
dec = Decoder(defs)
bb = BB(chunks[1])
msg = dec.read_value(bb, dec.by_name['Message'])
nc = msg.get('nodeChanges') or []
print('nodeChanges:', len(nc))
with open(OUT, 'wb') as f:
    pickle.dump(nc, f)
print('wrote', OUT)
