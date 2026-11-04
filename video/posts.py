# Builds posts.html: four 1600x900 launch visuals (product, fees, supply, meta), one per ?card=N.
import re
def path(n): return re.findall(r'd="([^"]+)"', open(f'../web/logos/{n}.svg').read())
claude, openai, solana = path('claude')[0], path('openai')[0], path('solana')[0]
jup = open('../web/logos/jupiter.svg').read().replace('width="128" height="128"', 'width="100%" height="100%"')
P = "M44 8a36 36 0 1 0 36 36H44V8Z M52 0v36h36A36 36 0 0 0 52 0Z"
mark = lambda c="#FF5A1F", s=40: f'<svg viewBox="0 0 88 88" width="{s}" height="{s}"><path d="{P}" fill="{c}" fill-rule="evenodd"/></svg>'
logo = {
 'claude': lambda s: f'<svg viewBox="0 0 24 24" width="{s}" height="{s}"><path d="{claude}" fill="#D97757"/></svg>',
 'openai': lambda s: f'<svg viewBox="0 0 24 24" width="{s}" height="{s}"><path d="{openai}" fill="#F6F4EF"/></svg>',
 'solana': lambda s: f'<svg viewBox="0 0 24 24" width="{s}" height="{s}"><defs><linearGradient id="sg" x1="0" x2="1"><stop offset="0" stop-color="#9945FF"/><stop offset="1" stop-color="#14F195"/></linearGradient></defs><path d="{solana}" fill="url(#sg)"/></svg>',
 'jupiter': lambda s: f'<div style="width:{s}px;height:{s}px">{jup}</div>',
}
extruded = lambda size, rot: f'''<div style="width:{size}px;height:{size}px;transform:rotateY({rot}deg) rotateX(8deg);filter:drop-shadow(0 0 70px rgba(255,90,31,.75))"><svg viewBox="-6 -6 104 104" width="{size}" height="{size}"><defs><linearGradient id="face" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1E6"/><stop offset=".45" stop-color="#FF8A4C"/><stop offset="1" stop-color="#E4420E"/></linearGradient><linearGradient id="sw" x1="0" y1="0" x2="1" y2="1"><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".42" stop-color="#fff" stop-opacity=".7"/><stop offset=".52" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>{"".join(f'<path d="{P}" fill="rgb({110+i*5},{32+i*2},{8+i})" fill-rule="evenodd" transform="translate({i*.5} {i*.5})"/>' for i in range(24))}<path d="{P}" fill="url(#face)" fill-rule="evenodd" transform="translate(11.5 11.5)"/><path d="{P}" fill="url(#sw)" fill-rule="evenodd" transform="translate(11.5 11.5)"/></svg></div>'''

# Light bars for every card's background (static, seeded).
import random
random.seed(9)
bars = "".join(f'<rect x="{x}" y="{900-h}" width="{w}" height="{h}" fill="url(#bar)" opacity="{o:.2f}"/>' for x,w,h,o in [(i*11+random.randint(0,4), random.choice([3,4,6,8]), 120+int(500*max(0,1-abs(i-c)/22)*random.uniform(.6,1)), .15+.75*max(0,1-abs(i-c)/22)) for c in [72] for i in range(146)] if h>130)
BG = f'''<svg class="bg" viewBox="0 0 1600 900" preserveAspectRatio="none"><defs><linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF7A3D" stop-opacity="0"/><stop offset=".55" stop-color="#FFD9C2" stop-opacity=".9"/><stop offset="1" stop-color="#FF5A1F" stop-opacity=".5"/></linearGradient></defs>{bars}</svg>'''

