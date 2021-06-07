const express = require('express'); // lol
const childProcess = require('child_process');
const stream = require('stream');
const moduleName = require('path').basename(__filename);

module.exports = function load(bot) {
    let app = null;
    let oldModule = bot.config.modules[moduleName];
    if (oldModule && oldModule.app) app = oldModule.app;
    else {
        app = express();
        app.listen(8035);

        app.use('/', (req, res, next) => {
            let router = bot.config.modules[moduleName]?.router;
            if (!router) res.type('text/plain').status(404).send('oh no');
            router(req, res, next);
        });
    }
    let router = express.Router();

    function findLinks() {
        let visited = new Set();
        let links = [];
        let toVisit = [];
        toVisit.push(bot.server.remoteSid);
        while (toVisit.length) {
            let current = bot.server.servers.get(toVisit.pop());
            if (visited.has(current.sid)) continue;
            visited.add(current.sid);
            for (let link of current.links) {
                if (visited.has(link)) continue;
                links.push([current, bot.server.servers.get(link)]);
                toVisit.push(link);
            }
        }
        return links;
    }
    function createGraphviz() {
        let g = `graph {`;
        let push = s => g += '\n  ' + s;

        for (let server of bot.server.servers.values()) {
            push(`"${server.sid}" [label = "${server.name} (${server.sid})\\n` +
                `${server.description}\\n${server.version}", id = "\\N"]`);
        }

        let links = findLinks();
        for (let [from, to] of links) {
            push(`"${from.sid}" -- "${to.sid}"`);
        }

        g += `\n}`;
        return g;
    }
    let GRAPH_FORMATS = new Set(['svg', 'png']);
    let GRAPH_RENDERERS = new Set(['dot', 'neato', 'circo', 'fdp', 'twopi']);
    const NETWORK_INFO = 'pissnet (https://letspiss.net/)';

    router.get('/', (_req, res) => {
        res.type('application/json').send(JSON.stringify({
            _hello: 'greetings from IoServ',
            _network: NETWORK_INFO,
            _complainTo: 'iczero',
            serversCount: bot.server.servers.size,
            clientsCount: bot.server.clients.size,
            endpoints: [
                '/graph/raw',
                '/graph/json',
                '/graph?format=&renderer='
            ]
        }, null, 2));
    });
    router.get('/graph/raw', (_req, res) => res.type('text/plain').send(createGraphviz()));
    router.get('/graph/json', (_req, res) => {
        let links = findLinks().map(([a, b]) => [a.sid, b.sid]);
        let nodes = {};
        for (let [sid, server] of bot.server.servers) {
            nodes[sid] = { name: server.name, description: server.description, version: server.version };
        }
        res.send({ nodes, links });
    });
    router.get('/graph', (req, res) => {
        let format = req.query.format || 'svg';
        let renderer = req.query.renderer || 'neato';
        if (!GRAPH_FORMATS.has(format)) {
            res.type('text/plain').status(400).send(`unknown format: ${format}`);
            return;
        }
        if (!GRAPH_RENDERERS.has(renderer)) {
            res.type('text/plain').status(400).send(`unknown renderer: ${renderer}`);
            return;
        }
        res.type(format);
        // -Goverlap=scale results in MASSIVE graphs, removed for now
        let graphviz = childProcess.spawn('dot', ['-T' + format, '-Goverlap=prism', '-Gsplines=spline'], {
            argv0: renderer,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        graphviz.stdin.write(createGraphviz());
        graphviz.stdin.end();
        graphviz.stdout.pipe(res);
        graphviz.stderr.pipe(res);
    });

    return { findLinks, createGraphviz, app, router };
};

