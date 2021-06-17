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

  if (activeJupeTargets.size) {
    bot.events.on('newServer', server => {
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
  }
};

