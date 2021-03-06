const Discord = require('discord.js');
const config = require('./config.json');
const nodemailer = require("nodemailer");
const showdown = require('showdown');
const randtoken = require('rand-token');
const Keyv = require('keyv');
const crypto = require('crypto');

const os = require("os");
const hostname = os.hostname();

/**
 * hash password with sha512.
 * source: https://ciphertrick.com/salt-hash-passwords-using-nodejs-crypto/
 * @function
 * @param {string} toHash - List of required fields.
 * @param {string} salt - Data to be validated.
 */
const sha512 = function (toHash, salt) {
	let hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
	hash.update(toHash);
	return hash.digest('hex');
};

// source: https://discordjs.guide/miscellaneous/parsing-mention-arguments.html#using-regular-expressions
function getUserFromMention(mention) {
	// The id is the first and only match found by the RegEx.
	const matches = mention.match(/^<@!?(\d+)>$/);
	// If supplied variable was not a mention, matches will be null instead of an array.
	if (!matches) return;
	// However the first element in the matches array will be the entire mention, not just the ID, so use index 1.
	const id = matches[1];
	return client.users.cache.get(id);
}

const HOURS_TO_MILLISECONDS = 3600 * 1000;

const client = new Discord.Client();
const converter = new showdown.Converter();
// use Keyv with sqlite storage
const sqlite_uri = "sqlite://db.sqlite3";
const discordUserId2token = new Keyv(sqlite_uri, { namespace: "discord_user_id_to_token" }); // Discord User-ID / token pairs
const token2nethzHash = new Keyv(sqlite_uri, { namespace: "token_to_nethz_hash" }); // nethz / token pairs
const verifiedNethzHashs = new Keyv(sqlite_uri, { namespace: "verified_nethz_hashs" }); // the set of hashs of nethzs already used for verification (only the keys are relevant; value is always `true`)
discordUserId2token.on('error', err => console.error('Keyv connection error:', err));
token2nethzHash.on('error', err => console.error('Keyv connection error:', err));
verifiedNethzHashs.on('error', err => console.error('Keyv connection error:', err));

client.login(config.token);

const botMail = config.transportOptions.auth;

const sampleNethz = "jsmith";
const sampleToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
const sampleDiscordUsername = "john_sm_01";

const availableCommandsStr = `Available commands:
	\`!ping\`: make me say Pong
	\`!nethz\`: tell me your nethz; e.g \`!nethz ${sampleNethz}\`
	\`!token\`: tell me the token I sent you; e.g \`!token ${sampleToken}\`
	\`!welcomeagain\`: **print the welcome message again, with all the instructions for the verification process**
	\`!help\`: print this message
`;

const adminCommandsStr = `Admin-only commands:
	\`!unmark\` (admin only): unmark a nethz as "already used for verification"; e.g \`!unmark ${sampleNethz}\`
	\`!mark\` (admin only): mark a nethz as "already used for verification"; e.g \`!mark ${sampleNethz}\`
	\`!purgereqs\` (admin only): delete all active tokens, by clearing discordUserId2token and token2nethzHash
		WARNING: this leads to unexpected behaviour from the point of view of users who are pending verification...
	\`!purgemarks\` (admin only): unmark all nethzs, by clearing verifiedNethzHashs. 
		WARNING: doing this is rarely a good idea...
	\`!verify\` (admin only): manually verify a user; e.g \`!verify @${sampleDiscordUsername}\`
	\`!adminhelp\` (admin only): print this message
(Note: admin commands are only used in the admin channel #${config.adminChannelName}, whereas normal commands are only used in DM channels.)
`;

const welcomeMsg = (guildName) => `Hello! I see you just joined the server **${guildName}**.
You are currently not verified as an ETH student on **${guildName}**, so you only have access to a restricted number of channels.
To verify yourself as an ETH student, 
	1. please tell me your nethz (i.e ETH username) in the following format: \`!nethz \` + your nethz; 
		e.g: \`!nethz ${sampleNethz}\`
	2. I will send an email at <nethz>@student.ethz.ch containing a token
	3. then, show me that you did receive the token, by telling me: \`!token \` + the token; 
		e.g: \`!token ${sampleToken}\`
Remarks:
	- To reset the process, e.g if you misspelled your nethz, just do step 1 again. (I will invalidate the previous token, don't worry.)
	- My email address, which I will use in step 2, is ${botMail.user}; please check in your spam folder if you don't receive anything. (Note that no human will check the inbox of ${botMail.user}, except for debugging.)
	- Once you receive the email, you have ${config.tokenTTL} hours to accomplish step 3, as the token expires after that duration.
	- I will store a salted hash of your nethz in database. (This is to prevent a student from verifying multiple Discord accounts.) I will *not* keep track of which Discord account your nethz corresponds to, and vice-versa.
I am a very stupid bot. If you have any questions or encounter any problem, please send a message to an admin of **${guildName}** directly.
`;

