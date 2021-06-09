"use strict";
/* eslint-disable indent */
function PrivateMessageEvent(bot,head,msg,from,raw) {
    this.valid = false;
    this.raw = raw;
    this.replyas = null;
    let rhost = bot.getUser(from);
    // user does not exist
    if (!rhost) {
        // bot.send(`:${bot.config.sid} KILL ${from} :Unknown user`);
        console.error('=============================================');
        console.error('WARNING: UNKNOWN USER DETECTED', raw);
        console.error('=============================================');
        return;
    }
    var host = [rhost.nick,rhost.ident,rhost.host];
    let chan = null; // TODO: REFACTOR
    let messageTarget = bot.getChannel(head[1]);
    if (messageTarget) chan = messageTarget.name;
    else {
        messageTarget = bot.getUser(head[1]);
        if (messageTarget) {
            // message to pseudoserver to a user that is not on the pseudoserver
            if (messageTarget.server !== bot.client.ownServer) return;
            chan = rhost.uid;
            this.replyas = messageTarget.uid;
        } else return;
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
    this.valid = true;
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
