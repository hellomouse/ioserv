const nullbox = require('nullbox');
const minimist = require('minimist');
const request = require('request');
const cgi = require("./cgi/cgi.js");
const elements = require("./cgi/elements.js");
const QRCode = require("qrcode");
const dns = require("dns");

var color = String.fromCharCode(3);
var block = String.fromCharCode(0x2592);
var NIL = 0;
var RED = [4, 4];
var YEL = [8, 8];
var GRE = [0, 0];
var alp = Object.create(null);
var NO_POKE = ['iovoid', 'iczero', 'wlp1s1', 'RangeError'];
var NO_POKEBACK = ['AegisCommand'];
var nullcmdreplies = ['...', 'ohai $nick', 'lol', "That isn't a command...", 'y u highlight', 'Yes?', 'plz no ban--oh wait i can\'t be banned >:D', 'n00b',
    'ehlo $nick', 'Kernel panic - not syncing: Attempted to kill init!', '\x01ACTION pokes $nick\x01', '# killall -SIGSEGV init & killall -SIGILL init',
    'Segmentation fault', 'I am not a supybot you derp', 'You are a derp', 'You have been derped', "Didn't you know about circles with negative radius? They can be seen in the shape of the virus that infects fool's brains.", 'String.fromCharCode(2)+("m"+"o".repeat(60)).split("").map(x=>String.fromCharCode(3)+Math.floor(Math.random()*16)+(x)["to"+["Upper","Lower"][Math.floor(Math.random()*2)]+"Case"]()).join("")',
    String.fromCharCode(2) + ("m" + "o".repeat(60)).split("").map(x => String.fromCharCode(3) + Math.floor(Math.random() * 16) + (x)["to" + ["Upper", "Lower"][Math.floor(Math.random() * 2)] + "Case"]()).join("")
]


function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick(list) {
    return list[randInt(0, list.length - 1)];
}

function s(a, b) {
    return String.fromCharCode(Number("0x25" + a.toString() + b).toString())
}

function j(a) {
    return a.map(b => {
        return b.map(c => c.join("")).join("")
    })
}
var lineChars = Object.create(null);
lineChars.makeChar = (code) => String.fromCharCode(Number("0x25" + code));
lineChars.vert = lineChars.makeChar("51");
lineChars.horz = lineChars.makeChar("50");
lineChars.downRight = lineChars.makeChar("54");
lineChars.downLeft = lineChars.makeChar("57");
lineChars.upRight = lineChars.makeChar("5A");
lineChars.upLeft = lineChars.makeChar("5D");
lineChars.TRight = lineChars.makeChar("60");
lineChars.TLeft = lineChars.makeChar("63");
lineChars.TDown = lineChars.makeChar("66");
lineChars.TUp = lineChars.makeChar("69");
lineChars.cross = lineChars.makeChar("6C");
lineChars.codeCharMap = [
    ' ', lineChars.horz, lineChars.vert, lineChars.upRight,
    lineChars.horz, lineChars.horz, lineChars.upLeft, lineChars.TUp,
    lineChars.vert, lineChars.downRight, lineChars.vert, lineChars.TRight,
    lineChars.downLeft, lineChars.TDown, lineChars.TLeft, lineChars.cross
];
lineChars.bmpToArr = (bmp) => {
    const filled = (i, j) => i >= 0 && i < bmp.length && j >= 0 && j < bmp[0].length && bmp[i][j] == '#';
    const filledAsInt = (i, j) => filled(i, j) ? 1 : 0;
    const filledCode = (i, j) => {
        let res = 0;
        res += filledAsInt(i, j + 1) << 0;
        res += filledAsInt(i - 1, j) << 1;
        res += filledAsInt(i, j - 1) << 2;
        res += filledAsInt(i + 1, j) << 3;
        return res;
    };
    const arr = Array(parseInt(bmp.length / 2) + 1).fill("");
    for (let i = 0; i < bmp.length; i += 2) {
        let row = "";
        for (let j = 0; j < bmp[0].length; j += 2) {
            if (bmp[i][j] == " ") row += " ";
            else row += lineChars.codeCharMap[filledCode(i, j)];
        }
        arr[i / 2] = row;
    }
    console.log(arr);
    return arr;
};
alp.A = lineChars.bmpToArr([
    "#####",
    "#   #",
    "#####",
    "#   #",
    "#   #"
]);
alp.B = lineChars.bmpToArr([
    "#### ",
    "#  # ",
    "#####",
    "#   #",
    "#####"
]);
alp.L = lineChars.bmpToArr([
    "#    ",
    "#    ",
    "#    ",
    "#    ",
    "#####"
]);
alp.M = lineChars.bmpToArr([
    "#####",
    "# # #",
    "# # #",
    "# # #",
    "# # #"
]);
alp.O = lineChars.bmpToArr([
    "#####",
    "#   #",
    "#   #",
    "#   #",
    "#####"
]);
alp[" "] = lineChars.bmpToArr([
    "     ",
    "     ",
    "     ",
    "     ",
    "     "
]);

