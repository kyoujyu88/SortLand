// Generates flat-vector placeholder portraits for the nine expansion characters.
// Output SVGs are rendered to assets/characters/*.png with scripts/render_extra_characters.sh,
// then composed into public/sort-characters-extra.webp by scripts/build_character_sprite.py.
// Replace the PNGs with hand-drawn art at any time and rebuild the sprite.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "characters-extra-svg");
mkdirSync(OUT_DIR, { recursive: true });

const SKIN = "#ffe3ce";
const SKIN_SHADE = "#f6c9a8";
const BLUSH = "#f7a8a0";

function girl({
  hairColor,
  hairShadow,
  dressColor,
  dressShadow,
  hairStyle = "long",
  eyeColor = "#4a3b33",
  closedEyes = false,
  accessory = "",
  leftArm = "M 400 640 Q 320 690 300 760",
  rightArm = "M 624 640 Q 704 690 724 760",
}) {
  const headX = 512;
  const headY = 402;
  const hairBack = hairStyle === "long"
    ? `<path d="M ${headX} 190 C 330 190 300 340 306 470 C 310 590 280 660 260 720 L 764 720 C 744 660 714 590 718 470 C 724 340 694 190 ${headX} 190 Z" fill="${hairColor}"/>`
    : hairStyle === "twin"
      ? `<path d="M ${headX} 200 C 350 200 320 330 322 430 C 324 520 310 560 300 600 L 724 600 C 714 560 700 520 702 430 C 704 330 674 200 ${headX} 200 Z" fill="${hairColor}"/>
         <ellipse cx="300" cy="560" rx="58" ry="120" fill="${hairColor}"/>
         <ellipse cx="724" cy="560" rx="58" ry="120" fill="${hairColor}"/>`
      : `<path d="M ${headX} 200 C 356 200 322 330 326 430 C 328 510 318 545 308 580 L 716 580 C 706 545 696 510 698 430 C 702 330 668 200 ${headX} 200 Z" fill="${hairColor}"/>`;
  const eyes = closedEyes
    ? `<path d="M 420 428 Q 448 452 476 428" stroke="${eyeColor}" stroke-width="10" fill="none" stroke-linecap="round"/>
       <path d="M 548 428 Q 576 452 604 428" stroke="${eyeColor}" stroke-width="10" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="448" cy="424" rx="25" ry="33" fill="${eyeColor}"/>
       <ellipse cx="576" cy="424" rx="25" ry="33" fill="${eyeColor}"/>
       <circle cx="457" cy="412" r="8" fill="#fff"/>
       <circle cx="585" cy="412" r="8" fill="#fff"/>`;
  return `
  <g>
    ${hairBack}
    <path d="${leftArm}" stroke="${SKIN}" stroke-width="42" fill="none" stroke-linecap="round"/>
    <path d="${rightArm}" stroke="${SKIN}" stroke-width="42" fill="none" stroke-linecap="round"/>
    <path d="M 512 560 C 420 560 372 620 362 700 L 352 810 L 672 810 L 662 700 C 652 620 604 560 512 560 Z" fill="${dressColor}"/>
    <path d="M 512 560 C 470 560 440 580 424 606 L 512 660 L 600 606 C 584 580 554 560 512 560 Z" fill="${dressShadow}"/>
    <rect x="482" y="520" width="60" height="60" rx="24" fill="${SKIN}"/>
    <circle cx="${headX}" cy="${headY}" r="168" fill="${SKIN}"/>
    <path d="M 344 402 A 168 168 0 0 1 680 402 L 680 372 A 168 168 0 0 0 344 372 Z" fill="${SKIN_SHADE}" opacity="0.0"/>
    ${eyes}
    <ellipse cx="414" cy="482" rx="26" ry="14" fill="${BLUSH}" opacity="0.55"/>
    <ellipse cx="610" cy="482" rx="26" ry="14" fill="${BLUSH}" opacity="0.55"/>
    <path d="M 488 500 Q 512 522 536 500" stroke="#b06a58" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M ${headX} 234 C 400 234 356 300 348 392 C 380 330 430 322 512 322 C 594 322 644 330 676 392 C 668 300 624 234 ${headX} 234 Z" fill="${hairColor}"/>
    <path d="M 358 380 C 366 330 392 310 420 306 C 398 336 392 360 390 396 Z" fill="${hairShadow}"/>
    <path d="M 666 380 C 658 330 632 310 604 306 C 626 336 632 360 634 396 Z" fill="${hairShadow}"/>
    ${accessory}
  </g>`;
}

