import os
import time
import re
from matplotlib import pyplot as plt
import matplotlib as mpl
import asyncio
import aiofiles
from io import BytesIO

mpl.rcParams["text.usetex"] = True
mpl.rcParams["font.family"] = "serif"
mpl.rcParams["text.latex.preamble"] = r"\usepackage{amsmath}"

async def smart_wrap_latex(text):
    """
    Ultra-clean wrapping: no forced \\ at all, let LaTeX handle line breaks.
    Just put everything inside a centered parbox.
    """
    return r"\parbox{5in}{" + text + "}"

async def render_latex_to_image(content: str, x_size=5, y_size=3, fontsize=14, wrap=True):
    """
    Render mixed LaTeX/plaintext input as a centered PNG image asynchronously.
    """
    out_dir = "static"
    dpi = 300
    figsize = (x_size, y_size)
    fontsize = fontsize

    if wrap:
        processed_content = await smart_wrap_latex(content)

    os.makedirs(out_dir, exist_ok=True)
    
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)
    ax.axis("off")
    ax.text(
        0.5, 0.5,
        processed_content,
        ha="center", va="center",
        fontsize=fontsize
    )
    
    buffer = BytesIO()
    fig.savefig(buffer, bbox_inches="tight", pad_inches=0.2)
    plt.close(fig)
    
    filename = f"latex_{int(time.time() * 1000)}.png"
    path = os.path.join(out_dir, filename)
    
    buffer.seek(0)
    async with aiofiles.open(path, 'wb') as f:
        await f.write(buffer.getvalue())
    
    return path

content = (
    "Set up and evaluate the volume of the solid region D bounded below by the paraboloid $z = x^2 + y^2$ and above by the sphere $x^2 + y^2 + z^2 = 2$. Use cylindrical coordinates."
)

#render_latex_to_image(content)