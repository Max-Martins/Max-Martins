#!/usr/bin/env python3
"""
Gerador de cards SVG para o perfil do GitHub (Max-Martins).

Gera 4 arquivos, sem depender de serviços externos (Vercel etc.):
  stats.svg     -> GitHub Analytics (métricas + linguagens)
  streak.svg    -> Contribution Streak (sequência atual, recorde, total)
  activity.svg  -> Activity Graph (últimos 90 dias)
  trophies.svg  -> Troféus com níveis e barra de progresso

Sem dependências externas (só biblioteca padrão).

Uso:
  GH_TOKEN=xxx GH_USER=Max-Martins python scripts/generate_cards.py dist
  python scripts/generate_cards.py dist --demo      # dados fictícios p/ testar layout
"""
from __future__ import annotations

import datetime as dt
import json
import os
import random
import sys
import urllib.error
import urllib.request
from html import escape
from pathlib import Path

API = "https://api.github.com/graphql"

T = {
    "bg": "#000000",
    "border": "#1f2328",
    "orange": "#FF6B00",
    "blue": "#0066FF",
    "text": "#FFFFFF",
    "muted": "#8b949e",
    "dim": "#30363d",
}
FONT = "'Segoe UI', Ubuntu, 'Helvetica Neue', Arial, sans-serif"

# --------------------------------------------------------------------------- #
# Coleta de dados (GraphQL)
# --------------------------------------------------------------------------- #
Q_USER = """
query($login: String!) {
  user(login: $login) {
    login name createdAt
    followers { totalCount }
    repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, first: 100) {
      totalCount
      nodes {
        name stargazerCount
        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
          edges { size node { name color } }
        }
      }
    }
  }
}
"""

Q_CONTRIB = """
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalRepositoryContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}
"""


