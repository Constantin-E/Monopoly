var Monopoly = {};
Monopoly.allowRoll = true;
Monopoly.moneyAtStart = 30;
Monopoly.doubleCounter = 0;
Monopoly.brokePlayerIds = [];

//*********Basic Functions */
Monopoly.getCurrentPlayer = function () {
    return $(".player.current-turn");
};
Monopoly.getPlayersCell = function (player) {
    return player.closest(".cell");
};
Monopoly.getPlayersMoney = function (player) {
    return parseInt(player.attr("data-money"));
};
Monopoly.playSound = function (sound) {
    var snd = new Audio("./sounds/" + sound + ".wav");
    snd.play();
}

Monopoly.updatePlayersMoney = function (player, amount) {
    var playersMoney = parseInt(player.attr("data-money"));
    playersMoney -= amount;
    Monopoly.playSound("chaching");
    player.attr("data-money", playersMoney);
    player.attr("title", player.attr("id") + ": $" + playersMoney);
    console.log(player[0].id + " now has" + playersMoney);
    Monopoly.closePopup();
    if (playersMoney < 0) {
        Monopoly.handleBankruptcy(player);
    } else {
        Monopoly.checkIfPair();
    }
};

Monopoly.rollDice = function () {
    var result1 = Math.floor(Math.random() * 6) + 1;
    var result2 = Math.floor(Math.random() * 6) + 1;
    $(".dice").find(".dice-dot").css("opacity", 0);
    $(".dice#dice1").attr("data-num", result1).find(".dice-dot.num" + result1).css("opacity", 1);
    $(".dice#dice2").attr("data-num", result2).find(".dice-dot.num" + result2).css("opacity", 1);
    if (result1 == result2) {
        Monopoly.doubleCounter++;
        Monopoly.lastWasDouble = true;
    } else {
        Monopoly.lastWasDouble = false;
    }
    var currentPlayer = Monopoly.getCurrentPlayer();
    Monopoly.handleAction(currentPlayer, "move", result1 + result2);
};


Monopoly.movePlayer = function (player, steps) {
    Monopoly.allowRoll = false;
    var playerMovementInterval = setInterval(function () {
        if (steps == 0) {
            clearInterval(playerMovementInterval);
            Monopoly.handleTurn(player);
        } else {
            var playerCell = Monopoly.getPlayersCell(player);
            var nextCell = Monopoly.getNextCell(playerCell);
            nextCell.find(".content").append(player);
            steps--;
        }
    }, 200);
};


Monopoly.handleTurn = function () {
    var player = Monopoly.getCurrentPlayer();
    var playerCell = Monopoly.getPlayersCell(player);
    if (playerCell.is(".available.property")) {
        Monopoly.handleBuyProperty(player, playerCell);
    } else if (playerCell.is(".property:not(.available)") && !playerCell.hasClass(player.attr("id"))) {
        Monopoly.handlePayRent(player, playerCell);
    } else if (playerCell.hasClass(player.attr("id"))) {
        $(".player.current-turn").addClass("home");
        Monopoly.checkIfPair();
    } else if (playerCell.is(".go-to-jail")) {
        Monopoly.handleGoToJail(player);
    } else if (playerCell.is(".chance")) {
        Monopoly.handleChanceCard(player);
    } else if (playerCell.is(".community")) {
        Monopoly.handleCommunityCard(player);
    } else {
        Monopoly.checkIfPair();
    }
}

Monopoly.checkIfPair = function () {
    var player = Monopoly.getCurrentPlayer();
    if (Monopoly.lastWasDouble) {
        player.removeClass("home");
        if (Monopoly.doubleCounter < 3) {
            Monopoly.allowRoll = true;
        } else {
            Monopoly.handleGoToJail(Monopoly.getCurrentPlayer());
        }
    } else {
        Monopoly.doubleCounter = 0;
        Monopoly.setNextPlayerTurn();
    }
    Monopoly.closePopup();
}