function bigtextify(str) {
    const strs = str.split("").map(x => (alp[x] ? alp[x] : alp[" "]));
    let res = "";
    const numrows = 3;
    for (let i = 0; i < numrows; i++) res += strs.map(x => x[i]).join(" ") + ((i < numrows - 1) ? "\n" : "");
    return res;
}
var arts = Object.create(null);
arts.ironman = [
    [NIL, NIL, NIL, NIL, NIL, RED, RED, RED, RED, RED, NIL, NIL, NIL, NIL, NIL, NIL, NIL],
    [NIL, NIL, NIL, NIL, RED, YEL, RED, RED, RED, YEL, RED, NIL, NIL, NIL, NIL, NIL, NIL],
    [NIL, NIL, NIL, NIL, RED, YEL, YEL, RED, YEL, YEL, RED, NIL, NIL, NIL, NIL, NIL, NIL],
    [NIL, NIL, NIL, NIL, RED, YEL, NIL, YEL, NIL, YEL, RED, NIL, NIL, NIL, NIL, NIL, NIL],
    [NIL, NIL, NIL, NIL, RED, YEL, YEL, YEL, YEL, YEL, RED, NIL, NIL, NIL, NIL, NIL, NIL],
    [NIL, NIL, NIL, NIL, NIL, YEL, GRE, GRE, GRE, YEL, NIL, NIL, NIL, NIL, NIL, NIL, NIL],
    [NIL, NIL, NIL, RED, YEL, RED, RED, RED, RED, RED, YEL, RED, NIL, NIL, NIL, NIL, NIL],
    [NIL, NIL, NIL, RED, YEL, RED, RED, NIL, RED, RED, YEL, RED, NIL, NIL, NIL, NIL, NIL],
    [NIL, NIL, NIL, NIL, NIL, RED, RED, RED, RED, RED, NIL, NIL, NIL, NIL, NIL, NIL, NIL],
    [NIL, NIL, NIL, NIL, NIL, YEL, YEL, YEL, YEL, YEL, NIL, NIL, NIL, NIL, NIL, NIL, NIL],
    [NIL, NIL, NIL, NIL, NIL, RED, RED, NIL, RED, RED, NIL, NIL, NIL, NIL, NIL, NIL, NIL]
];
var SHADES = Array(16).fill([]);
for (var i in SHADES) {
    SHADES[i] = Array(16).fill([]);
    for (var z in SHADES[i]) {
        SHADES[i][z] = [i, z];
    }
}

function s2a(s, c, c2) {
    return s.split("\n").map(q => q.split("").map(f => (f == "#") ? c : ((f == "!") ? c2 : NIL)))
}
arts.lol = s2a(`
#    ####  #
#    # !#  #
###  ####  ###
`, RED, YEL);
arts.shades = SHADES;

