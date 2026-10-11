"""Rough concept sketches for a from-scratch naeil logo exploration.

Run: python3 build_sketches.py   (writes sketches/*.svg, board.svg, board.png)
Colors are temporary sketch values, not brand decisions.
"""
from pathlib import Path
import subprocess

HERE = Path(__file__).parent
INK, WARM, NIGHT = "#1f1d1a", "#e0743a", "#36406a"

# Each body uses {ink} {warm} {night}; monochrome sets all three to ink.
CONCEPTS = [
    ("a-comma", "A · 쉼표", "오늘은 마침표가 아니라 쉼표",
     ["끝난 줄 알았던 하루 뒤에 이어지는 문장.", "실패한 오늘도 ‘다음’으로 넘어간다."],
     "형태 → 의미: 약함(설명 필요) · 이야기의 힘: 강함",
     "다른 해석: 문장부호·작은따옴표·씨앗·올챙이",
     """<circle cx="30" cy="25" r="13" fill="{warm}"/>
<path d="M42.6 28.5C42 41 35 50.5 22 56C29 49 31.5 43 30.5 37.5Z" fill="{warm}"/>"""),
    ("b-waking-eye", "B · 눈을 뜨는 아침", "눈을 뜨는 순간이 해가 뜨는 순간",
     ["아래 눈꺼풀은 지평선, 눈동자는 떠오르는 해.", "‘내일’은 내가 깨어나 맞이하는 장면."],
     "형태 → 의미: 중간(눈 또는 일출 하나로 먼저 읽힘)",
     "다른 해석: 보기/비밀번호 아이콘·감시·안과",
     """<path d="M8 42Q32 4 56 42" fill="none" stroke="{ink}" stroke-width="5" stroke-linecap="round"/>
<path d="M8 42H56" stroke="{ink}" stroke-width="5" stroke-linecap="round"/>
<path d="M21 42A11 11 0 0 1 43 42Z" fill="{warm}"/>"""),
    ("c-ember", "C · 지켜낸 불씨", "오늘 밤 지킨 작은 온기로 내일을 지핀다",
     ["화롯불 불씨를 아침까지 덮어두던 마음.", "희망은 손으로 지켜서 건네는 것."],
     "형태 → 의미: 따뜻함은 강함, ‘내일’은 약함",
     "다른 해석: 기부·돌봄 단체·양초·요리",
     """<path d="M8 30C8 43 17 53 30 54V46C21 45 14.5 39 13.5 30Z" fill="{ink}"/>
<path d="M56 30C56 43 47 53 34 54V46C43 45 49.5 39 50.5 30Z" fill="{ink}"/>
<path d="M32 13C36.5 20 40 25 40 31A8 8 0 0 1 24 31C24 25 27.5 20 32 13Z" fill="{warm}"/>"""),
    ("d-night-cradle", "D · 밤이 품은 내일", "밤은 끝이 아니라 내일을 안고 있는 시간",
     ["누운 초승달이 작은 해를 요람처럼 받친다.", "쉬는 동안에도 내일은 자라고 있다."],
     "형태 → 의미: 중간~강함(달+해 = 밤에서 아침)",
     "다른 해석: 웃는 얼굴·그릇 속 공·수면 앱",
     """<path d="M12.04 20.75A22 22 0 1 0 51.96 20.75A20 20 0 1 1 12.04 20.75Z" transform="translate(0 4)" fill="{night}"/>
<circle cx="32" cy="29" r="8.5" fill="{warm}"/>"""),
    ("e-next-page", "E · 넘기는 한 장", "내일은 언제든 넘길 수 있는 새 한 장",
     ["일력의 오늘 장을 들추면 따뜻한 다음 장.", "다시 시작은 거창하지 않고 한 장이면 된다."],
     "형태 → 의미: 중간(‘다음 장’은 읽히나 날짜는 약함)",
     "다른 해석: 파일·메모·스티커 아이콘",
     """<path d="M34 54H16A4 4 0 0 1 12 50V14A4 4 0 0 1 16 10H48A4 4 0 0 1 52 14V36" fill="none" stroke="{ink}" stroke-width="4.5" stroke-linejoin="round"/>
<path d="M52 36L34 54C33 46 36 38 52 36Z" fill="{ink}"/>
<path d="M55 41V55A2 2 0 0 1 53 57H39Z" fill="{warm}"/>"""),
    ("f-door-light", "F · 문틈의 빛", "아직 열지 않은 문틈으로 먼저 오는 빛",
     ["문은 아직 다 열리지 않았지만 빛은 이미 와 있다.", "내일은 문 너머에서 나를 기다린다."],
     "형태 → 의미: 중간(빛·문은 읽히나 ‘시간’은 약함)",
     "다른 해석: 출구/로그아웃·부동산·무대 조명",
     """<mask id="slit"><rect width="64" height="64" fill="#fff"/><path d="M36 9L41 8.5V48H36Z" fill="#000"/></mask>
<path d="M14 48V26A18 18 0 0 1 50 26V48Z" fill="{ink}" mask="url(#slit)"/>
<path d="M36 51H41L56 60H24Z" fill="{warm}"/>"""),
]


