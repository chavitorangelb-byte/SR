import sys, glob
from PIL import Image
d, out, cols = sys.argv[1], sys.argv[2], int(sys.argv[3])
fs = sorted(glob.glob(d + '/*.jpg')); ims = [Image.open(f) for f in fs]
w, h = ims[0].size; rows = -(-len(ims) // cols)
b = Image.new('RGB', (cols * (w + 8), rows * (h + 8)), (40, 40, 40))
for i, im in enumerate(ims): b.paste(im, ((i % cols) * (w + 8) + 4, (i // cols) * (h + 8) + 4))
b.save(out, quality=88)
