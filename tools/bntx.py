# Decodifica la primera textura de un .bntx (Switch) a una imagen Pillow. Solo lo necesario para
# los retratos de personaje del ModPack: formatos BC1/BC3/BC7 (y RGBA8), disposición block-linear.
import io, struct
from PIL import Image
# formato BRTI (byte alto) -> (dxgi, bytes por bloque)
FMT = {0x1a: (71, 8), 0x1b: (74, 16), 0x1c: (77, 16), 0x20: (98, 16)}  # BC1, BC2, BC3, BC7
def _round_up(x, n): return (x + n - 1) // n * n
def _gob_addr(xb, y, pitch, bh):
    gobs_w = pitch // 64
    a = (y // (8 * bh)) * 512 * bh * gobs_w + (xb // 64) * 512 * bh + ((y % (8 * bh)) // 8) * 512
    x = xb % 64; y %= 8
    return a + ((x % 64) // 32) * 256 + ((y % 8) // 2) * 64 + ((x % 32) // 16) * 32 + (y % 2) * 16 + (x % 16)
def decode(path):
    d = open(path, 'rb').read()
    i = d.find(b'BRTI')
    if d[:4] != b'BNTX' or i < 0: raise ValueError('no es BNTX')
    fmt = struct.unpack_from('<I', d, i + 0x1c)[0] >> 8
    w, h = struct.unpack_from('<II', d, i + 0x24)
    bh_log2 = struct.unpack_from('<I', d, i + 0x34)[0]
    ptrs = struct.unpack_from('<Q', d, i + 0x70)[0]
    off = struct.unpack_from('<Q', d, ptrs)[0]
    if fmt == 0x0b:
        bpp, bw, bhh, dxgi = 4, 1, 1, None
    elif fmt in FMT:
        dxgi, bpp = FMT[fmt]; bw = bhh = 4
    else:
        raise ValueError('formato no soportado 0x%x' % fmt)
    wb, hb = -(-w // bw), -(-h // bhh)
    pitch = _round_up(wb * bpp, 64)
    bh = max(1, 1 << bh_log2)
    out = bytearray(wb * hb * bpp)
    for y in range(hb):
        for x in range(wb):
            s = off + _gob_addr(x * bpp, y, pitch, bh)
            out[(y * wb + x) * bpp:(y * wb + x + 1) * bpp] = d[s:s + bpp]
    if dxgi is None:
        return Image.frombytes('RGBA', (w, h), bytes(out))
    hdr = b'DDS ' + struct.pack('<7I', 124, 0x1007 | 0x80000, h, w, len(out), 0, 0) + b'\0' * 44
    hdr += struct.pack('<2I4s5I', 32, 4, b'DX10', 0, 0, 0, 0, 0) + struct.pack('<5I', 0x1000, 0, 0, 0, 0)
    hdr += struct.pack('<5I', dxgi, 3, 0, 1, 0)
    return Image.open(io.BytesIO(hdr + bytes(out))).convert('RGBA')
