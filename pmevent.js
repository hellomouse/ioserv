"use strict";
function PrivateMessageEvent(bot,head,msg,from,raw) {
    this.raw = raw;
    var rhost = bot.server.clients[from] || bot.getUserByNick(from) || {};
    var host = [rhost.nick,rhost.ident,rhost.host];
    var chan = head[1];
    if (chan.startsWith(bot.config.sid)) {
        chan = host[0];
        this.replyas = head[1];
    }
    var type = 'msg';
    var cmd = null;
    var args = null;
    var uperms = bot.config.uperms[rhost.account] || 0;
    if (msg[0].startsWith(bot.config.cmdchar)) {
        type = 'command';
        cmd = msg[0].substr(bot.config.cmdchar.length).toLowerCase();
        args = msg.slice(1);
    } else if (msg[0].startsWith('\x01') && msg[msg.length-1].endsWith('\x01')) {
        type = 'ctcp';
        msg[0] = msg[0].replace(/^\x01{1}/,'');
        msg[msg.length-1] = msg[msg.length-1].replace(/\x01{1}$/,'');
        cmd = msg[0].toLowerCase();
        args = msg.slice(1);
    } else {
        args = msg;
    }
    this.args = args;
    this.chan = chan;
    this.host = host;
    this.rhost = rhost;
    this.uperms = uperms;
    this.cmd = cmd;
    this.type = type;
    this.bot = bot;
}
PrivateMessageEvent.prototype = {
    emote(msg,trunc) {
        this.bot.sendMsg(this.chan,'\x01ACTION '+msg+'\x01',this.replyas,trunc);
    },
    sendBack(msg,trunc) {
        this.bot.sendMsg(this.chan,msg,this.replyas,trunc);
    },
    reply(msg,trunc) {
        this.bot.sendMsg(this.chan,this.host[0]+': '+msg,this.replyas,trunc);
    }
}

module.exports = PrivateMessageEvent;
