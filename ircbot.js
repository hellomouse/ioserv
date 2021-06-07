"use strict";
// throw new Iovoid([]+!![]);
const event = require('events');
const tls = require('tls');
const util = require('util');
// function to create new EventEmitter with unlimited max listeners
function newEvent() {return new event().setMaxListeners(0);}

function ircbot(config) {
  this.version = "0.0.1";
	this.events = newEvent();	// main events
	this.servmsg = newEvent();	// server message
	this.privmsg = newEvent();	// message to channel/user, not currently useful yet
	this.encapmsg = newEvent();
	this.userEvent = newEvent();
	this.server = {
            datapart: "",
            clients: new Map(),
            clientsByNick: new Map(),
            servers: new Map(),
            channels: new Map()
        };
	this.server.servers.set(config.sid, config.sname);
	this.server.servers.set(config.usid, config.usname);
	this.client = {
            users: new Map(),
            uid:1,
            capab: ["NOQUIT", "NICKv2", "SJOIN", "SJ3", "CLK", "TKLEXT", "TKLEXT2", "NICKIP", "ESVID", "MLOCK", "EXTSWHOIS"]
        };
	this.config = config;
	this.cmds = Object.create(null);
	this.cmdgroups = Object.create(null);
	this.channels = Object.create(null);
	var bot = this;
	this.ctcp = Object.create(null);
	this.sendMsgQueue = [];
	this.sendCount = 0;
	this.ircsock = new tls.TLSSocket(this.ircsock);
	if (config.authtype == 'certfp') {
		this.ircsock=tls.connect({host: config.host, port: config.port, cert: config.cert, key: config.certkey, rejectUnauthorized: !config.overrideCert});
	}
	this.ircsock.on('connect', function() {
		console.log('Connected to server!');
		bot.send(`PASS :${config.password}`);
        bot.send(`PROTOCTL EAUTH=${config.sname} SID=${config.sid}`);
		bot.send(`PROTOCTL :${bot.client.capab.join(" ")}`);
		bot.send(`SERVER ${config.sname} 1 :${config.sdesc}`);
	}).on('data', function(data) {
		var data = data.toString('utf-8');
		if (!data.endsWith('\n')) {
			bot.server.datapart = bot.server.datapart + data;
			return false;
		} else {
			data = (bot.server.datapart + data).replace(/(\r|\n)+$/,'');
			bot.server.datapart = '';
		}
		for (var line of data.split('\n')) {
			line = line.replace(/\r$/,'');
			bot.events.emit('data', line);
		}
	}).on('close', function() {
		console.log('[WARN] Connection closed.');
		bot.events.emit('connclosed');
	});
}
ircbot.prototype = {
	Command: require('./command'),
	PrivateMessageEvent: require('./pmevent'),
	addCmd(name,group,code,help,canExec,hidden) {
		this.cmds[name] = new this.Command(group,code,help,canExec);
		if (!hidden) {
			if (!this.cmdgroups[group]) {
				this.cmdgroups[group] = [];
			}
			if (this.cmdgroups[group].indexOf(name) == -1) {
				this.cmdgroups[group].push(name);
			}
		}
	},
	send(data) {
		this.ircsock.write(data + '\r\n');
		console.log('[SEND] ' + data);
	},
	_sendMsg(chan,src,msg) {
		this.send(`:${src} PRIVMSG ${chan} :${msg}`);
	},
	sendMsg(chan,msg,src,trunc) {
		src = src || this.config.botUser.uid;
		if (chan === undefined || msg === undefined) throw new Error("Channel/message are required");
		msg = msg.toString();
		if (msg.indexOf('\n')>-1) {
			msg.split('\n').forEach(line => this.sendMsg(chan,line,src,trunc));
			return;
		}
		if (msg == '') {msg = ' ';}
        // TODO: actually calculate length properly
		var maxlen = 449 - chan.length;
		if (msg.length > maxlen) {
			if (trunc) {
				this._sendMsg(chan,src,msg.slice(0,maxlen-21)+' \x02(message truncated)');
			} else {
				var chunk=msg.match(/.{1,430}/g);
				for (var i in chunk) this._sendMsg(chan,src,chunk[i]);
			}
		} else {
			this._sendMsg(chan,src,msg);
		}
		this.events.emit('msg');
	},
	mode(chan,mode,src) {
		src = src || this.config.sid;
		this.send(`:${src} MODE ${chan} ${mode}`);
	},
	skick(chan,nick,reason) {
		this.send(':'+this.config.sid+' KICK '+chan+' '+nick+' :'+reason);
	},
	kick(chan,nick,reason,src) {
        let user = this.getUser(nick);
        let channel = this.getChannel(chan);
        if (!user || !channel) return;
		src = src || this.config.botUser.uid;
		this.send(`:${src} KICK ${channel.name} ${user.uid} :${reason}`);
        this._handleChannelPart(channel, user);
	},
    _handleRemoveUser(user) {
        if (!user) return;
        let uid = user.uid;
        for (let c of user.channels) {
            let channel = this.getChannel(c);
            if (channel) channel.users.delete(uid);
        }
        this.server.clients.delete(uid);
        this.client.users.delete(uid); // may not exist
        this.server.clientsByNick.delete(user.nick.toLowerCase());
    },
	kill(name,reason,src) {
        let user = this.getUser(name);
        if (user.server === this.config.sname) return false;
        if (!user) return false;
        if (!reason || !reason.length) reason = 'Killed';
		src = src || this.config.botUser.uid;
		this.send(`:${src} KILL ${user.uid} :${reason}`);
		this._handleRemoveUser(user);
        return true;
	},
	sendNotice(chan,src,msg,ctcp) {
		src = src || this.config.bname;
		if (ctcp) {
			this.send(':'+src+' NOTICE '+chan+' :\x01'+msg+'\x01');
		} else {
			this.send(':'+src+' NOTICE '+chan+' :'+msg);
		}
	},
    whois: util.deprecate(function whois(nick, cb) {
        if (this.getUser(nick)) return cb(null, user.ident, user.host, user.realname, user.nick, user.uid);
        /*
		for (var i in this.server.clients) {
			if (this.server.clients[i].nick.toLowerCase() === nick.toLowerCase()) {
				var user = this.server.clients[i];
				cb(null, user.ident, user.host, this.realname, user.nick, i);
				return;
			}
		}
        */
		cb(new Error('User not found!'));
	}, 'bot.whois is deprecated in IoServ, use bot.getUser instead'),
	getUserByNick(nick) {
        let user = this.server.clientsByNick.get(nick.toLowerCase());
        return user || null;
        /*
		for (var i in this.server.clients) {
			if (this.server.clients[i].nick.toLowerCase() === nick.toLowerCase()) {
				var user = this.server.clients[i];
				return user;
			}
		}
        return null;
        */
	},
    getUser(nickOrUID) {
        if (!nickOrUID) throw new Error('argument cannot be undefined');
        if (typeof nickOrUID === 'object') return this.server.clients.get(nickOrUID.uid) || null;
        if (nickOrUID[0].match(/\d/)) return this.server.clients.get(nickOrUID) || null;
        else return this.getUserByNick(nickOrUID);
    },
    changeHost(nickOrUID, host) {
        if (host.match(/\s/)) throw new Error('invalid hostname');
        let user = this.getUser(nickOrUID);
        user.host = host;
        this.send(`:${this.config.sid} CHGHOST ${user.uid} :${host}`);
    },
    changeIdent(nickOrUID, ident) {
        if (ident.match(/s/)) throw new Error('invalid ident');
        let user = this.getUser(nickOrUID);
        user.ident = ident;
        this.send(`:${this.config.sid} CHGIDENT ${user.uid} ${user.ident}`);
    },
    getChannel(name) {
        return this.server.channels.get(name.toLowerCase()) || null;
    },
    // classes are hard. plus, this is old code
    _makeChannel(name, ts) {
        let c = {
            name,
            ts,
            users: new Map(),
            metadata: new Map(), // varname=>value channel metadata set by MD
            member_metadata: new Map(), // user=>varname=>value member metadata set by MD
            // TODO: modes when i get off my ass
        };
        this.server.channels.set(name.toLowerCase(), c);
        return c;
    },
    _handleChannelPart(channel, user) {
        if (!channel || !user) return;
        channel.users.delete(user.uid);
        if (!channel.users.size) this.server.channels.delete(channel.name.toLowerCase());
    },
    _handleNickChange(user, newNick, ts) {
        if (!user) return;
        this.server.clientsByNick.delete(user.nick.toLowerCase());
        user.nick = newNick;
        user.ts = ts;
        this.server.clientsByNick.set(user.nick.toLowerCase(), user);
    },
	makeUID() {
		let uid = (this.client.uid++%1e6).toString(16);
		return this.config.sid+"0".repeat(Math.abs(6-uid.length))+uid;
	},
	getTS() {
		return Math.floor(Date.now() / 1000);
	},
	// addUser(nick,ident,host,modes,realname) {
    addUser({
        nick,
        ident = this.config.sdesc,
        host = this.config.sname,
        modes = 'zi',
        realname = this.config.sdesc
    }) {
        if (!nick) throw new Error('nick is required');
        let prevUser = this.getUser(nick);
        if (prevUser) {
            if (prevUser.server === this.config.sname) throw new Error('duplicate nick');
            else this.kill(nick, 'y u steal ioserv nick :(', '042');
        }
		let uid = this.makeUID();
		let ts = this.getTS();
		this.send(`:${this.config.sid} UID ${nick} 0 ${ts} ${ident} ${host} ${uid} 0 +${modes} * * * :${realname}`);
		let client = {
			uid,
			nick,
			ident,
			host,
			realname,
			modes,
			ts,
			account: null,
                        channels: new Set(),
                        metadata: new Map(), // varname=>value metadata set by MD
                        metadata_membership: new Map(), // channel_varname=>value membership metadata set by MD
			server: this.config.sname
		};
        this.client.users.set(uid, client);
		this.server.clients.set(uid, client);
        this.server.clientsByNick.set(client.nick.toLowerCase(), client);
		return uid;
	},
	delUser(uid, reason) {
        let user = this.getUser(uid);
        if (!user) return;
		this.send(`:${user.uid} QUIT :${reason || 'Shutting down...'}`);
        this._handleRemoveUser(user);
	},
    changeNick(uidOrNick, newNick, force = false) {
        if (newNick.match(/\s/)) throw new Error('invalid nick');
        let user = this.getUser(uidOrNick);
        if (!user || user.server !== this.config.sname) throw new Error('nonlocal user');
        let collided = this.getUser(newNick);
        if (collided) {
            if (!force) throw new Error('nick collision');
            if (collided.server === this.config.sname) this.delUser(collided.uid);
            else this.kill(collided.uid, 'your nick has been stolen by IoServ!');
        }
        let ts = this.getTS();
        this.send(`:${user.uid} NICK ${newNick} ${ts}`);
        this._handleNickChange(user, newNick, ts);
    },
	join(uidOrNick,chan) {
        let user = this.getUser(uidOrNick);
        if (!user || user.server !== this.config.sname) return false;
        let channel = this.getChannel(chan);
        if (!channel) channel = this._makeChannel(chan, this.getTS());
        if (channel.users.has(user.uid)) return false;
        channel.users.set(user.uid, '');
        user.channels.add(channel.name);
		this.send(`:${this.config.sid} SJOIN ${channel.ts} ${channel.name} :${user.uid}`);
        return true;
	},
	part(uidOrNick,chan, reason = '') {
        let user = this.getUser(uidOrNick);
        if (!user || user.server !== this.config.sname) return;
        let channel = this.getChannel(chan);
		this.send(`:${user.uid} PART ${chan} :${reason}`);
        this._handleChannelPart(channel, user); 
	},
	nickdelay(user,time) {
		//this.send(`:${this.config.sid} ENCAP * NICKDELAY ${time} ${user}`);
	},
	_start() {
		if(this.config.authtype != 'certfp') {this.ircsock.connect({host: this.config.host, port: this.config.port});}
	},
	start() {
		this._start();
		this.init();
		return this;
	},
	init() {
		var bot = this;
		this.addCmd('echo','general',function(event) {event.reply(event.args.join(' '));},"Echoes something");
		this.addCmd('ping','general',"pong","Requests a pong from the bot");
		this.addCmd('pong','general',"Did you mean ping? Anyways ping","<AegisServer2> It's ping you moron.");
		this.addCmd('eval','general',function(event) {
			try {
				var result = eval(event.args.join(' '));
				util.inspect(result).split('\n').forEach(function(line) {event.sendBack(line);});
			} catch(e) {
				event.sendBack(e.name+': '+e.message);
			}
		},"(level 11) Runs javascript code in the bot",11);
		this.addCmd('flushq','general',function(event) {
			bot.sendMsgQueue.length = 0;
			event.reply("Send queue flushed");
		},"Flushes the send queue");
		this.addCmd('help','general',function(event) {
			if (event.args[0] != undefined) {
				if (bot.cmds[event.args[0]]) {
					event.reply(bot.cmds[event.args[0]].help);
				} else {
					event.reply("That command does not exist!");
				}
			} else {
				event.reply("Use 'help <command>'");
			}
		});
		this.addCmd('list','general',function(event) {
			if (event.args[0]) {
				if (bot.cmdgroups[event.args[0]]) {
					event.reply(bot.cmdgroups[event.args[0]].join(' '));
				} else {
					event.reply("No such group, use list");
				}
			} else {
				event.reply("Command groups (use list <group>): "+Object.keys(bot.cmdgroups).join(' '));
			}
		});

		this.events.on('data', function(line) {
			console.log('[RECV] '+line);
			var dsplit = line.split(' :');
			var head = dsplit[0];
			dsplit.splice(0,1);
			var msg = dsplit.join(' :');
			head = head.split(' ');
			msg = msg.split(' ');
			if (line.startsWith(':')) {
				var from = head[0].replace(/^:/,'');
				head.splice(0,1);
				bot.servmsg.emit(head[0],head,msg,from,line);
			} else {
				var from = false;
				bot.servmsg.emit(head[0],head,msg,from,line);
			}
		});

		this.servmsg.on('PING', function(head,msg,from) {
			bot.send(`:${msg[1] || bot.config.sname} PONG ${msg[1]} ${msg[0]}`);
		}).on('EOS', (head, msg, from) => {
            if (from !== bot.config.usid) return;
            bot.config.botUser.uid = bot.addUser(bot.config.botUser);
            bot.send(`:${bot.config.sid} EOS`);
			bot.events.emit('regdone');
		}).on('PRIVMSG', function(head,msg,from,raw) {
			var event = new bot.PrivateMessageEvent(bot,head,msg,from,raw);
            if (!event.valid) return;
			bot.privmsg.emit(event.chan,event);
			bot.events.emit('privmsg',event);
			if (event.type == 'ctcp') {
				if (bot.ctcp[event.cmd]) {
					bot.ctcp[event.cmd](event.args,event.chan,event.host); // use the old api for now
				}
			} else if (event.type == 'command') {
				if (bot.cmds[event.cmd]) {
					try {
						var res = bot.cmds[event.cmd].run(event);
						if (!res && ~res) {
							event.reply("You do not have permission to use this command.");
						}
					} catch(e) {
                        if (bot.getChannel(bot.config.logchannel)) {
						    bot.sendMsg(event.chan || bot.config.logchannel,"An error occured while processing your command: "+e);
						    bot.sendMsg(bot.config.logchannel,e.stack);
						    bot.sendMsg(bot.config.logchannel,'Caused by '+event.host[0]+'!'+event.host[1]+'@'+event.host[2]+' using command '+event.cmd+' with arguments ['+event.args.toString()+'] in channel '+event.chan);
					    }
                    }
				}
			}
		}).on('UID',function(head,msg,from,raw) {
			let client = {
                nick: head[1],
                ts: head[3],
                ident: head[4],
                host: head[5],
                uid: head[6],
                modes: head[8],
                vhost: head[9],
                chost: head[10],
                ip: head[11],
                realname: msg.join(' '),
                server: null,
                account: null,
                channels: new Set(),
                metadata: new Map(),
                metadata_membership: new Map(),
			};
            if (client.vhost === '*') client.vhost = null;
            if (client.chost === '*') client.chost = null;
            client.server = bot.server.servers.get(client.uid.slice(0, 3));
            bot.server.clients.set(client.uid, client);
            bot.server.clientsByNick.set(client.nick.toLowerCase(), client);
            bot.events.emit('newUser', client);
		}).on('SID', function(head,msg,from) {
			bot.server.servers.set(head[3], head[1]);
		}).on('CHGHOST',function(head,msg,from,raw) {
            // is this used in unreal? yes
			var parts = raw.split(" ");
            let user = bot.getUser(parts[2]);
			if (user) user.vhost = parts[3]; // user.vhost?
		}).on('CHGIDENT', (head, msg, from) => {
            let newIdent = head[2];
            let user = bot.getUser(head[1]);
            if (user) user.ident = newIdent;
        }).on('SJOIN', (head, msg, from) => {
            let ts = +head[1];
            let name = head[2];
            let modes = head[3];
            let usersList = msg.filter(Boolean).filter(a => !a.match(/^[&"']/)).map(a => a.replace(/^[~&@%\+\*]+/, ''));

            let channel = bot.getChannel(name);
            if (!channel) channel = bot._makeChannel(name, ts);
            else channel.ts = Math.min(channel.ts, ts);

            for (let user of usersList) {
                channel.users.set(user, '');
                bot.getUser(user).channels.add(channel.name);
            }
        }).on('PART', (head, msg, from) => {
            let user = bot.getUser(from);
            let channel = bot.getChannel(head[1]);
            bot._handleChannelPart(channel, user);
        }).on('MD', (head, msg, from) => {
            let type = head[1];
            switch (type) {
                case 'client': {
                    let user = bot.getUser(head[2]);
                    if (!user) return;
                    user.metadata.set(head[3], msg);
                    break;
                }
                case 'channel': {
                    let channel = bot.getChannel(head[2]);
                    if (!channel) return;
                    user.metadata.set(head[3], msg);
                    break;
                }
                case 'member': {
                    let channel = bot.getChannel(head[2]);
                    if (!channel) return;
                    if (!channel.member_metadata.has(head[3])) channel.member_metadata.set(head[3], new Map());
                    channel.metadata_membership.get(head[3]).set(head[4], msg);
                    break;
                }
                case 'membership': {
                    let user = bot.getUser(head[2]);
                    if (!user) return;
                    if (!user.metadata_membership.has(head[3])) user.metadata_membership.set(head[3], new Map());
                    user.metadata_membership.get(head[3]).set(head[4], msg);
                    break;
                }
            }
        }).on("MOTD",function(head,msg,from){
			let motd = bot.config.motd.split("\n");
			for(let line of motd) {
				bot.send(`372 ${from} :${line}`);
			}
		}).on('KICK',function(head,msg,from) {
            let user = bot.getUser(head[2]);
            let channel = bot.getChannel(head[1]);
            if (!user || !channel) return;
            bot._handleChannelPart(channel, user);
			if (user.server === bot.config.sname) setImmediate(() => bot.join(user.uid, channel.name));
		}).on('NICK',function(head,msg,from,raw) {
            let user = bot.getUser(from);
            let newNick = head[1];
            let ts = +msg[0];
            bot._handleNickChange(user, newNick, ts);
		}).on('QUIT',function(head,msg,from,raw) {
            let user = bot.getUser(from);
            if (user) bot._handleRemoveUser(user);
		}).on('KILL',function(head,msg,from,raw) {
            let user = bot.getUser(head[1]);
            if (!user) return;
			if (user.server === bot.config.sname) {
                let channels = [...user.channels];
				queueMicrotask(() => {
                    let newuid = bot.addUser(user);
                    if (user.uid === bot.config.botUser.uid) bot.config.botUser.uid = newuid;
                    for (let channel of channels) bot.join(newuid, channel);
                });
			}
            bot._handleRemoveUser(user);
		});
	}
}

module.exports = ircbot;
