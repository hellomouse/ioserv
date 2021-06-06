const util = require('util');
module.exports = function(bot, config) {
    config.processes = [];
    bot.addCmd('join', 'main', event => {
        if (event.args[0] != undefined) {
            let user = bot.getUser(event.args[0]);
            if (!user) {
                event.reply('No such user');
                return;
            }
            if (user.server !== bot.config.sname) {
                event.reply('User not on IoServ');
                return;
            }
            bot.join(user.uid,event.args[1]);
        } else {
            event.reply("Not enough arguments. See help");
        }
    }, "(level 10) Tells the bot to join a channel, for multiple channels, separate with ','", 10);
    bot.addCmd('getuser', 'main', event => {
        if (!event.args[0]) return;
        let user = bot.getUser(event.args[0]);
        event.reply(util.inspect(user));
    }, "(level 10) Obtain user information, useful for debugging", 10);
    bot.addCmd('part', 'main', event => {
        if (event.args[0] != undefined) {
            bot.part(event.args[0],event.args[1]);
        } else {
            for(let user of Object.keys(bot.client.users)){
                bot.part(user,event.args[0]||event.chan);
            }
        }
    }, "(level 10) Tells the bot to join a channel, for multiple channels, separate with ','", 10);
    /*
    bot.addCmd('cycle', 'main', event => {
        var chan = event.args[0];
        if (!chan) chan = event.chan;
        bot.send('PART ' + chan + ' :cycling...');
        var t = parseInt(event.args[1]);
        if (t > 0) {
            setTimeout(() => {
                bot.send('JOIN ' + chan);
            }, t * 1000);
        } else bot.send('JOIN ' + chan);
    }, 'Cycles a channel', 10);
    */
    bot.addCmd('reload', 'main', event => {
        bot.events.emit('reload');
        event.reply('Reloaded modules');
    }, '(level 10) Reloads modules of the bot', 10);
    /*
    bot.addCmd('whois', 'main', event => {
        if (!event.args[0]) {
            event.reply('Usage: whois <nick>');
            return;
        }
        bot.whois(event.args[0], function(err, ident, whoishost, realname) {
            console.log(err);
            if (err) {
                event.reply('No such nick');
                return;
            }
            event.reply('Ident: ' + ident + ' | Host: ' + whoishost + ' | Realname: ' + realname);
        });
    }, 'Do a WHOIS on a nick. Usage: whois <nick>');
    bot.addCmd('nick', 'main', event => {
        if (!event.args[0]) {
            event.reply('Usage: nick <newnick>');
            return false;
        }
        bot.send('NICK ' + event.args[0]);
    }, "(level 10) Change the bot's nick. Usage: nick <newnick>", 10);
    */
    bot.addCmd('exec', 'main', event => {
        if (!event.args[0]) {
            event.reply('Usage: exec <command>');
            return;
        }
        var cprocess = require('child_process').exec(event.args.join(' '), {
            shell: '/bin/bash',
            maxBuffer: 1024 * 1024
        });
        config.processes.push(cprocess);
        var outpart = '';

        function send(data) {
            data = (outpart + data).split('\n');
            outpart = data[data.length - 1];
            for (let i = 0; i < data.length - 1; i++) event.sendBack(data[i]);
        }
        cprocess.stdout.on('data', send);
        cprocess.stderr.on('data', send);
        cprocess.on('exit', (code, signal) => {
            if (outpart !== '') {
                event.sendBack(outpart);
                outpart = '';
            }
            event.reply('Process exited with ' + (signal || code));
        });
        cprocess.on('error', () => {
            event.reply('Error while running process');
        });
        cprocess.on('close', () => {
            config.processes.splice(config.processes.indexOf(cprocess), 1);
        });
    }, "Executes a command", 11);
    bot.addCmd('killprocess', 'main', event => {
        var oldest = config.processes.pop();
        if (oldest) {
            oldest.kill();
        }
        event.reply('Done');
    }, "Kills the earliest process started", 11);
    bot.addCmd('restart', 'main', event => {
        if (!event.args[0]) {
            event.reply('Usage: restart <message>');
            return;
        }
        console.log('[NOTICE] Restart requested by ' + event.host[0] + ': ' + event.args.join(' '));
        bot.sendMsg(config.logchannel, 'Restart requested by ' + event.host[0] + ': ' + event.args.join(' '));
        bot.send(`SQUIT ${bot.config.sid} :Restart requested by ${event.host[0]}: ${event.args.join(' ')}`);
        setTimeout(() => {
            process.exit(11);
        }, 3000);
    }, "(level 11) Restart the bot", 11);
    bot.addCmd('quit', 'main', event => {
        if (!event.args[0]) {
            event.reply('Usage: quit <message>');
            return;
        }
        console.log('[NOTICE] Quit requested by ' + event.host[0] + ': ' + event.args.join(' '));
        bot.sendMsg(config.logchannel, 'Quit requested by ' + event.host[0] + ': ' + event.args.join(' '));
        bot.send(`SQUIT ${bot.config.sid} :Shutdown requested by ${event.host[0]}: ${event.args.join(' ')}`);
        setTimeout(() => {
            process.exit(10);
        }, 3000);
    }, "(level 11) Shutdown the bot", 11);
    bot.addCmd('raw', 'main', event => {
        if (!event.args[0]) {
            event.reply('Usage: raw <raw data>');
            return;
        }
        bot.send(event.args.join(' '));
    }, "(level 11) Sends raw data to the server", 11);
    bot.addCmd('runat', 'main', event => {
        if (!event.args[1]) {
            event.reply("Usage: runat <target> <command> [<arguments>]");
            return;
        }
        var cmd = event.args[1];
        if (bot.cmds[cmd]) {
            event.chan = event.args[0];
            event.args.splice(0, 2);
            bot.cmds[cmd].run(event);
        }
        else event.reply('No such command');
    }, "(level 11) Execute the command in another channel, usage: runat <target> <command> <arguments>", 11);
    bot.addCmd('runas', 'main', event => {
        if (!event.args[1]) {
            event.reply("Usage: runas <target> <command> [<arguments>]");
            return;
        }
        var cmd = event.args[1];
        if (bot.cmds[cmd]) {
            bot.whois(event.args[0], function(err, ident, whoishost, realname, ccnick) {
                if (err) {
                    event.reply('No such user');
                    return;
                }
                event.args.splice(0, 2);
                event.host = [ccnick, ident, whoishost];
                event.uperms = event._findUperms();
                if (!bot.cmds[cmd].run(event)) event.reply("User has insufficient permissions");
            });
        } else event.reply('No such command');
    }, "(level 11) Execute the command as another user. Usage: runas <target> <command> [<arguments>]", 11);
    bot.addCmd('msg', 'main', event => {
        if (!event.args[1]) {
            event.reply("Usage: msg <target> <message>");
            return;
        }
        bot.sendMsg(event.args[0], event.args.slice(1).join(' '));
    }, "(level 10) Send a message somewhere, usage: msg <target> <message>", 10);
    bot.addCmd('by', 'main', event => {
        if (!event.args[1]) {
            event.reply("Usage: by <service> <command> [<arguments>]");
            return;
        }
        var cmd = event.args[1];
        if (bot.cmds[cmd]) {
            event.replyas = event.args[0];
            event.args.splice(0, 2);
            bot.cmds[cmd].run(event);
        }
        else event.reply('No such command');
    }, "(level 11) Execute the command as other service, usage: by <service> <command> [<arguments>]", 11);
    bot.addCmd('invite', 'main', event => {
        let chan = event.args[0];
        bot.send(`:${bot.config.botUser.uid} INVITE ${event.rhost.uid} ${chan} 0`);
    }, '(level 11) Get an invite to a channel', 11);
}

