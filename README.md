Discord bot for ETH student "verification"
===

## Description
A discord bot to "verify" that a user joining the server is indeed an ETH student, by the following process:
- TODO

### Warning: the process is not safe
TODO

## Config
The fields of the `config.json` file to be used is described by the sample file `config-dist.json`
- The `fetchMailInterval` field is in seconds.
- The `theGuildId` field holds the (unique) discord server that should be using this bot. (Yes we support only serving one server, since that is exactly our goal.)

## Notes for devs
(This is, and will remain, a really small project, so we dump here whatever would normally be in a CONTRIBUTING file)

### Useful links
- https://nodemailer.com/about/
- https://github.com/discordjs/guide/blob/master/code-samples/creating-your-bot/commands-with-user-input/11/index.js
> Rk: that link is a strict subset of  https://github.com/discordjs/guide/blob/master/code-samples/command-handling/adding-features/11/index.js (which is the code sample for a later step of the same tutorial), but since we only need to respond to very few commands, that link is actually more relevant
- https://discordjs.guide/popular-topics/common-questions.html#how-do-i-add-a-role-to-a-guild-member
