const { Client, IntentsBitField } = require("discord.js");

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ]
});

client.on("ready", (c) => {
    console.log(`${c.user.tag} is online`);
});

const neutral = "😐";


const numbers = Array.from({ length: 25 }, (v, k) => k + 1);

const conversationStates = {};

// Black Jack Cards
const cards = [2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,4,4,4,4,4,4,4,4,5,5,5,5,5,5,5,5,6,6,6,6,6,6,6,6,
    7,7,7,7,7,7,7,7,8,8,8,8,8,8,8,8,9,9,9,9,9,9,9,9,10,10,10,10,10,10,10,10,"J","J","J","J","J","J","J","J",
    "Q","Q","Q","Q","Q","Q","Q","Q","K","K","K","K","K","K","K","K","A","A","A","A","A","A","A","A"
];

function calculateTotal(cards) {
    let total = 0;
    let aceCount = 0;

    for (const card of cards) {
        if (['J', 'Q', 'K'].includes(card)) {
            total += 10;
        } else if (card === 'A') {
            total += 11;
            aceCount += 1;
        } else {
            total += card;
        }
    }
    // Adjust for aces if total is over 21
    while (total > 21 && aceCount > 0) {
        total -= 10;
        aceCount -= 1;
    }

    return total;
}

async function startBlackjack(msg) {
    await msg.reply("Welcome to the best game created, are you ready? (y/n)");

    const filter = response => response.author.id === msg.author.id;
    const yesnocollector = msg.channel.createMessageCollector({ filter, time: 30000 });

    yesnocollector.on('collect', async m => {
        if (m.content.toLowerCase() === "y") {
            await msg.reply("Let's get started then!\nThis bot assumes you know how to play, so I hope you do!\nHere are your cards:");

            // Initialize game
            const currcards = [];
            for (let i = 0; i < 4; i++) {
                const randomIndex = Math.floor(Math.random() * cards.length);
                currcards.push(cards[randomIndex]);
            }

            const botcards = [currcards[0], currcards[3]];
            const playercards = [currcards[1], currcards[2]];

            await msg.channel.send(`Your cards are: ${playercards.join(', ')}\nYour total is: ${calculateTotal(playercards)}`);
            console.log(`Bot's cards are: ${botcards.join(', ')}\nBot's total: ${calculateTotal(botcards)}`);
            await msg.channel.send(`The Dealer is showing: ${currcards[0]}`);

            // Create the game collector for hit/stand responses
            await msg.reply("Do you want to hit or stand?");
            const gameCollector = msg.channel.createMessageCollector({ filter, time: 30000 });

            gameCollector.on('collect', async response => {
                if (response.content.toLowerCase() === "hit") {
                    // Draw a new card
                    const newCard = cards[Math.floor(Math.random() * cards.length)];
                    playercards.push(newCard);
                    const total = calculateTotal(playercards);
                    await msg.channel.send(`You drew a ${newCard}. Your total is ${total}.`);

                    // Check if the player busts
                    if (total > 21) {
                        await msg.channel.send(`You busted. Game over! ${neutral}`);
                        gameCollector.stop(); // Stop the collector if the player busts
                        await askToPlayAgain(msg, filter); // Ask to play again
                    } else {
                        // Ask the user to choose again
                        await msg.reply("Do you want to hit or stand?");
                    }
                } else if (response.content.toLowerCase() === "stand") {
                    // Reveal dealer’s cards and finish the game
                    await msg.channel.send(`Dealer's cards are: ${botcards.join(', ')}\nDealer's total is ${calculateTotal(botcards)}.`);

                    // Dealer logic: hits until reaching 17 or more
                    while (calculateTotal(botcards) < 17) {
                        const newBotCard = cards[Math.floor(Math.random() * cards.length)];
                        botcards.push(newBotCard);
                        await msg.channel.send(`Dealer drew a ${newBotCard}. Dealer's total is now ${calculateTotal(botcards)}.`);
                    }

                    if (calculateTotal(botcards) > 21) {
                        await msg.channel.send("Dealer busted. You win!");
                    } else {
                        const playerTotal = calculateTotal(playercards);
                        const botTotal = calculateTotal(botcards);
                        if (playerTotal > botTotal) {
                            await msg.channel.send("You win!");
                        } else if (playerTotal < botTotal) {
                            await msg.channel.send("Dealer wins!");
                        } else {
                            await msg.channel.send("It's a tie!");
                        }
                    }
                    
                    // Ask if the player wants to play again
                    await askToPlayAgain(msg, filter);
                    gameCollector.stop(); // Stop the collector when the game ends
                } else {
                    await msg.reply("Please reply with 'hit' or 'stand'.");
                }
            });

            gameCollector.on('end', collected => {
                if (collected.size === 0) {
                    msg.reply(`You didn't respond in time. You're a bum ${neutral}`);
                }
            });

            yesnocollector.stop();
        } else if (m.content.toLowerCase() === "n") {
            await msg.reply(`You're a bum ${neutral}`);
            yesnocollector.stop();
        }
    });

    yesnocollector.on('end', collected => {
        if (collected.size === 0) {
            msg.reply(`You didn't respond in time. You're a bum ${neutral}`);
        }
    });
}
// Function to play again
async function askToPlayAgain(msg, filter) {
    await msg.reply("Do you want to play again? (y/n)");
    const playAgainCollector = msg.channel.createMessageCollector({ filter, time: 30000 });

    playAgainCollector.on('collect', async playAgainResponse => {
        if (playAgainResponse.content.toLowerCase() === "y") {
            playAgainCollector.stop(); 
            // Restart the game
            await startBlackjack(msg);
        } else if (playAgainResponse.content.toLowerCase() === "n") {
            playAgainCollector.stop(); 
        } else {
            await msg.reply("Please reply with 'y' or 'n'.");
        }
    });

    playAgainCollector.on('end', collected => {
        if (collected.size === 0) {
            msg.reply(`You didn't respond in time. Thanks for playing!`);
        }
    });
}

// Message in the server
client.on("messageCreate", async (msg) => {
    // Strip messages
    const stripped = msg.content.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

    // Make sure bot doesn't take bot messages
    if (msg.author.bot) {
        return;
    }

    // Blackjack command
    if (msg.content.toLowerCase() === "!blackjack") {
        await startBlackjack(msg);
    }
});

client.login("Your Bot Token Here");

