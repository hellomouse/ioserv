const wolf = require('wolframalpha-websocket-api');

module.exports = function load(bot) {
  let api = new wolf.WolframAlphaApi();

  bot.addCmd('wa', 'wolframalpha', async event => {
    let query = event.args.join(' ');
    let response = api.query(query);
    try {
      await response.promise;
    } catch (err) {
      event.reply('error with query(?) ' + err.message);
      console.error('wolframalpha error');
      console.error(err);
    }

    if (response.failed) {
      event.sendBack('\x0304No results');
      return;
    }
    if (response.correctedInput && response.originalInput !== response.correctedInput) {
      event.sendBack('\x0307\x02Using input:\x02 ' + response.correctedInput);
    }
    for (let { text } of response.warnings) {
      event.sendBack('\x0304\x02Warning:\x02 ' + text);
    }
    for (let { string } of response.assumptions) {
      event.sendBack('\x0302' + string);
    }
    for (let topic of response.futureTopic) {
      event.sendBack(`\x02${topic.topic}\x02 ${topic.msg}`);
    }
    for (let pod of response.pods.values()) {
      event.sendBack('\x02=== ' + pod.title);
      if (pod.subpods) {
        for (let subpod of pod.subpods) {
          if (subpod.plaintext) event.sendBack(subpod.plaintext);
          else if (subpod.img) event.sendBack('\x0312Image: ' + subpod.img.src);
          else event.sendBack('\x0304(no representation available)');
        }
      }
      // these are not complete and therefore mostly useless
      let stepByStepPod = response.stepByStep.get(pod.position);
      if (stepByStepPod) {
        event.sendBack('\x02  * Step by step: ' + stepByStepPod.title);
        for (let subpod of stepByStepPod.subpods) {
          if (subpod.plaintext) event.sendBack(subpod.plaintext);
          else if (subpod.img) event.sendBack('\x0312Image: ' + subpod.img.src);
          else event.sendBack('\x0304(no representation available)');
        }
      }
    }
    event.sendBack('\x02End of results');
  }, 'wolframalpha', 1);
};
