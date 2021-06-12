module.exports = function load(bot) {
  bot.events.on('privmsg', event => {
    if (event.type !== 'msg') return;
    if (event.args[0].toLowerCase() === '!chaos') event.reply('y u do dis');
  });
};

