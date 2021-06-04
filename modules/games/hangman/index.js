/*
        // whoever wrote this had no clue what they were doing
module.exports = function main(bot, config, verside){
	let self = {};
	self.party;

	self.config	= {
		scope: 2, // Can be run in both game and party channels
		requires: ["party"],
		minPlayers: 2,
		maxPlayers: 10 // Maybe inf? Make for really sbort games
	}

	self.start = function(party){
		/*
		Party contains game channel information and other stuff.
		This method initializes a channel to start a game in. A timer can
		be used or a voting system etc.
		*//*
		
		self.party = party;
		console.log("Starting game in", party.game.channels);
		
	}

	// We also need to subscribe to certain handlers otherwise a game will get stuck. e.g. JOIN/PART/QUIT/etc
	
	// JOIN Event - Implement some sort of party chat since +m will be applied and actualy players will be voiced.
	bot.servmsg.on("JOIN", (head,msg,uid)=>{
		
		// We're using uuid since it's more reliable than using nick
		
	})
	
	// TODO: Reference the below method in such a way self can be accessed in it's scope
	bot.servmsg.on("JOIN", (head,msg,uid)=>{
		
		// TODO: Put players in party.game since members just indiciates their a part of that party
		if self.party.members.includes(uuid){console.log("Party member left game channel")}
		
	})

	return self
}
*/
