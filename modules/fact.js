"use strict";
const url = require('url');
const http = require('http');
const https = require('https');
const Entities = require('html-entities').AllHtmlEntities;
const cheerio = require('cheerio');
const prettysize = require('prettysize');
let entities = new Entities();

const phpShitUrls = [
    'https://eev.ee/blog/2012/04/09/php-a-fractal-of-bad-design/',
    'http://edorian.github.io/2013-10-19-Please-stop-pretending-PHP-is-a-good-language/',
    'https://adambard.com/blog/you-write-php-because-you-dont-know-better/',
    'https://blog.codinghorror.com/the-php-singularity/',
    'https://whydoesitsuck.com/why-does-php-suck/'
];

const chanwhitelist = ['##lazy-valoran', '##freetutorial'];
const nickblacklist = ['relayer', 'AegisCommand', 'GusBot3', 'Eleos', 'bannon3001'];
// no more ReDoS yay
// const urlRegex = /(?:(?:https?):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?/i;
const urlRegex = /(?:(?:https?:)?\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:1\d\d|2[0-4]\d|25[0-4]|[1-9]\d?)))|\[(?:(?:[\da-f]{1,4}:){7,7}[\da-f]{1,4}|(?:[\da-f]{1,4}:){1,4}:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:1\d\d|2[0-4]\d|25[0-4]|[1-9]\d?)))|::(?:ffff(?::0{1,4}){0,1}:){0,1}(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:1\d\d|2[0-4]\d|25[0-4]|[1-9]\d?)))|[\da-f]{1,4}:(?:(?::[\da-f]{1,4}){1,6})|(?:[\da-f]{1,4}:){1,2}(?::[\da-f]{1,4}){1,5}|(?:[\da-f]{1,4}:){1,3}(?::[\da-f]{1,4}){1,4}|(?:[\da-f]{1,4}:){1,4}(?::[\da-f]{1,4}){1,3}|(?:[\da-f]{1,4}:){1,5}(?::[\da-f]{1,4}){1,2}|(?:[\da-f]{1,4}:){1,6}:[\da-f]{1,4}|(?:[\da-f]{1,4}:){1,7}:|:(?:(?::[\da-f]{1,4}){1,7}|:))\]|(?:(?:[a-z0-9\u00a1-\uffff][a-z0-9\u00a1-\uffff_-]{0,62})?[a-z0-9\u00a1-\uffff]\.)+(?:[a-z\u00a1-\uffff]{2,}\.?))(?::\d{2,5})?(?:[/?#]\S*)?/i;
// tip: this is the regexp from Android // i think this is outdated -iczero
const redirnum = 5; // if redirected greater than this many times will return redirect loop
const timeout = 5000; // ms after which to abort the url fetching request
const MAX_LENGTH = 1048576; // maximum length in bytes
const redircodes = [301, 302, 307];
function getUrlTitle(qurl, callback, num = 0) {
    if (num >= redirnum) return callback('Redirect loop');
    let vurl = url.parse(qurl);
    if (!vurl.protocol) { // its a domain name, try it as http
        qurl = 'http://' + qurl;
        vurl = url.parse(qurl);
    }
    let urlOpts = {
        host: vurl.hostname,
        path: vurl.path,
        headers: {
            'User-Agent': `Mozilla/5.0 (compatible, otherbot url title resolver) Node.js/${process.version}`
        }
    };
    let ssl;
    if (vurl.protocol == 'http:') {
        urlOpts.port = 80;
    } else if (vurl.protocol == 'https:') {
        urlOpts.port = 443;
        ssl = true;
    } else {
        // this can happen with plain hosts with ports
        return getUrlTitle('http://' + qurl, callback, num);
    }
    if (vurl.port) urlOpts.port = vurl.port;
    let req;
    let reqtimeout = setTimeout(() => {
        if (!req.aborted) {
            req.abort();
            callback('Request took too long');
        }
    }, timeout);
    let errorHandler = function(err) {
        if (req.aborted) return;
        console.error(err);
        req.abort();
        clearTimeout(reqtimeout);
        if (err.code) {
            switch (err.code) {
                //case 'ECONNRESET':
                case 'ENOTFOUND':
                    return;
            }
            callback(`Connection error: ${err.code}`); // probably not necessary
        }
    }
    let redirectTo = function(toURL) {
        req.abort();
        try {
            let parsed = new url.URL(toURL, qurl);
            getUrlTitle(parsed.href, callback, ++num);
        } catch(e) {
            req.abort();
        }
    }
    let handler = function(response) {
        if (~redircodes.indexOf(response.statusCode)) return redirectTo(response.headers.location);
        let desc = '';
        // ffs why are content-type and content-length OPTIONAL
        if (response.headers['content-type']) {
            if (response.headers['content-length']) {
                desc = `${response.statusCode} Content-Type: ${response.headers['content-type']}, Length: ${prettysize(response.headers['content-length'])}`;
            } else {
                desc = `${response.statusCode} Content-Type: ${response.headers['content-type']}`;
            }
        } else if (response.headers['content-length']) {
            desc = `${response.statusCode} Length: ${prettysize(response.headers['content-length'])}`;
        } else desc = `${response.statusCode} No data found`;

        if (response.headers['content-length'] && response.headers['content-length'] > MAX_LENGTH) {
            req.abort();
            return callback(desc);
        } else if (response.headers['content-type'] && response.headers['content-type'].split(';')[0] !== 'text/html') {
            req.abort();
            return callback(desc);
        }

        let data = '';
        response.on('data', function(chunk) {
            data += chunk;
            if (response.headers['content-length'] && data.length > response.headers['content-length']) {
                req.abort();
                return callback('Malformed response (mismatched Content-Length)');
            }
            if (data.length > MAX_LENGTH) req.abort(); // feed this into cheerio
        }).on('end', () => {
            clearTimeout(reqtimeout);
            let $ = cheerio.load(data, {
                decodeEntities: false
            });
            let redirect = $('meta[http-equiv="refresh"]').first().attr('content');
            if (redirect) return redirectTo(redirect.match(/url=(.+)$/)[1]);
            let title = $('title').first().text();
            if (title) callback(`${response.statusCode === 200 ? '' : response.statusCode + ' '}Title: ` + entities.decode(title).replace(/\r|\n|\0/g,'').match(/^\s*(.*)\s*$/)[1]);
            else callback(desc);
        }).on('error', errorHandler); // we don't care
    }
    try {
        if (ssl) {
            req = https.get(urlOpts, handler).on('error', errorHandler);
        } else {
            req = http.get(urlOpts, handler).on('error', errorHandler);
        }
    } catch(err) {
        clearTimeout(reqtimeout);
    }
}
/*
let reqhead = {
    "Accept": "application/json",
    "app_id": "97cc26d4",
    "app_key": "9b112c206775523476d8383ff93037ff"
};
//Careful! this is important! 3k req per month. use it wisely
function getDef(word, lang, def, callback) {
    let treutrn
    let req = https.request({
        protocol: "https:",
        port: 443,
        hostname: "od-api.oxforddictionaries.com",
        headers: reqhead,
        path: "/api/v1/entries/" + lang + "/" + word
    }, function(res) {
        let reply = '';
        res.on('data', (chunk) => {
            reply += chunk;
        }).on('end', () => { // fixed ur shit
            callback(reply);
            console.log(reply);
        });
    }).on('error', (e) => {
        console.log(`[ERROR] Dictionary request failed: ${e.message}`);
    }).end();
};
*/
module.exports = function(bot) {
    bot.events.on('privmsg', event => {
        return;
        //if (!~chanwhitelist.indexOf(event.chan)) return;
        //if (~nickblacklist.indexOf(event.host[0])) return;
        //if (~event.host.join(' ').toLowerCase().indexOf('bot')) return;
        let urls = event.args.join(' ').match(urlRegex);
        if (urls) {
            getUrlTitle(urls[0], title => {
                event.sendBack("[" + title + "]", true);
            });
        }
    });
    bot.addCmd('ptitle', 'fact', event => {
        let urls = event.args.join(' ').match(urlRegex);
        if (urls) getUrlTitle(urls[0], title => event.sendBack(`[${title}]`, true));
        else event.reply('no urls found');
    }, 'Get a title');
    bot.addCmd('php', 'fun', event => {
        event.reply('Oh, PHP? PHP is shit. You want proof? See ' + phpShitUrls.join(' '));
    }, 'Gives useful info about php');
    /*
    bot.addCmd('wolf', 'fact', function(args, chan, host) {
        if (!args[0]) {
            bot.sendMsg(chan, "Usage: wolf <query>");
            return;
        }
        let input = encodeURIComponent(args.join(' '));
        console.log(input);
        let data = '';
        let qres = "";
        http.get('http://api.wolframalpha.com/v2/query?input=' + input + '&appid=' + wolfkey + '&format=plaintext', res => {
            res.on('data', (d) => {
                data += d;
            }).on('end', _ => {
                parseXML(data, (err, res) => {
                    if (err) {
                        bot.sendMsg(chan, 'An error occured, Please check your input validity and spelling. Thank You.');
                        return;
                    }
                    //console.log(require('util').inspect(res,false,null));
                    let pods = res.queryresult.pod;
                    console.log(require('util').inspect(pods, false, null));
                    if (pods == undefined) {
                        bot.sendMsg(chan, 'Please check your input validity and spelling');
                        return;
                    }
                    qres += "\x02Input:\x0F " + pods[0].subpod[0].plaintext.join(" ");
                    if (pods[1].subpod[0].plaintext.join(" ") == "") {
                        pods[1].subpod[0].plaintext.join(" ") == "No result. Please check your input validity and spelling";
                        return;
                    }
                    let plaintext = "";
                    pods.forEach((element) => {
                        element.subpod.forEach((element) => {
                            plaintext += element.plaintext.join(" \x02|\x0F ") + " \x02|\x0F ";
                        });
                    });
                    qres += "; \x02Result:\x0F " + plaintext.replace(/(\r\n|\r|\n)/g, " \x02|\x0F ");
                    bot.sendMsg(chan, qres, true);
                });
            });
        });

    }, "search wolfram alpha.");
    bot.addCmd('def', 'fact', (args, chan, host) => {
        getDef(args[0], args[1], parseInt(args[2]), (body) => {

            let data = JSON.parse(body);
            if (data.results == undefined) {
                bot.sendMsg(chan, "No results! please check if the language name listed is IOTA complient and the word is valid");
            }
            let res = data.results[0];
            let definitions = res.lexicalEntries;
            if (definitions[parseInt(args[2])] == undefined) {
                bot.sendMsg(chan, "Definition " + args[2] + " not found!");
            }
            else {
                bot.sendMsg(chan, definitions[parseInt(args[2])][0].senses[0].definitions[0])
            }
        });
    });
    */
    return {getUrlTitle};
}
