Discord bot for ETH student "verification"
===

## Description
A discord bot to "verify" that a user joining the server is indeed an ETH student, by the following process:
1. user tells bot their nethz
2. bot sends an email to that nethz (domain "student") with a token
3. user reports token to bot, thus proving it has access to nethz inbox
Remarks:
- the token has an expiration date
- the bot must have an outgoing email address not blacklisted by ETH's mail server
- nethz is never stored in database (only Discord User-ID)

## Config
The fields of the `config.json` file to be used is described by the sample file `config-dist.json`
- The `transportOptions` field is passed directly to nodemailer.createTransport, which is documented here: https://nodemailer.com/smtp/
- The `theGuildId` field holds the ID of the (unique) discord server that should be using this bot. (Yes we support only serving one server, since that is exactly our goal.)
- The `tokenTTL` field is in hours

## Notes for devs
(This is, and will remain, a really small project, so we dump here whatever would normally be in a CONTRIBUTING file)

### TODO
- test
- debug
- (optional) handle "The email address you entered couldn't be found" emails with https://nodemailer.com/smtp/dsn/ and https://www.npmjs.com/package/imap

### Useful links
- https://nodemailer.com/about/
- https://nodemailer.com/usage/using-gmail/
- https://github.com/discordjs/guide/blob/master/code-samples/creating-your-bot/commands-with-user-input/11/index.js
> Rk: that link is a strict subset of  https://github.com/discordjs/guide/blob/master/code-samples/command-handling/adding-features/11/index.js (which is the code sample for a later step of the same tutorial), but since we only need to respond to very few commands, that link is actually more relevant
- https://discordjs.guide/popular-topics/common-questions.html#how-do-i-add-a-role-to-a-guild-member
- https://discord.js.org/#/docs/main/stable/class/Client?scrollTo=e-guildMemberAdd
- https://discordjs.guide/keyv/#installation
