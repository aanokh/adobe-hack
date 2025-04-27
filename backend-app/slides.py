from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
from openai import OpenAI
import os
import time
import matplotlib.pyplot as plt
import tempfile
import re

import matplotlib as mpl

import matplotlib as mpl
mpl.rcParams["text.usetex"] = True
mpl.rcParams["font.family"] = "serif"
mpl.rcParams["text.latex.preamble"] = r"\usepackage{amsmath}"



llm = ChatOpenAI(model_name="o4-mini", openai_api_key=OPENAI_API_KEY)
client = OpenAI(api_key=OPENAI_API_KEY)

# ----- Function 1: Generate Outline -----

def generate_outline(topic: str) -> list:
    """Generates a slide outline (titles only) for a given topic."""
    system_message_outline = """
    You are an AI presentation assistant. Given a topic, generate a clear slide outline for a multi-slide presentation.

    Instructions:
    - Output a JSON array where each element is a slide title.
    - Titles should be concise, descriptive, and logically ordered.
    - Cover the topic in about 5–8 slides.
    - Output ONLY valid JSON — no prose, no markdown.
    """
    
    messages = [
        SystemMessage(content=system_message_outline),
        HumanMessage(content=topic)
    ]

    response = llm.invoke(messages).content
    return response

# ----- Function 2: Generate Full Slides -----

def generate_slides(outline: list) -> list:
    """Expands an outline (list of titles) into full slides."""
    system_message_expand = """
    You are an AI presentation assistant. Expand a given slide outline into full, detailed slides.

    For each slide title, create a JSON object with:
    1. `title` (keep given title)
    2. `bulletPoints` (3–5 informative points)
    3. `speakerNote` (friendly academic explanation)
    4. `imagePrompt` (visual description OR null if math-heavy)
    5. `layoutType` ("bullets", "comparison", "timeline", "quote", or "visual")
    6. `latex` (simple inline LaTeX string OR null)

    Rules:
    - If the topic is math-heavy (math, physics, neural networks), set `imagePrompt` = null and always provide `latex`.
    - Use valid JSON array output.
    - No extra prose, no markdown.
    """

    outline_text = "\n".join(f"- {title}" for title in outline)

    messages = [
        SystemMessage(content=system_message_expand),
        HumanMessage(content=f"Expand the following slide outline:\n{outline_text}")
    ]

    response = llm.invoke(messages).content
    return response

# ----- Function 3: Generate Images -----

from openai import OpenAI
import base64

client = OpenAI(api_key=OPENAI_API_KEY)

prompt = "Use English text only. An educational diagram showing the water cycle, labeled with arrows, colorful and clean cartoon style."

result = client.images.generate(
    model="gpt-image-1",
    prompt=prompt
)

image_base64 = result.data[0].b64_json
image_bytes = base64.b64decode(image_base64)

with open("mlp.png", "wb") as f:
    f.write(image_bytes)

# --- LaTeX Renderer (MathText via Matplotlib) ---
def render_latex_to_image_old(latex_code):
    fig, ax = plt.subplots(figsize=(5, 1.5), dpi=300)
    ax.text(0.5, 0.5, f"${latex_code}$", fontsize=26, ha='center', va='center')
    ax.axis("off")

    timestamp = int(time.time() * 1000)  # milliseconds
    filename = f"latex_{timestamp}.png"
    filepath = os.path.join("static", filename)
    
    plt.savefig(filepath, bbox_inches='tight', pad_inches=0.2)
    plt.close(fig)
    return filepath

def render_latex_to_image(content: str):
    """
    Render a mixed plain-text/MathText string as an image.
    
    - content: e.g. 'Solve for $x^2 + y^2 = 1$ and report your answer.'
    - out_dir: folder where the PNG will be saved.
    - dpi, figsize, fontsize: tweak as you like.
    """
    out_dir = "static"
    dpi = 300
    figsize = (2, 6)
    fontsize = 20

    #content = content.replace("$$", "$")

    os.makedirs(out_dir, exist_ok=True)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)
    ax.axis("off")
    ax.text(
        0.5, 0.5,
        content,
        ha="center", va="center",
        wrap=True,
        fontsize=fontsize
    )
    filename = f"latex_{int(time.time() * 1000)}.png"
    path = os.path.join(out_dir, filename)
    fig.savefig(path, bbox_inches="tight", pad_inches=0.2)
    plt.close(fig)
    return path

# ----- Example Usage -----
'''
if __name__ == "__main__":
    
    topic = "Lecture Slides teaching the basics of matrix addition"
    outline_json = generate_outline(topic)
    print("\n=== Outline Generated ===\n")
    print(outline_json)

    import json
    outline_list = json.loads(outline_json)

    slides_json = generate_slides(outline_list)
    print("\n=== Full Slides Generated ===\n")
    print(slides_json)
    '''