css = '''
* { box-sizing: border-box; margin: 0; }
html, body { width: 1600px; height: 900px; overflow: hidden; background: #0B0B0C; font-family: Inter, sans-serif; color: #F6F4EF; }
.card { position: absolute; inset: 0; display: none; overflow: hidden; background: radial-gradient(90% 80% at 50% 100%, #2a0f05 0%, #0e0907 55%, #0B0B0C 100%); }
.bg { position: absolute; inset: 0; width: 100%; height: 100%; opacity: .55; }
.vig { position: absolute; inset: 0; background: radial-gradient(80% 80% at 50% 50%, transparent 50%, rgba(0,0,0,.7)); }
.brand { position: absolute; left: 60px; top: 52px; display: flex; gap: 12px; align-items: center; font-weight: 600; font-size: 28px; z-index: 5; }
.foot { position: absolute; right: 60px; bottom: 46px; font: 600 16px Inter; letter-spacing: .3em; color: #cdbfb2; z-index: 5; }
.eyebrow { font: 600 17px Inter; letter-spacing: .32em; text-transform: uppercase; color: #FFB36B; }
h1 { font-weight: 600; font-size: 84px; line-height: .98; letter-spacing: -.05em; }
.acc { color: #FF7A3D; }
.glass { background: rgba(20,14,12,.78); backdrop-filter: blur(14px); border-radius: 20px; box-shadow: inset 0 0 0 1px rgba(255,210,184,.16), 0 30px 80px -20px rgba(0,0,0,.7); }
.tool { display: flex; align-items: center; gap: 12px; padding: 14px 18px; font-size: 19px; }
.tool code { font-family: "JetBrains Mono", monospace; color: #FFB36B; font-size: 18px; }
.ok { color: #3ccf7a; }
.stamp { display: inline-block; padding: 10px 28px; border: 5px solid #FF5A1F; border-radius: 12px; color: #FF5A1F; font-weight: 800; font-size: 56px; text-transform: uppercase; background: rgba(20,6,2,.85); box-shadow: 0 0 60px rgba(255,90,31,.5); }
.split { display: flex; align-items: center; gap: 22px; padding: 22px 26px; }
.split b { font-size: 46px; font-weight: 600; letter-spacing: -.03em; width: 120px; }
.split small { display: block; color: #bdb3a8; font-size: 18px; margin-top: 4px; }
.split strong { font-size: 24px; font-weight: 600; }
'''
cards = []
# 1. Product: the mark with three floating moments of the product around it.
cards.append(f'''<div class="card" id="c1">{BG}<div class="vig"></div><div class="brand">{mark()}Allow</div>
 <div style="position:absolute;left:90px;top:200px;width:620px"><div class="eyebrow">Give your agent a wallet</div><h1 style="margin-top:22px">It apes.<br>It stops.<br><span class="acc">It proves it.</span></h1>
 <p style="margin-top:26px;font-size:24px;line-height:1.5;color:#e4dbd1">Claude or ChatGPT trades any Solana token inside the caps you set, and writes every move on chain.</p></div>
 <div style="position:absolute;left:830px;top:150px;perspective:1600px">{extruded(420, -22)}</div>
 <div class="glass" style="position:absolute;left:760px;top:120px;width:430px;transform:rotate(-3deg)"><div class="tool">{mark(s=22)}<code>allow_swap</code><span style="margin-left:auto">27.4 WIF <span class="ok">✓</span></span></div></div>
 <div style="position:absolute;left:1180px;top:430px;transform:rotate(-8deg)"><span class="stamp">Refused</span><div style="text-align:center;margin-top:10px;font-size:18px;color:#cdbfb2">freeze authority ON</div></div>
 <div class="glass" style="position:absolute;left:840px;top:640px;width:560px;transform:rotate(2deg)"><div class="tool"><span style="color:#a89d92">#7</span><span style="font:600 14px Inter;letter-spacing:.14em;color:#FFB36B">BUY</span>27.4 WIF for 0.05 SOL<span class="ok" style="margin-left:auto;font-size:15px;letter-spacing:.08em">✓ ANCHORED ON SOLANA</span></div></div>
 <div class="foot">USEALLOW.XYZ</div></div>''')
# 2. Fees: a glowing donut and the split, like a clean tokenomics sheet.
FEES = [(50, "Buyback & burn", "Buys $ALLOW on the market and burns it", "#FF5A1F"), (30, "Agent treasury", "Funds the public demo agent: every trade on chain", "#FFB36B"), (20, "Development", "Mainnet program, audits, new tools", "#7A2406")]
import math
def donut():
    R, r0, out, a = 210, 150, "", -90
    for pct, *_ , col in FEES:
        b = a + pct * 3.6 - 1.2
        large = 1 if b - a > 180 else 0
        p = lambda ang, rad: (300 + rad * math.cos(math.radians(ang)), 300 + rad * math.sin(math.radians(ang)))
        x1, y1 = p(a, R); x2, y2 = p(b, R); x3, y3 = p(b, r0); x4, y4 = p(a, r0)
        out += f'<path d="M{x1},{y1} A{R},{R} 0 {large} 1 {x2},{y2} L{x3},{y3} A{r0},{r0} 0 {large} 0 {x4},{y4} Z" fill="{col}"/>'
        a = b + 1.2
    return f'<svg viewBox="0 0 600 600" width="520" height="520" style="filter:drop-shadow(0 0 50px rgba(255,90,31,.45))">{out}<circle cx="300" cy="300" r="140" fill="#0f0a08"/><text x="300" y="292" text-anchor="middle" font-size="84" font-weight="600" fill="#F6F4EF" font-family="Inter" letter-spacing="-3">100%</text><text x="300" y="340" text-anchor="middle" font-size="17" font-weight="600" letter-spacing="5" fill="#cdbfb2" font-family="Inter">OF CREATOR FEES</text></svg>'