function bar(x, y, w, h, color, rx = 8) {
  return `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" rx="${rx}" fill="${color}"/>`;
}

function scene(bg, decor, body, props) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${bg}"/>
  ${decor}
  ${props.behind ?? ""}
  ${body}
  ${props.front ?? ""}
</svg>`;
}

const dots = (color) => `
  <circle cx="120" cy="140" r="26" fill="${color}" opacity="0.5"/>
  <circle cx="905" cy="200" r="18" fill="${color}" opacity="0.5"/>
  <circle cx="860" cy="95" r="12" fill="${color}" opacity="0.4"/>
  <circle cx="150" cy="880" r="14" fill="${color}" opacity="0.35"/>`;

const desk = `<rect x="0" y="806" width="1024" height="218" fill="#e3c294"/>
  <rect x="0" y="806" width="1024" height="26" fill="#d1ab77"/>`;

const characters = {
  // 図書館ソート — ライブラ・シェルフ: bookshelf with deliberate gaps
  "library-girl": scene("#f6eedb", dots("#caa96e"), girl({
    hairColor: "#6d5140", hairShadow: "#57402f", dressColor: "#a9825e", dressShadow: "#936f4e",
    accessory: `<rect x="404" y="386" width="88" height="66" rx="12" fill="none" stroke="#8a6f50" stroke-width="9"/>
      <rect x="532" y="386" width="88" height="66" rx="12" fill="none" stroke="#8a6f50" stroke-width="9"/>
      <path d="M 492 412 L 532 412" stroke="#8a6f50" stroke-width="9"/>`,
    leftArm: "M 400 640 Q 310 660 268 728", rightArm: "M 624 640 Q 714 660 756 728",
  }), {
    front: `${desk}
      <rect x="180" y="640" width="664" height="20" rx="8" fill="#8a6f50" transform="translate(0,148)"/>
      ${bar(210, 806, 52, 130, "#c96f6f")}${bar(272, 806, 52, 96, "#d99a4f")}
      <rect x="334" y="700" width="52" height="100" rx="8" fill="none" stroke="#b9a17e" stroke-width="7" stroke-dasharray="14 12"/>
      ${bar(396, 806, 52, 118, "#8aa65a")}
      <rect x="458" y="690" width="52" height="110" rx="8" fill="none" stroke="#b9a17e" stroke-width="7" stroke-dasharray="14 12"/>
      ${bar(520, 806, 52, 150, "#5fa9a3")}${bar(582, 806, 52, 84, "#718cb7")}
      <rect x="644" y="712" width="52" height="88" rx="8" fill="none" stroke="#b9a17e" stroke-width="7" stroke-dasharray="14 12"/>
      ${bar(706, 806, 52, 132, "#8f7bb6")}`,
  }),

  // ペイシェンスソート — ペイシェ・パイル: card piles
  "patience-girl": scene("#ece4f2", dots("#a58bc0"), girl({
    hairColor: "#3f3348", hairShadow: "#2e2436", dressColor: "#8b6fa3", dressShadow: "#775d8e", hairStyle: "twin",
    accessory: `<path d="M 620 268 l 16 34 36 4 -27 25 7 36 -32 -18 -32 18 7 -36 -27 -25 36 -4 Z" fill="#e8c268"/>`,
    leftArm: "M 400 640 Q 316 680 292 752", rightArm: "M 624 640 Q 708 680 732 752",
  }), {
    front: `${desk}
      <g transform="translate(150,690)">
        <rect x="0" y="24" width="120" height="86" rx="10" fill="#fff" stroke="#c9bfd6" stroke-width="5"/>
        <rect x="8" y="12" width="120" height="86" rx="10" fill="#fff" stroke="#c9bfd6" stroke-width="5"/>
        <rect x="16" y="0" width="120" height="86" rx="10" fill="#fff" stroke="#8b6fa3" stroke-width="6"/>
        <text x="76" y="58" font-family="ui-monospace, monospace" font-size="44" font-weight="700" fill="#8b6fa3" text-anchor="middle">3</text>
      </g>
      <g transform="translate(370,702)">
        <rect x="0" y="12" width="120" height="86" rx="10" fill="#fff" stroke="#c9bfd6" stroke-width="5"/>
        <rect x="8" y="0" width="120" height="86" rx="10" fill="#fff" stroke="#8b6fa3" stroke-width="6"/>
        <text x="68" y="58" font-family="ui-monospace, monospace" font-size="44" font-weight="700" fill="#c96f6f" text-anchor="middle">5</text>
      </g>
      <g transform="translate(580,714)">
        <rect x="0" y="0" width="120" height="86" rx="10" fill="#fff" stroke="#8b6fa3" stroke-width="6"/>
        <text x="60" y="58" font-family="ui-monospace, monospace" font-size="44" font-weight="700" fill="#5f8fa5" text-anchor="middle">8</text>
      </g>
      <g transform="translate(780,690)">
        <rect x="0" y="24" width="120" height="86" rx="10" fill="#f3eef8" stroke="#c9bfd6" stroke-width="5" stroke-dasharray="12 10"/>
      </g>`,
  }),

  // デュアルピボットクイック — デュエラ・スラッシュ: two pivots, three zones
  "dualpivot-girl": scene("#f8e4eb", dots("#d78fa8"), girl({
    hairColor: "#8c4a54", hairShadow: "#733a44", dressColor: "#c46584", dressShadow: "#ad5372", hairStyle: "short",
    accessory: `<path d="M 388 296 L 348 236" stroke="#c46584" stroke-width="14" stroke-linecap="round"/>
      <path d="M 636 296 L 676 236" stroke="#7a86c2" stroke-width="14" stroke-linecap="round"/>`,
    leftArm: "M 400 630 Q 300 600 258 520", rightArm: "M 624 630 Q 724 600 766 520",
  }), {
    front: `${desk}
      ${bar(150, 806, 56, 70, "#e0a9bc")}${bar(216, 806, 56, 96, "#e0a9bc")}
      ${bar(292, 806, 56, 150, "#c46584", 10)}
      ${bar(368, 806, 56, 108, "#b9c0e0")}${bar(434, 806, 56, 122, "#b9c0e0")}${bar(500, 806, 56, 116, "#b9c0e0")}
      ${bar(576, 806, 56, 168, "#7a86c2", 10)}
      ${bar(652, 806, 56, 186, "#9aa7d6")}${bar(718, 806, 56, 176, "#9aa7d6")}
      <path d="M 320 622 L 320 596 M 604 604 L 604 578" stroke="#a0526f" stroke-width="8" stroke-linecap="round"/>`,
  }),

  // スムースソート — スムーサ・レオナ: leonardo heaps as hills
  "smooth-girl": scene("#e2efe8", dots("#7fae9c"), girl({
    hairColor: "#4c6b5a", hairShadow: "#3b5546", dressColor: "#6f9d8a", dressShadow: "#5d8a77",
    accessory: `<circle cx="640" cy="280" r="20" fill="none" stroke="#e8f4ee" stroke-width="8"/>
      <circle cx="640" cy="280" r="6" fill="#e8f4ee"/>`,
    leftArm: "M 400 640 Q 320 690 300 764", rightArm: "M 624 640 Q 716 664 760 700",
  }), {
    front: `${desk}
      <path d="M 130 806 L 210 726 L 290 806 Z" fill="#8fb8a6"/>
      <path d="M 300 806 L 420 666 L 540 806 Z" fill="#6f9d8a"/>
      <path d="M 550 806 L 720 606 L 890 806 Z" fill="#557f6d"/>
      <circle cx="210" cy="742" r="14" fill="#f2f8f4"/>
      <circle cx="420" cy="684" r="14" fill="#f2f8f4"/>
      <circle cx="720" cy="626" r="14" fill="#f2f8f4"/>`,
  }),

  // スリープソート — ネムネ・アラーム: sleeping, alarm clocks
  "sleep-girl": scene("#e3e6f6", dots("#8d97cc"), girl({
    hairColor: "#7d86b8", hairShadow: "#6a73a5", dressColor: "#7a86c2", dressShadow: "#6873b1", closedEyes: true,
    accessory: `<path d="M 360 250 C 340 200 380 160 430 176 C 420 210 400 236 360 250 Z" fill="#5d68a2"/>
      <circle cx="352" cy="256" r="26" fill="#e8c268"/>
      <text x="660" y="240" font-family="ui-monospace, monospace" font-size="64" font-weight="800" fill="#5d68a2">z</text>
      <text x="710" y="190" font-family="ui-monospace, monospace" font-size="48" font-weight="800" fill="#7d86b8">z</text>
      <text x="748" y="150" font-family="ui-monospace, monospace" font-size="36" font-weight="800" fill="#9aa3d0">z</text>`,
    leftArm: "M 400 640 Q 330 700 320 770", rightArm: "M 624 640 Q 694 700 704 770",
  }), {
    front: `${desk}
      <g transform="translate(170,668)">
        <circle cx="70" cy="80" r="62" fill="#fff" stroke="#7a86c2" stroke-width="8"/>
        <path d="M 70 80 L 70 44 M 70 80 L 94 92" stroke="#5d68a2" stroke-width="8" stroke-linecap="round"/>
        <path d="M 30 26 L 16 12 M 110 26 L 124 12" stroke="#7a86c2" stroke-width="10" stroke-linecap="round"/>
        <text x="70" y="182" font-family="ui-monospace, monospace" font-size="34" font-weight="700" fill="#5d68a2" text-anchor="middle">2</text>
      </g>
      <g transform="translate(430,668)">
        <circle cx="70" cy="80" r="62" fill="#fff" stroke="#7a86c2" stroke-width="8"/>
        <path d="M 70 80 L 70 44 M 70 80 L 48 98" stroke="#5d68a2" stroke-width="8" stroke-linecap="round"/>
        <path d="M 30 26 L 16 12 M 110 26 L 124 12" stroke="#7a86c2" stroke-width="10" stroke-linecap="round"/>
        <text x="70" y="182" font-family="ui-monospace, monospace" font-size="34" font-weight="700" fill="#5d68a2" text-anchor="middle">5</text>
      </g>
      <g transform="translate(690,668)">
        <circle cx="70" cy="80" r="62" fill="#fff" stroke="#7a86c2" stroke-width="8"/>
        <path d="M 70 80 L 70 44 M 70 80 L 92 60" stroke="#5d68a2" stroke-width="8" stroke-linecap="round"/>
        <path d="M 30 26 L 16 12 M 110 26 L 124 12" stroke="#7a86c2" stroke-width="10" stroke-linecap="round"/>
        <text x="70" y="182" font-family="ui-monospace, monospace" font-size="34" font-weight="700" fill="#5d68a2" text-anchor="middle">9</text>
      </g>`,
  }),

  // フラッシュソート — フラッシャ・スパーク: lightning, long jump arrows
  "flash-girl": scene("#faf0d6", dots("#dcb45e"), girl({
    hairColor: "#c58a3e", hairShadow: "#aa7430", dressColor: "#d9a441", dressShadow: "#c39034", hairStyle: "twin",
    accessory: `<path d="M 660 220 L 620 292 L 656 292 L 616 372 L 700 276 L 662 276 L 700 220 Z" fill="#e8c268" stroke="#c58a3e" stroke-width="6" stroke-linejoin="round"/>`,
    leftArm: "M 400 630 Q 306 618 262 560", rightArm: "M 624 640 Q 712 672 748 736",
  }), {
    front: `${desk}
      ${bar(160, 806, 58, 88, "#e5c98a")}${bar(238, 806, 58, 180, "#d9a441")}${bar(316, 806, 58, 120, "#e5c98a")}
      ${bar(474, 806, 58, 64, "#e5c98a")}${bar(552, 806, 58, 140, "#e5c98a")}
      ${bar(710, 806, 58, 200, "#c96f6f")}${bar(788, 806, 58, 156, "#e5c98a")}
      <path d="M 268 592 C 400 500 600 500 738 578" stroke="#c58a3e" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="4 22"/>
      <path d="M 738 578 l -30 -12 m 30 12 l -10 -30" stroke="#c58a3e" stroke-width="10" fill="none" stroke-linecap="round"/>`,
  }),

  // アメリカンフラッグソート — フラッガ・スター: striped flag bands
  "americanflag-girl": scene("#f7e2dc", dots("#cf8b7c"), girl({
    hairColor: "#5c3a35", hairShadow: "#482b27", dressColor: "#b55b5b", dressShadow: "#a04c4f",
    accessory: `<path d="M 384 266 l 12 26 28 3 -21 19 6 28 -25 -14 -25 14 6 -28 -21 -19 28 -3 Z" fill="#e8c268"/>`,
    leftArm: "M 400 640 Q 316 640 268 596", rightArm: "M 624 640 Q 710 676 740 744",
  }), {
    behind: `<g transform="translate(196,470)">
      <path d="M 40 0 L 40 210" stroke="#8a6f50" stroke-width="12" stroke-linecap="round"/>
      <path d="M 46 6 C 130 -14 180 26 262 6 L 262 118 C 180 138 130 98 46 118 Z" fill="#fff"/>
      <path d="M 46 6 C 130 -14 180 26 262 6 L 262 44 C 180 64 130 24 46 44 Z" fill="#b55b5b"/>
      <path d="M 46 80 C 130 60 180 100 262 80 L 262 118 C 180 138 130 98 46 118 Z" fill="#5f8fa5"/>
    </g>`,
    front: `${desk}
      ${bar(150, 806, 118, 120, "#b55b5b", 10)}${bar(278, 806, 118, 120, "#b55b5b", 10)}
      ${bar(416, 806, 118, 120, "#eadfd2", 10)}${bar(544, 806, 118, 120, "#eadfd2", 10)}
      ${bar(682, 806, 118, 120, "#5f8fa5", 10)}${bar(810, 806, 118, 120, "#5f8fa5", 10)}`,
  }),

  // マージ挿入ソート — メリサ・フォード: balance scale, pairs
  "mergeinsertion-girl": scene("#dfecf2", dots("#7fa6bb"), girl({
    hairColor: "#39566b", hairShadow: "#2b4356", dressColor: "#5f8fa5", dressShadow: "#4f7d93", hairStyle: "short",
    accessory: `<rect x="470" y="252" width="84" height="26" rx="13" fill="#e8c268"/>`,
    leftArm: "M 400 640 Q 320 680 296 750", rightArm: "M 624 640 Q 704 680 728 750",
  }), {
    front: `${desk}
      <g transform="translate(312,600)">
        <path d="M 200 20 L 200 120" stroke="#8a6f50" stroke-width="12" stroke-linecap="round"/>
        <path d="M 40 40 L 360 0" stroke="#39566b" stroke-width="12" stroke-linecap="round"/>
        <path d="M 40 40 L 12 108 M 40 40 L 68 108" stroke="#39566b" stroke-width="8"/>
        <path d="M 12 108 A 34 34 0 0 0 68 108" fill="#7fa6bb"/>
        <path d="M 360 0 L 332 68 M 360 0 L 388 68" stroke="#39566b" stroke-width="8"/>
        <path d="M 332 68 A 34 34 0 0 0 388 68" fill="#7fa6bb"/>
        <rect x="24" y="66" width="30" height="42" rx="6" fill="#c96f6f"/>
        <rect x="346" y="34" width="30" height="34" rx="6" fill="#8aa65a"/>
      </g>
      ${bar(120, 806, 54, 100, "#9fc0d0")}${bar(184, 806, 54, 128, "#9fc0d0")}
      ${bar(786, 806, 54, 88, "#9fc0d0")}${bar(850, 806, 54, 148, "#9fc0d0")}`,
  }),

  // スローソート — ユルリ・スロウ: snail and tea time
  "slow-girl": scene("#efeade", dots("#b3a68d"), girl({
    hairColor: "#a9927a", hairShadow: "#907a63", dressColor: "#9b8d7f", dressShadow: "#87796c", closedEyes: true,
    accessory: `<path d="M 404 260 C 412 236 444 232 456 254 C 470 232 502 238 506 262" stroke="#87796c" stroke-width="10" fill="none" stroke-linecap="round"/>`,
    leftArm: "M 400 640 Q 330 700 322 768", rightArm: "M 624 640 Q 706 674 742 718",
  }), {
    front: `${desk}
      <g transform="translate(150,652)">
        <circle cx="104" cy="94" r="62" fill="#c9b79b" stroke="#a9927a" stroke-width="8"/>
        <circle cx="104" cy="94" r="34" fill="none" stroke="#a9927a" stroke-width="8"/>
        <path d="M 158 130 C 200 130 224 116 236 88 C 246 110 244 140 224 154 L 158 154 Z" fill="#b3a68d"/>
        <path d="M 236 88 L 252 62 M 244 92 L 262 74" stroke="#87796c" stroke-width="8" stroke-linecap="round"/>
      </g>
      <g transform="translate(640,690)">
        <path d="M 20 40 L 180 40 L 164 116 L 36 116 Z" fill="#fff" stroke="#b3a68d" stroke-width="7"/>
        <path d="M 180 52 C 216 52 216 96 172 96" fill="none" stroke="#b3a68d" stroke-width="7"/>
        <path d="M 66 18 C 60 4 74 -6 84 4 M 116 18 C 110 4 124 -6 134 4" stroke="#c4bab0" stroke-width="7" fill="none" stroke-linecap="round"/>
      </g>`,
  }),
};

for (const [name, svg] of Object.entries(characters)) {
  writeFileSync(join(OUT_DIR, `${name}.svg`), svg.trim() + "\n");
  console.log("wrote", `${name}.svg`);
}
