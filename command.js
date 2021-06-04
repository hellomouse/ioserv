// command system for ircbot
"use strict";
function Command(group,code,help,canExec) {
	if (!group || !code) {throw new Error("Missing group/code while adding command!");}
	this.group = group;
	if (typeof code == "string") {
		this.string = code;
		this.code = function(event) {event.reply(this.string);}
	} else {
		this.code = code;
	}
	this.help = help || "Help is not available for that command.";
	canExec = canExec || 0;
	if (typeof canExec == "number") {
		this.lvl = canExec;
		this.canExec = function canExec(event) {
			if (event.uperms === -1) return -1; // ignore
			return event.uperms >= this.lvl;
		}
	}
}
Command.prototype = {
	run(event) {
		var canExec = this.canExec(event);
		if (canExec === true) this.code(event);
		return canExec;
	}
}

module.exports = Command;