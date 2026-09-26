import os
import struct
import zlib
import math

def create_png(width, height, draw_fn, output_path):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # Filter type 0: None
        for x in range(width):
            r, g, b, a = draw_fn(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(bytes(raw_data), 9))
    iend = chunk(b'IEND', b'')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(header + ihdr + idat + iend)
    print(f"Generated {output_path} ({width}x{height})")

def standard_icon(x, y, w, h):
    # Normalized coords from -1 to 1
    nx = (x / (w - 1)) * 2 - 1
    ny = (y / (h - 1)) * 2 - 1
    
    # Rounded rectangle (corner radius 0.28)
    radius = 0.28
    qx = max(abs(nx) - (1 - radius), 0)
    qy = max(abs(ny) - (1 - radius), 0)
    d = math.sqrt(qx * qx + qy * qy)
    
    if d > radius:
        return (0, 0, 0, 0)
    
    # Background gradient: deep slate navy to dark emerald
    # ny goes from -1 (top) to 1 (bottom)
    t = (ny + 1) / 2.0
    bg_r = int(15 * (1 - t * 0.3) + 6 * (t * 0.3))
    bg_g = int(23 * (1 - t) + 78 * t)
    bg_b = int(42 * (1 - t) + 59 * t)

    # Foreground badge: Savings vault coin / upward growth symbol
    # Center circle
    dist_center = math.sqrt(nx * nx + ny * ny)
    
    # Outer ring: emerald glow
    if 0.45 <= dist_center <= 0.65:
        # Ring gradient
        rt = (nx + 1) / 2.0
        r = int(16 * (1 - rt) + 52 * rt)
        g = int(185 * (1 - rt) + 211 * rt)
        b = int(129 * (1 - rt) + 153 * rt)
        return (r, g, b, 255)
    
    # Dollar vertical stem: nx between -0.06 and 0.06, ny between -0.40 and 0.40
    if abs(nx) <= 0.05 and abs(ny) <= 0.38:
        return (240, 253, 244, 255) # emerald-50
        
    # 'S' shape approximation
    # Top curve
    top_c = math.sqrt(nx * nx + (ny + 0.16) * (ny + 0.16))
    if 0.12 <= top_c <= 0.24 and (nx <= 0.05 or ny <= -0.16):
        return (240, 253, 244, 255)
        
    # Bottom curve
    bot_c = math.sqrt(nx * nx + (ny - 0.16) * (ny - 0.16))
    if 0.12 <= bot_c <= 0.24 and (nx >= -0.05 or ny >= 0.16):
        return (240, 253, 244, 255)

    return (bg_r, bg_g, bg_b, 255)

def maskable_icon(x, y, w, h):
    # Maskable icons need 15% safe margin around border, full background coverage
    nx = (x / (w - 1)) * 2 - 1
    ny = (y / (h - 1)) * 2 - 1
    
    t = (ny + 1) / 2.0
    bg_r = int(15 * (1 - t) + 6 * t)
    bg_g = int(23 * (1 - t) + 78 * t)
    bg_b = int(42 * (1 - t) + 59 * t)

    # Scale symbol down to 70% to stay strictly inside safe zone
    snx = nx / 0.70
    sny = ny / 0.70
    
    dist_center = math.sqrt(snx * snx + sny * sny)
    if 0.45 <= dist_center <= 0.65:
        rt = (snx + 1) / 2.0
        r = int(16 * (1 - rt) + 52 * rt)
        g = int(185 * (1 - rt) + 211 * rt)
        b = int(129 * (1 - rt) + 153 * rt)
        return (r, g, b, 255)

    if abs(snx) <= 0.05 and abs(sny) <= 0.38:
        return (240, 253, 244, 255)

    top_c = math.sqrt(snx * snx + (sny + 0.16) * (sny + 0.16))
    if 0.12 <= top_c <= 0.24 and (snx <= 0.05 or sny <= -0.16):
        return (240, 253, 244, 255)
        
    bot_c = math.sqrt(snx * snx + (sny - 0.16) * (sny - 0.16))
    if 0.12 <= bot_c <= 0.24 and (snx >= -0.05 or sny >= 0.16):
        return (240, 253, 244, 255)

    return (bg_r, bg_g, bg_b, 255)

if __name__ == '__main__':
    create_png(192, 192, standard_icon, 'public/pwa-192x192.png')
    create_png(512, 512, standard_icon, 'public/pwa-512x512.png')
    create_png(180, 180, standard_icon, 'public/apple-touch-icon.png')
    create_png(512, 512, maskable_icon, 'public/pwa-maskable-512x512.png')