cards.append(f'''<div class="card" id="c2">{BG}<div class="vig"></div><div class="brand">{mark()}Allow</div>
 <div style="position:absolute;left:90px;top:190px"><div class="eyebrow">$ALLOW tokenomics</div><h1 style="margin-top:22px">Where the<br><span class="acc">fees go.</span></h1></div>
 <div style="position:absolute;left:560px;top:190px">{donut()}</div>
 <div style="position:absolute;left:1070px;top:250px;width:460px;display:grid;gap:14px">{"".join(f'<div class="glass split"><b style="color:{col}">{pct}%</b><div><strong>{t}</strong><small>{d}</small></div></div>' for pct,t,d,col in FEES)}</div>
 <div class="foot">EVERY MOVE PUBLIC · USEALLOW.XYZ/VERIFY</div></div>''')
# 3. Supply: one huge number, the coin orb and three plain facts.
cards.append(f'''<div class="card" id="c3">{BG}<div class="vig"></div><div class="brand">{mark()}Allow</div>
 <div style="position:absolute;left:0;right:0;top:150px;text-align:center"><div class="eyebrow">$ALLOW supply</div>
 <div style="margin-top:20px;font-size:190px;font-weight:700;letter-spacing:-.06em;line-height:1;background:linear-gradient(180deg,#FFF1E6,#FF7A3D 70%,#C83C0A);-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 0 40px rgba(255,90,31,.45))">1,000,000,000</div></div>
 <div style="position:absolute;left:0;right:0;top:500px;display:flex;justify-content:center;gap:22px">
 {"".join(f'<div class="glass" style="width:320px;padding:28px 30px"><div style="font-size:44px;font-weight:600;letter-spacing:-.03em">{a}</div><div style="margin-top:8px;font-size:19px;color:#cdbfb2">{b}</div></div>' for a,b in [("Fair launch","on pump.fun, same price for all"),("0%","presale, team or VC allocation"),("Open source","github.com/bigrceo/allow")])}</div>
 <div class="foot">USEALLOW.XYZ</div></div>''')
# 4. Meta: Allow at the center, the stack it plugs into orbiting around it.
orbit = [("claude", "Claude", 0), ("openai", "ChatGPT", 72), ("solana", "Solana", 144), ("jupiter", "Jupiter", 216), (None, "x402", 288)]
nodes = ""
for key, name, ang in orbit:
    x = 800 + 420 * math.cos(math.radians(ang - 90)); y = 470 + 250 * math.sin(math.radians(ang - 90))
    icon = logo[key](56) if key else '<div style="font:800 30px Inter;color:#F6F4EF">x402</div>'
    nodes += f'<div class="glass" style="position:absolute;left:{x-95}px;top:{y-62}px;width:190px;height:124px;display:grid;place-items:center;align-content:center;gap:8px">{icon}<div style="font-size:18px;color:#e4dbd1">{name}</div></div>'
lines = "".join(f'<line x1="800" y1="470" x2="{800+420*math.cos(math.radians(a-90))}" y2="{470+250*math.sin(math.radians(a-90))}" stroke="url(#ln)" stroke-width="2"/>' for *_, a in orbit)
cards.append(f'''<div class="card" id="c4">{BG}<div class="vig"></div><div class="brand">{mark()}Allow</div>
 <svg style="position:absolute;inset:0" width="1600" height="900"><defs><radialGradient id="ln" cx="800" cy="470" r="420" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FF7A3D" stop-opacity=".9"/><stop offset="1" stop-color="#FF7A3D" stop-opacity=".1"/></radialGradient></defs>
 <ellipse cx="800" cy="470" rx="420" ry="250" fill="none" stroke="rgba(255,150,90,.25)" stroke-width="2" stroke-dasharray="4 10"/>{lines}</svg>
 <div style="position:absolute;left:800px;top:470px;transform:translate(-50%,-50%);perspective:1400px">{extruded(230, -18)}</div>{nodes}
 <div style="position:absolute;left:0;right:0;top:110px;text-align:center"><div class="eyebrow">The agent meta, on Solana</div></div>
 <div style="position:absolute;left:0;right:0;bottom:70px;text-align:center;font-size:44px;font-weight:600;letter-spacing:-.03em">One wallet for every agent. <span class="acc">Sealed by your rules.</span></div></div>''')
html = f'''<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=block" rel="stylesheet"><style>{css}</style></head><body>{"".join(cards)}
<script>const n=new URLSearchParams(location.search).get("card")||"1";document.getElementById("c"+n).style.display="block";window.ready=document.fonts.ready;</script></body></html>'''
open('posts.html', 'w').write(html)