//Next Player is selected
Monopoly.setNextPlayerTurn = function () {
    var currentPlayerTurn = Monopoly.getCurrentPlayer();
    var playerId = parseInt(currentPlayerTurn.attr("id").replace("player", ""));
    var nextPlayerId = playerId + 1;
    if (nextPlayerId > $(".player").length) {
        nextPlayerId = 1;
    }
    nextPlayerId = Monopoly.checkIfNextIsBroke(nextPlayerId);
    currentPlayerTurn.removeClass("current-turn");
    var nextPlayer = $(".player#player" + nextPlayerId);
    nextPlayer.addClass("current-turn");
    if (nextPlayer.is(".jailed")) {
        var currentJailTime = parseInt(nextPlayer.attr("data-jail-time"));
        currentJailTime++;
        nextPlayer.attr("data-jail-time", currentJailTime);
        if (currentJailTime > 3) {
            nextPlayer.removeClass("jailed");
            nextPlayer.removeAttr("data-jail-time");
        }
        Monopoly.setNextPlayerTurn();
        return;
    }
    Monopoly.closePopup();
    Monopoly.allowRoll = true;
};
Monopoly.checkIfNextIsBroke = function (nextPlayerId) {
    var checkBrokePlayers = function (nextPlayerId) {
        for (var i = 0; i < Monopoly.brokePlayerIds.length; i++) {
            if (nextPlayerId === Monopoly.brokePlayerIds[i]) {
                nextPlayerId += 1;
                if (nextPlayerId > $(".player").length) {
                    nextPlayerId = 1;
                }
                if (Monopoly.brokePlayerIds.length+1 === $('.player').length) {
                    winnerId = Monopoly.getCurrentPlayer()[0].id;
                    Monopoly.winningMessage(winnerId);
                }
                checkBrokePlayers(nextPlayerId);
                break;
            }
        }
    }
    checkBrokePlayers(nextPlayerId);
    return nextPlayerId;
}
//*************Handling of different Game Events */

//Winning
Monopoly.winningMessage = function (playerId) {
    console.log(`Player ${playerId} won!`);
    //make this a simple popup with no buttons
}
//Paasing Go
Monopoly.handlePassedGo = function () {
    var player = Monopoly.getCurrentPlayer();
    Monopoly.updatePlayersMoney(player, Monopoly.moneyAtStart / (-10));
};

//Property purchase
Monopoly.handleBuyProperty = function (player, propertyCell) {
    var propertyCost = Monopoly.calculateProperyCost(propertyCell);
    var popup = Monopoly.getPopup("buy");
    popup.find(".cell-price").text(propertyCost);
    popup.find("button").unbind("click").bind("click", function () {
        var clickedBtn = $(this);
        if (clickedBtn.is("#yes")) {
            Monopoly.handleBuy(player, propertyCell, propertyCost);
        } else {
            Monopoly.closeAndNextTurn();
        }
    });
    Monopoly.showPopup("buy");
};
Monopoly.handleBuy = function (player, propertyCell, propertyCost) {
    var playersMoney = Monopoly.getPlayersMoney(player)
    if (playersMoney < propertyCost) {
        Monopoly.playSound("boing");
        Monopoly.showErrorMsg();
    } else {
        Monopoly.updatePlayersMoney(player, propertyCost);
        var rent = Monopoly.calculateProperyRent(propertyCost);

        propertyCell.removeClass("available")
            .addClass(player.attr("id"))
            .attr("data-owner", player.attr("id"))
            .attr("data-rent", rent);
        Monopoly.checkIfPair();
    }
};

//Rent payment
Monopoly.handlePayRent = function (player, propertyCell) {
    var popup = Monopoly.getPopup("pay");
    var currentRent = parseInt(propertyCell.attr("data-rent"));
    var properyOwnerId = propertyCell.attr("data-owner");
    popup.find("#player-placeholder").text(properyOwnerId);
    popup.find("#amount-placeholder").text(currentRent);
    popup.find("button").unbind("click").bind("click", function () {
        var properyOwner = $(".player#" + properyOwnerId);
        console.log(properyOwnerId)
        Monopoly.updatePlayersMoney(properyOwner, -1 * currentRent);
        Monopoly.updatePlayersMoney(player, currentRent);
        if (Monopoly.getPlayersMoney(player) > 0) {
            Monopoly.closeAndNextTurn();
        }
    });
    Monopoly.showPopup("pay");
};
//Jail
Monopoly.handleGoToJail = function (player) {
    var popup = Monopoly.getPopup("jail");
    popup.find("button").unbind("click").bind("click", function () {
        Monopoly.handleAction(player, "jail");
    });
    Monopoly.showPopup("jail");
};
Monopoly.sendToJail = function (player) {
    player.addClass("jailed");
    player.attr("data-jail-time", 1);
    $(".corner.game.cell.in-jail").append(player);
    Monopoly.playSound("woopwoop");
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};
//Bankruptcy
Monopoly.handleBankruptcy = function (player) {
    var popup = Monopoly.getPopup("bankrupt");
    popup.find("button").unbind("click").bind("click", function () {
        $(`.game.cell.${player[0].id}`)
            .removeClass(`property ${player[0].id}`)
            .addClass('available')
            .removeAttr('data-owner', "")
            .removeAttr('data-rent', "");
        $(`.player.shadowed#${player[0].id}`).remove();
        Monopoly.handleAction(player, "bankrupt");
    });
    Monopoly.showPopup("bankrupt");
}
//Cards
Monopoly.handleChanceCard = function (player) {
    var popup = Monopoly.getPopup("chance");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_chance_card", function (chanceJson) {
        popup.find(".popup-content #text-placeholder").text(chanceJson["content"]);
        popup.find(".popup-title").text(chanceJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action", chanceJson["action"]).attr("data-amount", chanceJson["amount"]);
    }, "json");
    popup.find("button").unbind("click").bind("click", function () {
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player, action, amount);
    });
    Monopoly.showPopup("chance");
};
Monopoly.handleCommunityCard = function (player) {
    var popup = Monopoly.getPopup("chance");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_community_card", function (chanceJson) {
        popup.find(".popup-content #text-placeholder").text(chanceJson["content"]);
        popup.find(".popup-title").text(chanceJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action", chanceJson["action"]).attr("data-amount", chanceJson["amount"]);
    }, "json");
    popup.find("button").unbind("click").bind("click", function () {
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player, action, amount);
    });
    Monopoly.showPopup("chance");
};
Monopoly.handleAction = function (player, action, amount) {
    switch (action) {
        case "move":
            Monopoly.movePlayer(player, amount);
            Monopoly.closePopup();
            break;
        case "pay":
            Monopoly.updatePlayersMoney(player, amount);
            break;
        case "jail":
            Monopoly.sendToJail(player);
            Monopoly.closePopup();
            break;
        case "bankrupt":
            var playerId = parseInt(player.attr("id").replace("player", ""));
            Monopoly.brokePlayerIds.push(playerId);
            Monopoly.setNextPlayerTurn();
            Monopoly.closePopup();
    };
};

