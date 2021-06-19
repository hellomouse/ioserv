const ipaddr = require('ipaddr.js');
let activeJupeTargets = new Map([
  /*
  ['random.testing.server.please.ignore', {
    // an example
    sid: null, // target SID for server, will be dynamically updated if it changes
    quitParent: false, // whether or not to send SQUIT for parent server, do not use
    reason: 'testing'
  }]
  */
]);

module.exports = function load(bot) {
  bot.events.on('privmsg', event => {
    if (event.type !== 'msg') return;
    if (event.args[0].toLowerCase() === '!chaos') event.reply('y u do dis');
  });
  // pls do not chaos
  bot.events.on('newClient', client => {
    if (client.nick === 'CHAOS') bot.kill(client, 'CHAOS is no longer allowed');
  });
  bot.servmsg.on('SENDSNO', (head, msg, from) => {
    // autogline/pmflood listening for max-concurrent-conversations
    if (head[1] !== 'f') return;
    if (msg[2] !== '(max-concurrent-conversations)') return;
    let source = bot.getServer(from);
    let rawTarget = msg[5].slice(1, -1);
    let parsedIP = ipaddr.parse(rawTarget);
    let target;
    if (parsedIP.kind() === 'ipv6') {
      // lazy way of obtaining /64
      for (let i = 4; i < 8; i++) parsedIP.parts[i] = 0;
      target = parsedIP.toString() + '/64';
    } else {
      target = parsedIP.toString();
    }
    bot.sendMsg('#services', `[autogline/pmflood] found [${msg[4]}] (addr [${rawTarget}], gline [${target}]) from [${source.name}] (max-concurrent-conversations)`);
    let expireTS = bot.getTS() + 86400; // 1 day
    bot.addTKL('G', '*', target, 'IoServ[autogline/pmflood]', expireTS, `max-concurrent-conversations from ${source.name} (${rawTarget})`);
  });

  bot.events.on('newServer', server => {
    if (server.name.toLowerCase() === 'eris.berkeley.edu') {
      // activejupe whatever server introduces eris
      let parent = server.parent;
      bot.sendMsg('#services', `[activejupe/eris] server [${parent.name} (${parent.sid})] introduced [${server.name}], adding activejupe`);
      activeJupeTargets.set(parent.name, {
        sid: parent.sid,
        quitParent: false,
        reason: 'please remove eris'
      });
      bot.squit(parent, '[activejupe] removing eris');
    }
    // activejupe
    if (!activeJupeTargets.size) return;
    let jupeTarget = activeJupeTargets.get(server.name.toLowerCase());
    if (!jupeTarget) return;
    jupeTarget.sid = server.sid;

    bot.squit(server, 'active jupe in progress');
    if (jupeTarget.quitParent) {
      let parent = server.parent;
      if (parent !== bot.server.remoteServer) {
        bot.squit(server.parent, `active jupe for ${server.name}, quit parent`);
      }
    }
    bot.introduceServer(jupeTarget.sid, server.name, `active jupe for ${server.name} (${jupeTarget.reason})`);
    bot.sendMsg('#services', `[activejupe] received SID, squit and introduce ${server.name}`);
  });
  bot.servmsg.on('SQUIT', (head, msg, from) => {
    // activejupe
    if (!activeJupeTargets.size) return;
    let target = head[1];
    let jupeTarget = activeJupeTargets.get(target.toLowerCase());
    if (!jupeTarget) return;
    setTimeout(() => {
      if (bot.getServer(target)) return;
      bot.introduceServer(jupeTarget.sid, target, `active jupe for ${target} (${jupeTarget.reason})`);
      bot.sendMsg('#services', `[activejupe] received SQUIT, introduce ${target}`);
    }, 100);
  });

  function doInitialCheck() {
    // activejupe
    if (!activeJupeTargets) return;
    for (let [name, jupeTarget] of activeJupeTargets) {
      let target = bot.getServer(name);
      if (!target) continue;
      bot.squit(target, 'active jupe in progress');
      if (jupeTarget.quitParent) {
        let parent = server.parent;
        if (parent !== bot.server.remoteServer) {
          bot.squit(server.parent, `active jupe for ${target.name}, quit parent`);
        }
      }
      bot.introduceServer(jupeTarget.sid, server.name, `active jupe for ${target.name} (${jupeTarget.reason})`);
      bot.sendMsg('#services', `[activejupe] initial check found server, squit and introduce ${target.name}`);
    }
  }
  if (bot.client.registered) doInitialCheck();
  else bot.events.once('regdone', doInitialCheck);
};

