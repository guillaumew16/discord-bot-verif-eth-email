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
- upon completion of the process, a salted hash of the nethz used is stored in database, and marked as "already used for verification"; no nethz/Discord-User-ID association is stored

## Setup

- git clone this repo
- `yarn` (or `npm i`)
- `cp config-dist.json config.json` and fill the config file (cf section "Config")
- `yarn start`

### Config
The fields of the `config.json` file to be used is described by the sample file `config-dist.json`
- The `transportOptions` field is passed directly to nodemailer.createTransport, which is documented here: https://nodemailer.com/smtp/
- The `theGuildId` field holds the ID of the (unique) discord server that should be using this bot. (Yes we support only serving one server, since that is exactly our goal.)
- The `tokenTTL` field is in hours
- The `commonSalt` field is used to "salt" the nethz before hashing them (otherwise we risk dictionary attack, since nethz's are short). Note that we use a common salt for all nethz's, contrary to what is usually meant by "salting" (typically for passwords), since we don't have keys (typically username), just the hashed values.

## Notes for devs
(This is, and will remain, a really small project, so we dump here whatever would normally be in a CONTRIBUTING file)

### TODO
- (optional) handle "The email address you entered couldn't be found" emails with https://nodemailer.com/smtp/dsn/ and https://www.npmjs.com/package/imap

### Useful links
- https://github.com/discordjs/guide/blob/master/code-samples/creating-your-bot/commands-with-user-input/11/index.js
> Rk: that link is a strict subset of  https://github.com/discordjs/guide/blob/master/code-samples/command-handling/adding-features/11/index.js (which is the code sample for a later step of the same tutorial), but since we only need to respond to very few commands, that link is actually more relevant
- https://discord.js.org/#/docs/main/stable/class/Client?scrollTo=e-guildMemberAdd
- https://discordjs.guide/popular-topics/common-questions.html#how-do-i-add-a-role-to-a-guild-member
- https://discordjs.guide/keyv/
- https://nodemailer.com/about/
- https://nodemailer.com/usage/using-gmail/
