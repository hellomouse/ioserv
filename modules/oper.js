module.exports = function(bot) {
    bot.addCmd('kill', 'oper', event => {
        if (event.args[0]) {
            event.args[0].split(',').forEach(nick => {
                let user = bot.getUser(nick);
                if (!user) {
                    event.reply('No such nick: ' + nick);
                    return;
                }
                bot.kill(user.uid, event.args.slice(1).join(' '));
            });
        } else {
            bot.sendMsg(event.chan, 'Usage: kill <nick>[,<nick2>[,<nick3>...]] <reason>');
        }
    }, 'Kill somebody. Please keep in mind that people don\'t like being killed.', 10);
    bot.addCmd("global","oper", event => {
        bot.send(":IoServ NOTICE $$*.net :"+event.args.join(" "));
    }, "Sends a global notice.", 10);
    /*
    bot.addCmd("fnick","oper", event => {
        let u = bot.getUser(event.args[0]);
        if (!u) return event.reply('no such user');
        let newNick = event.args[1];
        let ts = bot.getTS();
        // bot.send(`ENCAP ${u.server} RSFNC ${u.nick} ${event.args[1]} ${ts} ${u.ts}`);
        bot.send(`SVSNICK ${u.nick} ${newNick} ${ts}`);
        u.ts = ts;
        u.nick = newNick;
    }, "Forces a nick change", 10);
    */
    bot.addCmd("rehash","oper", event => {
        bot.send(`:${bot.config.bname} ENCAP ${event.args[0] || '*'} REHASH ${event.args[1]}`);
    }, "Rehashes a server, takes server and type", 10);
    bot.addCmd('chghost', 'oper', event => {
        let user = bot.getUser(event.args[0]);
        let host = event.args[1];
        bot.changeHost(user, host);
    });
    bot.servmsg.on("JOIN",(head,msg,uid) => {
        // bot.sendMsg(bot.config.logchannel,`${(bot.server.clients[uid]||{nick:"unknown user"}).nick} joined ${head[2]}`);
        if(head[2]==="#suicide" && (bot.config.uperms[bot.getUser(uid).account]||0) < 10) bot.kill(uid, `${bot.config.sname}!${bot.config.bhost}!${bot.config.bname}!${bot.config.bname} (User has committed suicide)`);
    });
    let restricted = ['#ioservsmells'];
    bot.servmsg.on("SJOIN",(head,msg,serv) => {
        let users = msg.map(a=>a.replace("@","").replace("+","")).filter(Boolean).map(uid=>(bot.getUser(uid)||{nick:"unknown user"}).nick).join(", ");
        // bot.sendMsg(bot.config.logchannel,`${users} joined ${head[2]}`);
        if (restricted.includes(head[2].toLowerCase())) {
            let lusers = msg.map(a=>a.replace("@","").replace("+",""));
            for (let i = 0; i < lusers.length; i++) bot.kill(lusers[i], `fuck off`);
        }
    })
    /*
    bot.servmsg.on('EUID', (head, msg, from) => {
        if (head[1] === 'handicraftsman') bot.kill(head[8], 'HEY!'); // he keeps killing people <_<
    });
    */
}
