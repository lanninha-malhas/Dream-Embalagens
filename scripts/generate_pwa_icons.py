#!/usr/bin/env python3
import struct
import zlib
import math

def make_png(width, height, get_pixel_func):
    """
    Generate a 32-bit RGBA PNG image without external dependencies.
    get_pixel_func(x, y) returns (r, g, b, a) in 0..255.
    """
    raw_rows = []
    for y in range(height):
        row_bytes = bytearray([0]) # Filter type 0 (None)
        for x in range(width):
            r, g, b, a = get_pixel_func(x, y)
            row_bytes.extend([int(r), int(g), int(b), int(a)])
        raw_rows.append(bytes(row_bytes))
    
    compressed_data = zlib.compress(b"".join(raw_rows), level=6)
    
    def chunk(chunk_type, data):
        length = struct.pack(">I", len(data))
        crc = struct.pack(">I", zlib.crc32(chunk_type + data) & 0xffffffff)
        return length + chunk_type + data + crc

    png_bytes = bytearray(b"\x89PNG\r\n\x1a\n")
    # IHDR
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png_bytes.extend(chunk(b"IHDR", ihdr_data))
    # IDAT
    png_bytes.extend(chunk(b"IDAT", compressed_data))
    # IEND
    png_bytes.extend(chunk(b"IEND", b""))
    return bytes(png_bytes)

def render_icon(width, height, maskable=False):
    # Colors
    c_teal_start = (0x22, 0xCB, 0xD0, 255) # #22CBD0
    c_teal_end   = (0x0E, 0x9A, 0xA0, 255) # #0E9AA0
    c_navy       = (0x00, 0x2B, 0x49, 255) # #002B49
    c_white      = (255, 255, 255, 255)
    c_check_bg   = (0x22, 0xCB, 0xD0, 255)

    scale = width / 512.0
    safe_scale = 0.75 if maskable else 1.0
    
    def get_pixel(x, y):
        # Normalize coords relative to center
        cx = width / 2.0
        cy = height / 2.0
        
        # If maskable, full bleed background with safe zone inner content
        if maskable:
            # Gradient full bleed
            t = (x + y) / (width + height)
            r = int(c_teal_start[0] + (c_teal_end[0] - c_teal_start[0]) * t)
            g = int(c_teal_start[1] + (c_teal_end[1] - c_teal_start[1]) * t)
            b = int(c_teal_start[2] + (c_teal_end[2] - c_teal_start[2]) * t)
            base_bg = (r, g, b, 255)
        else:
            # Rounded rect background
            corner_r = 112.0 * scale
            # Check rounded box distance
            dx = max(abs(x - cx) - (cx - corner_r), 0)
            dy = max(abs(y - cy) - (cy - corner_r), 0)
            dist = math.sqrt(dx * dx + dy * dy)
            if dist > corner_r:
                return (0, 0, 0, 0) # transparent
            t = (x + y) / (width + height)
            r = int(c_teal_start[0] + (c_teal_end[0] - c_teal_start[0]) * t)
            g = int(c_teal_start[1] + (c_teal_end[1] - c_teal_start[1]) * t)
            b = int(c_teal_start[2] + (c_teal_end[2] - c_teal_start[2]) * t)
            base_bg = (r, g, b, 255)

        # Scale and translate bag drawing inside 512x512 space
        # Original center is (256, 290)
        orig_cx, orig_cy = 256.0, 280.0
        nx = (x - cx) / (scale * safe_scale) + orig_cx
        ny = (y - cy) / (scale * safe_scale) + orig_cy

        # 1. Handle Arch: ellipse from (196, 180) to (316, 180)
        # Center of handle is (256, 180), rx = 60, ry = 70
        h_dx = (nx - 256.0) / 60.0
        h_dy = (ny - 180.0) / 70.0
        h_dist = math.sqrt(h_dx * h_dx + h_dy * h_dy)
        if 0.78 <= h_dist <= 1.22 and ny <= 180.0:
            return c_white

        # 2. Bag body:
        # Top from 140 to 372 at y=180
        # Bottom from 120 to 392 at y=430
        if 180.0 <= ny <= 430.0:
            # Width widens slightly towards bottom
            progress = (ny - 180.0) / 250.0
            left_bound = 140.0 - progress * 24.0
            right_bound = 372.0 + progress * 24.0
            
            # Rounded bottom corners
            if ny > 410.0:
                bot_progress = (ny - 410.0) / 20.0
                left_bound += bot_progress * 15.0
                right_bound -= bot_progress * 15.0

            if left_bound <= nx <= right_bound:
                # Bag body color
                # Inner square badge on bag: (216, 260) to (296, 340)
                if 255.0 <= nx <= 257.0 and 200.0 <= ny <= 230.0:
                    pass
                if 216.0 <= nx <= 296.0 and 260.0 <= ny <= 340.0:
                    # Check mark on badge
                    # line 1: (236, 300) to (250, 314)
                    # line 2: (250, 314) to (276, 284)
                    # Distance to check segments:
                    d1 = dist_to_segment(nx, ny, 236.0, 300.0, 250.0, 314.0)
                    d2 = dist_to_segment(nx, ny, 250.0, 314.0, 276.0, 284.0)
                    if min(d1, d2) <= 5.0:
                        return c_navy
                    return c_check_bg
                
                # Kraft horizontal stitching line
                if 378.0 <= ny <= 382.0 and 160.0 <= nx <= 352.0:
                    return (255, 255, 255, 120)

                return c_navy

        return base_bg

    return make_png(width, height, get_pixel)

def dist_to_segment(px, py, x1, y1, x2, y2):
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return math.hypot(px - x1, py - y1)
    t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    proj_x = x1 + t * dx
    proj_y = y1 + t * dy
    return math.hypot(px - proj_x, py - proj_y)

if __name__ == "__main__":
    import os
    os.makedirs("/app/applet/public", exist_ok=True)
    
    print("Generating pwa-192x192.png...")
    png_192 = render_icon(192, 192, maskable=False)
    with open("/app/applet/public/pwa-192x192.png", "wb") as f:
        f.write(png_192)

    print("Generating pwa-512x512.png...")
    png_512 = render_icon(512, 512, maskable=False)
    with open("/app/applet/public/pwa-512x512.png", "wb") as f:
        f.write(png_512)

    print("Generating pwa-maskable-512x512.png...")
    png_maskable = render_icon(512, 512, maskable=True)
    with open("/app/applet/public/pwa-maskable-512x512.png", "wb") as f:
        f.write(png_maskable)

    print("Generating apple-touch-icon.png (180x180)...")
    png_apple = render_icon(180, 180, maskable=False)
    with open("/app/applet/public/apple-touch-icon.png", "wb") as f:
        f.write(png_apple)

    print("All PWA PNG assets generated successfully!")
