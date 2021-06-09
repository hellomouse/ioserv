const { Keccak } = require('../util/keccak');
const { promises: fsP } = require('fs');

module.exports = function load(bot) {
  let keccak = new Keccak(12);
  if (Object.prototype.hasOwnProperty.call(bot.config.modules, 'keccak.js')) {
    let prev = bot.config.modules['keccak.js'];
    // restore old state
    if (prev?.keccak?.state) keccak.state = prev.keccak.state;
    if (prev?.randomTimer) clearTimeout(prev.randomTimer);
    if (prev?.randomFd) prev.randomFd.close();
  }

  let keccakStream = keccak.absorbStream(512);

  let state = {
    keccak,
    keccakStream,
    randomBytes: keccak.squeeze.bind(keccak, 512),
    randomTimer: null,
    randomFd: null
  };

  // write irc messages to keccak, because why not
  bot.events.on('data', data => {
    keccakStream.write(process.hrtime()[1].toString());
    keccakStream.write(data);
  });

  async function randomStuff() {
    let time1 = process.hrtime()[1];
    let readBuf = Buffer.allocUnsafe(63);
    let writeBuf = keccak.squeeze(512, 64);
    await Promise.all([
      state.randomFd.read(readBuf, 0, readBuf.length, null),
      state.randomFd.write(writeBuf)
    ]);
    keccak.absorb(512, readBuf);
    let timeBuf = keccak.squeeze(512, 2);
    let time = timeBuf.readUInt16BE();
    let time2 = process.hrtime()[1];
    if (time2 < time1) time2 += 1e9;
    keccakStream.write((time2 - time1).toString());
    state.randomTimer = setTimeout(randomStuff, time * 10);
  }

  (async () => {
    state.randomFd = await fsP.open('/dev/urandom', 'r+');
    state.randomTimer = setTimeout(randomStuff);
  })();

  const UINT48_MAX = 2 ** 48;
  function floatMany(n) {
    let out = [];
    let buf = keccak.squeeze(512, n * 6);
    for (let i = 0; i < buf.length; i += 6) {
      let val = buf.readUIntLE(i, 6);
      out.push(val / UINT48_MAX);
    }
    return out;
  }

  bot.addCmd('random', 'keccak', event => {
    let args = event.args.map(a => a.toLowerCase());
    let short = false;
    let decimal = false;
    let encoding = 'hex';
    while (args.length) {
      switch (args.pop()) {
        case 'short': short = true; break;
        case 'long': short = false; break;
        case 'hex': decimal = false; encoding = 'hex'; break;
        case 'base64': decimal = false; encoding = 'base64'; break;
        case 'decimal': decimal = true; break;
        default: break;
      }
    }

    if (!decimal) {
      let length = 0;
      if (short) length = 8;
      else length = 64
      event.sendBack(keccak.squeeze(512, length).toString(encoding));
    } else {
      if (short) event.sendBack(keccak.state[0].toString());
      else {
        event.sendBack(
          keccak.state.slice(0, 8)
          .reduce((acc, val, idx) => acc | (val << BigInt(idx * 64)), 0n)
          .toString()
        );
      }
      keccak.keccakf();
    }
  }, 'a random 64-bit number, usage: random [short|long] [hex|decimal|base64]');

  bot.addCmd('roll', 'keccak', event => {
    let dice = event.args.map(m => {
      let spec = m.split('d');
      let count;
      if (spec[0].length) count = +spec[0];
      else count = 1;
      let sides = +spec[1];
      if (!Number.isFinite(count) || !Number.isFinite(sides)) return null;
      count = Math.floor(count);
      sides = Math.floor(sides);
      if (count <= 0 || count > 100) return null;
      if (sides <= 0 || sides > 1e9) return null;
      return [count, sides];
    }).filter(Boolean).slice(0, 5);
    for (let [count, sides] of dice) {
      let source = floatMany(count);
      let results = [];
      for (let pick of source) {
        let result = Math.floor(pick * sides) + 1;
        results.push(result);
      }
      event.sendBack(`\x02${count}d${sides}\x02: ${results.join(' ')}`);
    }
  }, 'roll dice, <count>d<sides>');

  return state;
};
