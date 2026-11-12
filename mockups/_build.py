"""Inline content/content.json into each mockup template.

Templates live in mockups/_src/*.html and contain the marker /*@DATA@*/.
Output goes to mockups/<same name>.html so every mockup is one file:
images are inlined as data URIs, libraries and fonts come from CDNs, and
only the CV link still points at ../content/assets/.

Run: python3 -I mockups/_build.py
"""
import base64
import json
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent
CONTENT = ROOT.parent / "content" / "content.json"
ASSET_PREFIX = "../content/"


def asset(path):
    return ASSET_PREFIX + path if path else None


def compact(d):
    p, c = d["profile"], d["contact"]
    return {
        "name": p["name"],
        "short": p["shortName"],
        "headline": p["headline"],
        "role": "Software Developer",
        "location": p["location"],
        "about": p["about"],
        "photo": asset(p["photo"]["thumb"]),
        "email": c["email"],
        "phone": c["phone"],
        "phoneE164": c["phoneE164"],
        "cv": asset(c["cv"]["copy"]),
        "socials": [{"name": s["name"], "handle": s["handle"], "url": s["url"]} for s in c["socials"]],
        "skills": {
            "Languages": d["skills"]["languages"],
            "Frontend": d["skills"]["frontend"],
            "Backend": d["skills"]["backend"],
            "Database": d["skills"]["database"],
            "Design": d["skills"]["design"],
            "Also used": ["Zustand", "Chakra UI", "Go", "Streamlit", "TypeScript"],
        },
        "skillIcons": {s["name"]: s["icon"] for s in d["skills"]["icons"]},
        "experience": [
            {
                "role": e["role"],
                "company": e["company"],
                "start": e["start"],
                "end": e["end"],
                "latest": e.get("latest", False),
                "highlights": e["highlights"],
            }
            for e in d["experience"]
        ],
        "education": d["education"]["items"],
        "organizations": d["organizations"]["items"],
        "achievements": d["achievements"]["items"],
        "projects": [
            {
                "slug": pr["slug"],
                "title": pr["title"],
                "description": pr["description"].replace("Wwebsite", "website"),
                "tags": pr["tags"],
                "github": pr["github"],
                "website": pr["website"],
                "thumb": asset(pr["thumb"]),
            }
            for pr in d["projects"]
        ],
        # Confirmed future projects; copy comes from the user later, so only the
        # screenshot name and image are passed through.
        "pending": [
            {"slug": pp["slug"], "title": pp["workingTitle"], "thumb": asset(pp["thumb"])}
            for pp in d.get("pendingProjects", {}).get("items", [])
        ],
        "certificates": [
            {"title": ce["title"], "issuer": ce["issuer"], "date": ce["date"], "thumb": asset(ce["thumb"])}
            for ce in d["certificates"]
        ],
    }


_cache = {}


def data_uri(url, width):
    """Shrink an image under ../content/assets and return it as a data URI.

    Inlining keeps each mockup a single file: pages opened from file:// or
    published elsewhere can't resolve ../content/, and Chrome refuses to put
    file:// images into WebGL textures.
    """
    key = (url, width)
    if key not in _cache:
        src = ROOT / url
        with tempfile.TemporaryDirectory() as tmp:
            dst = pathlib.Path(tmp) / "out.jpg"
            subprocess.run(
                ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "60", "--resampleWidth", str(width), str(src), "--out", str(dst)],
                check=True, capture_output=True,
            )
            _cache[key] = "data:image/jpeg;base64," + base64.b64encode(dst.read_bytes()).decode()
    return _cache[key]


def inline(data):
    data["photo"] = data_uri(data["photo"], 320)
    for p in data["projects"] + data["pending"]:
        p["thumb"] = data_uri(p["thumb"], 560)
    for c in data["certificates"]:
        c["thumb"] = data_uri(c["thumb"], 360)
    return data


def main():
    data = inline(compact(json.loads(CONTENT.read_text())))
    data_js = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    for src in sorted((ROOT / "_src").glob("*.html")):
        html = src.read_text()
        if "/*@DATA@*/" not in html:
            raise SystemExit(f"{src.name}: missing /*@DATA@*/ marker")
        html = html.replace("/*@DATA@*/", data_js)
        (ROOT / src.name).write_text(html)
        print("built", src.name)


if __name__ == "__main__":
    main()