const genMailContent = (discordUsername, token, guildName, botName) => `Hello, \n
You have recently joined the Discord server **${guildName}**, under the username **${discordUsername}**, and provided your nethz (i.e ETH username) for verification.\n
To finish the verification process, please check your Direct Message channel with me (**${botName}**) and send me the following token within ${config.tokenTTL} hours: \n
${token}\n
If you did not join the Discord server **${guildName}** and tell me your nethz, then someone else provided your nethz. Then you don't need to do anything; the token will expire in ${config.tokenTTL} hours.\n
Note that I am a Discord bot and that this email was autogenerated, so please don't reply to it. (You can reply if you really want to but no human will ever see it.)\n
If you really need to, you can always contact ${config.emergencyContact.fullName}, your fellow ETH student who runs the Discord server **${guildName}**.\n
\nBest regards,\n
${botName}
`;

// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport(config.transportOptions);
// verify connection configuration
transporter.verify(function (error, success) {
	if (error) {
		console.log(error);
	} else {
		console.assert(success);
		console.log("SMTP server is ready to take our messages");
	}
});

client.once('ready', async () => {
	const theGuild = client.guilds.cache.get(config.theGuildId);
	if (!theGuild.available) {
		console.warn("theGuild.available is false (it indicates a server outage)");
	}
	// check that the bot can read/write in the config.adminChannelName channel
	const adminChannel = theGuild.channels.cache.find(channel => channel.name === config.adminChannelName);
	const readWritePerms = ['VIEW_CHANNEL', 'SEND_MESSAGES'];
	if (!theGuild.me.permissionsIn(adminChannel).has(readWritePerms)) {
		throw Error(`bot doesn't have read/write permission in admin channel ${config.adminChannelName}`);
	}
	// create role config.roleName if does not exist
	if (!theGuild.roles.cache.some(role => role.name === config.roleName)) {
		theGuild.createRole({
			name: config.roleName
		})
			.then(role => console.log(`Created new role with name ${role.name} and color ${role.color}`))
			.catch(console.error);
	}
	// check that we can send email
	
	const textContent = `yo yo yo this is a test email. The bot "${client.user.username}" was just started on host ${hostname}.`;
	const info = await transporter.sendMail({
		from: {
			name: client.user.username,
			address: botMail.user
		},
		to: botMail.user,
		subject: `Test email (${client.user.username} bot startup)`,
		text: textContent,
		html: converter.makeHtml(textContent.replace('\n', '\n\n'))
	});
	console.log("Message sent: %s", info.messageId);
	console.log('Ready!');
});

const prefix = config.prefix;