// Property values
Monopoly.calculateProperyCost = function (propertyCell) {
    var cellGroup = propertyCell.attr("data-group");
    var cellPrice = parseInt(cellGroup.replace("group", "")) * 5;
    if (cellGroup == "rail") {
        cellPrice = 10;
    }
    return cellPrice;
};
Monopoly.calculateProperyRent = function (propertyCost) {
    return propertyCost / 2;
};

//Popups
Monopoly.initPopups = function () {
    $(".popup-page#intro").find("button").click(function () {
        var numOfPlayers = $(this).closest(".popup-page").find("input").val();
        if (Monopoly.isValidInput("numofplayers", numOfPlayers)) {
            Monopoly.createPlayers(numOfPlayers);
            Monopoly.closePopup();
        }
    });
};
Monopoly.getPopup = function (popupId) {
    return $(".popup-lightbox .popup-page#" + popupId);
};
Monopoly.showErrorMsg = function () {
    $(".popup-page .invalid-error").fadeTo(500, 1);
    setTimeout(function () {
        $(".popup-page .invalid-error").fadeTo(500, 0);
    }, 2000);
};
Monopoly.closePopup = function () {
    $(".popup-lightbox").fadeOut();
};
Monopoly.showPopup = function (popupId) {
    $(".popup-lightbox .popup-page").hide();
    $(".popup-lightbox .popup-page#" + popupId).show();
    $(".popup-lightbox").fadeIn();
};
Monopoly.closeAndNextTurn = function () {
    Monopoly.checkIfPair();
    Monopoly.closePopup();
};


Monopoly.getNextCell = function (cell) {
    var currentCellId = parseInt(cell.attr("id").replace("cell", ""));
    var nextCellId = currentCellId + 1
    if (nextCellId > 40) {
        Monopoly.handlePassedGo();
        nextCellId = 1;
    }
    return $(".cell#cell" + nextCellId);
};
//*************Initialization */
Monopoly.start = function () {
    Monopoly.showPopup("intro")
};
Monopoly.createPlayers = function (numOfPlayers) {
    var startCell = $(".go");
    for (var i = 1; i <= numOfPlayers; i++) {
        var player = $("<div />").addClass("player shadowed").attr("id", "player" + i).attr("title", "player" + i + ": $" + Monopoly.moneyAtStart);
        startCell.find(".content").append(player);
        if (i == 1) {
            player.addClass("current-turn");
        }
        player.attr("data-money", Monopoly.moneyAtStart);
    }
};
Monopoly.adjustBoardSize = function () {
    var gameBoard = $(".board");
    var boardSize = Math.min($(window).height(), $(window).width());
    boardSize -= parseInt(gameBoard.css("margin-top")) * 2;
    $(".board").css({ "height": boardSize, "width": boardSize });
}
Monopoly.isValidInput = function (validate, value) {
    var isValid = false;
    switch (validate) {
        case "numofplayers":
            if (value > 1 && value <= 6) {
                isValid = true;
            }
    }
    if (!isValid) {
        Monopoly.showErrorMsg();
    }
    return isValid;
}
Monopoly.initDice = function () {
    $(".dice").click(function () {
        if (Monopoly.allowRoll) {
            Monopoly.rollDice();
        }
    });
};
Monopoly.init = function () {
    $(document).ready(function () {
        Monopoly.adjustBoardSize();
        $(window).bind("resize", Monopoly.adjustBoardSize);
        Monopoly.initDice();
        Monopoly.initPopups();
        Monopoly.start();
    });
};

Monopoly.init();