def svg(body, w=64, title=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="{w}" height="{w}">'
            f'<title>{title}</title>{body}</svg>\n')


def colored(body, mono=None):
    if mono:
        return body.format(ink=mono, warm=mono, night=mono)
    return body.format(ink=INK, warm=WARM, night=NIGHT)


def nested(body, x, y, size, mono=None, idsuffix=""):
    b = colored(body, mono).replace('id="slit"', f'id="slit{idsuffix}"').replace("url(#slit)", f"url(#slit{idsuffix})")
    return f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="0 0 64 64">{b}</svg>'


def text(x, y, s, size=15, weight=400, fill=INK, anchor="start"):
    return (f'<text x="{x}" y="{y}" font-family="Pretendard, Apple SD Gothic Neo, sans-serif" '
            f'font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}">{s}</text>')


def main():
    out = HERE / "sketches"
    out.mkdir(exist_ok=True)
    for key, title, *_rest, body in CONCEPTS:
        (out / f"{key}.svg").write_text(svg(colored(body), title=f"naeil sketch {title}"))
        (out / f"{key}-mono.svg").write_text(svg(colored(body, INK), title=f"naeil sketch {title} mono"))

    cw, ch, pad = 540, 600, 24
    W, H = pad + 3 * (cw + pad), 150 + 2 * (ch + pad)
    parts = [f'<rect width="{W}" height="{H}" fill="#f6f3ee"/>',
             text(pad, 52, "naeil — ‘내일’을 처음부터 다시 보는 러프 스케치", 30, 700),
             text(pad, 88, "중심 가설: 내일은 오늘이 어떻게 끝났든 다시 이어갈 수 있는, 작은 온기가 기다리는 다음이다.", 18),
             text(pad, 116, "색은 임시값이며 비교 대상이 아니다. 각 칸의 왼쪽 큰 형태는 단색, 오른쪽은 의미를 보조하는 임시 색이다.", 15, fill="#6b655d")]
    for i, (key, title, line, why, read, alt, body) in enumerate(CONCEPTS):
        x = pad + (i % 3) * (cw + pad)
        y = 150 + (i // 3) * (ch + pad)
        parts.append(f'<rect x="{x}" y="{y}" width="{cw}" height="{ch}" rx="16" fill="#fff" stroke="#e4ded5"/>')
        parts.append(text(x + 28, y + 46, title, 24, 700))
        parts.append(text(x + 28, y + 78, line, 18, 600, WARM))
        parts.append(nested(body, x + 28, y + 100, 220, INK, f"{i}m"))
        parts.append(nested(body, x + 292, y + 100, 220, None, f"{i}c"))
        # actual-size row: light color, light mono, dark reversed
        sx = x + 28
        for s in (48, 32, 24, 16):
            parts.append(nested(body, sx, y + 352 + (48 - s), s, None, f"{i}s{s}"))
            sx += s + 18
        parts.append(f'<rect x="{sx + 6}" y="{y + 340}" width="150" height="66" rx="10" fill="#1b1a18"/>')
        dx = sx + 22
        for s in (32, 16):
            parts.append(nested(body, dx, y + 357 + (32 - s), s, "#f2eee8", f"{i}d{s}"))
            dx += s + 20
        parts.append(text(x + 28, y + 440, why[0], 16))
        parts.append(text(x + 28, y + 466, why[1], 16))
        parts.append(text(x + 28, y + 514, read, 15, 600))
        parts.append(text(x + 28, y + 540, alt, 15, fill="#6b655d"))
    (HERE / "board.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{"".join(parts)}</svg>\n')
    subprocess.run(["rsvg-convert", "-o", str(HERE / "board.png"), str(HERE / "board.svg")], check=True)


if __name__ == "__main__":
    main()
