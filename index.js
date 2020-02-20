const Discord = require('discord.js');
const config = require('./config.json');
const client = new Discord.Client();

client.once('ready', () => {
    console.log('Ready!');
});

const availableCommandsStr = `Available commands:
    !ping: make me say Pong
    !help: print this message
`;

const welcomeMsg = `You are currently not verified as an ETH student, so you only have access to a restricted number of channels.
To verify yourself as an ETH student, 
    1. please tell me your nethz in the following format: \`!nethz \` + your nethz; e.g \`nethz jsmith\`
    2. I will send an email at <nethz>@student.ethz.ch containing a token; e.g \`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\`
    3. then, show me that you did receive the token, by telling me: \`!token \` + the token; e.g \`token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\`
Remarks:
    - To reset the process, e.g if you misspelled your nethz, just do step 1 again. (I will invalidate the previous token, don't worry.)
    - My email address, which I will use in step 2, is ${config.botmail.user}; please check in your spam folder if you don't receive anything.
    - Note that no human will check the inbox of ${config.botmail.user}.
    - I am a very stupid bot. If you encounter any problem or have any questions, please send a message to an admin of this server directly.
`;

let prefix = config.prefix;

client.on('message', message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();
    const user = message.author;

    if (command === 'ping') {
		message.channel.send('Pong.');
	} else if (command === 'avatar') {
        if (!message.mentions.users.size) {
            return message.channel.send(`Your avatar: <${message.author.displayAvatarURL}>`);
        }

        const avatarList = message.mentions.users.map(user => {
            return `${user.username}'s avatar: <${user.displayAvatarURL}>`;
        });

        message.channel.send(avatarList);
	} else if (command === 'help') {
        message.channel.send(availableCommandsStr)
    } else {
        return message.reply('command not understood :(\n' + availableCommandsStr);
    }
});

client.on('guildMemberAdd', member => {
    let msgToSend = `Hello! I see you just joined the server ${member.guild.name}. \n${welcomeMsg}`;

    member.user.dmChannel.send(msgToSend)
        .then(message => console.log(`Sent message: ${message.content}`))
        .catch(console.error);
});

client.login(config.token);