function drawThing(toDraw) {
    var out = "";
    for (var y = 0; y < 17; y++) {
        if (toDraw[y]) {
            for (var x = 0; x < 17; x++) {
                if (toDraw[y][x]) {
                    out += color + toDraw[y][x][0] + "," + toDraw[y][x][1] + block;
                }
                else out += color + " ";
            }
            out += '\n';
        }
    }
    return out.slice(0, out.length - 2);
}
const POKE_NICK = "ioserv";
var POKE_REGEX = new RegExp('^pokes ' + POKE_NICK, 'i');
module.exports = function(bot, config) {
    bot.addCmd('colorart', 'fun', event => {
        if (arts[event.args[0]]) event.sendBack(drawThing(arts[event.args[0].toLowerCase()]));
        else event.reply('No such art!');
    }, '(level 1) Draw art!', 0);
    bot.addCmd('bigtext', 'fun', event => {
        event.sendBack(bigtextify(event.args.join(" ")));
    }, '(level 1) Unicode figlet!', 0);
    bot.addCmd('spoiler', 'fun', event => {
        event.sendBack(color + "35,35" + event.args.join(" "));
    }, '(level 1) Hide text using fancy IRC colors', 0);
    bot.addCmd('undefined', 'fun', event => {
        event.replyas="undefined";
        event.sendBack("undefined");
    }, 'undefined', 0);
    bot.addCmd('belong', 'fun', event => {
        if (!event.args[0]) return event.reply('Usage: belong <object> [. <entity>]');
        var args = event.args.join(' ').toUpperCase().split(' . ');
        if (!args[1]) args[1] = 'US';
        event.sendBack(`ALL YOUR ${args[0]} ARE BELONG TO ${args[1]}`);
    });
    // stolen shamelessly from IoServ/IovoidBot
    bot.addCmd('annoy', 'fun', function annoy(event) {
        var ntt = (event.args[0] || event.host[0]) + " ";
        if (ntt.length > 20) return;
        ntt = ntt + ntt + ntt + ntt + ntt + ntt + ntt + ntt;
        ntt = ntt + ntt + ntt + ntt + ntt + ntt + ntt + ntt;
        event.sendBack(ntt);
    }, 'Stolen from IovoidBot/IoServ: annoys people');
    var mathprop = Object.getOwnPropertyNames(Math);
    for (var i in mathprop) global[mathprop[i]] = Math[mathprop[i]];
    bot.addCmd('graph', 'fun', event => {
        let stime = process.hrtime();
        var arg = event.args.join(" ").split("#");
        var xs = Number(arg[3])||40;
        var ys = Number(arg[4])||11;
        var res = arg[1]||1;
        var mult = arg[2]||1;
        var graph = Array(ys*2).fill(0).slice(1);
        var ft = arg[0];
        var color = xs*3 < 400;
        
        let f = new Function('x', `return (${ft.replace(';',',')});`); // yay optimize
        //var f = x => Math.round(require("mathjs").compile(ft).eval({x:x,reval:eval,event:event})*mult);
        for (let i in graph) graph[i] = Array(xs*2).fill(arg[6]||" ");
        for (let y = 0;y < ys*2-1; y++) graph[y][xs] = String.fromCharCode(0x3,0x2502);
        for (let x = 0;x < xs*2; x++) graph[ys-1][x] = String.fromCharCode(0x3,0x2500);
        graph[ys-1][xs] = String.fromCharCode(0x3,0x253C);
        let vals = [0,[],0];
        let x = -xs;
        let its = 0;
        function vala (r){
            if(!r) return;
            if(r < vals[0]) vals[0] = r;
            if(r > vals[2]) vals[2] = r;
            vals[1].push(r);
        }
        function* xit () {
            while(x <= xs) {
                its++;
                let fr;
                try {
                    fr = f((-x-1)*res);
                } catch(e) {fr = NaN; }
        	    if(!(fr instanceof Array)) fr = [fr];
        	    x++;
        		yield fr.map((r,i) => {
        		    r = Math.round(r*mult);
        		    vala(r);
        		    if (Math.abs(r) < ys) graph[ys-r-1][xs-x] = String.fromCharCode(3)+(2+i*2%13).toString()+(arg[5] || String.fromCharCode(0x2022))+String.fromCharCode(3);
        		});
    	    }
        }
        let xi = xit();
        function iox (){
            let xo = xi.next();
            if(xo.done) {
                let o = graph.map(a=>a.join(""));
                let avg = 0;
                vals[1].forEach(a=>{
                   avg += a;
                });
                avg /= vals[1].length;
                let _d = process.hrtime(stime);
                let d = _d[0] * 1e9 + _d[1];

                o.forEach(a=> event.sendBack(a.toString()));
                event.sendBack(`Done in ${d}ns, with ${its} iterations. Output contains ${o.join("\n").length} chars. Min ${vals[0]} Max ${vals[2]} Avg ${avg}`);
            } else process.nextTick(iox);
        }
        process.nextTick(iox);
    }, '(level 11) Graph. x is variable. Format: formula#xscale#yscale#xsize#ysize#char', 11);
    bot.addCmd('poke', 'fun', event => {
        event.replyas = "LolServ";
        var toPoke = event.args.join(' ').replace(/[^\x20-\x7F]/g, '');
        if (toPoke === '') toPoke = event.host[0] + ' for not knowing how to use the poke command';
        var lowerPoke = toPoke.toLowerCase();
        if (~lowerPoke.indexOf(POKE_NICK)) toPoke = `${event.host[0]} for expecting ${POKE_NICK} to poke itself`;
        for (let i of NO_POKE) {
            // allow poking of self (lol)
            if (i === event.host[0]) break;
            if (~lowerPoke.indexOf(i)) toPoke = `${event.host[0]} for trying to poke ${i}`;
        }
        event.emote('pokes ' + toPoke);
    }, 'Poke somebody!');
    bot.addCmd('defenestrate', 'fun', event => {
        event.replyas = 'LolServ';
        event.emote('throws \x02' + event.args[0] + '\x02 out of a window');
    }, 'Defenestrate somebody');
    bot.events.on('privmsg', event => {
        if (event.type === 'ctcp' && event.cmd === 'action' && event.args.length >= 2 && event.args.join(' ').match(POKE_REGEX)) {
            if (NO_POKEBACK.includes(event.host[0])) return;
            event.replyas = "LolServ";
            event.emote('pokes ' + event.host[0] + ' back');
        }
    });
    /*
    bot.addCmd('js', 'fun', event => {
        var script = event.args.join(' ');
        nullbox.execute(script).then((res)=>{
            event.sendBack(res.replace(/(\r\n|\r|\n)/g, " | "));
        });
    });
    */


    function tf(bool) {
        return bool ? "YES" : "NO";
    }
    let mods = function(o) {
        let orig = (o.origin || ord);
        if (orig.modId == 0) return "Official";
        if (o["Jacob1's_Mod"]) return "Jacob1's Mod";
        return "Probably Official";
    };
    let ord = {
        majorVersion: "old",
        minorVersion: "old",
        modId: undefined
    };

    function bin2int(n) {
        let n1 = (n & 0xff000000) >> 24;
        let v = 0;
        if (n1 >= 0) {
            v = n1
        }
        else {
            v = 256 + n1;
        }
        return v.toString(16).padStart(2, 0) + (n & 0xffffff).toString(16).padStart(6, 0);
    }
    let ircColors = {
        0: "D3D7CF",
        1: "2E3436",
        2: "3465A4",
        3: "4E9A06",
        4: "CC0000",
        5: "8F3902",
        6: "5C3566",
        7: "CE5C00",
        8: "C4A000",
        9: "73D216",
        10: "11A879",
        11: "58A19D",
        12: "57799E",
        13: "A04365",
        14: "555753",
        15: "888A85"
    };

    function gc(c) {
        let min = [443, 7]
        c = c.match(/.{1,2}/g).map(a => parseInt(a, 16));
        for (let i = 0; i < 16; i++) {
            let val = Math.sqrt(ircColors[i].match(/.{1,2}/g).map((a, d) => (parseInt(a, 16) - c[d]) ** 2).reduce((a, b) => a + b));
            if (val < min[0]) {
                min[0] = val;
                min[1] = i;
            }
        }
        return min[1];
    }
    bot.addCmd('saveinfo', 'fun', event => {
        if(event.args.length == 0) event.reply("Usage: saveinfo [--render] [--deco] <saveid>");
        const args = minimist(event.args, {
            alias: {
                'render': 'r',
                'deco': 'd'
            },
            defaults: {
                'render': false,
                'deco': true
            },
            boolean: ['render', 'deco']
        });
        const id = args._[0];
        const saveURL = `http://static.powdertoy.co.uk/${id}.cps`;
        request({
            url: saveURL,
            encoding: null
        }, function(err, response, body) {
            if (err) return event.reply('Save fetch failure\n' + err.stack);
            if (response.statusCode !== 200) return event.reply(`Save does not exist (got status code ${response.statusCode})`);
            try {
                const saveInfo = cgi.parseOPS(body);
                let usedParticles = {};
                let usedParticlesText = [];
                let temp = {
                    minTemp: 10000,
                    maxTemp: 0,
                    avgTemp: 0
                };
                let colored = 0;
                let saveGuess = {
                    bomb: 0,
                    art: 0,
                    city: 0,
                    elec: 0,
                    misc: 0
                };
                let usedColors = 0;
                var render = Array(32).fill(0);
                for (let i in render) render[i] = Array(64).fill(" ");
                let colors = {};
                for (let i in saveInfo.particles) {
                    let particle = saveInfo.particles[i];
                    if (particle.temp > temp.maxTemp) temp.maxTemp = particle.temp;
                    if (particle.temp < temp.minTemp) temp.minTemp = particle.temp;
                    temp.avgTemp += particle.temp;
                    if (args.render) {
                        if ((particle.y % 13 + particle.x % 9) == 0) {
                            render[(particle.y / 13) | 0][(particle.x / 9) | 0] = `\u0003${gc((particle.dcolour&&args.deco)?bin2int(particle.dcolour).substring(2,8):elements[particle.type].color)}${String.fromCharCode(0x2588)}`;
                        }
                    }
                    if (particle.dcolour) {
                        colored++;
                        let hc = bin2int(particle.dcolour);
                        if (!colors[hc]) usedColors++;
                        colors[hc] = (colors[hc] || 0) + 1;
                    }
                    switch (elements[particle.type].name) {
                        case "BCLN":
                            saveGuess.bomb++; break;
                        case "SING":
                            saveGuess.bomb++; break;
                        case "VIBR":
                            saveGuess.bomb++; break;
                        case "PBCN":
                            saveGuess.bomb++; break;
                        case "BOMB":
                            saveGuess.bomb++; break;
                        case "DEST":
                            saveGuess.bomb++; break;
                        case "LIGH":
                            saveGuess.bomb++; break;
                        case "DEUT":
                            saveGuess.bomb++; break;
                        case "C4":
                            saveGuess.bomb++; break;
                        case "TNT":
                            saveGuess.bomb++; break;
                        case "LCRY":
                            saveGuess.art++; break;
                        case "DMND":
                            saveGuess.art++; break;
                        case "WOOD":
                            saveGuess.art++;
                            saveGuess.city++;
                            break;
                        case "PQRT":
                            saveGuess.city++; break;
                        case "QRTZ":
                            saveGuess.city++; break;
                        case "CNCT":
                            saveGuess.city++; break;
                        case "STNE":
                            saveGuess.city++; break;
                        case "BRCK":
                            saveGuess.city++; break;
                        case "BRMT":
                            saveGuess.city++; break;
                        case "GLAS":
                            saveGuess.city++; break;
                        case "BGLA":
                            saveGuess.city++; break;
                        case "FILT":
                            saveGuess.elec++; break; // subframe shit uses filt a lot
                        case "INWR":
                            saveGuess.elec++; break;
                        case "DRAY":
                            saveGuess.elec++; break;
                        case "CRAY":
                            saveGuess.elec++; break;
                        case "ARAY":
                            saveGuess.elec++; break;
                        case "SWCH":
                            saveGuess.elec++; break;
                        case "CONV":
                            saveGuess.elec++; break;
                        default:
                            saveGuess.misc++; break;
                    }
                    usedParticles[elements[particle.type].name] = (usedParticles[elements[particle.type].name] || 0) + 1;
                }
                temp.avgTemp /= saveInfo.particles.length;
                colored /= saveInfo.particles.length / 100;
                if (colored > 50) saveGuess.art += ((saveGuess.art + 100) * 1.6) | 0;
                for (let i in usedParticles) {
                    usedParticlesText.push(`${i}: ${usedParticles[i]}`);
                }
                event.sendBack(`Report for ID:${id}
          Number of particles: ${saveInfo.particles.length}
          Signs: ${saveInfo.signs.map(a=>a.text).join(" | ")}
          Used particles: ${usedParticlesText.join(" | ")}
          Colored %${colored.toFixed(2)} Used colors ${usedColors} ${/*Object.getOwnPropertyNames(colors).join(" | ")*/0}
          Type of save score: BOMB: ${saveGuess.bomb} ART: ${saveGuess.art} CITY: ${saveGuess.city} ELECTRONICS: ${saveGuess.elec} MISC: ${saveGuess.misc}
          Temp: MIN: ${(temp.minTemp-273.15).toFixed(2)} MAX: ${(temp.maxTemp-273.15).toFixed(2)} AVG: ${(temp.avgTemp-273.15).toFixed(2)}
          WaterEQ: ${tf(saveInfo.props.waterEEnabled)} AHeat: ${tf(saveInfo.props.aheat_enable)} Paused: ${tf(saveInfo.props.paused)} Gravity: ${tf(saveInfo.props.gravityEnable)} 
          Save made with TPT version ${(saveInfo.props.origin||ord).majorVersion}.${(saveInfo.props.origin||ord).minorVersion} (${mods(saveInfo.props)}) Platform ${(saveInfo.props.origin||ord).platform}`);
                if (args.render) {
                    render.map(a => {
                        let val = a.join("");
                        if (val.length > 0) event.sendBack(val);
                    })
                }

            }
            catch (e) {
                event.reply(require("util").inspect(e))
            }
        });
    });
    bot.addCmd('', 'fun', event => {
        event.sendBack(randomPick(nullcmdreplies).replace('$nick', event.host[0]));
    });
    bot.addCmd('troll', 'fun', event => {
        if (!event.args[0]) event.args[0] = event.host[0]; // lol
        bot.nickdelay(event.args[0], 1e5);
        bot.whois(event.args[0], (err, ident, whost, realname, ccnick, eid) => {
            if (err) {
                event.reply('No such nick');
                return;
            }
            bot.kill(eid, `${bot.config.shost}!${bot.config.bhost}!${bot.config.bname}!${bot.config.bname} (${event.args.slice(1).join(' ')})`);
            // bot.server.clientsByNick.delete(event.args[0]); // Sorry iczero for the dirty hack // no longer necessary - iczero
            bot.addUser({ nick: event.args[0], ident: "troll", host: "trolled.hellomouse.net", modes: "i", realname: "lol" });
            bot.join(event.args[0],"#services",true);
            bot.join(event.args[0],"#pissnet",true);
        });
    }, 'lol rip', 11);
/* REMOVED for killing the network
    bot.addCmd('megatroll', 'fun', event => {
        if (!event.args[1]) event.args = [event.host[0], event.args[0]]; // for being dumb
        if (!(+event.args[1] >= 1)) return event.reply("Invalid usage.");
        for (let i = 0; i < +event.args[1]; i++) {
  setInterval(i=>{
            bot.send(`SVSJOIN ${event.args[0]} #trollchan-${i}`);
            bot.send(`SVSPART ${event.args[0]} #trollchan-${i} :RIP your client`);
        }, i*10, i);}
    }, 'lol superrip', 11);
*/
    bot.addCmd('adduser', 'fun', event => {
        if (!event.args[0]) return event.reply("No user.")
        bot.addUser({ nick: event.args[0], ident: event.args[0], host: event.args[0]+".hellomouse.net", modes: "i",  realname: event.args[0]+" Services" });
    }, 'SaaS: Services as a Service!', 11);
    bot.addCmd('deluser', 'fun', event => {
        if (!event.args[0]) return event.reply("No user.")
        bot.delUser(event.args[0]);
    }, 'SaaS: Services as a Service!', 11);
    bot.addCmd('qr', 'fun', event => {
        QRCode.toString(event.args.join(" "), function (err, string) {
          if (err) throw err;
          string = string.split("\n");
          string.splice(-2);
          event.sendBack(string.map(a=>a.substr(4)).slice(2).join("\n"));
        });
    }, ':D QR codes in IRC', 10);
    bot.addCmd("killme", "fun", event => {
        bot.kill(event.rhost.uid, event.args.join(' ') || 'You have been killed!');
    }, "Nothing bad...");
    let funStuff = ["lol","lel","lal","kek","lul","lmao","lmfao","!lottery"];
    bot.events.on('privmsg', event => {
        let msg = event.args.map(a=>a.toLowerCase());
        for(let fun of funStuff){
            if(msg.includes(fun)) {
                event.replyas = 'LolServ';
                // event.sendBack(fun);
            }
        }
    });
/*
    bot.addCmd("addserver", "fun", event => {
        bot.send("SQUIT 00C");
        bot.send("SID "+event.args[0]+" 2 00C :TestServer");
        bot.send(`:0C9 ENCAP * GCAP :QS EX IE KLN UNKLN ENCAP TB SERVICES EUID EOPMOD MLOCK`);
    }, "Adds a server", 11);
    bot.addCmd("ssid", "fun", event => {
        let osid = bot.config.sid;
        bot.config.sid = event.args[0];
        var cmd = event.args[1];
        if (bot.cmds[cmd]) {
            event.args.splice(0, 2);
            bot.cmds[cmd].run(event);
        }
        bot.config.sid = osid;
    }, "Change SID and run a command. HIGHLY DANGEROUS.", 11);
*/
    bot.addCmd("ddos", "fun", event => {
        let type = (event.args[1] == "-6") ? "resolve6": "resolve";
        dns[type](event.args[0], (e, r) => {
            if(e) return event.reply("ERROR");
            if(!r[0]) return event.reply("UR HOST IS NOT VALID!!1");
            if(r[0].split(".")[0] == "127" || r[0] == "::1") return event.reply("I U THINK I AM A FOOL??!");
            event.reply(`Starting a DDoS attack, with ${r[0]} as target`);
            for(let i = 0; i < 10; i++) {
                setTimeout(_ => {
                    event.sendBack("Request hit server.");
                }, 1000 * i * Math.random());
            }
            setTimeout(_ => {
                event.sendBack("Target down.");
            }, 10000)
        })
    }, "DDoS n1gger t4rgetz0rz", 10);
    return {
        arts
    };
}