def gql(query: str, variables: dict, token: str) -> dict:
    req = urllib.request.Request(
        API,
        data=json.dumps({"query": query, "variables": variables}).encode(),
        headers={
            "Authorization": f"bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "profile-cards",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            payload = json.load(r)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode()[:300]}") from e
    if payload.get("errors"):
        raise RuntimeError(payload["errors"])
    return payload["data"]


def iso(d: dt.datetime) -> str:
    return d.strftime("%Y-%m-%dT%H:%M:%SZ")


def fetch(login: str, token: str) -> dict:
    now = dt.datetime.now(dt.timezone.utc)
    user = gql(Q_USER, {"login": login}, token)["user"]
    if not user:
        raise RuntimeError(f"Usuário {login} não encontrado")

    created = dt.datetime.fromisoformat(user["createdAt"].replace("Z", "+00:00"))

    # A API limita cada consulta a 1 ano -> percorre janelas desde a criação da conta
    totals = dict(commits=0, prs=0, issues=0, repos_created=0, private=0, contributions=0)
    days: dict[dt.date, int] = {}
    start = created
    while start < now:
        end = min(start + dt.timedelta(days=364), now)
        c = gql(Q_CONTRIB, {"login": login, "from": iso(start), "to": iso(end)}, token)
        c = c["user"]["contributionsCollection"]
        totals["commits"] += c["totalCommitContributions"]
        totals["prs"] += c["totalPullRequestContributions"]
        totals["issues"] += c["totalIssueContributions"]
        totals["repos_created"] += c["totalRepositoryContributions"]
        totals["private"] += c["restrictedContributionsCount"]
        for w in c["contributionCalendar"]["weeks"]:
            for d in w["contributionDays"]:
                k = dt.date.fromisoformat(d["date"])
                days[k] = max(days.get(k, 0), d["contributionCount"])
        start = end + dt.timedelta(seconds=1)

    totals["contributions"] = sum(days.values())

    last_year = gql(
        Q_CONTRIB,
        {"login": login, "from": iso(now - dt.timedelta(days=364)), "to": iso(now)},
        token,
    )["user"]["contributionsCollection"]

    langs: dict[str, dict] = {}
    stars = 0
    for repo in user["repositories"]["nodes"]:
        stars += repo["stargazerCount"]
        for e in repo["languages"]["edges"]:
            n = e["node"]["name"]
            langs.setdefault(n, {"size": 0, "color": e["node"]["color"] or T["muted"]})
            langs[n]["size"] += e["size"]

    return {
        "login": user["login"],
        "name": user["name"] or user["login"],
        "created": created.date(),
        "followers": user["followers"]["totalCount"],
        "repos": user["repositories"]["totalCount"],
        "stars": stars,
        "langs": langs,
        "totals": totals,
        "year": {
            "contributions": last_year["contributionCalendar"]["totalContributions"],
            "commits": last_year["totalCommitContributions"],
            "private": last_year["restrictedContributionsCount"],
        },
        "days": days,
    }


def demo_data() -> dict:
    random.seed(7)
    today = dt.date.today()
    days = {}
    for i in range(400):
        d = today - dt.timedelta(days=i)
        days[d] = random.choice([0, 0, 1, 2, 3, 5, 8]) if i < 120 else random.choice([0, 0, 0, 1])
    return {
        "login": "Max-Martins", "name": "Max Martins", "created": today - dt.timedelta(days=700),
        "followers": 4, "repos": 2, "stars": 3,
        "langs": {"Python": {"size": 52000, "color": "#3572A5"},
                  "Shell": {"size": 9000, "color": "#89e051"},
                  "Dockerfile": {"size": 2500, "color": "#384d54"}},
        "totals": dict(commits=187, prs=6, issues=4, repos_created=3, private=120,
                       contributions=sum(days.values())),
        "year": {"contributions": sum(v for k, v in days.items() if (today - k).days < 365),
                 "commits": 150, "private": 90},
        "days": days,
    }


# --------------------------------------------------------------------------- #
# Cálculos
# --------------------------------------------------------------------------- #
def streaks(days: dict[dt.date, int]) -> dict:
    if not days:
        return {"current": 0, "longest": 0, "cur_start": None, "long_start": None, "long_end": None}
    first, last = min(days), max(days)
    seq = [first + dt.timedelta(days=i) for i in range((last - first).days + 1)]

    longest, run, run_start = 0, 0, None
    long_start = long_end = None
    for d in seq:
        if days.get(d, 0) > 0:
            run_start = d if run == 0 else run_start
            run += 1
            if run > longest:
                longest, long_start, long_end = run, run_start, d
        else:
            run = 0

    # sequência atual: se hoje ainda está zerado, começa a contar de ontem
    cur, i = 0, len(seq) - 1
    if i >= 0 and days.get(seq[i], 0) == 0:
        i -= 1
    cur_start = None
    while i >= 0 and days.get(seq[i], 0) > 0:
        cur += 1
        cur_start = seq[i]
        i -= 1
    return {"current": cur, "longest": longest, "cur_start": cur_start,
            "long_start": long_start, "long_end": long_end}


def fmt_date(d: dt.date | None) -> str:
    if not d:
        return "—"
    meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
    return f"{d.day:02d} {meses[d.month - 1]} {d.year}"


def fmt_n(n: int) -> str:
    return f"{n:,}".replace(",", ".")


# --------------------------------------------------------------------------- #
# SVG helpers
# --------------------------------------------------------------------------- #
def svg_open(w: int, h: int, title: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
        f'role="img" aria-label="{escape(title)}">'
        f"<title>{escape(title)}</title>"
        "<style>"
        f"text{{font-family:{FONT};fill:{T['text']}}}"
        f".t{{font-size:18px;font-weight:700;fill:{T['orange']}}}"
        f".l{{font-size:13px;fill:{T['muted']}}}"
        ".v{font-size:22px;font-weight:700}"
        ".s{font-size:12px}"
        "@keyframes f{from{opacity:0}to{opacity:1}}"
        ".a{animation:f .8s ease-in both}"
        "</style>"
        f'<rect x="0.5" y="0.5" width="{w-1}" height="{h-1}" rx="10" fill="{T["bg"]}" stroke="{T["border"]}"/>'
    )


def txt(x, y, s, cls="", anchor="start", extra="") -> str:
    c = f' class="{cls}"' if cls else ""
    return f'<text x="{x}" y="{y}"{c} text-anchor="{anchor}" {extra}>{escape(str(s))}</text>'


# --------------------------------------------------------------------------- #
# Cards
# --------------------------------------------------------------------------- #
def card_stats(d: dict) -> str:
    W, H = 860, 240
    o = [svg_open(W, H, "GitHub Analytics")]
    o.append(txt(28, 40, "Painel de Automação · GitHub", "t"))
    o.append(txt(W - 28, 40, f"atualizado em {fmt_date(dt.date.today())}", "l", "end"))

    metrics = [
        ("Contribuições (12m)", d["year"]["contributions"]),
        ("Commits (12m)", d["year"]["commits"]),
        ("Pull requests", d["totals"]["prs"]),
        ("Issues", d["totals"]["issues"]),
        ("Repositórios", d["repos"]),
        ("Estrelas", d["stars"]),
    ]
    for i, (label, val) in enumerate(metrics):
        col, row = i % 3, i // 3
        x, y = 28 + col * 140, 90 + row * 72
        color = T["orange"] if i % 2 == 0 else T["blue"]
        o.append(f'<rect x="{x}" y="{y-26}" width="3" height="44" fill="{color}" class="a"/>')
        o.append(txt(x + 12, y, fmt_n(val), "v a"))
        o.append(txt(x + 12, y + 18, label, "l"))

    if d["year"]["private"]:
        o.append(txt(28, H - 18, f"+ {fmt_n(d['year']['private'])} contribuições em repositórios privados (12m)", "l"))

    # linguagens
    lx, lw = 470, 362
    o.append(txt(lx, 76, "Linguagens nos projetos públicos", "s", extra=f'fill="{T["muted"]}"'))
    total = sum(v["size"] for v in d["langs"].values())
    if total == 0:
        o.append(f'<rect x="{lx}" y="90" width="{lw}" height="10" rx="5" fill="{T["dim"]}"/>')
        o.append(txt(lx, 130, "Os primeiros projetos estão sendo publicados.", "s"))
        o.append(txt(lx, 150, "Esta barra se preenche automaticamente.", "l"))
    else:
        top = sorted(d["langs"].items(), key=lambda kv: -kv[1]["size"])[:6]
        top_total = sum(v["size"] for _, v in top)
        x = lx
        o.append(f'<clipPath id="bar"><rect x="{lx}" y="90" width="{lw}" height="10" rx="5"/></clipPath>')
        o.append('<g clip-path="url(#bar)">')
        for name, v in top:
            w = lw * v["size"] / top_total
            o.append(f'<rect x="{x:.1f}" y="90" width="{w:.1f}" height="10" fill="{v["color"]}"/>')
            x += w
        o.append("</g>")
        for i, (name, v) in enumerate(top):
            col, row = i % 2, i // 2
            px, py = lx + col * 185, 128 + row * 26
            pct = 100 * v["size"] / total
            o.append(f'<circle cx="{px+5}" cy="{py-4}" r="5" fill="{v["color"]}"/>')
            o.append(txt(px + 16, py, f"{name}", "s"))
            o.append(txt(px + 170, py, f"{pct:.1f}%", "l", "end"))
    o.append("</svg>")
    return "".join(o)


def card_streak(d: dict) -> str:
    W, H = 860, 200
    s = streaks(d["days"])
    o = [svg_open(W, H, "Contribution Streak")]
    cols = [
        (143, fmt_n(d["totals"]["contributions"]), "Contribuições totais",
         f"desde {fmt_date(d['created'])}", T["text"]),
        (430, f"{s['current']}", "Sequência atual",
         f"desde {fmt_date(s['cur_start'])}" if s["current"] else "comece hoje 🚀", T["orange"]),
        (717, f"{s['longest']}", "Maior sequência",
         f"{fmt_date(s['long_start'])} → {fmt_date(s['long_end'])}" if s["longest"] else "—", T["blue"]),
    ]
    for x in (286, 573):
        o.append(f'<line x1="{x}" y1="30" x2="{x}" y2="{H-30}" stroke="{T["dim"]}"/>')
    for x, val, label, sub, color in cols:
        if color == T["orange"]:
            # anel com a chama no topo
            o.append(f'<circle cx="{x}" cy="82" r="42" fill="none" stroke="{T["orange"]}" stroke-width="5" class="a"/>')
            o.append(f'<rect x="{x-13}" y="28" width="26" height="22" fill="{T["bg"]}"/>')
            o.append(txt(x, 48, "🔥", anchor="middle", extra='font-size="20"'))
            o.append(txt(x, 92, val, anchor="middle", extra=f'font-size="28" font-weight="700" fill="{color}"'))
            o.append(txt(x, 150, label, anchor="middle", extra=f'font-size="15" font-weight="700" fill="{color}"'))
        else:
            o.append(txt(x, 92, val, anchor="middle", extra=f'font-size="30" font-weight="700" fill="{color}"'))
            o.append(txt(x, 150, label, anchor="middle", extra='font-size="15" font-weight="700"'))
        o.append(txt(x, 172, sub, "l", "middle"))
    o.append("</svg>")
    return "".join(o)


def card_activity(d: dict, n_days: int = 90) -> str:
    W, H = 860, 280
    L, R, TOP, BOT = 50, W - 24, 64, H - 44
    today = dt.date.today()
    seq = [today - dt.timedelta(days=n_days - 1 - i) for i in range(n_days)]
    vals = [d["days"].get(x, 0) for x in seq]
    mx = max(max(vals), 4)
    total, active = sum(vals), sum(1 for v in vals if v)

    def px(i):
        return L + (R - L) * i / (n_days - 1)

    def py(v):
        return BOT - (BOT - TOP) * v / mx

    o = [svg_open(W, H, "Activity Graph")]
    o.append(
        f'<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="{T["orange"]}" stop-opacity=".55"/>'
        f'<stop offset="1" stop-color="{T["orange"]}" stop-opacity="0"/></linearGradient></defs>'
    )
    o.append(txt(28, 36, f"Atividade · últimos {n_days} dias", "t"))
    o.append(txt(W - 28, 36, f"{fmt_n(total)} contribuições · {active} dias ativos · média {total/n_days:.1f}/dia", "l", "end"))

    for k in range(5):
        v = mx * k / 4
        y = py(v)
        o.append(f'<line x1="{L}" y1="{y:.1f}" x2="{R}" y2="{y:.1f}" stroke="{T["dim"]}" stroke-dasharray="3 4"/>')
        o.append(txt(L - 10, y + 4, f"{v:.0f}", "l", "end"))

    pts = " ".join(f"{px(i):.1f},{py(v):.1f}" for i, v in enumerate(vals))
    o.append(f'<polygon points="{L},{BOT} {pts} {R},{BOT}" fill="url(#g)" class="a"/>')
    o.append(f'<polyline points="{pts}" fill="none" stroke="{T["orange"]}" stroke-width="2" stroke-linejoin="round" class="a"/>')
    for i, v in enumerate(vals):
        if v:
            o.append(f'<circle cx="{px(i):.1f}" cy="{py(v):.1f}" r="2.6" fill="{T["blue"]}"/>')
    for i in range(0, n_days, 15):
        o.append(txt(px(i), H - 20, f"{seq[i].day:02d}/{seq[i].month:02d}", "l", "middle"))
    o.append(txt(px(n_days - 1), H - 20, "hoje", "l", "end"))
    o.append("</svg>")
    return "".join(o)


TROPHIES = [
    # (ícone, nome, descrição, métrica, limites bronze/prata/ouro)
    ("⚙️", "Automatizador", "commits publicados", "commits", (10, 100, 500)),
    ("🔥", "Maratonista", "dias seguidos (recorde)", "longest", (3, 7, 30)),
    ("📦", "Construtor", "repositórios próprios", "repos", (1, 5, 15)),
    ("🤝", "Colaborador", "pull requests", "prs", (1, 10, 50)),
    ("⭐", "Reconhecido", "estrelas recebidas", "stars", (1, 10, 50)),
    ("🧬", "Poliglota", "linguagens em uso", "langs", (1, 3, 6)),
]
LEVELS = [("Bloqueado", "#484f58"), ("Bronze", "#CD7F32"), ("Prata", "#C0C0C0"), ("Ouro", "#FFD700")]


def card_trophies(d: dict) -> str:
    values = {
        "commits": d["totals"]["commits"],
        "longest": streaks(d["days"])["longest"],
        "repos": d["repos"],
        "prs": d["totals"]["prs"],
        "stars": d["stars"],
        "langs": len(d["langs"]),
    }
    W, H = 860, 290
    CW, CH, GAP = 258, 104, 13
    o = [svg_open(W, H, "GitHub Trophies")]
    unlocked = 0
    for idx, (icon, name, desc, key, limits) in enumerate(TROPHIES):
        val = values[key]
        level = sum(1 for lim in limits if val >= lim)
        unlocked += level > 0
        lname, lcolor = LEVELS[level]
        nxt = limits[level] if level < 3 else limits[-1]
        prog = 1.0 if level == 3 else min(val / nxt, 1.0)

        x = 28 + (idx % 3) * (CW + GAP)
        y = 58 + (idx // 3) * (CH + GAP)
        op = "1" if level else ".55"
        o.append(f'<g opacity="{op}" class="a">')
        o.append(f'<rect x="{x}" y="{y}" width="{CW}" height="{CH}" rx="8" fill="#0d1117" stroke="{lcolor}" stroke-opacity=".7"/>')
        o.append(txt(x + 16, y + 38, icon, extra='font-size="26"'))
        o.append(txt(x + 56, y + 28, name, extra='font-size="15" font-weight="700"'))
        o.append(txt(x + CW - 14, y + 28, lname.upper(), anchor="end",
                     extra=f'font-size="11" font-weight="700" fill="{lcolor}" letter-spacing="1"'))
        o.append(txt(x + 56, y + 48, f"{fmt_n(val)} {desc}", "l"))
        bw = CW - 32
        o.append(f'<rect x="{x+16}" y="{y+68}" width="{bw}" height="6" rx="3" fill="{T["dim"]}"/>')
        o.append(f'<rect x="{x+16}" y="{y+68}" width="{bw*prog:.1f}" height="6" rx="3" fill="{lcolor if level else T["orange"]}"/>')
        hint = "nível máximo" if level == 3 else f"próximo nível: {fmt_n(nxt)}"
        o.append(txt(x + 16, y + 92, hint, "l", extra='font-size="11"'))
        o.append("</g>")
    o.append(txt(28, 38, "Conquistas", "t"))
    o.append(txt(W - 28, 38, f"{unlocked}/{len(TROPHIES)} desbloqueadas", "l", "end"))
    o.append("</svg>")
    return "".join(o)


# --------------------------------------------------------------------------- #
def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    out = Path(args[0] if args else "dist")
    out.mkdir(parents=True, exist_ok=True)

    if "--demo" in sys.argv:
        data = demo_data()
    else:
        token = os.environ.get("GH_TOKEN")
        login = os.environ.get("GH_USER", "Max-Martins")
        if not token:
            print("ERRO: defina GH_TOKEN", file=sys.stderr)
            return 1
        data = fetch(login, token)

    cards = {
        "stats.svg": card_stats(data),
        "streak.svg": card_streak(data),
        "activity.svg": card_activity(data),
        "trophies.svg": card_trophies(data),
    }
    for name, svg in cards.items():
        (out / name).write_text(svg, encoding="utf-8")
        print(f"ok  {out / name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
