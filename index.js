const Discord = require('discord.js');
const client = new Discord.Client();

const config = JSON.parse(fs.readFileSync('config.json'));

// const imapConfig = config.imap;

const imap = new Imap({
    user: config.user,
    password: config.password,
    host: config.host,
    port: config.port,
    tls: config.tls
});

client.once('ready', () => {
	console.log('Ready!');
});

client.on('message', message => {
	if (message.content === '!ping') {
		message.channel.send('Pong.');
	}
});

client.login('your-token-goes-here');
