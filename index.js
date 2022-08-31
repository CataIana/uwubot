import { ChatClient } from "dank-twitch-irc";
import fs from "fs";
import fetch from "node-fetch";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const owoify = require("owoify-js").default;

function between(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function to_uwuify(msg, mode) {
  if (
    msg.messageText.startsWith("!uwuify") ||
    msg.messageText.startsWith("!uvuify") ||
    msg.messageText.startsWith("!owoify")
  ) {
    //console.log("force uwuify with command");
    return true;
  }
  if (config["ignored_users"].includes(Number(msg.senderUserID))) {
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
  fs.writeFile("./config.json", data, "utf8", (err) => {
    if (err) {
      console.log(`Error writing file: ${err}`);
    } else {
      console.log(`Config updated successfully!`);
    }
  });
}

try {
  const data = fs.readFileSync("./config.json", "utf8");
  var config = JSON.parse(data);
} catch (err) {
  console.log(`Error reading file from disk: ${err}`);
}

let tclient = new ChatClient({
  username: config.username,
  password: config.password,

  rateLimits: "default",
}); //Create the twitch client object

tclient.on("ready", () => console.log("Successfully connected to chat"));

tclient.on("PRIVMSG", async (msg) => {
  if (msg.senderUsername == config.username) {
    return;
  }
  if (msg.channelName == config.username) {
    //Don't uwuify messages in the bots channel
    if (msg.messageText === "!join") {
      if (Array.from(tclient.joinedChannels).includes(msg.senderUsername)) {
        tclient.privmsg(
          msg.channelName,
          `Bot has already joined #${msg.senderUsername}!`
        );
      } else {
        console.log(`Joining channel #${msg.senderUsername}`);
        tclient.privmsg(
          msg.channelName,
          `Joining channel #${msg.senderUsername}`
        );
        if (!config["joined_channels"].includes(Number(msg.senderUserID))) {
          config["joined_channels"].push(Number(msg.senderUserID));
        }
        tclient.join(msg.senderUsername);
        await update_config();
      }
    } else if (msg.messageText === "!part" || msg.messageText === "!leave") {
      if (!Array.from(tclient.joinedChannels).includes(msg.senderUsername)) {
        tclient.privmsg(
          msg.channelName,
          `Bot not in channel #${msg.senderUsername}!`
        );
      } else {
        console.log(`Leaving channel #${msg.senderUsername}`);
        tclient.privmsg(
          msg.channelName,
          `Leaving channel #${msg.senderUsername}`
        );
        if (config["joined_channels"].includes(Number(msg.senderUserID))) {
          config["joined_channels"].splice(
            config["joined_channels"].indexOf(Number(msg.senderUserID)),
            1
          );
        }
        tclient.part(msg.senderUsername);
        await update_config();
      }
    } else if (msg.messageText === "!ignore") {
      if (config["ignored_users"].includes(Number(msg.senderUserID))) {
        tclient.privmsg(msg.channelName, `You're already being ignored!`);
      } else {
        console.log(`Ignoring user ${msg.displayName}`);
        tclient.privmsg(msg.channelName, `Ignoring user ${msg.displayName}`);
        config["ignored_users"].push(Number(msg.senderUserID));
        await update_config();
      }
    } else if (msg.messageText === "!unignore") {
      if (!config["ignored_users"].includes(Number(msg.senderUserID))) {
        tclient.privmsg(msg.channelName, `You aren't being ignored!`);
      } else {
        console.log(`Unignoring user ${msg.displayName}`);
        tclient.privmsg(msg.channelName, `Unignoring user ${msg.displayName}`);
        config["ignored_users"].splice(
          config["ignored_users"].indexOf(msg.senderUsername),
          1
        );
        await update_config();
      }
    } else if (msg.messageText === "!help") {
      tclient.privmsg(
        msg.channelName,
        `!join to make the bot join your channel, !part or !leave to make it leave. !ignore will make the bot not uwuify your messages and !unignore will make it uwuify them again. !maxlength allows you to limit message length. You can also run !uwuify <message> to force it to uwuify. UwU`
      );
    } else if (msg.messageText.startsWith("!maxlength")) {
      var maxlength = msg.messageText.split(" ")[1];
      if (maxlength == null) {
        tclient.privmsg(
          msg.channelName,
          `You must provide a number from 1 to 500!`
        );
        return;
      }
      maxlength = Number(maxlength);
      if (isNaN(maxlength)) {
        tclient.privmsg(
          msg.channelName,
          `Value must be a number from 1 to 500!`
        );
        return;
      }
      if (maxlength > 500 || maxlength < 1) {
        tclient.privmsg(
          msg.channelName,
          `Value must be a number from 1 to 500!`
        );
        return;
      }
      config["max_length"][msg.senderUserID] = maxlength;
      tclient.privmsg(
        msg.channelName,
        `Set response max length to ${maxlength} in channel ${msg.senderUsername}`
      );
      await update_config();
    }
  } else {
    var mode = "uwu"; // Default mode
    if ((await to_uwuify(msg, mode)) === true) {
      if (msg.messageText.startsWith("!uwuify")) {
        var message = msg.messageText.split(" ").slice(1).join(" ");
        mode = "uwu";
        console.log(
          `uwuifying message from ${msg.senderUsername} in #${msg.channelName}`
        );
      } else if (msg.messageText.startsWith("!owoify")) {
        var message = msg.messageText.split(" ").slice(1).join(" ");
        mode = "owo";
        console.log(
          `owoifying message from ${msg.senderUsername} in #${msg.channelName}`
        );
      } else if (msg.messageText.startsWith("!uvuify")) {
        var message = msg.messageText.split(" ").slice(1).join(" ");
        mode = "uvu";
        console.log(
          `uvuifying message from ${msg.senderUsername} in #${msg.channelName}`
        );
      } else {
        var message = msg.messageText;
        console.log(
          `uwuifying message from ${msg.senderUsername} in #${msg.channelName}`
        );
      }
      let uwuified = owoify(message, mode);
      let maxlength = config["max_length"][msg.senderUserID];
      if (maxlength == null) {
        maxlength = 500;
      }
      tclient.privmsg(msg.channelName, uwuified.substring(0, maxlength));
    }
  }
});

var joined_channels = [];
if (config["joined_channels"].length > 0) {
  const chunkSize = 100;
  for (let i = 0; i < config["joined_channels"].length; i += chunkSize) {
    const chunk = config["joined_channels"].slice(i, i + chunkSize);
    let ids = chunk.join("&id=");
    const response = await fetch(
      `https://api.twitch.tv/helix/users?id=${ids}`,
      {
        headers: {
          Authorization: `Bearer ${config.password}`,
          "Client-Id": config.client_id,
        },
      }
    );
    if (!response.ok) {
      throw new Error("HTTP error " + response.status);
    }
    const json = await response.json();
    for (let i = 0; i < json.data.length; i++) {
      joined_channels.push(json.data[i].login);
    }
  }
}

if (!joined_channels.includes(config.username)) {
  joined_channels.push(config.username);
}

tclient.connect();
console.log(`Connecting to channels ${joined_channels}`);
tclient.joinAll(joined_channels);
