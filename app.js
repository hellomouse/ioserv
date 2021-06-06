#!/usr/bin/env node
// Initializes ircbot
const ircbot = require('./ircbot');
const readline = require('readline');
const fs = require('fs');
const cluster = require('cluster');

function loadModules(xbot, reload, config, noload) {
	console.log('[INFO] Loading modules...');
	if (!noload) noload = {};
	if (reload) {
		xbot.privmsg.removeAllListeners();
		xbot.servmsg.removeAllListeners();
		xbot.events.removeAllListeners();
		xbot.encapmsg.removeAllListeners();
		xbot.userEvent.removeAllListeners();
		xbot.cmds = Object.create(null);
	    xbot.cmdgroups = Object.create(null);
		xbot.init();
		xbot.events.on('connclosed',_=>{process.exit(1);});
	}
	xbot.events.on('reload', () => loadModules(xbot,true,config,noload));
	fs.readdirSync('modules').forEach(function(file) {
		if(fs.lstatSync('./modules/'+file).isFile() && file.endsWith('.js') && !(file in noload)) {
			if (reload) {	
				console.log('[DEBUG] Deleting cache for file '+file);
				delete require.cache[require.resolve('./modules/'+file)];
			}
			config.modules[file] = require('./modules/'+file)(xbot,config,0);
			console.log('[INFO] Loaded module '+file);
		}
	});
	xbot.events.on('fork', () => process.send('fork'));
}

if (cluster.isMaster) {
    console.log('[NOTICE] Starting cluster...');
    cluster.fork().on('message', m => {
        switch(m) {
            case 'fork': cluster.fork();
        }
    });
    cluster.on('exit', (worker, code) => {
        if (code === 10) { // quit command given
            console.log('[NOTICE] Graceful exit from worker');
        } else if (code === 11) { // restart command given
            console.log('[NOTICE] Restart requested from worker');
            setTimeout(() => cluster.fork(), 1000);
        } else { // something went wrong?
            console.log('[WARN] Worker unexpectedly exited, restarting...');
            setTimeout(() => cluster.fork(), 5000);
        }
    });
} else if (cluster.isWorker) {
    console.log('[INFO] Started as worker');
    let sigintCount = 0;
    const SIGINT_EXIT_COUNT = 2;
    var consoleinterface = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'repl> '
    }).on('line', function(line) {
        // reset sigint count
        sigintCount = 0;

		var result;
        try {
            result = eval(line);
        } catch (e) {
            result = e;
        }
        console.log(result);
        consoleinterface.prompt();
    }).on('SIGINT', function() {
        if (++sigintCount >= SIGINT_EXIT_COUNT) {
            console.log('Exiting (SIGINT)');
            process.exit(10);
        } else {
            // this is probably stupid - iczero, 2021
            console.log(`Press ^C ${SIGINT_EXIT_COUNT - sigintCount} more times to quit`);
        }
        //process.emit('SIGINT');
        //console.log('Closing connection. Use Ctrl-D to exit');
    });

    var config = require('./config.js');
    var bot = new ircbot(config);
    config.modules = {};
    

    loadModules(bot, false, config);
    bot.start();
    bot.events.on('connclosed', () => setTimeout(() => process.exit(11), 3000));
    bot.events.on('regdone', _=>{
      // handled in config as botUser
      bot.join(bot.config.botUser.uid,"#services");
      bot.mode('#services', '+o ' + bot.config.botUser.nick);
      bot.join(bot.config.botUser.uid, "#hellomouse");
      bot.join(bot.config.botUser.uid, '#pissnet');
      bot.mode('#pissnet', '+o ' + bot.config.botUser.nick);
      bot.join(bot.config.botUser.uid, '#opers');
      bot.mode('#opers', '+o ' + bot.config.botUser.nick);
      let lolserv = bot.addUser({ nick: "LolServ", ident: "LolServ", host: "ioserv.hellomouse.net", modes: "Szi", realname: "Laughing Services" });
      bot.join(lolserv,"#services",true);
      let undefinedserv = bot.addUser({ nick: 'undefined', ident: 'undefined', host: 'undefined', modes: 'zi', realname: 'undefined' }); // YAY
      bot.join(undefinedserv,"#services",true);
    });
}
