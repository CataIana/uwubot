const { ChatClient } = require("dank-twitch-irc");
const owoify = require('owoify-js').default
const fs = require('fs');

function between(min, max) {
    return Math.floor(
        Math.random() * (max - min + 1) + min
    )
}

async function to_uwuify(msg, mode) {
    if (msg.messageText.startsWith("!uwuify") || msg.messageText.startsWith("!uvuify") || msg.messageText.startsWith("!owoify")) {
        //console.log("force uwuify with command");
        return true;
    }
    if (config["ignored_users"].indexOf(msg.senderUsername) > -1) {
        //console.log("ignored");
        return false; //Don't uwuify is the user is ignored
    }
    let uwuified = owoify(msg.messageText, mode);
    if (msg.messageText === uwuified) {
        //console.log("unchanged");
        return false; //Don't uwuify if the message is going to be unchanged
    }
    if (between(1, config["chance_to_uwuify"]) === 1) {
        return true; //A one in config defined chance to uwuify
    }
    //console.log("rng");
    return false;
}

async function update_config() {
    const data = JSON.stringify(config);
    fs.writeFile('./config.json', data, 'utf8', (err) => {
        if (err) {
            console.log(`Error writing file: ${err}`);
        } else {
            console.log(`Config updated successfully!`);
        }
    
    });
}

try {
    const data = fs.readFileSync('./config.json', 'utf8');
    var config = JSON.parse(data);
} catch (err) {
    console.log(`Error reading file from disk: ${err}`);
}

let tclient = new ChatClient({
    username: config.username,
    password: config.password,

    rateLimits: "default"
}); //Create the twitch client object

tclient.on("ready", () => console.log("Successfully connected to chat"));

tclient.on("PRIVMSG", async msg => {
    if (msg.senderUsername == config.username) {
        return;
    }
    if (msg.channelName == config.username) { //Don't uwuify messages in the bots channel
        if (msg.messageText === "!join") {
            if (tclient.joinedChannels.includes(msg.senderUsername)) {
                tclient.privmsg(msg.channelName, `Bot has already joined ${msg.senderUsername}!`);
            }
            else {
                console.log(`Joining channel #${msg.senderUsername}`);
                tclient.privmsg(msg.channelName, `Joining channel #${msg.senderUsername}`);
                if (!config["joined_channels"].includes(msg.senderUsername)) {
                    config["joined_channels"].push(msg.senderUsername);
                }
                tclient.join(msg.senderUsername);
                await update_config();
            }
        }
        else if (msg.messageText === "!part" || msg.messageText === "!leave") {
            if (!tclient.joinedChannels.includes(msg.senderUsername)) {
                tclient.privmsg(msg.channelName, `Bot not in channel ${msg.senderUsername}!`);
            }
            else {
                console.log(`Leaving channel #${msg.senderUsername}`);
                tclient.privmsg(msg.channelName, `Leaving channel #${msg.senderUsername}`);
                if (config["joined_channels"].includes(msg.senderUsername)) {
                    config["joined_channels"].splice(config["joined_channels"].indexOf(msg.senderUsername), 1);
                }
                tclient.part(msg.senderUsername);
                await update_config();
            }
        }
        else if (msg.messageText === "!ignore") {
            if (config["ignored_users"].indexOf(msg.senderUsername) > -1) {
                tclient.privmsg(msg.channelName, `You're already being ignored!`);
            }
            else {
                console.log(`Ignoring user ${msg.displayName}`);
                tclient.privmsg(msg.channelName, `Ignoring user ${msg.displayName}`);
                config["ignored_users"].push(msg.senderUsername);
                await update_config();
            }
        }
        else if (msg.messageText === "!unignore") {
            if (config["ignored_users"].indexOf(msg.senderUsername) === -1) {
                tclient.privmsg(msg.channelName, `You aren't being ignored!`);
            }
            else {
                console.log(`Unignoring user ${msg.displayName}`);
                tclient.privmsg(msg.channelName, `Unignoring user ${msg.displayName}`);
                config["ignored_users"].splice(config["ignored_users"].indexOf(msg.senderUsername), 1);
                await update_config();
            }
        }
        else if (msg.messageText === "!help") {
            tclient.privmsg(msg.channelName, `!join to make the bot join your channel, !part or !leave to make it leave. !ignore will make the bot not uwuify your messages and !unignore will make it uwuify them again. !maxlength allows you to limit message length. You can also run !uwuify <message> to force it to uwuify. UwU`);
        }
        else if (msg.messageText.startsWith("!maxlength")) {
            var maxlength = msg.messageText.split(" ")[1];
            if (maxlength == null) {
                tclient.privmsg(msg.channelName, `You must provide a number from 1 to 500!`);
                return;
            }
            maxlength = Number(maxlength);
            if (isNaN(maxlength)) {
                tclient.privmsg(msg.channelName, `Value must be a number from 1 to 500!`);
                return;
            }
            if (maxlength > 500 || maxlength < 1) {
                tclient.privmsg(msg.channelName, `Value must be a number from 1 to 500!`);
                return;
            }
            config["max_length"][msg.senderUsername] = maxlength;
            tclient.privmsg(msg.channelName, `Set response max length to ${maxlength} in channel ${msg.senderUsername}`);
            await update_config();
        }
    }
    else {
        var mode = "uwu"; // Default mode
        if (await to_uwuify(msg, mode) === true) {
            if (msg.messageText.startsWith("!uwuify")) {
                var message = msg.messageText.split(' ').slice(1).join(' ');
                mode = "uwu";
                console.log(`uwuifying message from ${msg.senderUsername} in #${msg.channelName}`);
            }
            else if (msg.messageText.startsWith("!owoify")) {
                var message = msg.messageText.split(' ').slice(1).join(' ');
                mode = "owo";
                console.log(`owoifying message from ${msg.senderUsername} in #${msg.channelName}`);
            }
            else if (msg.messageText.startsWith("!uvuify")) {
                var message = msg.messageText.split(' ').slice(1).join(' ');
                mode = "uvu";
                console.log(`uvuifying message from ${msg.senderUsername} in #${msg.channelName}`);
            }
            else {
                var message = msg.messageText
                console.log(`uwuifying message from ${msg.senderUsername} in #${msg.channelName}`);
            }
            let uwuified = owoify(message, mode);
            let maxlength = config["max_length"][msg.senderUsername];
            if (maxlength == null) {
                maxlength = 500;
            }
            tclient.privmsg(msg.channelName, uwuified.substring(0, maxlength));
        }
    }
});

if (config["joined_channels"].indexOf(config.username) === -1) {
    config.joined_channels.push(config.username);
}

tclient.connect();
console.log(`Connecting to channels ${config.joined_channels}`);
tclient.joinAll(config.joined_channels);
