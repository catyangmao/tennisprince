// 《网球王子》每日数据抓取 — GitHub Actions 定时运行
// 数据源: ESPN 公开API(免费无key) — scoreboard端点
// 输出: data.json {updated, matches[]} — 页面加载时自动拉取
'use strict';
const fs = require('fs');

const TZ = 8; // 北京时间
function bj(date) { return new Date(date.getTime() + TZ * 3600000); }
function bjTimeStr(d) {
  const t = bj(d);
  return `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
}
function bjDateKey(d) {
  const t = bj(d);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

const ROUND_MAP = {
  'Final': '决赛', 'Semifinals': '半决赛', 'Quarterfinals': '1/4决赛',
  'Round of 16': '1/8决赛', 'Round of 32': '1/16决赛', 'Round of 64': '1/32决赛', 'Round of 128': '1/64决赛'
};
const TOUR_CN = {
  'Rolex Paris Masters': '巴黎大师赛', 'Wimbledon': '温网', 'US Open': '美网',
  'Australian Open': '澳网', 'French Open': '法网', 'Roland Garros': '法网',
  'China Open': '中国网球公开赛', 'Shanghai Masters': '上海大师赛', 'Wuhan Open': '武汉公开赛',
  'ATP Finals': 'ATP年终总决赛', 'WTA Finals': 'WTA年终总决赛'
};
// 常见球员英→中(内置库口径;未命中显示原名)
const NAME_CN = {
  'Jannik Sinner': '辛纳', 'Carlos Alcaraz': '阿尔卡拉斯', 'Novak Djokovic': '德约科维奇',
  'Alexander Zverev': '兹维列夫', 'Taylor Fritz': '弗里茨', 'Daniil Medvedev': '梅德韦杰夫',
  'Casper Ruud': '鲁德', 'Lorenzo Musetti': '穆塞蒂', 'Holger Rune': '鲁内', 'Alex de Minaur': '德米纳尔',
  'Frances Tiafoe': '蒂亚福', 'Alexander Bublik': '布布利克', 'Ben Shelton': '谢尔顿', 'Tommy Paul': '保罗',
  'Arthur Fils': '菲斯', 'Luca Van Assche': '范阿舍', 'Rinky Hijikata': '土方凛辉', 'Nuno Borges': '博尔热斯',
  'Jan-Lennard Struff': '斯特鲁夫', 'Mattia Bellucci': '贝卢奇',
  'Polina Kudermetova': '库德摩托娃', 'Maria Sakkari': '萨卡里', 'Aliaksandra Sasnovich': '萨斯诺维奇',
  'Bianca Andreescu': '安德莱斯库', 'Alexandra Shubladze': '舒布拉泽', 'Elina Svitolina': '斯维托丽娜',
  'Sonay Kartal': '卡尔塔尔', 'Claire Liu': '刘婧文', 'Janice Tjen': '陈婉萍',
  'Victoria Mboko': '姆博科', 'Lulu Sun': '孙璐璐', 'Yulia Putintseva': '普汀塞娃',
  'Mattia Bellucci': '贝卢奇', 'Jaime Faria': '法里亚', 'Hugo Gaston': '加斯东',
  'Zachary Svajda': '斯瓦伊达', 'Thiago Agustin Tirante': '蒂兰特', 'Vit Kopriva': '科普里瓦',
  'Pablo Carreno Busta': '卡雷诺·布斯塔',
  'Tien Daniel': '丹尼尔·田', ' Learner Tien': ' learner Tien', 'Learner Tien': '蒂恩',
  'Bu Yunchakang': '布云朝克特', 'Zhou Yi': '周意', 'Huang Zelin': '黄泽林', 'Zizou Bergs': '贝尔赫斯',
  'Corentin Moutet': '穆泰', 'Giovanni Mpetshi Perricard': '姆佩希·佩里卡尔',
  'Alejandro Davidovich Fokina': '达维多维奇', 'Tomas Machac': '马哈奇',
  'Korda Sebastian': '科达', 'Sebastian Korda': '科达', 'Alex Michelsen': '米切尔森',
  'Marcos Giron': '吉隆', 'Jenson Brooksby': '布鲁克斯比',
  'Camilo Ugo Carabelli': '乌戈·卡拉贝利', 'Federico Agustin Gomez': '戈麦斯',
  'Julia Riera': '里埃拉', 'Leyre Romero Gormaz': '罗梅罗·戈尔马兹', 'Alice Tubello': '图贝洛',
  'Liudmila Samsonova': '萨姆索诺娃', 'Anhelina Kalinina': '卡利尼娜',
  'Rebecca Sramkova': '什拉姆科娃', 'Donna Vekic': '维基奇',
  'Anna Blinkova': '布林科娃', 'Ella Seidel': '赛德尔', 'Veronika Kudermetova': '库德梅托娃',
  'Oceane Babel': '巴贝尔', 'Tereza Valentova': '瓦伦托娃',
  'Moyuka Uchijima': '内岛萌夏', 'Kim Birrell': '伯里尔',
  'Tereza Mihalikova': '米哈利科娃',
  'Costa Picchinotti': '皮基诺蒂', 'Marie Mattel': '马特尔', 'Nina Radovanovic': '拉多万诺维奇',
  'Katarzyna Kawa': '卡瓦', 'Antonia Rufrancisco': '鲁弗兰西斯科', 'Carole Monnet': '莫内',
  'Shophie Marie Gang': '冈真理惠', 'Sofia Kenin': '凯宁',
  'Alycia Parks': '帕克斯', 'Ann Li': '李安',
  'Sara Bejlek': '贝莱克', 'Antonia Vergara Rivera': '贝加拉',
  'Veronica Royer': '罗耶', 'Loa Milojevic': '米洛耶维奇', 'Josepha Godefroid': '戈弗雷',
  'Aryna Sabalenka': '萨巴伦卡', 'Iga Swiatek': '斯瓦泰克', 'Zheng Qinwen': '郑钦文', 'Coco Gauff': '高芙',
  'Elena Rybakina': '莱巴金娜', 'Jessica Pegula': '佩古拉', 'Naomi Osaka': '大坂直美',
  'Jasmine Paolini': '保利尼', 'Madison Keys': '凯斯', 'Mirra Andreeva': '米拉·安德列娃',
  'Diana Shnaider': '施内德', 'Emma Navarro': '纳瓦罗'
};
function cn(t) { return NAME_CN[t] || t; }
function tourMeta(ev) {
  const name = ev.name || '';
  if (ev.major) { // 大满贯
    return { name: TOUR_CN[name] || name, lv: 'slam' };
  }
  // 已知赛事:名字+级别对照(1000/500/250按巡回赛体系)
  const known = [
    [/Paris Masters/i, '巴黎大师赛', '1000'],
    [/Shanghai/i, '上海大师赛', '1000'],
    [/Monte.?Carlo/i, '蒙特卡洛大师赛', '1000'],
    [/Madrid Open|Mutua Madrid/i, '马德里公开赛', '1000'],
    [/Italian Open|Rome/i, '罗马公开赛', '1000'],
    [/Canada|Masters Toronto|National Bank Open/i, '加拿大大师赛', '1000'],
    [/Cincinnati/i, '辛辛那提大师赛', '1000'],
    [/Miami Open/i, '迈阿密公开赛', '1000'],
    [/BNP Paribas Open|Indian Wells/i, '印第安维尔斯公开赛', '1000'],
    [/China Open|Beijing/i, '中国网球公开赛', '500'],
    [/Dubai/i, '迪拜锦标赛', '500'],
    [/Rotterdam/i, '鹿特丹公开赛', '500'],
    [/Doha/i, '卡塔尔公开赛', '500'],
    [/Barcelona/i, '巴塞罗那公开赛', '500'],
    [/Queen.?s/i, '女王杯', '500'],
    [/Halle|Gerry Weber/i, '哈勒公开赛', '500'],
    [/Stuttgart/i, '斯图加特公开赛', '500'],
    [/Washington/i, '华盛顿公开赛', '500'],
    [/Tokyo/i, '日本公开赛', '500'],
    [/Vienna/i, '维也纳公开赛', '500'],
    [/Hong Kong/i, 'WTA香港站', '250'],
    [/Chennai/i, 'WTA金奈站', '250'],
    [/Cali/i, 'WTA卡利站', '250'],
    [/Angola|Luanda/i, 'WTA罗安达125K', 'challenger'],
  ];
  for (const [re, cn, lv] of known) {
    if (re.test(name)) return { name: cn, lv };
  }
  return { name: name || '未知赛事', lv: 'tour' };
}

async function fetchTour(tour) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/tennis/${tour}/scoreboard`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${tour}`);
  return (await res.json()).events || [];
}

// "Mattia Bellucci (ITA) bt Pablo Carreno Busta (ESP) 6-1 7-6 (7-3)" → 盘分数组
function parseSets(note) {
  if (!note) return [];
  const m = note.match(/bt\s+.+?\s+\(.+?\)\s+(.+)$/);
  if (!m) return [];
  return m[1].split(/\s+/).filter(s => /\d+-\d+/.test(s)).map(s => s.replace(/\s*\(\d+-\d+\)/, ''));
}

function convertComp(c, ev, dayOffset) {
  const meta = tourMeta(ev);
  const cpts = c.competitors || [];
  if (cpts.length !== 2) return null;
  const nameOf = cp => cn(((cp.athlete || {}).displayName) || '?');
  const a = nameOf(cpts[0]), b = nameOf(cpts[1]);
  if (a === '?' || b === '?') return null;
  if (a === 'TBD' || b === 'TBD') return null; // 半决赛对手未定
  const st = new Date(c.date);
  const state = (c.status && c.status.type && c.status.type.state) || 'pre';
  const status = state === 'in' ? '进行中' : state === 'post' ? '已结束' : '未开始';
  const sets = parseSets((c.notes || []).map(n => n.text || '').join(' '));
  const cur = status === '进行中' ? (['第一盘', '第二盘', '第三盘'][sets.length] || '进行中') : '';
  const noteTxt = (c.notes || []).map(n => n.text || '').join(' ');
  let winner = '';
  if (state === 'post' && noteTxt.includes(' bt ')) {
    const first = noteTxt.split(' bt ')[0].replace(/\s*\(.+?\)\s*$/, '').trim();
    winner = first === ((cpts[0].athlete || {}).displayName || '') ? 'a' : 'b';
  }
  const roundTxt = (c.round && (c.round.displayName || c.round.text)) || '';
  const sex = ((c.type && c.type.text) || '').includes("Women") ? 'WTA' : 'ATP';
  return {
    tour: meta.name,
    lv: meta.lv,
    gender: sex,
    round: ROUND_MAP[roundTxt] || roundTxt,
    time: bjTimeStr(st),
    start: bjTimeStr(st), day: dayOffset,
    court: (c.venue && c.venue.court) || '',
    a, b, status, sets, cur, curGame: '', winner
  };
}

(async () => {
  const now = new Date();
  const todayKey = bjDateKey(now);
  const tomorrowKey = bjDateKey(new Date(now.getTime() + 24 * 3600000));
  const [atp, wta] = await Promise.all([fetchTour('atp'), fetchTour('wta')]);
  let all = [];
  for (const ev of atp.concat(wta)) {
    for (const g of (ev.groupings || [])) {
      const gt = ((g.grouping || {}).displayName) || '';
      if (!/Singles/i.test(gt)) continue; // 只要单打
      for (const c of (g.competitions || [])) {
        const dayKey = bjDateKey(new Date(c.date));
        const dayOffset = dayKey === todayKey ? 0 : dayKey === tomorrowKey ? 1 : -1;
        if (dayOffset < 0) continue; // 只留今明两天
        const m = convertComp(c, ev, dayOffset);
        if (m) all.push(m);
      }
    }
  }
  const seen = new Set();
  all = all.filter(m => { const k = m.tour + m.a + m.b + m.time; if (seen.has(k)) return false; seen.add(k); return true; });
  const ord = { '进行中': 0, '未开始': 1, '已结束': 2 };
  all.sort((x, y) => (ord[x.status] - ord[y.status]) || (x.time < y.time ? -1 : 1));
  const t = bj(now);
  const out = {
    updated: `bot ${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')} ${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`,
    matches: all
  };
  fs.writeFileSync('data.json', JSON.stringify(out, null, 1), 'utf8');
  console.log(`OK: ${all.length} matches written (ATP+WTA, today+tomorrow)`);
})().catch(e => { console.error('FETCH FAILED:', e.message); process.exit(1); });
