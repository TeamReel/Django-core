
import os
import sys
from PIL import Image, ImageDraw

print("Starting debug script...")

def create_debug_visualization():
    # Constants from build_lineup.py
    CLOSEUP_CROP_Y_FRAC = 0.22
    CLOSEUP_HEAD_OVERLAY_FRAC = 0.45
    CIRCLE_SIZE = 211

    # Constants from create_circle_assets.py (Geometry source)
    MASK_ORIGINAL_SIZE = 400
    MASK_CIRCLE_DIAM_FRAC = 0.86
    MASK_BOTTOM_MARGIN = 8

    # Paths
    ASSETS_DIR = os.path.join(os.getcwd(), "local_lineup_test", "assets")
    INPUT_IMAGE = os.path.join(ASSETS_DIR, "closeup", "junior_van_der_velden.png")

    # 1. Load Input
    print(f"Loading {INPUT_IMAGE}...")
    if not os.path.exists(INPUT_IMAGE):
        print(f"Error: {INPUT_IMAGE} not found.")
        return

    img = Image.open(INPUT_IMAGE).convert("RGBA")
    print(f"Original Size: {img.size}")

    # 2. Scale (Step 1 in build_lineup.py)
    # scale_target = int(circle_size * 2.2)
    scale_target = int(CIRCLE_SIZE * 2.2)
    img_scaled = img.resize((scale_target, scale_target), Image.Resampling.LANCZOS)
    print(f"Scaled Size: {img_scaled.size} (Target: {scale_target})")

    # 3. Crop (Step 2)
    # crop=circle_size:circle_size:(iw-ow)/2:(ih-oh)*CLOSEUP_CROP_Y_FRAC
    iw, ih = img_scaled.size
    ow, oh = CIRCLE_SIZE, CIRCLE_SIZE

    crop_x = int((iw - ow) / 2)
    crop_y_float = (ih - oh) * CLOSEUP_CROP_Y_FRAC
    crop_y = int(crop_y_float)

    print(f"Crop Window: {ow}x{oh} at X={crop_x}, Y={crop_y} (Float Y={crop_y_float:.2f})")
    # PIL Crop is (left, top, right, bottom)
    img_cropped = img_scaled.crop((crop_x, crop_y, crop_x + ow, crop_y + oh))
    img_cropped.save("debug_crop.png")
    print("Saved debug_crop.png")

    # 4. Create Mask (Replicating create_circle_assets.py logic but scaled)
    # Real mask is created at 400x400 then scaled to 211x211.
    # Let's create it at 211 directly for simplicity, or scale it to match exact behavior.
    # Logic:
    # circle_d = int(SIZE * CIRCLE_DIAM_FRAC) -> 344
    # y1 = SIZE - BOTTOM_MARGIN_PX -> 392
    # y0 = y1 - circle_d -> 48
    # y_frac_top = 48 / 400 = 0.12
    # y_frac_bot = 392 / 400 = 0.98

    # Let's behave exactly like ffmpeg: create mask at 400, scale to 211.
    mask_orig = Image.new('L', (MASK_ORIGINAL_SIZE, MASK_ORIGINAL_SIZE), 0)
    draw_m = ImageDraw.Draw(mask_orig)

    circle_d = int(MASK_ORIGINAL_SIZE * MASK_CIRCLE_DIAM_FRAC)
    x0 = (MASK_ORIGINAL_SIZE - circle_d) // 2
    x1 = x0 + circle_d
    y1 = MASK_ORIGINAL_SIZE - MASK_BOTTOM_MARGIN
    y0 = y1 - circle_d

    draw_m.ellipse((x0, y0, x1, y1), fill=255)

    mask_scaled = mask_orig.resize((CIRCLE_SIZE, CIRCLE_SIZE), Image.Resampling.LANCZOS)
    mask_scaled.save("debug_mask.png")
    print("Saved debug_mask.png")

    # 5. Apply Mask (Body)
    # [p_sq_m][mask_label]alphamerge[p_masked]
    img_masked = img_cropped.copy()
    img_masked.putalpha(mask_scaled)
    # Saved for reference (not requested but useful)
    img_masked.save("debug_masked_body.png")

    # 6. Head Overlay (Step 4)
    # head_h = int(circle_size * CLOSEUP_HEAD_OVERLAY_FRAC)
    # [p_sq_h]crop=circle_size:head_h:0:0[p_head]
    head_h = int(CIRCLE_SIZE * CLOSEUP_HEAD_OVERLAY_FRAC)
    if head_h < 2: head_h = 2

    print(f"Head Overlay Height: {head_h}")

    # Crop top part of original cropped image
    # 0:0 means start at 0,0 of the cropped image.
    img_head = img_cropped.crop((0, 0, CIRCLE_SIZE, head_h))
    img_head.save("debug_head.png")
    print("Saved debug_head.png")

    # 7. Compose (Step 5)
    # [p_masked][border]overlay... (skipping border for now as it's just decoration)

    # [p_circ]pad=iw:ih+head_h:0:head_h...
    # FFmpeg pad adds space.
    # Here: new size is iw x (ih + head_h).
    # x=0, y=head_h means the original content is placed at (0, head_h).
    # So we add empty space at the TOP.

    # In ffmpeg command at line 390:
    # pad=iw:ih+head_h:0:head_h:color=0x00000000
    # The 'y' offset for the original image is 'head_h'. So it pushes the circle DOWN.
    # The top 'head_h' pixels are transparent.

    final_w = CIRCLE_SIZE
    final_h = CIRCLE_SIZE + head_h
    final_img = Image.new("RGBA", (final_w, final_h), (0,0,0,0))

    # Paste masked body at (0, head_h)
    # This represents p_circ being pushed down
    final_img.paste(img_masked, (0, head_h), img_masked)

    # [p_pad][p_head]overlay=0:0[p_badge]
    # Overlay head at (0,0) of the NEW padded canvas.
    # That means top-left.
    final_img.paste(img_head, (0, 0), img_head)

    final_img.save("debug_final.png")
    print("Saved debug_final.png")

    # --- Analysis Logic ---
    # We are simulating the "popout" effect.
    # The intent is to show the top part of the head (img_head) sticking out above the circle.
    # img_masked contains the circle.
    # The circle starts at Y_mask = 25 (scaled 48).
    #
    # We place img_masked at Y_canvas = 94.
    # So the circle starts at Y_canvas = 94 + 25 = 119.
    #
    # We place img_head at Y_canvas = 0 to 94.
    #
    # So pixels 0-94 are from the cropped source image (Y=0..94).
    # Then pixels 94-119 are transparent (because mask is 0 there).
    # Then pixel 119 starts the circle (which is Y=25 of crop).
    #
    # Wait... Crop Y=25 IS THE TOP OF THE CIRCLE.
    # And we are displaying Crop Y=0..25 in `img_head`.
    #
    # IF head_h (94) > mask_top_y (25), THEN:
    #   img_head shows Crop Y=0..94.
    #   img_masked starts at Canvas Y=94.
    #   img_masked Top (Crop Y=25) is at Canvas Y = 94 + 25 = 119.
    #
    #   Gap: Crop Y=94 (bottom of head overlay) vs Crop Y=25 (top of circle).
    #   VISUAL DISCONTINUITY!
    #   We want to match the pixels.
    #   The pixel at Canvas Y=X should be conceptually consistent.
    #
    #   The issue is `pad=iw:ih+head_h:0:head_h`.
    #   This shifts the circle down by `head_h`.
    #   This is only correct if we wanted to STACK them vertically.
    #   But we want to OVERLAY them such that `img_head` covers the top part of `img_masked`... NO.
    #   We want `img_head` (the unmasked part) to extend ABOVE the circle.
    #
    #   If we want the head to pop out, the geometry must align.
    #   The `img_masked` has the circle starting at `mask_top_y`.
    #   We want the head to stick out above that `mask_top_y`.
    #
    #   If `head_h` is the height of the "extra" space we add...
    #   And we place `img_head` at the top...
    #   And proper alignment implies that `img_head` bottom row matches `img_masked` top row?
    #   No, `img_head` contains Y=0..H. `img_masked` contains Y=0..H (masked).
    #
    #   If we just want to show the top of the head which was cut off by the mask...
    #   The mask cuts off everything above Y=25.
    #   So we want to show Y=0..25 above the circle.
    #
    #   But we shift `img_masked` DOWN by `head_h` (94).
    #   So `img_masked` (Crop Y=0) is at Canvas Y=94.
    #   And `img_head` (Crop Y=0) is at Canvas Y=0.
    #
    #   So at Canvas Y=0, we see Crop Y=0.
    #   At Canvas Y=94, we see Crop Y=0.
    #
    #   IT IS DUPLICATED!
    #   We see the forehead at the top.
    #   Then we see the forehead AGAIN inside the transparent part of the mask (if it wasn't masked).
    #   But since it IS masked, we see nothing until the circle starts.
    #   The circle starts at Crop Y=25.
    #   Which is at Canvas Y = 94 + 25 = 119.
    #
    #   So:
    #   Canvas 0..94: Crop 0..94 (Forehead to Nose)
    #   Canvas 94..119: Transparent (Masked forehead)
    #   Canvas 119..305: Circle (starting from Crop 25 - Forehead).
    #
    #   So we see:
    #   1. Big head chunk (0..94).
    #   2. Gap.
    #   3. Circle starting with Forehead (25).
    #
    #   Result: "Piece of head above circle". Exactly as user reported.
    #
    #   FIX:
    #   We should not shift `img_masked` down by `head_h` blindly.
    #   The "pop out" logic usually means:
    #   Use the original coordinate system.
    #   The mask limits the body to the circle.
    #   We want to "unmask" the top part.
    #
    #   If we just overlay `p_head` on top of `p_masked` WITHOUT padding/shifting?
    #   Then `p_head` (Crop 0..94) is on top of `p_masked` (Crop 0..211).
    #   At Y=0..25: `p_head` shows pixels. `p_masked` is transparent. Result: Visible head top.
    #   At Y=25..94: `p_head` shows pixels. `p_masked` shows pixels. They are IDENTICAL. Result: Visible head.
    #   At Y=94..211: `p_head` ends. `p_masked` continues.
    #
    #   So simply removing the padding shift would fix the continuity.
    #   BUT, if we remove padding, the canvas size remains 211x211.
    #   Does the user want the head to extend OUTSIDE the 211x211 box?
    #   Probably yes, otherwise we are just unmasking the top of the circle (restoring the square corner).
    #   The user wants the "Pop Out" effect where the head breaches the circle boundary.
    #
    #   If the circle is meant to be the "limit", then yes, we are just unmasking the top.
    #   But if the circle is small usage, and we want "tall" usage...
    #
    #   The code adds `pad`. This implies they want a taller sprite.
    #   If they want a taller sprite, they should pad the BOTTOM or ensure alignment.
    #
    #   Correct Logic for "Pop Out":
    #   We want the circle to be at the bottom.
    #   We want the head to stick out top.
    #
    #   Let `protrusion` be the amount of pixels above the circle top.
    #   Mask Top is at Y=25.
    #   Crop starts at Y=0.
    #   So we naturally have 25 pixels of "head above circle" in the crop space.
    #
    #   If we want to display that, we just need to ensure the composition respects the relative positions.
    #
    #   Start with `p_masked`. (Size 211x211). Reference Y=0 is Top of Crop. Circle starts at Y=25.
    #   If we simply overlay `p_head` (Size 211x94) at (0,0)...
    #   We get a 211x211 image where the top 25px are now visible (unmasked), and 25..94 are same.
    #   This restores the square corners at the top!
    #   It looks like a square top on a round bottom.
    #
    #   That is probably NOT what they want. They want the head cut out *smoothly*?
    #   Usually "Pop Out" implies segmentation (remove background).
    #   We only have a Circle Mask. We don't have a "Head Mask".
    #   So we can't do a true pop-out (where background is removed but head stays).
    #   If the input image is rectangular/full (with background), unmasking the top just shows the background corners too!
    #
    #   Wait, the input `junior_van_der_velden.png` - is it already cut out? Transparent background?
    #   If it is a cutout, then `p_sq` has transparent background.
    #   Then unmasking the top just reveals the head (and no background corners).
    #
    #   Let's check if the input image has alpha.

    if img.mode == 'RGBA':
        extrema = img.getextrema()
        if extrema[3][0] < 255:
            print("Input image has transparency.")
        else:
            print("Input image is opaque.")

if __name__ == "__main__":
    create_debug_visualization()