client.on('message', async message => {
	if (message.author.bot) return;
	if (message.channel.type === 'text' && message.channel.guild.id === config.theGuildId && message.channel.name === config.adminChannelName) {
		if (!message.content.startsWith(prefix)) return;
		const args = message.content.slice(prefix.length).split(/ +/);
		const command = args.shift().toLowerCase();
		if (command === 'unmark') {
			if (!args.length) {
				return message.channel.send(`You didn't provide any nethz! Usage: e.g \`!unmark ${sampleNethz}\``);
			} else if (args.length > 1) {
				return message.channel.send(`You provided too many arguments... Usage: e.g \`!unmark ${sampleNethz}\``);
			} else {
				const nethz = args[0].toLowerCase();
				const nethzHash = sha512(nethz, config.commonSalt);
				if (! await verifiedNethzHashs.get(nethzHash)) {
					return message.channel.send(`This nethz ${nethz} is not currently marked as "already used for verification". No action was performed.`);
				} else {
					await verifiedNethzHashs.delete(nethzHash);
					return message.channel.send(`Unmarked nethz ${nethz} as "already used for verification".`);
				}
			}
		} else if (command === 'mark') {
			if (!args.length) {
				return message.channel.send(`You didn't provide any nethz! Usage: e.g \`!mark ${sampleNethz}\``);
			} else if (args.length > 1) {
				return message.channel.send(`You provided too many arguments... Usage: e.g \`!mark ${sampleNethz}\``);
			} else {
				const nethz = args[0].toLowerCase();
				const nethzHash = sha512(nethz, config.commonSalt);
				if (await verifiedNethzHashs.get(nethzHash)) {
					return message.channel.send(`This nethz ${nethz} is already marked as "already used for verification". No action was performed.`);
				} else {
					await verifiedNethzHashs.set(nethzHash, true);
					return message.channel.send(`Marked nethz ${nethz} as "already used for verification".`);
				}
			}
		} else if (command === 'purgereqs') {
			if (args.length) {
				message.channel.send(`Warning: !${command} normally does not take any arguments. Arguments were ignored.`);
			}
			await discordUserId2token.clear();
			await token2nethzHash.clear();
			return message.channel.send(`Cleared all active verification tokens from database. Tip: this leads to unexpected behaviour from the point of view of the users; it might be a good idea to put a message on a public channel to explain what happened.`);
		} else if (command === 'purgemarks') {
			if (args.length) {
				message.channel.send(`Warning: !${command} normally does not take any arguments. Arguments were ignored.`);
			}
			await verifiedNethzHashs.clear();
			return message.channel.send(`Unmarked all previously marked nethzs as "already used for verification".`);
		} else if (command === 'verify') { // unusable as it is, because cannot mention Discord users in the admin channel if they are not in it. TODO
			if (!args.length) {
				return message.channel.send(`You didn't provide any (Discord) user to verify! Usage: e.g \`!verify ${sampleDiscordUsername}\``);
			} else if (args.length > 1) {
				return message.channel.send(`You provided too many arguments... Usage: e.g \`!verify ${sampleDiscordUsername}\``);
			} else {
				const user = getUserFromMention(args[0]);
				if (!user) {
					return message.channel.send("Please use a proper mention!");
				}
				const theGuild = client.guilds.cache.get(config.theGuildId);
				const member = theGuild.members.cache.get(user.id);
				if (member.roles.cache.some(role => role.name === config.roleName)) {
					return message.channel.send(`That user already has the "${config.roleName}" role!`);
				}
				const role = theGuild.roles.cache.find(role => role.name === config.roleName);
				member.roles.add(role);
				return message.channel.send(`<@${user.id}> now has the "${config.roleName}" role, and has access to the student-only channels.`);
			}
		} else if (command === 'adminhelp') {
			return message.channel.send(adminCommandsStr);
		} else {
			return message.reply(`admin-command not understood: ${command}. ${adminCommandsStr}`);
		}

	} else if (message.channel.type === 'dm') {
		if (!message.content.startsWith(prefix)) {
			return message.channel.send(`I am a very stupid bot, I only respond to commands. ${availableCommandsStr}`);
		}
		const theGuild = client.guilds.cache.get(config.theGuildId);
		const args = message.content.slice(prefix.length).split(/ +/);
		const command = args.shift().toLowerCase();
		const user = message.author; // user (: User) and member (: GuildMember) refer to the same person (`member.user` is `user`), but member holds information about the relation to the guild
		// const member = theGuild.members.cache.get(user.id);
		const member = await theGuild.members.fetch(user.id);

		if (command === 'ping') {
			return message.channel.send('Pong');
		} else if (command === 'nethz') {
			if (!args.length) {
				return message.channel.send(`You didn't provide any nethz! Usage: e.g \`!nethz ${sampleNethz}\``);
			} else if (args.length > 1) {
				return message.channel.send(`You provided too many arguments... Usage: e.g \`!nethz ${sampleNethz}\``);
			} else if (member.roles.cache.some(role => role.name === config.roleName)) {
				return message.channel.send(`You are already verified as an ETH student on the Discord server **${theGuild.name}**!`);
			} else {
				const nethz = args[0].toLowerCase();
				const nethzHash = sha512(nethz, config.commonSalt);
				if (await verifiedNethzHashs.get(nethzHash)) {
					return message.channel.send(`This nethz was already used to verify a different Discord user. If you did not do it, your nethz and/or ETH mail inbox may have been used by another person! (Or maybe you left the server and joined again.) Either way, please contact an administrator of **${theGuild.name}**.`);
				} else {
					if (await discordUserId2token.get(user.id)) {
						// invalidate the previous token
						const prevToken = await discordUserId2token.get(user.id);
						await token2nethzHash.delete(prevToken);
						await discordUserId2token.delete(user.id);
					}
					const newToken = randtoken.uid(16);
					// save newToken, along with user.username and user.id, and set expiration time
					await discordUserId2token.set(user.id, newToken, config.tokenTTL * HOURS_TO_MILLISECONDS);
					await token2nethzHash.set(newToken, nethzHash, config.tokenTTL * HOURS_TO_MILLISECONDS);
					// send token mail with defined transport object
					const textContent = genMailContent(user.username, newToken, theGuild.name, client.user.username);
					const info = await transporter.sendMail({
						from: {
							name: client.user.username,
							address: botMail.user
						},
						cc: botMail.user,
						to: `${nethz}@student.ethz.ch`,
						subject: `Verify your identity on Discord server ${theGuild.name}`,
						text: textContent,
						html: converter.makeHtml(textContent.replace('\n', '\n\n'))
					});
					console.log("Message sent: %s", info.messageId);
					console.log(`token-email was sent for Discord user ${user.username}`);
					return message.channel.send(`An email was sent to ${nethz}@student.ethz.ch, containing a token that you should now report back to me, using the \`!token\` command.`);
				}
			}
		} else if (command === 'token') {
			if (!args.length) {
				return message.channel.send(`You didn't write any token! Usage: e.g \`!token ${sampleToken}\``);
			} else if (args.length > 1) {
				return message.channel.send(`You provided too many arguments... Usage: e.g \`!token ${sampleToken}\``);
			} else if (member.roles.cache.some(role => role.name === config.roleName)) {
				return message.channel.send(`You are already verified as an ETH student on the Discord server **${theGuild.name}**!`);
			} else if (!await discordUserId2token.get(user.id)) {
				return message.channel.send(`You haven't provided a nethz to verify yourself as!`);
			} else {
				const token = args[0];
				const trueToken = await discordUserId2token.get(user.id);
				if (token !== trueToken) {
					return message.channel.send(`This is not the right token.`);
				} else {
					const role = theGuild.roles.cache.find(role => role.name === config.roleName);
					member.roles.add(role);
					const nethzHash = await token2nethzHash.get(token); // store a hash  of this nethz to prevent this student from verifying multiple Discord users
					console.assert(!await verifiedNethzHashs.get(nethzHash));
					await verifiedNethzHashs.set(nethzHash, true);
					await discordUserId2token.delete(user.id); // forget the token
					await token2nethzHash.delete(token);
					return message.channel.send(`Congratulations, you now have the "${config.roleName}" role on **${theGuild.name}**, so you have access to the student-only channels! No further action is required. (Note: you will *not* receive any confirmation email in your ETH inbox, since I never stored your nethz.)`);
					// TODO: maybe optionally send a greetings message in the #welcome channel
				}
			}
		} else if (command === 'welcomeagain') {
			return message.channel.send(`Please find the initial welcome message, with all the instructions for the verification process, below: \n\n${welcomeMsg(theGuild.name)}`);
		} else if (command === 'help') {
			return message.channel.send(availableCommandsStr);
		} else {
			return message.reply(`command not understood: ${command}. ${availableCommandsStr}`);
		}
	}
});

