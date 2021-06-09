const express = require('express'); // lol
const childProcess = require('child_process');
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
  let router = express.Router(); // eslint-disable-line new-cap

  function findLinks() {
    // let visited = new Set();
    let links = [];
    let toVisit = [];
    // graph root
    toVisit.push(bot.server.remoteServer);
    while (toVisit.length) {
      let current = toVisit.pop();
      // if (visited.has(current.sid)) continue;
      // visited.add(current.sid);
      for (let child of current.children) {
        // if (visited.has(link)) continue;
        links.push([current, child]);
        toVisit.push(child);
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
        `/graph?format={${[...GRAPH_FORMATS].join()}}&renderer={${[...GRAPH_RENDERERS].join()}}`
      ]
    }, null, 2));
  });
  router.get('/graph/raw', (_req, res) => res.type('text/plain').send(createGraphviz()));
  router.get('/graph/json', (_req, res) => {
    let links = findLinks().map(([a, b]) => [a.sid, b.sid]);
    let nodes = {};
    for (let [sid, server] of bot.server.servers) {
      nodes[sid] = {
        name: server.name,
        description: server.description,
        version: server.version,
        clients: server.clients.size
      };
    }
    res.set('Access-Control-Allow-Origin', '*');
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
    let graphviz = childProcess.spawn('dot', ['-T' + format, '-Goverlap=prism', '-Gsplines=spline'], {
      argv0: renderer,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    graphviz.stdin.write(createGraphviz());
    graphviz.stdin.end();
    graphviz.stderr.pipe(res, { end: false });
    graphviz.stdout.pipe(res);
    /* imagemagick uses too many resources
        if (format === 'png') {
            let im = childProcess.spawn('convert', ['-define', 'png:compression-filter=2', 'png:-', 'png:-']);
            graphviz.stdout.pipe(im.stdin);
            im.stdout.pipe(res);
            im.stderr.pipe(res, { end: false });
        } else {
            graphviz.stdout.pipe(res);
        }
        */
  });

  return { findLinks, createGraphviz, app, router };
};

