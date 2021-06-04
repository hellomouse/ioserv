module.exports = function(bot) {
    bot.addCmd('kick', 'chanop', event => {
        if (!event.args[0]) {
            event.reply("Usage: kick <user> <reason>");
        }
        for (var i of event.args[0].split(',').map(a => a.toLowerCase())) {
            bot.kick(event.chan, i, event.args.slice(1).join(' ') || "Goodbye");
        }
    }, "Kicks a user with <reason>", 9); // 9 is for chanops
    bot.addCmd('ban', 'chanop', event => {
        if (!event.args[0]) {
            event.reply("Usage: ban <hostmask> [<hostmask2>]...");
        }
        var mode = 'b'.repeat(event.args.length);
        bot.mode(event.chan, '+' + mode + ' ' + event.args.join(' '));
    }, "Bans a user with <reason>", 9);
    bot.addCmd('unban', 'chanop', event => {
        if (!event.args[0]) {
            event.reply("Usage: unban <hostmask> [<hostmask2>]...");
        }
        var mode = 'b'.repeat(event.args.length);
        bot.mode(event.chan, '-' + mode + ' ' + event.args.join(' '));
    }, "Unbans a user", 9);
    bot.addCmd('op', 'chanop', event => {
        if (!event.args[0]) {
            event.args[0] = event.host[0];
        }
        var mode = 'o'.repeat(event.args.length);
        bot.mode(event.chan, '+' + mode + ' ' + event.args.join(' '));
    }, "Ops a user, with no arguments, ops yourself. Usage: op [<user>] [<user2>]...", 9);
    bot.addCmd('deop', 'chanop', event => {
        if (!event.args[0]) {
            event.args[0] = event.host[0];
        }
        var mode = 'o'.repeat(event.args.length);
        bot.mode(event.chan, '-' + mode + ' ' + event.args.join(' '));
    }, "Deops a user, with no arguments, deops yourself. Usage: deop [<user>] [<user2>]...", 9);
    bot.addCmd('stab', 'chanop', event => {
        if (event.args[0]) {
            event.args[0].split(',').forEach(nick => {
                var i = nick.toLowerCase();
                var isPKiller = i.match(/p.cketkiller/);
                if (isPKiller || i === 'slammort') bot.cmds.kick.code(event);
                bot.whois(nick, (err, ident, whost) => {
                    if (err) {
                        event.reply('No such nick');
                    }
                    else {
                        var t = parseInt(event.args[1]);
                        if (t > 0) {
                            setTimeout(() => {
                                bot.mode(event.chan, '-q *!*@' + whost);
                            }, t * 1000);
                        }
                        bot.mode(event.chan, '+q *!*@' + whost);
                    }
                });
            });
        } else {
            bot.sendMsg('Usage: stab <nick>[,<nick2>...]');
        }
    }, "Quiets a user", 9);
    bot.addCmd('unstab', 'chanop', event => {
        if (event.args[0]) {
            event.args[0].split(',').forEach(nick => {
                bot.whois(nick, (err, ident, whost) => {
                    if (err) {
                        event.reply('No such nick');
                    }
                    else {
                        bot.mode(event.chan, '-q *!*@' + whost);
                    }
                });
            });
        }
        else {
            bot.sendMsg('Usage: unstab <nick>[,<nick2>...]');
        }
    }, "Unquiets a user", 9);
    bot.addCmd('mode', 'chanop', event => {
        bot.mode(event.chan, event.args.join(' '));
    }, "Changes mode. Usage: mode <mode> <opts>", 9)
    bot.addCmd('kban', 'chanop', event => {
        if (event.args[0]) {
            event.args[0].split(',').forEach(nick => {
                bot.whois(nick, (err, ident, whost) => {
                    if (err) {
                        event.reply('No such nick');
                    }
                    else {
                        var t = parseInt(event.args[1]);
                        var i;
                        if (t > 0) {
                            setTimeout(() => {
                                bot.mode(event.chan, '-b *!*@' + whost);
                            }, t * 1000);
                            i = 2;
                        }
                        else {
                            i = 1;
                        }
                        bot.mode(event.chan, '-o+b ' + nick + ' *!*@' + whost);
                        bot.kick(event.chan, nick, event.args.slice(i).join(' '));
                    }
                });
            });
        }
        else {
            bot.sendMsg(event.chan, 'Usage: kban <nick>[,<nick2>[,<nick3>...]] [<seconds>] <reason>');
        }
    }, "Kickbans a user", 9);
    bot.addCmd('voice', 'chanop', event => {
        if (!event.args[0]) {
            event.args[0] = event.host[0];
        }
        var mode = 'v'.repeat(event.args.length);
        bot.mode(event.chan, '+' + mode + ' ' + event.args.join(' '));
    }, "voices a user, with no arguments, voices yourself. Usage: voice [<user>] [<user2>]...", 9);
    bot.addCmd('devoice', 'chanop', event => {
        if (!event.args[0]) {
            event.args[0] = event.host[0];
        }
        var mode = 'v'.repeat(event.args.length);
        bot.mode(event.chan, '-' + mode + ' ' + event.args.join(' '));
    }, "unvoices a user, with no arguments, unvoices yourself. Usage: unvoice [<user>] [<user2>]...", 9);
};