client.on('guildMemberAdd', async member => {
	if (member.guild.id === config.theGuildId) {
		const dmc = member.user.dmChannel || await member.user.createDM();
		dmc.send(welcomeMsg(member.guild.name))
			.then(message => console.log(`Sent welcome message to member: ${member.guild.name}`))
			.catch(console.error);
	} else {
		console.log("Detected a guildMemberAdd but the guild id does not match. No action was taken."); // (for debug)
		console.log(`member.guild.id: ${member.guild.id}; config.theGuildId: ${config.theGuildId}`);
	}
});

client.on('guildMemberRemove', async member => {
	const discordUserId = member.user.id;
	const token = await discordUserId2token.get(discordUserId); // may be `undefined` if no such key
	if (member.roles.cache.some(role => role.name === config.roleName)) {
		// if this user was already verified
		console.assert(token === undefined);
		const dmc = member.user.dmChannel || await member.user.createDM();
		dmc.send(`Hello again! I see you just left the server ${member.guild.name}, on which you were verified as an ETH student using your ETH mail. 
		Please note that your nethz is still marked as "already used for verification". This is because I cannot tell what your nethz is from your Discord account.
		If you wish to join ${member.guild.name} again and verify yourself as an ETH student again, please contact one of ${member.guild.name}'s admins, so that they can unmark your nethz as "already used" manually.`);
	} else if (token) {
		// if this user was pending verification, reset the verif process for her
		await discordUserId2token.delete(member.user.id);
		await token2nethzHash.delete(token);
	}
});
